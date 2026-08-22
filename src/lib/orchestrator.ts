import type {
  AgentResult,
  Checkpoint,
  ConflictClaim,
  EvidenceAssessment,
  FinalIntelligence,
  FrameworkStatus,
  GraphState,
  GraphNodeId,
  HypothesisState,
  InvestigationContext,
  MonitoringProfile,
  ScanState,
  SelfEvaluation,
  Signal,
} from '@/types';
import { classifyQuery } from './classify';
import type { AgentRuntime } from './runtime';
import { runResearchAgent } from './researchAgent';
import { runNewsAgent } from './newsAgent';
import {
  clamp,
  evidenceVerdict,
  tokensOverlap,
  tokenize,
  topSignals,
  wait,
} from './utils';
import {
  buildResearchContextMessage,
  extractKeywordsFromSignals,
  extractTopicsFromSignals,
  type MemoryBoostResult,
} from './memory';
import {
  activateNode,
  completeNode,
  createCheckpoint,
  createDynamicPlan,
  createInitialGraphState,
  createRevisedPlan,
  detectLoop,
  confidenceLevel,
  nextNodeAfterPlan,
  shouldRunParallel,
  shouldReplan,
  MAX_REPLANS,
  MAX_TOOL_CALLS,
  MAX_AGENT_STEPS,
  MAX_RETRIES_PER_TOOL,
} from './graph';
import {
  shouldSimulateConflict,
  shouldSimulateLowConfidence,
  generateConflictingNewsSignals,
  generateLowConfidenceResearchSignals,
} from './adversarial';

interface OrchestratorRuntime extends AgentRuntime {
  setContext: (updater: (prev: InvestigationContext) => InvestigationContext) => void;
  memoryBoost: MemoryBoostResult;
  graphStateRef: { current: GraphState };
  checkpointsRef: { current: Checkpoint[] };
  frameworkStatusRef: { current: FrameworkStatus };
  retriesRef: { current: number };
}

/**
 * State-Graph Orchestrator — LangGraph-equivalent explicit state machine.
 *
 * Graph: START → UNDERSTAND → PLAN → [RESEARCH | NEWS | PARALLEL] → VERIFY → SELF_EVALUATE → [SYNTHESIS | REPLAN] → END
 *
 * Implements: dynamic planning, conditional routing, parallel execution,
 * shared state, checkpointing, autonomous replanning, failure recovery,
 * tool fallback, conflict resolution, uncertainty-aware decisions,
 * resource-aware execution, self-evaluation, hypothesis verification,
 * memory-based reasoning, loop/deadlock detection, adaptive task decomposition.
 */
