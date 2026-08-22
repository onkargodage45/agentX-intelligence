import type {
  AgentId,
  AdversarialConfig,
  Checkpoint,
  DynamicPlan,
  GraphEdge,
  GraphNode,
  GraphNodeId,
  GraphState,
  PlanTask,
  ToolName,
} from '@/types';
import { uid } from './utils';
import { classifyQuery, type Classification } from './classify';

/* ---------------- Constants ---------------- */

export const MAX_TOOL_CALLS = 8;
export const MAX_RETRIES_PER_TOOL = 2;
export const MAX_AGENT_STEPS = 12;
export const MAX_REPLANS = 3;

/* ---------------- Graph definition ---------------- */

export const GRAPH_NODES: GraphNode[] = [
  { id: 'START', label: 'START', status: 'PENDING' },
  { id: 'UNDERSTAND', label: 'UNDERSTAND', status: 'PENDING' },
  { id: 'PLAN', label: 'PLAN', status: 'PENDING' },
  { id: 'RESEARCH', label: 'RESEARCH', status: 'PENDING' },
  { id: 'NEWS', label: 'NEWS', status: 'PENDING' },
  { id: 'PARALLEL_RESEARCH_NEWS', label: 'PARALLEL', status: 'PENDING' },
  { id: 'VERIFY', label: 'VERIFY', status: 'PENDING' },
  { id: 'SELF_EVALUATE', label: 'SELF-EVALUATE', status: 'PENDING' },
  { id: 'REPLAN', label: 'REPLAN', status: 'PENDING' },
  { id: 'SYNTHESIS', label: 'SYNTHESIS', status: 'PENDING' },
  { id: 'END', label: 'END', status: 'PENDING' },
];

export const GRAPH_EDGES: GraphEdge[] = [
  { from: 'START', to: 'UNDERSTAND', label: 'begin', condition: 'always' },
  { from: 'UNDERSTAND', to: 'PLAN', label: 'understood', condition: 'always' },
  { from: 'PLAN', to: 'RESEARCH', label: 'research needed', condition: 'needsResearch' },
  { from: 'PLAN', to: 'NEWS', label: 'news needed', condition: 'needsNews' },
  { from: 'PLAN', to: 'PARALLEL_RESEARCH_NEWS', label: 'both needed', condition: 'needsBoth' },
  { from: 'PLAN', to: 'VERIFY', label: 'skip agents', condition: 'noAgents' },
  { from: 'RESEARCH', to: 'VERIFY', label: 'research done', condition: 'always' },
  { from: 'NEWS', to: 'VERIFY', label: 'news done', condition: 'always' },
  { from: 'PARALLEL_RESEARCH_NEWS', to: 'VERIFY', label: 'both done', condition: 'always' },
  { from: 'VERIFY', to: 'SELF_EVALUATE', label: 'evidence assessed', condition: 'always' },
  { from: 'SELF_EVALUATE', to: 'SYNTHESIS', label: 'sufficient', condition: 'proceed' },
  { from: 'SELF_EVALUATE', to: 'REPLAN', label: 'insufficient', condition: 'replanRequired' },
  { from: 'REPLAN', to: 'RESEARCH', label: 'reactivate', condition: 'needsResearch' },
  { from: 'REPLAN', to: 'NEWS', label: 'reactivate', condition: 'needsNews' },
  { from: 'REPLAN', to: 'SYNTHESIS', label: 'budget exhausted', condition: 'budgetExhausted' },
  { from: 'SYNTHESIS', to: 'END', label: 'complete', condition: 'always' },
];

/* ---------------- Graph state factory ---------------- */

export function createInitialGraphState(): GraphState {
  return {
    nodes: GRAPH_NODES.map((n) => ({ ...n })),
    edges: GRAPH_EDGES,
    currentNode: 'START',
    visitedNodes: [],
    plan: null,
    replanCount: 0,
    maxReplans: MAX_REPLANS,
    maxSteps: MAX_AGENT_STEPS,
    stepCount: 0,
  };
}

export function activateNode(state: GraphState, nodeId: GraphNodeId): GraphState {
  const nodes = state.nodes.map((n) =>
    n.id === nodeId
      ? { ...n, status: 'ACTIVE' as const, activatedAt: Date.now() }
      : n,
  );
  return {
    ...state,
    nodes,
    currentNode: nodeId,
    visitedNodes: [...new Set([...state.visitedNodes, nodeId])],
    stepCount: state.stepCount + 1,
  };
}

