export type AgentId = 'orchestrator' | 'research' | 'news';

export type AgentStatus = 'IDLE' | 'WORKING' | 'COMPLETED' | 'ERROR';

export type ToolName = 'OpenAlex' | 'Crossref' | 'Hacker News';

export type ToolStatus = 'CALLING' | 'SUCCESS' | 'NO RESULTS' | 'ERROR' | 'UNAVAILABLE';

export type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type SignalCategory = 'research' | 'competitor' | 'industry';

export type EvidenceVerdict = 'CONSISTENT' | 'PARTIAL' | 'CONFLICT' | 'INSUFFICIENT';

export interface MonitoringProfile {
  organization: string;
  competitors: string[];
  researchTopics: string[];
  keywords: string[];
}

export interface Signal {
  id: string;
  title: string;
  summary: string;
  category: SignalCategory;
  source: string;
  sourceType: 'OpenAlex' | 'Crossref' | 'Hacker News';
  date: string;
  relevance: number;
  priority: Priority;
  url: string;
  by?: string;
}

export interface AgentResult {
  agentId: AgentId;
  signals: Signal[];
  confidence: number;
  resultCount: number;
  note?: string;
}

export type DecisionType = 'reason' | 'delegate' | 'tool' | 'observe' | 'evaluate' | 'synthesis' | 'route' | 'checkpoint' | 'replan' | 'conflict' | 'hypothesis' | 'selfeval' | 'resource' | 'loop' | 'parallel' | 'fallback' | 'memory';

export interface DecisionEvent {
  id: string;
  step: number;
  text: string;
  agentId: AgentId;
  type: DecisionType;
}

export interface CommunicationEvent {
  id: string;
  from: AgentId;
  to: AgentId;
  message: string;
  timestamp: number;
}

export interface ToolActivity {
  id: string;
  tool: ToolName;
  agentId: AgentId;
  status: ToolStatus;
  query: string;
  results: number;
  detail?: string;
}

export interface EvidenceAssessment {
  verdict: EvidenceVerdict;
  researchConfidence: number;
  newsConfidence: number;
  overallConfidence: number;
  explanation: string;
  conflictClaims?: ConflictClaim[];
  resolution?: string;
}

export interface FinalIntelligence {
  executiveSummary: string;
  keySignals: string[];
  researchTrends: string[];
  competitorActivity: string[];
  evidenceAnalysis: string;
  whyItMatters: string;
  recommendedActions: string[];
  sources: { label: string; url: string }[];
}

export interface ScanState {
  status: 'idle' | 'running' | 'done' | 'error';
  query: string;
  startedAt?: number;
  finishedAt?: number;
  agentStatuses: Record<AgentId, AgentStatus>;
  decisions: DecisionEvent[];
  communications: CommunicationEvent[];
  tools: ToolActivity[];
  results: AgentResult[];
  evidence?: EvidenceAssessment;
  prioritySignals: Signal[];
  intelligence?: FinalIntelligence;
  error?: string;
  memoryEvents: MemoryEvent[];
  investigationContext?: InvestigationContext;
  memoryBoost?: MemoryBoostInfo;
  graphState?: GraphState;
  checkpoints?: Checkpoint[];
  frameworkStatus?: FrameworkStatus;
  adversarial?: AdversarialConfig;
  hypothesis?: HypothesisState;
  selfEvaluation?: SelfEvaluation;
}

export interface MemoryBoostInfo {
  matched: boolean;
  message: string;
  previousTopics: string[];
  previousKeywords: string[];
  previousQuery?: string;
}

export interface ScanRunInput {
  query: string;
  profile: MonitoringProfile;
}

/* ---------------- Context & Memory Management ---------------- */

export interface InvestigationContext {
  userQuery: string;
  organization: string;
  competitors: string[];
  topics: string[];
  keywords: string[];
  completedAgents: AgentId[];
  toolsUsed: string[];
  researchFindings: string[];
  newsFindings: string[];
  importantSignals: string[];
  evidenceCount: number;
  currentStep: string;
}

export interface MemoryEvent {
  id: string;
  step: number;
  text: string;
  type: 'load' | 'update' | 'boost' | 'persist';
}

export interface ScanSummary {
  query: string;
  timestamp: number;
  signalCount: number;
  verdict: EvidenceVerdict | 'PENDING';
  topTopics: string[];
}