export async function runOrchestrator(
  rt: OrchestratorRuntime,
): Promise<{ results: AgentResult[]; evidence: EvidenceAssessment; intelligence: FinalIntelligence; prioritySignals: Signal[] }> {
  const { emit, query, profile, context, setContext, memoryBoost, adversarial } = rt;

  let graphState = createInitialGraphState();
  rt.graphStateRef.current = graphState;
  const checkpoints: Checkpoint[] = [];
  rt.checkpointsRef.current = checkpoints;
  let retries = 0;
  rt.retriesRef.current = retries;

  const maxToolCalls = rt.maxToolCalls;
  let toolCallsUsed = 0;

  const updateFramework = (overrides: Partial<FrameworkStatus> = {}) => {
    const base: FrameworkStatus = {
      frameworkName: 'Equivalent State Graph (LangGraph-style)',
      state: 'RUNNING',
      currentNode: graphState.currentNode,
      checkpointNumber: checkpoints.length,
      toolBudget: maxToolCalls - toolCallsUsed,
      toolCallsUsed,
      maxToolCalls,
      retries,
      maxRetriesPerTool: MAX_RETRIES_PER_TOOL,
      replans: graphState.replanCount,
      maxReplans: MAX_REPLANS,
      loopDetection: 'ACTIVE',
      selfEvaluation: 'PENDING',
      agentSteps: graphState.stepCount,
      maxAgentSteps: MAX_AGENT_STEPS,
      restored: false,
    };
    const merged = { ...base, ...overrides };
    rt.frameworkStatusRef.current = merged;
    emit.frameworkStatus(merged);
  };

  const emitGraph = () => {
    rt.graphStateRef.current = graphState;
    emit.graphState(graphState);
  };

  const results: AgentResult[] = [];

  const makeCheckpoint = (node: GraphNodeId, label: string, conf: number) => {
    const ckpt = createCheckpoint(
      graphState,
      node,
      label,
      results.length,
      context.evidenceCount,
      conf,
    );
    ckpt.number = checkpoints.length + 1;
    checkpoints.push(ckpt);
    rt.checkpointsRef.current = checkpoints;
    emit.checkpoint(ckpt);
    emit.decision({
      agentId: 'orchestrator',
      type: 'checkpoint',
      text: `CHECKPOINT #${ckpt.number} — ${label}`,
    });
  };

  emit.agentStatus('orchestrator', 'WORKING');

  // ========== NODE: START ==========
  graphState = activateNode(graphState, 'START');
  emitGraph();
  updateFramework();
  emit.decision({
    agentId: 'orchestrator',
    type: 'route',
    text: `→ START — initializing state graph.`,
  });
  await wait(200);
  graphState = completeNode(graphState, 'START');

  // ========== NODE: UNDERSTAND ==========
  graphState = activateNode(graphState, 'UNDERSTAND');
  emitGraph();
  updateFramework();
  emit.decision({
    agentId: 'orchestrator',
    type: 'reason',
    text: `Goal analyzed — "${truncate(query, 90)}"`,
  });

  // Memory: load previous monitoring context
  if (memoryBoost.matched) {
    emit.memory({
      type: 'load',
      text: `Previous monitoring context loaded — reusing topics: ${memoryBoost.previousTopics.slice(0, 3).join(', ')}.`,
    });
    setContext((prev) => ({
      ...prev,
      topics: Array.from(new Set([...prev.topics, ...memoryBoost.previousTopics])),
      keywords: Array.from(new Set([...prev.keywords, ...memoryBoost.previousKeywords])),
      currentStep: 'Orchestrator loaded previous monitoring context',
    }));
    emit.decision({
      agentId: 'orchestrator',
      type: 'memory',
      text: `MEMORY MATCH — Previous AI-agent investigation found. Relevant context reused.`,
    });
  } else {
    emit.memory({
      type: 'load',
      text: 'No previous monitoring context found. Starting fresh investigation.',
    });
    setContext((prev) => ({ ...prev, currentStep: 'Orchestrator analyzing query' }));
  }
  await wait(400);

  const classification = classifyQuery(query);
  emit.decision({
    agentId: 'orchestrator',
    type: 'reason',
    text: classification.rationale,
  });
  await wait(300);
  graphState = completeNode(graphState, 'UNDERSTAND');

  // ========== NODE: PLAN ==========
  graphState = activateNode(graphState, 'PLAN');
  emitGraph();
  updateFramework();

  const plan = createDynamicPlan(query, classification, adversarial);
  graphState.plan = plan;
  emitGraph();

  emit.decision({
    agentId: 'orchestrator',
    type: 'reason',
    text: `DYNAMIC PLAN created (v${plan.planVersion}) — Goal: ${truncate(plan.goal, 60)}`,
  });
  emit.decision({
    agentId: 'orchestrator',
    type: 'reason',
    text: `Required evidence: ${plan.requiredEvidence.join('; ')}`,
  });
  emit.decision({
    agentId: 'orchestrator',
    type: 'reason',
    text: `Selected agents: ${plan.selectedAgents.join(', ') || 'none'} · Tools: ${plan.selectedTools.join(', ') || 'none'}`,
  });
  emit.decision({
    agentId: 'orchestrator',
    type: 'reason',
    text: `Execution strategy: ${plan.executionStrategy}`,
  });

  // Adaptive task decomposition
  emit.decision({
    agentId: 'orchestrator',
    type: 'reason',
    text: `ADAPTIVE TASK PLAN — ${plan.tasks.length} tasks decomposed from objective.`,
  });
  for (const task of plan.tasks) {
    emit.decision({
      agentId: 'orchestrator',
      type: 'reason',
      text: `Task: ${task.label}${task.required ? '' : ' (optional)'}${task.parallelWith ? ' [PARALLEL]' : ''}`,
    });
  }

  await wait(400);
  makeCheckpoint('PLAN', 'Planning completed', 0);
  graphState = completeNode(graphState, 'PLAN');
  updateFramework();

  // ========== ROUTING ==========
  const nextNode = nextNodeAfterPlan(classification);
  emit.decision({
    agentId: 'orchestrator',
    type: 'route',
    text: `Conditional routing → ${nextNode} (${shouldRunParallel(classification) ? 'parallel execution' : 'sequential execution'})`,
  });

  // ========== EXECUTION PHASE ==========
  let evidence: EvidenceAssessment | undefined;
  let prioritySignals: Signal[] = [];
  let intelligence: FinalIntelligence;
  let hypothesis: HypothesisState | null = null;

  // Execute the graph with potential replanning
  let maxIterations = MAX_REPLANS + 1;
  let iteration = 0;

  while (iteration < maxIterations) {
    iteration++;

    // --- Loop / deadlock detection ---
    const loopCheck = detectLoop(graphState);
    if (loopCheck.detected) {
      emit.decision({
        agentId: 'orchestrator',
        type: 'loop',
        text: `DEADLOCK DETECTED — ${loopCheck.reason}`,
      });
      updateFramework({ loopDetection: 'TRIGGERED' });

      if (graphState.replanCount >= graphState.maxReplans || graphState.stepCount >= graphState.maxSteps) {
        emit.decision({
          agentId: 'orchestrator',
          type: 'loop',
          text: 'Terminating safely with current evidence — uncertainty noted.',
        });
        break;
      }
    }

    // --- Resource check ---
    const toolBudgetRemaining = maxToolCalls - toolCallsUsed;
    if (toolBudgetRemaining <= 0) {
      emit.decision({
        agentId: 'orchestrator',
        type: 'resource',
        text: 'Tool budget exhausted. Proceeding with available evidence.',
      });
      updateFramework();
      break;
    }

    if (toolBudgetRemaining <= 2 && iteration > 1) {
      emit.decision({
        agentId: 'orchestrator',
        type: 'resource',
        text: `Tool budget nearly exhausted (${toolBudgetRemaining} remaining). Prioritizing highest-value evidence.`,
      });
    }

    // --- Execute agents ---
    if (iteration === 1) {
      if (shouldRunParallel(classification)) {
        // ========== PARALLEL EXECUTION ==========
        graphState = activateNode(graphState, 'PARALLEL_RESEARCH_NEWS');
        emitGraph();
        updateFramework();

        emit.decision({
          agentId: 'orchestrator',
          type: 'parallel',
          text: 'PARALLEL EXECUTION — Research Agent + News Agent running concurrently.',
        });
        emit.agentStatus('research', 'WORKING');
        emit.agentStatus('news', 'WORKING');
        emitGraph();
        updateFramework();

        const researchContextMsg = buildResearchContextMessage(context);

        // Run both agents in parallel using Promise.all
        const [researchResult, newsResult] = await Promise.all([
          runResearchAgent(rt, { requestCrossref: false }),
          runNewsAgent(rt),
        ]);

        toolCallsUsed = rt.toolCallsUsed();
        updateFramework();

        results.push(researchResult);
        emit.result(researchResult);
        results.push(newsResult);
        emit.result(newsResult);

        emit.decision({
          agentId: 'orchestrator',
          type: 'parallel',
          text: `PARALLEL COMPLETE — Research: ${researchResult.resultCount} signals, News: ${newsResult.resultCount} signals.`,
        });

        // Update shared context
        updateContextAfterResearch(rt, researchResult, setContext, emit);
        updateContextAfterNews(rt, newsResult, setContext, emit);

        graphState = completeNode(graphState, 'PARALLEL_RESEARCH_NEWS');
        makeCheckpoint('PARALLEL_RESEARCH_NEWS', 'Parallel research + news completed', Math.max(researchResult.confidence, newsResult.confidence));
      } else if (classification.needsResearch) {
        // ========== SEQUENTIAL: RESEARCH ==========
        graphState = activateNode(graphState, 'RESEARCH');
        emitGraph();
        updateFramework();

        emit.communication({
          from: 'orchestrator',
          to: 'research',
          message: `Investigate research evidence for: "${truncate(query, 70)}"`,
        });
        emit.decision({
          agentId: 'orchestrator',
          type: 'delegate',
          text: 'Research Agent selected — delegating research investigation.',
        });

        const research = await runResearchAgent(rt, {
          requestCrossref: classification.intent === 'mixed',
        });
        toolCallsUsed = rt.toolCallsUsed();
        updateFramework();

        results.push(research);
        emit.result(research);
        emit.communication({
          from: 'research',
          to: 'orchestrator',
          message: `Research findings returned — ${research.resultCount} signals, confidence ${research.confidence}%.`,
        });

        updateContextAfterResearch(rt, research, setContext, emit);
        graphState = completeNode(graphState, 'RESEARCH');
        makeCheckpoint('RESEARCH', 'Research completed', research.confidence);
      } else if (classification.needsNews) {
        // ========== SEQUENTIAL: NEWS ==========
        graphState = activateNode(graphState, 'NEWS');
        emitGraph();
        updateFramework();

        emit.communication({
          from: 'orchestrator',
          to: 'news',
          message: `Investigate industry & competitor developments for: "${truncate(query, 70)}"`,
        });
        emit.decision({
          agentId: 'orchestrator',
          type: 'delegate',
          text: 'News Agent selected — delegating competitor/industry investigation.',
        });

        const news = await runNewsAgent(rt);
        toolCallsUsed = rt.toolCallsUsed();
        updateFramework();

        results.push(news);
        emit.result(news);
        emit.communication({
          from: 'news',
          to: 'orchestrator',
          message: `Industry findings returned — ${news.resultCount} signals, confidence ${news.confidence}%.`,
        });

        updateContextAfterNews(rt, news, setContext, emit);
        graphState = completeNode(graphState, 'NEWS');
        makeCheckpoint('NEWS', 'News completed', news.confidence);
      }
    } else {
      // ========== REPLAN EXECUTION ==========
      emit.decision({
        agentId: 'orchestrator',
        type: 'replan',
        text: `Replan iteration ${iteration} — executing additional evidence gathering.`,
      });

      const toolBudgetRemaining = maxToolCalls - toolCallsUsed;
      if (toolBudgetRemaining <= 0) {
        emit.decision({
          agentId: 'orchestrator',
          type: 'resource',
          text: 'Tool budget exhausted during replan. Proceeding to synthesis.',
        });
        break;
      }

      // Re-execute the weakest agent
      const hasResearch = results.some((r) => r.agentId === 'research' && r.resultCount > 0);
      const hasNews = results.some((r) => r.agentId === 'news' && r.resultCount > 0);

      if (!hasResearch && classification.needsResearch) {
        graphState = activateNode(graphState, 'RESEARCH');
        emitGraph();
        updateFramework({ state: 'RECOVERING' });
        emit.decision({
          agentId: 'orchestrator',
          type: 'replan',
          text: 'Research Agent reactivated for additional evidence.',
        });
        const more = await runResearchAgent(rt, { requestCrossref: true });
        toolCallsUsed = rt.toolCallsUsed();
        updateFramework();
        results.push(more);
        emit.result(more);
        updateContextAfterResearch(rt, more, setContext, emit);
        graphState = completeNode(graphState, 'RESEARCH');
        makeCheckpoint('RESEARCH', 'Additional research completed', more.confidence);
      } else if (!hasNews && classification.needsNews) {
        graphState = activateNode(graphState, 'NEWS');
        emitGraph();
        updateFramework({ state: 'RECOVERING' });
        emit.decision({
          agentId: 'orchestrator',
          type: 'replan',
          text: 'News Agent reactivated for additional evidence.',
        });
        const more = await runNewsAgent(rt);
        toolCallsUsed = rt.toolCallsUsed();
        updateFramework();
        results.push(more);
        emit.result(more);
        updateContextAfterNews(rt, more, setContext, emit);
        graphState = completeNode(graphState, 'NEWS');
        makeCheckpoint('NEWS', 'Additional news completed', more.confidence);
      } else {
        // Both agents have some evidence — do supplementary research
        graphState = activateNode(graphState, 'RESEARCH');
        emitGraph();
        updateFramework({ state: 'RECOVERING' });
        emit.decision({
          agentId: 'orchestrator',
          type: 'replan',
          text: 'Supplementary research verification requested.',
        });
        const more = await runResearchAgent(rt, { requestCrossref: true });
        toolCallsUsed = rt.toolCallsUsed();
        updateFramework();
        results.push(more);
        emit.result(more);
        graphState = completeNode(graphState, 'RESEARCH');
        makeCheckpoint('RESEARCH', 'Supplementary research completed', more.confidence);
      }
    }

    // ========== NODE: VERIFY ==========
    graphState = activateNode(graphState, 'VERIFY');
    emitGraph();
    updateFramework();

    emit.decision({
      agentId: 'orchestrator',
      type: 'evaluate',
      text: 'Comparing evidence across agents — correlating signals.',
    });

    // Conflict detection
    const hasConflict = checkForConflicts(results, adversarial);
    if (hasConflict) {
      emit.decision({
        agentId: 'orchestrator',
        type: 'conflict',
        text: 'CONFLICT DETECTED — Research and industry evidence show divergent signals.',
      });

      // Inject simulated conflicting signals if in adversarial mode
      if (shouldSimulateConflict(adversarial)) {
        const conflictingNews = generateConflictingNewsSignals(query);
        const newsResult = results.find((r) => r.agentId === 'news');
        if (newsResult) {
          newsResult.signals.push(...conflictingNews);
          newsResult.resultCount = newsResult.signals.length;
        }
        emit.decision({
          agentId: 'orchestrator',
          type: 'conflict',
          text: '[ADVERSARIAL] Simulated conflicting industry signals injected for demonstration.',
        });
      }

      emit.decision({
        agentId: 'orchestrator',
        type: 'conflict',
        text: 'Routing to Evidence Verification — comparing sources, checking dates/relevance.',
      });
    }

    evidence = assessEvidence(results, query, profile, adversarial);
    emit.patch({ evidence });
    emit.decision({
      agentId: 'orchestrator',
      type: 'evaluate',
      text: `Evidence verdict: ${evidence.verdict} (overall confidence ${evidence.overallConfidence}%).`,
    });

    if (evidence.conflictClaims && evidence.conflictClaims.length > 0) {
      for (const cc of evidence.conflictClaims) {
        emit.decision({
          agentId: 'orchestrator',
          type: 'conflict',
          text: `Conflict: ${cc.source} — "${truncate(cc.claim, 60)}" (${cc.evidence})`,
        });
      }
      if (evidence.resolution) {
        emit.decision({
          agentId: 'orchestrator',
          type: 'conflict',
          text: `Resolution: ${evidence.resolution}`,
        });
      }
    }

    makeCheckpoint('VERIFY', 'Evidence evaluation completed', evidence.overallConfidence);
    graphState = completeNode(graphState, 'VERIFY');
    updateFramework();

    // ========== NODE: SELF_EVALUATE ==========
    graphState = activateNode(graphState, 'SELF_EVALUATE');
    emitGraph();
    updateFramework({ selfEvaluation: 'PENDING' });

    const selfEval = performSelfEvaluation(results, evidence, query, classification);
    emit.selfEvaluation(selfEval);
    emit.decision({
      agentId: 'orchestrator',
      type: 'selfeval',
      text: `SELF-EVALUATION — Goal coverage: ${selfEval.goalCoverage}, Evidence quality: ${selfEval.evidenceQuality}, Conflicts: ${selfEval.conflicts}, Confidence: ${selfEval.confidence}.`,
    });
    emit.decision({
      agentId: 'orchestrator',
      type: 'selfeval',
      text: `Decision: ${selfEval.decision.replace(/_/g, ' ')}.`,
    });

    // ========== HYPOTHESIS VERIFICATION ==========
    if (classification.intent === 'mixed' || (results.length >= 2 && evidence.verdict !== 'INSUFFICIENT')) {
      hypothesis = formHypothesis(query, results, evidence);
      emit.hypothesis(hypothesis);
      emit.decision({
        agentId: 'orchestrator',
        type: 'hypothesis',
        text: `HYPOTHESIS — "${truncate(hypothesis.text, 80)}"`,
      });
      for (const part of hypothesis.parts) {
        emit.decision({
          agentId: 'orchestrator',
          type: 'hypothesis',
          text: `  ${part.claim}: ${part.status}`,
        });
      }
      emit.decision({
        agentId: 'orchestrator',
        type: 'hypothesis',
        text: `Conclusion: ${hypothesis.conclusion.replace(/_/g, ' ')}.`,
      });
    }

    graphState = completeNode(graphState, 'SELF_EVALUATE');

    // ========== CONDITIONAL ROUTING: SYNTHESIS or REPLAN ==========
    const confLevel = confidenceLevel(evidence.overallConfidence);
    const hasUnresolvedConflicts = (evidence.conflictClaims?.length ?? 0) > 0 && evidence.verdict === 'CONFLICT';
    const needsReplan = shouldReplan(
      evidence.overallConfidence,
      hasUnresolvedConflicts,
      graphState.replanCount,
      graphState.maxReplans,
      maxToolCalls - toolCallsUsed,
    );

    if (selfEval.decision === 'PROCEED' && !needsReplan) {
      updateFramework({ selfEvaluation: 'PASSED' });
      emit.decision({
        agentId: 'orchestrator',
        type: 'route',
        text: `Conditional routing → SYNTHESIS (confidence ${confLevel}, self-evaluation passed).`,
      });
      break;
    } else if (selfEval.decision === 'TERMINATE_WITH_UNCERTAINTY' || (selfEval.decision === 'REPLAN_REQUIRED' && !needsReplan)) {
      updateFramework({ selfEvaluation: 'REPLAN_REQUIRED' });
      emit.decision({
        agentId: 'orchestrator',
        type: 'route',
        text: `Self-evaluation requires replan but resource limits reached — proceeding with uncertainty.`,
      });
      break;
    } else {
      // ========== NODE: REPLAN ==========
      graphState = activateNode(graphState, 'REPLAN');
      graphState.replanCount++;
      emitGraph();
      updateFramework({ state: 'REPLANNING', selfEvaluation: 'REPLAN_REQUIRED' });

      emit.decision({
        agentId: 'orchestrator',
        type: 'replan',
        text: `→ Initial evidence insufficient (confidence ${evidence.overallConfidence}%). Replanning investigation.`,
      });
      emit.decision({
        agentId: 'orchestrator',
        type: 'replan',
        text: 'Additional verification required.',
      });

      const revisedPlan = createRevisedPlan(plan, `confidence ${evidence.overallConfidence}%`, classification);
      graphState.plan = revisedPlan;
      emitGraph();

      emit.decision({
        agentId: 'orchestrator',
        type: 'replan',
        text: `Plan revised to v${revisedPlan.planVersion}. ${revisedPlan.tasks.length} tasks.`,
      });

      makeCheckpoint('REPLAN', `Replan #${graphState.replanCount} completed`, evidence.overallConfidence);
      graphState = completeNode(graphState, 'REPLAN');
      updateFramework();
      // Continue the while loop for re-execution
    }
  }

  // ========== NODE: SYNTHESIS ==========
  graphState = activateNode(graphState, 'SYNTHESIS');
  emitGraph();
  updateFramework({ state: 'RUNNING' });

  setContext((prev) => ({ ...prev, currentStep: 'Final intelligence synthesis' }));

  const allSignals = results.flatMap((r) => r.signals);
  prioritySignals = topSignals(allSignals, 3);
  emit.patch({ prioritySignals });
  emit.decision({
    agentId: 'orchestrator',
    type: 'synthesis',
    text: `Priority signals identified — top ${prioritySignals.length} items ranked.`,
  });
  await wait(300);

  // Use the last computed evidence, or recompute if we broke early
  if (evidence === undefined) {
    evidence = assessEvidence(results, query, profile, adversarial);
    emit.patch({ evidence });
  }

  intelligence = synthesizeIntelligence(results, evidence, prioritySignals, query, profile, context, hypothesis);
  emit.patch({ intelligence });
  emit.decision({
    agentId: 'orchestrator',
    type: 'synthesis',
    text: 'Final intelligence synthesized — actionable report ready.',
  });

  makeCheckpoint('SYNTHESIS', 'Final synthesis completed', evidence.overallConfidence);
  graphState = completeNode(graphState, 'SYNTHESIS');

  // ========== NODE: END ==========
  graphState = activateNode(graphState, 'END');
  emitGraph();
  updateFramework({ state: 'COMPLETED', selfEvaluation: 'PASSED' });

  setContext((prev) => ({
    ...prev,
    completedAgents: [...prev.completedAgents, 'orchestrator'],
    currentStep: 'Investigation complete',
  }));

  emit.agentStatus('orchestrator', 'COMPLETED');
  graphState = completeNode(graphState, 'END');
  emitGraph();

  return { results, evidence, intelligence, prioritySignals };
}