export function completeNode(state: GraphState, nodeId: GraphNodeId): GraphState {
  const nodes = state.nodes.map((n) =>
    n.id === nodeId ? { ...n, status: 'COMPLETED' as const, completedAt: Date.now() } : n,
  );
  return { ...state, nodes };
}

export function skipNode(state: GraphState, nodeId: GraphNodeId): GraphState {
  const nodes = state.nodes.map((n) =>
    n.id === nodeId ? { ...n, status: 'SKIPPED' as const } : n,
  );
  return { ...state, nodes };
}

export function failNode(state: GraphState, nodeId: GraphNodeId): GraphState {
  const nodes = state.nodes.map((n) =>
    n.id === nodeId ? { ...n, status: 'FAILED' as const } : n,
  );
  return { ...state, nodes };
}

/* ---------------- Dynamic planning ---------------- */

export function createDynamicPlan(
  query: string,
  classification: Classification,
  adversarial?: AdversarialConfig,
): DynamicPlan {
  const agents: AgentId[] = [];
  const tools: ToolName[] = [];
  const requiredEvidence: string[] = [];
  const tasks: PlanTask[] = [];
  let taskId = 0;

  const mkTask = (
    label: string,
    agent: AgentId | 'orchestrator',
    tool?: ToolName,
    required = true,
    parallelWith?: string[],
  ): PlanTask => ({
    id: `task_${taskId++}`,
    label,
    agent,
    tool,
    parallelWith,
    required,
    status: 'PENDING',
  });

  tasks.push(mkTask('Query understanding & intent classification', 'orchestrator'));

  if (classification.needsResearch) {
    agents.push('research');
    tools.push('OpenAlex');
    requiredEvidence.push('Academic research publications');
    if (classification.intent === 'mixed' || classification.intent === 'research') {
      tools.push('Crossref');
    }
  }

  if (classification.needsNews) {
    agents.push('news');
    tools.push('Hacker News');
    requiredEvidence.push('Industry & competitor signals');
  }

  // Build task graph
  if (classification.needsResearch && classification.needsNews) {
    const researchTask = mkTask('Research investigation', 'research', 'OpenAlex', true);
    const newsTask = mkTask('Industry investigation', 'news', 'Hacker News', true);
    researchTask.parallelWith = [newsTask.id];
    newsTask.parallelWith = [researchTask.id];
    tasks.push(researchTask, newsTask);
    tasks.push(mkTask('Evidence aggregation & comparison', 'orchestrator'));
  } else if (classification.needsResearch) {
    tasks.push(mkTask('Research investigation', 'research', 'OpenAlex'));
    tasks.push(mkTask('Research verification', 'research', 'Crossref', false));
    tasks.push(mkTask('Evidence evaluation', 'orchestrator'));
  } else if (classification.needsNews) {
    tasks.push(mkTask('Industry investigation', 'news', 'Hacker News'));
    tasks.push(mkTask('Evidence evaluation', 'orchestrator'));
  } else {
    tasks.push(mkTask('Broad evidence gathering', 'research', 'OpenAlex'));
    tasks.push(mkTask('Evidence evaluation', 'orchestrator'));
  }

  tasks.push(mkTask('Self-evaluation', 'orchestrator'));
  tasks.push(mkTask('Final intelligence synthesis', 'orchestrator'));

  const strategy =
    classification.intent === 'mixed'
      ? 'Parallel execution: Research + News agents run concurrently, then evidence is correlated.'
      : classification.intent === 'research'
        ? 'Sequential execution: Research Agent with OpenAlex primary, Crossref fallback.'
        : 'Sequential execution: News Agent with Hacker News.';

  void adversarial;
  void query;

  return {
    goal: query,
    requiredEvidence,
    selectedAgents: agents,
    selectedTools: tools,
    executionStrategy: strategy,
    tasks,
    planVersion: 1,
  };
}