export interface LongTermMemory {
  organization: string;
  competitors: string[];
  researchTopics: string[];
  keywords: string[];
  recentQueries: string[];
  lastScan?: ScanSummary;
  frequentTopics: string[];
}

/* ---------------- Agent Framework: State Graph ---------------- */

export type GraphNodeId =
  | 'START'
  | 'UNDERSTAND'
  | 'PLAN'
  | 'RESEARCH'
  | 'NEWS'
  | 'PARALLEL_RESEARCH_NEWS'
  | 'VERIFY'
  | 'SELF_EVALUATE'
  | 'REPLAN'
  | 'SYNTHESIS'
  | 'END';

export type GraphNodeStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'SKIPPED' | 'FAILED';

export interface GraphNode {
  id: GraphNodeId;
  label: string;
  status: GraphNodeStatus;
  activatedAt?: number;
  completedAt?: number;
  description?: string;
}

export interface GraphEdge {
  from: GraphNodeId;
  to: GraphNodeId;
  label: string;
  condition: string;
}

export interface PlanTask {
  id: string;
  label: string;
  agent: AgentId | 'orchestrator';
  tool?: ToolName;
  parallelWith?: string[];
  required: boolean;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'SKIPPED' | 'FAILED';
}

export interface DynamicPlan {
  goal: string;
  requiredEvidence: string[];
  selectedAgents: AgentId[];
  selectedTools: ToolName[];
  executionStrategy: string;
  tasks: PlanTask[];
  planVersion: number;
}

export interface GraphState {
  nodes: GraphNode[];
  edges: GraphEdge[];
  currentNode: GraphNodeId;
  visitedNodes: GraphNodeId[];
  plan: DynamicPlan | null;
  replanCount: number;
  maxReplans: number;
  maxSteps: number;
  stepCount: number;
}

export interface Checkpoint {
  id: string;
  number: number;
  node: GraphNodeId;
  label: string;
  timestamp: number;
  stateSnapshot: {
    completedNodes: GraphNodeId[];
    resultsCount: number;
    evidenceCount: number;
    confidence: number;
    planVersion: number;
  };
}

export interface FrameworkStatus {
  frameworkName: string;
  state: 'IDLE' | 'RUNNING' | 'COMPLETED' | 'RECOVERING' | 'REPLANNING' | 'ERROR';
  currentNode: GraphNodeId;
  checkpointNumber: number;
  toolBudget: number;
  toolCallsUsed: number;
  maxToolCalls: number;
  retries: number;
  maxRetriesPerTool: number;
  replans: number;
  maxReplans: number;
  loopDetection: 'ACTIVE' | 'TRIGGERED' | 'CLEARED';
  selfEvaluation: 'PENDING' | 'PASSED' | 'REPLAN_REQUIRED' | 'SKIPPED';
  agentSteps: number;
  maxAgentSteps: number;
  restored: boolean;
}

export interface ConflictClaim {
  source: string;
  claim: string;
  evidence: 'STRONG' | 'MODERATE' | 'WEAK';
}

export interface HypothesisState {
  text: string;
  parts: { claim: string; status: 'UNVERIFIED' | 'SUPPORTS' | 'PARTIALLY_SUPPORTS' | 'CONTRADICTS' | 'INSUFFICIENT' }[];
  conclusion: 'VERIFIED' | 'PARTIALLY_VERIFIED' | 'REFUTED' | 'INCONCLUSIVE';
}

export interface SelfEvaluation {
  goalCoverage: 'HIGH' | 'MEDIUM' | 'LOW';
  evidenceQuality: 'HIGH' | 'MEDIUM' | 'LOW';
  conflicts: number;
  missingEvidence: string[];
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  decision: 'PROCEED' | 'REPLAN_REQUIRED' | 'TERMINATE_WITH_UNCERTAINTY';
  summary: string;
}

export interface AdversarialConfig {
  enabled: boolean;
  mode: 'live' | 'adversarial';
  simulateOpenAlexFailure: boolean;
  simulateNewsFailure: boolean;
  simulateConflictingEvidence: boolean;
  simulateLowConfidence: boolean;
  simulateResourceConstraint: boolean;
  maxToolCallsOverride: number | null;
}

export const DEFAULT_ADVERSARIAL: AdversarialConfig = {
  enabled: false,
  mode: 'live',
  simulateOpenAlexFailure: false,
  simulateNewsFailure: false,
  simulateConflictingEvidence: false,
  simulateLowConfidence: false,
  simulateResourceConstraint: false,
  maxToolCallsOverride: null,
};