/* ---------------- Helper functions ---------------- */

function updateContextAfterResearch(
  rt: OrchestratorRuntime,
  research: AgentResult,
  setContext: OrchestratorRuntime['setContext'],
  emit: OrchestratorRuntime['emit'],
) {
  const researchTopics = extractTopicsFromSignals(research.signals);
  const researchKeywords = extractKeywordsFromSignals(research.signals);
  const researchFindings = research.signals.slice(0, 4).map((s) => s.title);

  setContext((prev) => ({
    ...prev,
    completedAgents: [...prev.completedAgents, 'research'],
    toolsUsed: Array.from(new Set([
      ...prev.toolsUsed, 'OpenAlex',
      ...(research.signals.some((s) => s.sourceType === 'Crossref') ? ['Crossref'] : []),
    ])),
    researchFindings,
    topics: Array.from(new Set([...prev.topics, ...researchTopics])),
    keywords: Array.from(new Set([...prev.keywords, ...researchKeywords])),
    importantSignals: research.signals.slice(0, 3).map((s) => s.title),
    evidenceCount: prev.evidenceCount + research.signals.length,
    currentStep: 'Research context added to shared memory',
  }));

  emit.memory({
    type: 'update',
    text: `Research context added — ${researchTopics.length} topics, ${researchKeywords.length} keywords detected.`,
  });
}

