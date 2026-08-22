import type {
  AgentId,
  AgentResult,
  AdversarialConfig,
  CommunicationEvent,
  DecisionEvent,
  InvestigationContext,
  MemoryEvent,
  MonitoringProfile,
  ScanState,
  ToolActivity,
  ToolStatus,
  Checkpoint,
  GraphState,
  FrameworkStatus,
  HypothesisState,
  SelfEvaluation,
} from '@/types';
import { uid } from './utils';

export interface RuntimeEmit {
  decision: (e: Omit<DecisionEvent, 'id' | 'step'>) => void;
  communication: (e: Omit<CommunicationEvent, 'id' | 'timestamp'>) => void;
  tool: (e: Omit<ToolActivity, 'id'>) => string;
  toolUpdate: (id: string, patch: Partial<ToolActivity>) => void;
  agentStatus: (agentId: AgentId, status: ScanState['agentStatuses'][AgentId]) => void;
  result: (r: AgentResult) => void;
  patch: (patch: Partial<ScanState>) => void;
  memory: (e: Omit<MemoryEvent, 'id' | 'step'>) => void;
  context: (ctx: InvestigationContext) => void;
  checkpoint: (c: Checkpoint) => void;
  graphState: (g: GraphState) => void;
  frameworkStatus: (f: FrameworkStatus) => void;
  hypothesis: (h: HypothesisState) => void;
  selfEvaluation: (s: SelfEvaluation) => void;
}

export interface RuntimeHooks {
  onDecision: (e: DecisionEvent) => void;
  onCommunication: (e: CommunicationEvent) => void;
  onTool: (e: ToolActivity) => void;
  onToolUpdate: (id: string, patch: Partial<ToolActivity>) => void;
  onAgentStatus: (agentId: AgentId, status: ScanState['agentStatuses'][AgentId]) => void;
  onResult: (r: AgentResult) => void;
  onPatch: (patch: Partial<ScanState>) => void;
  onMemory: (e: MemoryEvent) => void;
  onContext: (ctx: InvestigationContext) => void;
  onCheckpoint: (c: Checkpoint) => void;
  onGraphState: (g: GraphState) => void;
  onFrameworkStatus: (f: FrameworkStatus) => void;
  onHypothesis: (h: HypothesisState) => void;
  onSelfEvaluation: (s: SelfEvaluation) => void;
}

export function createEmitter(hooks: RuntimeHooks, getStep: () => number): RuntimeEmit {
  return {
    decision: (e) => hooks.onDecision({ ...e, id: uid('dec'), step: getStep() }),
    communication: (e) =>
      hooks.onCommunication({ ...e, id: uid('com'), timestamp: Date.now() }),
    tool: (e) => {
      const id = uid('tool');
      hooks.onTool({ ...e, id });
      return id;
    },
    toolUpdate: (id, patch) => hooks.onToolUpdate(id, patch),
    agentStatus: (agentId, status) => hooks.onAgentStatus(agentId, status),
    result: (r) => hooks.onResult(r),
    patch: (p) => hooks.onPatch(p),
    memory: (e) => hooks.onMemory({ ...e, id: uid('mem'), step: getStep() }),
    context: (ctx) => hooks.onContext(ctx),
    checkpoint: (c) => hooks.onCheckpoint(c),
    graphState: (g) => hooks.onGraphState(g),
    frameworkStatus: (f) => hooks.onFrameworkStatus(f),
    hypothesis: (h) => hooks.onHypothesis(h),
    selfEvaluation: (s) => hooks.onSelfEvaluation(s),
  };
}

export interface AgentRuntime {
  emit: RuntimeEmit;
  profile: MonitoringProfile;
  query: string;
  context: InvestigationContext;
  setContext: (updater: (prev: InvestigationContext) => InvestigationContext) => void;
  adversarial?: AdversarialConfig;
  toolCallsUsed: () => number;
  maxToolCalls: number;
  incrementToolCall: () => void;
}

export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function makeToolId(): string {
  return uid('tool');
}

export function statusLabel(s: ToolStatus): string {
  return s;
}