/* ---------------- Challenge 7: Observability & Tracing ---------------- */

export type TraceSpanKind = 'run' | 'agent' | 'decision' | 'tool' | 'tool_result' | 'error' | 'recovery' | 'fallback';

export interface TraceSpan {
  id: string;
  traceId: string;
  parentId: string | null;
  kind: TraceSpanKind;
  name: string;
  agentId: AgentId | 'system';
  startedAt: number;
  endedAt: number | null;
  durationMs: number | null;
  status: 'ok' | 'error' | 'pending';
  attributes: Record<string, string | number | boolean | null>;
  events: { timestamp: number; text: string }[];
}

export interface TraceRun {
  id: string;
  query: string;
  startedAt: number;
  endedAt: number | null;
  durationMs: number | null;
  status: 'running' | 'completed' | 'error';
  agentCount: number;
  toolCallCount: number;
  errorCount: number;
  retryCount: number;
  fallbackCount: number;
  recoveryCount: number;
  signalCount: number;
  confidence: number;
  verdict: EvidenceVerdict | 'PENDING';
  diagnosis: string | null;
  isControlledFailure: boolean;
  recoverySucceeded: boolean;
  spans: TraceSpan[];
}

export interface BeforeAfterComparison {
  beforeRun: TraceRun | null;
  afterRun: TraceRun | null;
  metrics: {
    successRate: { before: boolean; after: boolean };
    latencyMs: { before: number | null; after: number | null };
    toolCalls: { before: number; after: number };
    errors: { before: number; after: number };
    recoveryRate: { before: number; after: number };
  };
  diagnosis: string | null;
  recoverySummary: string | null;
}

export interface ObservabilityState {
  status: 'idle' | 'running' | 'done' | 'error';
  currentRunId: string | null;
  runs: TraceRun[];
  comparison: BeforeAfterComparison | null;
  diagnosis: string | null;
  isControlledFailureTest: boolean;
  error: string | null;
}

/* ---------------- Challenge 6: Evaluation ---------------- */

export type EvaluationScenarioId =
  | 'normal'
  | 'ambiguous'
  | 'adversarial'
  | 'contradictory'
  | 'incomplete'
  | 'tool_failure'
  | 'repeated'
  | 'baseline';

export type EvaluationStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';

export interface EvaluationScenario {
  id: EvaluationScenarioId;
  label: string;
  description: string;
  query: string;
  adversarialOverrides: Partial<AdversarialConfig>;
  expectedOutcome: string;
  expectedVerdict: EvidenceVerdict | 'ANY';
  expectedMinConfidence: number;
  expectRecovery: boolean;
  expectUncertainty: boolean;
  repeatCount: number;
}

export interface EvaluationTestRecord {
  id: string;
  scenarioId: EvaluationScenarioId;
  scenarioLabel: string;
  runIndex: number;
  input: string;
  expectedOutcome: string;
  actualOutcome: string;
  evidenceUsed: string[];
  confidence: number;
  verdict: EvidenceVerdict | 'PENDING';
  recoveryStatus: 'not_required' | 'recovered' | 'failed' | 'partial';
  latencyMs: number;
  toolCalls: number;
  toolCallSummary: { tool: string; status: ToolStatus; results: number }[];
  passFail: 'PASS' | 'FAIL';
  failureReason?: string;
  uncertaintyHandled: boolean;
  hallucinationDetected: boolean;
  signalCount: number;
  agentSteps: number;
  replanCount: number;
}

export interface EvaluationMetricScore {
  label: string;
  value: number;
  max: number;
  unit: string;
  description: string;
}

export interface EvaluationSummary {
  totalTests: number;
  passed: number;
  failed: number;
  passRate: number;
  metrics: EvaluationMetricScore[];
  scenarioResults: { scenarioId: EvaluationScenarioId; label: string; passed: number; total: number; passRate: number }[];
  consistencyScores: { scenarioId: EvaluationScenarioId; label: string; consistency: number }[];
  avgLatencyMs: number;
  avgToolCalls: number;
  uncertaintyRewardScore: number;
  hallucinationPenaltyScore: number;
  overallScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export interface EvaluationState {
  status: 'idle' | 'running' | 'done';
  currentScenarioIndex: number;
  currentRunIndex: number;
  tests: EvaluationTestRecord[];
  summary: EvaluationSummary | null;
  startedAt?: number;
  finishedAt?: number;
}