function updateContextAfterNews(
  rt: OrchestratorRuntime,
  news: AgentResult,
  setContext: OrchestratorRuntime['setContext'],
  emit: OrchestratorRuntime['emit'],
) {
  const newsTopics = extractTopicsFromSignals(news.signals);
  const newsFindings = news.signals.slice(0, 4).map((s) => s.title);

  setContext((prev) => ({
    ...prev,
    completedAgents: [...prev.completedAgents, 'news'],
    toolsUsed: Array.from(new Set([...prev.toolsUsed, 'Hacker News'])),
    newsFindings,
    topics: Array.from(new Set([...prev.topics, ...newsTopics])),
    importantSignals: Array.from(new Set([...prev.importantSignals, ...news.signals.slice(0, 3).map((s) => s.title)])),
    evidenceCount: prev.evidenceCount + news.signals.length,
    currentStep: 'News context added to shared memory',
  }));

  emit.memory({
    type: 'update',
    text: `News context added — ${newsTopics.length} industry topics detected. Shared memory updated.`,
  });
}

function checkForConflicts(
  results: AgentResult[],
  adversarial: OrchestratorRuntime['adversarial'],
): boolean {
  const research = results.find((r) => r.agentId === 'research');
  const news = results.find((r) => r.agentId === 'news');
  if (!research || !news) return false;
  if (research.resultCount === 0 || news.resultCount === 0) return false;

  if (shouldSimulateConflict(adversarial)) return true;

  // Detect divergence: research says increasing, news says limited
  const researchText = research.signals.map((s) => `${s.title} ${s.summary}`).join(' ').toLowerCase();
  const newsText = news.signals.map((s) => `${s.title} ${s.summary}`).join(' ').toLowerCase();

  const increasingCues = ['increasing', 'growing', 'accelerating', 'rising', 'expanding', 'surge'];
  const decreasingCues = ['limited', 'declining', 'slow', 'cautious', 'exploratory', 'stagnant', 'lagging'];

  const researchIncreasing = increasingCues.some((c) => researchText.includes(c));
  const newsDecreasing = decreasingCues.some((c) => newsText.includes(c));

  return researchIncreasing && newsDecreasing;
}