export function createRevisedPlan(
  currentPlan: DynamicPlan,
  reason: string,
  classification: Classification,
): DynamicPlan {
  const newTasks = [...currentPlan.tasks];
  const completedIds = new Set(
    newTasks.filter((t) => t.status === 'COMPLETED').map((t) => t.id),
  );

  // Add verification task if not already present
  const hasVerify = newTasks.some((t) => t.label.toLowerCase().includes('verification'));
  if (!hasVerify && classification.needsResearch) {
    newTasks.push({
      id: `task_replan_${currentPlan.planVersion}`,
      label: `Additional research verification (${reason})`,
      agent: 'research',
      tool: 'Crossref',
      required: true,
      status: 'PENDING',
    });
  }

  // Reset any non-completed, non-skipped tasks to PENDING for re-execution
  for (const t of newTasks) {
    if (t.status !== 'COMPLETED' && t.status !== 'SKIPPED' && !completedIds.has(t.id)) {
      t.status = 'PENDING';
    }
  }

  return {
    ...currentPlan,
    tasks: newTasks,
    planVersion: currentPlan.planVersion + 1,
    executionStrategy: `Revised plan (v${currentPlan.planVersion + 1}): ${reason}`,
  };
}

/* ---------------- Checkpointing ---------------- */

export function createCheckpoint(
  graphState: GraphState,
  node: GraphNodeId,
  label: string,
  resultsCount: number,
  evidenceCount: number,
  confidence: number,
): Checkpoint {
  return {
    id: uid('ckpt'),
    number: (graphState.visitedNodes.length),
    node,
    label,
    timestamp: Date.now(),
    stateSnapshot: {
      completedNodes: graphState.nodes.filter((n) => n.status === 'COMPLETED').map((n) => n.id),
      resultsCount,
      evidenceCount,
      confidence,
      planVersion: graphState.plan?.planVersion ?? 1,
    },
  };
}

/* ---------------- Loop / deadlock detection ---------------- */

export interface LoopDetectionResult {
  detected: boolean;
  reason: string;
  repeatedNode?: GraphNodeId;
  repeatCount?: number;
}

export function detectLoop(graphState: GraphState): LoopDetectionResult {
  const visited = graphState.visitedNodes;
  const counts = new Map<GraphNodeId, number>();
  for (const n of visited) {
    counts.set(n, (counts.get(n) ?? 0) + 1);
  }

  for (const [node, count] of counts) {
    if (count >= 3 && (node === 'REPLAN' || node === 'RESEARCH' || node === 'NEWS')) {
      return {
        detected: true,
        reason: `Node ${node} visited ${count} times — possible investigation loop.`,
        repeatedNode: node,
        repeatCount: count,
      };
    }
  }

  if (graphState.replanCount >= graphState.maxReplans) {
    return {
      detected: true,
      reason: `Maximum replans (${graphState.maxReplans}) reached — stopping replanning.`,
    };
  }

  if (graphState.stepCount >= graphState.maxSteps) {
    return {
      detected: true,
      reason: `Maximum agent steps (${graphState.maxSteps}) reached — terminating safely.`,
    };
  }

  return { detected: false, reason: '' };
}

/* ---------------- Resource tracking ---------------- */

export function getResourceBudget(adversarial?: AdversarialConfig): number {
  if (adversarial?.simulateResourceConstraint && adversarial.maxToolCallsOverride) {
    return adversarial.maxToolCallsOverride;
  }
  return MAX_TOOL_CALLS;
}

export function getMaxRetries(adversarial?: AdversarialConfig): number {
  if (adversarial?.simulateOpenAlexFailure || adversarial?.simulateNewsFailure) {
    return MAX_RETRIES_PER_TOOL;
  }
  return MAX_RETRIES_PER_TOOL;
}

/* ---------------- Routing helpers ---------------- */

export function shouldRunParallel(classification: Classification): boolean {
  return classification.needsResearch && classification.needsNews;
}

export function nextNodeAfterPlan(
  classification: Classification,
): GraphNodeId {
  if (shouldRunParallel(classification)) return 'PARALLEL_RESEARCH_NEWS';
  if (classification.needsResearch) return 'RESEARCH';
  if (classification.needsNews) return 'NEWS';
  return 'VERIFY';
}

export function confidenceLevel(conf: number): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (conf >= 80) return 'HIGH';
  if (conf >= 50) return 'MEDIUM';
  return 'LOW';
}

export function shouldReplan(
  confidence: number,
  hasConflicts: boolean,
  replanCount: number,
  maxReplans: number,
  toolBudgetRemaining: number,
): boolean {
  if (replanCount >= maxReplans) return false;
  if (toolBudgetRemaining <= 0) return false;
  if (confidence < 50) return true;
  if (hasConflicts && confidence < 80) return true;
  return false;
}
