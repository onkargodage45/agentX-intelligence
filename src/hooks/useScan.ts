import { useCallback, useRef, useState } from 'react';
import type {
  AgentId,
  AgentResult,
  AdversarialConfig,
  Checkpoint,
  CommunicationEvent,
  DecisionEvent,
  FrameworkStatus,
  GraphState,
  HypothesisState,
  InvestigationContext,
  MemoryEvent,
  MonitoringProfile,
  ScanState,
  SelfEvaluation,
  ToolActivity,
} from '@/types';
import { DEFAULT_ADVERSARIAL } from '@/types';
import { createEmitter, type RuntimeHooks } from '@/lib/runtime';
import { runOrchestrator } from '@/lib/orchestrator';
import {
  createInitialContext,
  detectMemoryBoost,
  loadLongTermMemory,
  addRecentQuery,
  updateFrequentTopics,
  buildScanSummary,
  saveLongTermMemory,
} from '@/lib/memory';
import {
  createInitialGraphState,
  MAX_TOOL_CALLS,
} from '@/lib/graph';

const IDLE_STATUSES: ScanState['agentStatuses'] = {
  orchestrator: 'IDLE',
  research: 'IDLE',
  news: 'IDLE',
};

const INITIAL: ScanState = {
  status: 'idle',
  query: '',
  agentStatuses: { ...IDLE_STATUSES },
  decisions: [],
  communications: [],
  tools: [],
  results: [],
  prioritySignals: [],
  memoryEvents: [],
  graphState: createInitialGraphState(),
  checkpoints: [],
  adversarial: DEFAULT_ADVERSARIAL,
};