function assessEvidence(
  results: AgentResult[],
  query: string,
  profile: MonitoringProfile,
  adversarial: OrchestratorRuntime['adversarial'],
): EvidenceAssessment {
  const research = results.find((r) => r.agentId === 'research');
  const news = results.find((r) => r.agentId === 'news');
  const researchCount = research?.resultCount ?? 0;
  const newsCount = news?.resultCount ?? 0;

  const queryTokens = tokenize(query);
  const topicTokens = profile.researchTopics.flatMap(tokenize);
  const researchTokens = research?.signals.flatMap((s) => tokenize(s.title)) ?? [];
  const newsTokens = news?.signals.flatMap((s) => tokenize(s.title)) ?? [];

  const researchQueryOverlap = tokensOverlap(queryTokens, researchTokens).length;
  const newsQueryOverlap = tokensOverlap(queryTokens, newsTokens).length;
  const crossOverlap = tokensOverlap(researchTokens, newsTokens).length + tokensOverlap(topicTokens, newsTokens).length;

  let verdict = evidenceVerdict(researchCount, newsCount, crossOverlap);
  let researchConfidence = research?.confidence ?? 0;
  let newsConfidence = news?.confidence ?? 0;

  // Adversarial: simulate low confidence
  if (shouldSimulateLowConfidence(adversarial)) {
    researchConfidence = Math.min(researchConfidence, 30);
    newsConfidence = Math.min(newsConfidence, 25);
    verdict = 'INSUFFICIENT';
  }

  let overallConfidence = clamp(
    Math.round((researchConfidence + newsConfidence) / (results.length || 1)),
    0, 96,
  );

  if (shouldSimulateConflict(adversarial)) {
    verdict = 'CONFLICT';
    overallConfidence = Math.min(overallConfidence, 55);
  }

  let explanation = '';
  const conflictClaims: ConflictClaim[] = [];

  switch (verdict) {
    case 'CONSISTENT':
      explanation = 'Research and industry evidence support a similar trend — overlapping themes detected across academic and news sources.';
      break;
    case 'PARTIAL':
      explanation = 'Some evidence overlaps but signals differ in emphasis — research and industry are tracking related but not identical themes.';
      break;
    case 'CONFLICT':
      explanation = 'Sources show divergent signals — academic research and industry coverage emphasize different directions.';
      if (research) {
        conflictClaims.push({
          source: 'Research Agent',
          claim: 'Research activity is increasing',
          evidence: researchConfidence > 60 ? 'STRONG' : 'MODERATE',
        });
      }
      if (news) {
        conflictClaims.push({
          source: 'News Agent',
          claim: 'Industry adoption appears limited',
          evidence: newsConfidence > 50 ? 'MODERATE' : 'WEAK',
        });
      }
      break;
    case 'INSUFFICIENT':
      explanation = 'Not enough cross-source evidence to compare — one or more agents returned no usable signals.';
      break;
  }

  if (researchQueryOverlap > 0 || newsQueryOverlap > 0) {
    explanation += ` Query-to-evidence alignment: research ${researchQueryOverlap} terms, industry ${newsQueryOverlap} terms.`;
  }

  let resolution: string | undefined;
  if (verdict === 'CONFLICT') {
    if (overallConfidence >= 60) {
      resolution = 'PARTIALLY RESOLVED — Research evidence is stronger; industry evidence is moderate. Overall confidence: MEDIUM.';
    } else {
      resolution = 'UNRESOLVED — Both views preserved. Confidence reduced. Final answer will explicitly state uncertainty.';
    }
  }

  return {
    verdict,
    researchConfidence,
    newsConfidence,
    overallConfidence,
    explanation,
    conflictClaims: conflictClaims.length > 0 ? conflictClaims : undefined,
    resolution,
  };
}

function performSelfEvaluation(
  results: AgentResult[],
  evidence: EvidenceAssessment,
  query: string,
  classification: { intent: string; needsResearch: boolean; needsNews: boolean },
): SelfEvaluation {
  const totalSignals = results.reduce((sum, r) => sum + r.resultCount, 0);
  const hasResearch = results.some((r) => r.agentId === 'research' && r.resultCount > 0);
  const hasNews = results.some((r) => r.agentId === 'news' && r.resultCount > 0);

  const goalCoverage: SelfEvaluation['goalCoverage'] =
    totalSignals >= 8 ? 'HIGH' : totalSignals >= 4 ? 'MEDIUM' : 'LOW';

  const evidenceQuality: SelfEvaluation['evidenceQuality'] =
    evidence.overallConfidence >= 70 ? 'HIGH' : evidence.overallConfidence >= 45 ? 'MEDIUM' : 'LOW';

  const conflicts = evidence.conflictClaims?.length ?? 0;

  const missingEvidence: string[] = [];
  if (classification.needsResearch && !hasResearch) missingEvidence.push('Academic research data');
  if (classification.needsNews && !hasNews) missingEvidence.push('Industry/competitor signals');
  if (evidence.verdict === 'INSUFFICIENT') missingEvidence.push('Cross-source corroboration');

  const confidence: SelfEvaluation['confidence'] = confidenceLevel(evidence.overallConfidence);

  let decision: SelfEvaluation['decision'];
  if (evidence.overallConfidence >= 80 && conflicts === 0) {
    decision = 'PROCEED';
  } else if (evidence.overallConfidence < 50 || (conflicts > 0 && evidence.overallConfidence < 60)) {
    decision = 'REPLAN_REQUIRED';
  } else {
    decision = 'PROCEED';
  }

  const summary = `Goal coverage: ${goalCoverage}. Evidence quality: ${evidenceQuality}. Conflicts: ${conflicts}. Missing: ${missingEvidence.join(', ') || 'none'}. Confidence: ${confidence}.`;

  void query;
  return { goalCoverage, evidenceQuality, conflicts, missingEvidence, confidence, decision, summary };
}