export function useScan() {
  const [scan, setScan] = useState<ScanState>(INITIAL);
  const [adversarial, setAdversarial] = useState<AdversarialConfig>(DEFAULT_ADVERSARIAL);
  const stepRef = useRef(0);
  const contextRef = useRef<InvestigationContext | null>(null);
  const graphStateRef = useRef<GraphState>(createInitialGraphState());
  const checkpointsRef = useRef<Checkpoint[]>([]);
  const frameworkStatusRef = useRef<FrameworkStatus>({
    frameworkName: 'AgentX State Graph',
    state: 'IDLE',
    currentNode: 'START',
    checkpointNumber: 0,
    toolBudget: MAX_TOOL_CALLS,
    toolCallsUsed: 0,
    maxToolCalls: MAX_TOOL_CALLS,
    retries: 0,
    maxRetriesPerTool: 2,
    replans: 0,
    maxReplans: 3,
    loopDetection: 'ACTIVE',
    selfEvaluation: 'PENDING',
    agentSteps: 0,
    maxAgentSteps: 12,
    restored: false,
  });
  const toolCallsRef = useRef(0);

  const reset = useCallback(() => {
    stepRef.current = 0;
    contextRef.current = null;
    graphStateRef.current = createInitialGraphState();
    checkpointsRef.current = [];
    frameworkStatusRef.current = frameworkStatusRef.current;
    toolCallsRef.current = 0;
    setScan({
      ...INITIAL,
      agentStatuses: { ...IDLE_STATUSES },
      graphState: createInitialGraphState(),
      checkpoints: [],
      adversarial,
    });
  }, [adversarial]);

  const run = useCallback(async (query: string, profile: MonitoringProfile) => {
    stepRef.current = 0;
    toolCallsRef.current = 0;

    const longTerm = loadLongTermMemory();
    const boost = detectMemoryBoost(query, longTerm);

    const ctx = createInitialContext(query, profile);
    contextRef.current = ctx;
    graphStateRef.current = createInitialGraphState();
    checkpointsRef.current = [];

    const maxToolCalls = adversarial.simulateResourceConstraint && adversarial.maxToolCallsOverride
      ? adversarial.maxToolCallsOverride
      : MAX_TOOL_CALLS;

    setScan({
      ...INITIAL,
      agentStatuses: { ...IDLE_STATUSES },
      status: 'running',
      query,
      startedAt: Date.now(),
      memoryEvents: [],
      investigationContext: ctx,
      memoryBoost: boost,
      graphState: createInitialGraphState(),
      checkpoints: [],
      adversarial,
    });

    const hooks: RuntimeHooks = {
      onDecision: (e: DecisionEvent) =>
        setScan((s) => ({ ...s, decisions: [...s.decisions, e] })),
      onCommunication: (e: CommunicationEvent) =>
        setScan((s) => ({ ...s, communications: [...s.communications, e] })),
      onTool: (e: ToolActivity) =>
        setScan((s) => ({ ...s, tools: [...s.tools, e] })),
      onToolUpdate: (id, patch) =>
        setScan((s) => ({
          ...s,
          tools: s.tools.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        })),
      onAgentStatus: (agentId: AgentId, status) =>
        setScan((s) => ({
          ...s,
          agentStatuses: { ...s.agentStatuses, [agentId]: status },
        })),
      onResult: (r: AgentResult) =>
        setScan((s) => ({ ...s, results: [...s.results, r] })),
      onPatch: (patch) => setScan((s) => ({ ...s, ...patch })),
      onMemory: (e: MemoryEvent) =>
        setScan((s) => ({ ...s, memoryEvents: [...s.memoryEvents, e] })),
      onContext: (updatedCtx: InvestigationContext) => {
        contextRef.current = updatedCtx;
        setScan((s) => ({ ...s, investigationContext: updatedCtx }));
      },
      onCheckpoint: (c: Checkpoint) => {
        checkpointsRef.current = [...checkpointsRef.current, c];
        setScan((s) => ({ ...s, checkpoints: [...(s.checkpoints ?? []), c] }));
      },
      onGraphState: (g: GraphState) => {
        graphStateRef.current = g;
        setScan((s) => ({ ...s, graphState: g }));
      },
      onFrameworkStatus: (f: FrameworkStatus) => {
        frameworkStatusRef.current = f;
        setScan((s) => ({ ...s, frameworkStatus: f }));
      },
      onHypothesis: (h: HypothesisState) => {
        setScan((s) => ({ ...s, hypothesis: h }));
      },
      onSelfEvaluation: (se: SelfEvaluation) => {
        setScan((s) => ({ ...s, selfEvaluation: se }));
      },
    };

    const emit = createEmitter(hooks, () => ++stepRef.current);

    if (boost.matched) {
      emit.memory({
        type: 'boost',
        text: `Memory Boost: ${boost.message}`,
      });
    }

    try {
      const { results, evidence, intelligence, prioritySignals } = await runOrchestrator({
        emit,
        profile,
        query,
        context: ctx,
        setContext: (updater) => {
          const next = updater(contextRef.current ?? ctx);
          contextRef.current = next;
          emit.context(next);
        },
        memoryBoost: boost,
        adversarial,
        maxToolCalls,
        toolCallsUsed: () => toolCallsRef.current,
        incrementToolCall: () => { toolCallsRef.current++; },
        graphStateRef,
        checkpointsRef,
        frameworkStatusRef,
        retriesRef: { current: 0 },
      });

      const allSignals = results.flatMap((r) => r.signals);
      const detectedTopics = ctx.topics;
      const newSummary = buildScanSummary(query, allSignals, evidence.verdict, detectedTopics);

      const updatedMemory = {
        organization: profile.organization,
        competitors: profile.competitors,
        researchTopics: profile.researchTopics,
        keywords: profile.keywords,
        recentQueries: addRecentQuery(query, longTerm?.recentQueries ?? []),
        lastScan: newSummary,
        frequentTopics: updateFrequentTopics(detectedTopics, longTerm?.frequentTopics ?? []),
      };
      saveLongTermMemory(updatedMemory);

      emit.memory({
        type: 'persist',
        text: 'Long-term monitoring memory updated.',
      });

      setScan((s) => ({
        ...s,
        status: 'done',
        results,
        evidence,
        intelligence,
        prioritySignals,
        finishedAt: Date.now(),
      }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Scan failed unexpectedly.';
      setScan((s) => ({
        ...s,
        status: 'error',
        error: msg,
        finishedAt: Date.now(),
        agentStatuses: {
          orchestrator: 'ERROR',
          research: s.agentStatuses.research === 'WORKING' ? 'ERROR' : s.agentStatuses.research,
          news: s.agentStatuses.news === 'WORKING' ? 'ERROR' : s.agentStatuses.news,
        },
      }));
    }
  }, [adversarial]);

  const updateAdversarial = useCallback((config: Partial<AdversarialConfig>) => {
    setAdversarial((prev) => ({ ...prev, ...config }));
    setScan((s) => ({ ...s, adversarial: { ...s.adversarial!, ...config } }));
  }, []);

  return { scan, run, reset, adversarial, updateAdversarial };
}