function formHypothesis(
  query: string,
  results: AgentResult[],
  evidence: EvidenceAssessment,
): HypothesisState {
  const research = results.find((r) => r.agentId === 'research');
  const news = results.find((r) => r.agentId === 'news');

  const researchConf = research?.confidence ?? 0;
  const newsConf = news?.confidence ?? 0;

  const text = `Research activity in this domain is ${researchConf > 50 ? 'increasing' : 'limited'} while industry adoption is ${newsConf > 50 ? 'accelerating' : 'cautious'}.`;

  const parts: HypothesisState['parts'] = [
    {
      claim: 'Research activity is increasing',
      status: researchConf > 60 ? 'SUPPORTS' : researchConf > 30 ? 'PARTIALLY_SUPPORTS' : 'INSUFFICIENT',
    },
    {
      claim: 'Industry adoption is accelerating',
      status: newsConf > 60 ? 'SUPPORTS' : newsConf > 30 ? 'PARTIALLY_SUPPORTS' : 'INSUFFICIENT',
    },
  ];

  const supportedCount = parts.filter((p) => p.status === 'SUPPORTS').length;
  const partialCount = parts.filter((p) => p.status === 'PARTIALLY_SUPPORTS').length;

  let conclusion: HypothesisState['conclusion'];
  if (supportedCount === parts.length) conclusion = 'VERIFIED';
  else if (supportedCount + partialCount >= parts.length) conclusion = 'PARTIALLY_VERIFIED';
  else if (parts.some((p) => p.status === 'CONTRADICTS')) conclusion = 'REFUTED';
  else conclusion = 'INCONCLUSIVE';

  void query;
  void evidence;
  return { text, parts, conclusion };
}

function synthesizeIntelligence(
  results: AgentResult[],
  evidence: EvidenceAssessment,
  prioritySignals: Signal[],
  query: string,
  profile: MonitoringProfile,
  context: InvestigationContext,
  hypothesis: HypothesisState | null,
): FinalIntelligence {
  const research = results.find((r) => r.agentId === 'research');
  const news = results.find((r) => r.agentId === 'news');
  const researchSignals = research?.signals ?? [];
  const newsSignals = news?.signals ?? [];
  const competitorSignals = newsSignals.filter((s) => s.category === 'competitor');
  const industrySignals = newsSignals.filter((s) => s.category === 'industry');

  const researchCount = researchSignals.length;
  const newsCount = newsSignals.length;
  const total = researchCount + newsCount;

  let execSummary = buildExecSummary(query, profile, evidence, researchCount, newsCount, total, context);

  // Add hypothesis conclusion to summary
  if (hypothesis) {
    execSummary += ` Hypothesis: ${hypothesis.conclusion.replace(/_/g, ' ').toLowerCase()}.`;
  }

  // Add uncertainty note for conflicts
  if (evidence.verdict === 'CONFLICT' && evidence.resolution) {
    execSummary += ` ${evidence.resolution}`;
  }

  const keySignals = prioritySignals.map((s) => `${s.priority} · ${s.title} (${s.sourceType})`);
  const researchTrends = buildResearchTrends(researchSignals);
  const competitorActivity = buildCompetitorActivity(competitorSignals, industrySignals, profile);
  const whyItMatters = buildWhyItMatters(profile, evidence, total);
  const recommendedActions = buildRecommendations(evidence, prioritySignals, profile, researchCount, newsCount);
  const sources = dedupeSources([...researchSignals.slice(0, 8), ...newsSignals.slice(0, 8)]);

  return {
    executiveSummary: execSummary,
    keySignals,
    researchTrends,
    competitorActivity,
    evidenceAnalysis: evidence.explanation + (evidence.resolution ? ` ${evidence.resolution}` : ''),
    whyItMatters,
    recommendedActions,
    sources,
  };
}

function buildExecSummary(
  query: string,
  profile: MonitoringProfile,
  evidence: EvidenceAssessment,
  researchCount: number,
  newsCount: number,
  total: number,
  context: InvestigationContext,
): string {
  const parts: string[] = [];
  parts.push(
    `Intelligence scan for "${truncate(query, 80)}" gathered ${total} signals ` +
      `(${researchCount} research, ${newsCount} industry) relevant to ${profile.organization}.`,
  );
  if (evidence.verdict === 'CONSISTENT') {
    parts.push('Academic and industry sources converge on the same themes — a strong, corroborated signal.');
  } else if (evidence.verdict === 'PARTIAL') {
    parts.push('Sources partially overlap; research and industry emphasize related but distinct angles.');
  } else if (evidence.verdict === 'CONFLICT') {
    parts.push('Academic research and industry coverage point in different directions — treat with caution.');
  } else {
    parts.push('Evidence is insufficient for a full comparison — some sources returned no usable signals.');
  }
  if (researchCount === 0) parts.push('Research evidence was unavailable; conclusions lean on industry signals.');
  if (newsCount === 0) parts.push('Industry evidence was unavailable; conclusions lean on academic signals.');

  if (context.researchFindings.length > 0 && context.newsFindings.length > 0) {
    parts.push(`Cross-step context: research identified ${context.topics.length} topics that were passed to the News Agent for industry correlation.`);
  }
  return parts.join(' ');
}

function buildResearchTrends(signals: Signal[]): string[] {
  if (signals.length === 0) return ['No research trends available — research sources returned no signals.'];
  const top = topSignals(signals, 5);
  return top.map((s) => `${s.title} — ${s.source} (${s.date || 'undated'}). Relevance ${s.relevance}%.`);
}

function buildCompetitorActivity(
  competitorSignals: Signal[],
  industrySignals: Signal[],
  profile: MonitoringProfile,
): string[] {
  if (competitorSignals.length === 0 && industrySignals.length === 0) {
    return ['No competitor or industry activity available — Hacker News returned no matching signals.'];
  }
  const out: string[] = [];
  const mentioned = new Set<string>();
  for (const s of [...competitorSignals, ...industrySignals].slice(0, 6)) {
    const matched = profile.competitors.find((c) =>
      `${s.title} ${s.summary}`.toLowerCase().includes(c.toLowerCase()),
    );
    if (matched) mentioned.add(matched);
    out.push(`${s.title} — ${s.source} (${s.date || 'recent'}).`);
  }
  if (mentioned.size > 0) {
    out.push(`Competitors mentioned: ${Array.from(mentioned).join(', ')}.`);
  }
  return out;
}

function buildWhyItMatters(
  profile: MonitoringProfile,
  evidence: EvidenceAssessment,
  total: number,
): string {
  if (total === 0) {
    return `No actionable intelligence could be gathered for ${profile.organization} from the available sources. Recommend retrying the scan or broadening the query.`;
  }
  const confidenceWord =
    evidence.overallConfidence >= 70 ? 'high' : evidence.overallConfidence >= 45 ? 'moderate' : 'limited';
  return (
    `For ${profile.organization}, these signals indicate ${confidenceWord} evidence confidence ` +
      `(${evidence.overallConfidence}%) around the monitored topics. ` +
      `${evidence.verdict === 'CONSISTENT' ? 'Corroborated trends suggest a window for proactive positioning.' : evidence.verdict === 'PARTIAL' ? 'Partial alignment suggests monitoring both fronts before committing.' : evidence.verdict === 'CONFLICT' ? 'Divergent signals suggest caution and deeper validation before acting.' : 'Insufficient cross-source evidence — gather more data before strategic moves.'}`
  );
}

function buildRecommendations(
  evidence: EvidenceAssessment,
  prioritySignals: Signal[],
  profile: MonitoringProfile,
  researchCount: number,
  newsCount: number,
): string[] {
  const recs: string[] = [];
  const top = prioritySignals[0];
  if (top) {
    recs.push(`Prioritize deep review of "${truncate(top.title, 60)}" — it is the highest-ranked signal (${top.priority}).`);
  }
  if (evidence.verdict === 'CONSISTENT') {
    recs.push(`Move quickly on ${profile.organization}'s aligned research area — corroborated trends favor early positioning.`);
  } else if (evidence.verdict === 'CONFLICT') {
    recs.push('Run a focused follow-up scan to resolve divergent signals before committing resources.');
  } else if (evidence.verdict === 'PARTIAL') {
    recs.push('Monitor both research and industry fronts; schedule a re-scan in 7 days to track convergence.');
  } else {
    recs.push('Expand the monitoring profile keywords and re-run the scan to close the evidence gap.');
  }
  if (researchCount > 0 && newsCount > 0) {
    recs.push('Share the synthesized intelligence with the strategy team and brief on the top 3 priority signals.');
  } else if (researchCount === 0) {
    recs.push('Supplement with direct academic database checks — research sources were unavailable this cycle.');
  } else if (newsCount === 0) {
    recs.push('Supplement with direct industry news checks — Hacker News returned no relevant stories this cycle.');
  }
  return recs.slice(0, 4);
}

function dedupeSources(signals: Signal[]): { label: string; url: string }[] {
  const seen = new Set<string>();
  const out: { label: string; url: string }[] = [];
  for (const s of signals) {
    if (!s.url || seen.has(s.url) || s.url.startsWith('#')) continue;
    seen.add(s.url);
    out.push({ label: `${truncate(s.title, 60)} · ${s.sourceType}`, url: s.url });
  }
  return out.slice(0, 12);
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
