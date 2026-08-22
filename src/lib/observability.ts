import type {
  AdversarialConfig,
  AgentId,
  AgentResult,
  BeforeAfterComparison,
  CommunicationEvent,
  DecisionEvent,
  EvidenceAssessment,
  EvidenceVerdict,
  MonitoringProfile,
  ScanState,
  ToolActivity,
  TraceRun,
  TraceSpan,
  TraceSpanKind,
} from '@/types';
import { createEmitter, type RuntimeHooks } from './runtime';
import { runOrchestrator } from './orchestrator';
import {
  createInitialContext,
  detectMemoryBoost,
  loadLongTermMemory,
  addRecentQuery,
  updateFrequentTopics,
  buildScanSummary,
  saveLongTermMemory,
} from './memory';
import { createInitialGraphState, MAX_TOOL_CALLS } from './graph';
import type { Checkpoint, FrameworkStatus, GraphState, HypothesisState, InvestigationContext, SelfEvaluation } from '@/types';
import { uid, wait } from './utils';

const STORAGE_KEY = 'agentx.observability.runs';
const MAX_STORED_RUNS = 20;

export function loadStoredRuns(): TraceRun[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TraceRun[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredRuns(runs: TraceRun[]): void {
  try {
    const trimmed = runs.slice(0, MAX_STORED_RUNS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    /* storage full or unavailable — non-critical */
  }
}

export interface TraceRecorder {
  traceId: string;
  spans: TraceSpan[];
  recordSpan(span: Omit<TraceSpan, 'id' | 'traceId'>): string;
  endSpan(spanId: string, status: 'ok' | 'error', attributes?: Record<string, string | number | boolean | null>): void;
  addEvent(spanId: string, text: string): void;
  buildRun(query: string, isControlledFailure: boolean): TraceRun;
}

export function createTraceRecorder(traceId: string): TraceRecorder {
  const spans: TraceSpan[] = [];

  const recordSpan = (span: Omit<TraceSpan, 'id' | 'traceId'>): string => {
    const id = uid('span');
    spans.push({ ...span, id, traceId });
    return id;
  };

  const endSpan = (
    spanId: string,
    status: 'ok' | 'error',
    attributes?: Record<string, string | number | boolean | null>,
  ) => {
    const span = spans.find((s) => s.id === spanId);
    if (!span) return;
    span.endedAt = Date.now();
    span.durationMs = span.endedAt - span.startedAt;
    span.status = status;
    if (attributes) {
      span.attributes = { ...span.attributes, ...attributes };
    }
  };

  const addEvent = (spanId: string, text: string) => {
    const span = spans.find((s) => s.id === spanId);
    if (!span) return;
    span.events.push({ timestamp: Date.now(), text });
  };

  const buildRun = (query: string, isControlledFailure: boolean): TraceRun => {
    const now = Date.now();
    const rootSpan = spans.find((s) => s.kind === 'run');
    const startedAt = rootSpan?.startedAt ?? now;
    const endedAt = rootSpan?.endedAt ?? now;

    const toolSpans = spans.filter((s) => s.kind === 'tool' || s.kind === 'tool_result');
    const errorSpans = spans.filter((s) => s.kind === 'error' || s.status === 'error');
    const retrySpans = spans.filter((s) => s.attributes?.retry != null);
    const fallbackSpans = spans.filter((s) => s.kind === 'fallback');
    const recoverySpans = spans.filter((s) => s.kind === 'recovery' && s.status === 'ok');
    const agentSpans = spans.filter((s) => s.kind === 'agent');

    const toolCallCount = toolSpans.filter((s) => s.kind === 'tool').length;
    const errorCount = errorSpans.length;
    const retryCount = retrySpans.length;
    const fallbackCount = fallbackSpans.length;
    const recoveryCount = recoverySpans.length;

    return {
      id: traceId,
      query,
      startedAt,
      endedAt,
      durationMs: endedAt - startedAt,
      status: 'completed',
      agentCount: agentSpans.length,
      toolCallCount,
      errorCount,
      retryCount,
      fallbackCount,
      recoveryCount,
      signalCount: 0,
      confidence: 0,
      verdict: 'PENDING' as EvidenceVerdict | 'PENDING',
      diagnosis: null,
      isControlledFailure,
      recoverySucceeded: recoveryCount > 0 && fallbackCount > 0,
      spans: [...spans],
    };
  };

  return { traceId, spans, recordSpan, endSpan, addEvent, buildRun };
}

export function diagnoseRun(run: TraceRun): string {
  const toolErrors = run.spans.filter((s) => s.kind === 'tool_result' && s.status === 'error');
  const fallbacks = run.spans.filter((s) => s.kind === 'fallback');
  const recoveries = run.spans.filter((s) => s.kind === 'recovery');

  if (toolErrors.length === 0 && fallbacks.length === 0) {
    return 'All tools succeeded — no failures detected. Run completed normally.';
  }

  const parts: string[] = [];

  for (const err of toolErrors) {
    const toolName = err.attributes?.tool as string | undefined;
    const errorMsg = err.attributes?.error as string | undefined;
    const isTimeout = errorMsg?.toLowerCase().includes('timeout') || errorMsg?.toLowerCase().includes('abort');
    const failureType = isTimeout ? 'timeout detected' : errorMsg ? `error: ${errorMsg}` : 'failure detected';
    parts.push(`${toolName ?? 'Tool'} failed → ${failureType}`);
  }

  for (const fb of fallbacks) {
    const from = fb.attributes?.from as string | undefined;
    const to = fb.attributes?.to as string | undefined;
    parts.push(`${from ?? 'Primary'} fallback selected → ${to ?? 'secondary source'}`);
  }

  for (const rec of recoveries) {
    const detail = rec.attributes?.detail as string | undefined;
    parts.push(`recovery: ${detail ?? 'task recovered'}`);
  }

  if (run.recoverySucceeded) {
    parts.push('task recovered successfully.');
  } else if (run.errorCount > 0 && run.recoveryCount === 0) {
    parts.push('no recovery available — task failed.');
  }

  return parts.join(' → ');
}

export function buildBeforeAfterComparison(
  beforeRun: TraceRun,
  afterRun: TraceRun,
): BeforeAfterComparison {
  const diagnosis = diagnoseRun(afterRun);

  const recoverySummary = afterRun.recoverySucceeded
    ? `Controlled failure injected → ${afterRun.errorCount} errors captured → ${afterRun.fallbackCount} fallbacks triggered → ${afterRun.recoveryCount} recoveries succeeded → task completed successfully.`
    : beforeRun.errorCount > 0 && afterRun.errorCount === 0
      ? 'After run avoided the failure path entirely — all tools succeeded.'
      : 'Recovery was not successful or not required.';

  return {
    beforeRun,
    afterRun,
    metrics: {
      successRate: {
        before: beforeRun.status === 'completed' && beforeRun.errorCount === 0,
        after: afterRun.status === 'completed',
      },
      latencyMs: {
        before: beforeRun.durationMs,
        after: afterRun.durationMs,
      },
      toolCalls: {
        before: beforeRun.toolCallCount,
        after: afterRun.toolCallCount,
      },
      errors: {
        before: beforeRun.errorCount,
        after: afterRun.errorCount,
      },
      recoveryRate: {
        before: beforeRun.recoveryCount,
        after: afterRun.recoveryCount,
      },
    },
    diagnosis,
    recoverySummary,
  };
}

export interface TracedScanResult {
  run: TraceRun;
  scanState: ScanState;
  durationMs: number;
}

export async function runTracedScan(
  query: string,
  profile: MonitoringProfile,
  adversarial: AdversarialConfig,
  isControlledFailure: boolean,
): Promise<TracedScanResult> {
  const traceId = uid('trace');
  const recorder = createTraceRecorder(traceId);
  const start = Date.now();

  const rootSpanId = recorder.recordSpan({
    parentId: null,
    kind: 'run',
    name: `Investigation: "${query.slice(0, 60)}"`,
    agentId: 'system',
    startedAt: start,
    endedAt: null,
    durationMs: null,
    status: 'pending',
    attributes: { query, isControlledFailure },
    events: [],
  });

  const longTerm = loadLongTermMemory();
  const boost = detectMemoryBoost(query, longTerm);
  const ctx = createInitialContext(query, profile);

  let scanState: ScanState = {
    status: 'running',
    query,
    startedAt: start,
    agentStatuses: { orchestrator: 'IDLE', research: 'IDLE', news: 'IDLE' },
    decisions: [],
    communications: [],
    tools: [],
    results: [],
    prioritySignals: [],
    memoryEvents: [],
    investigationContext: ctx,
    memoryBoost: boost,
    graphState: createInitialGraphState(),
    checkpoints: [],
    adversarial,
  };

  const agentSpanIds: Record<string, string> = {};
  const toolSpanMap: Record<string, string> = {};

  const hooks: RuntimeHooks = {
    onDecision: (e: DecisionEvent) => {
      scanState = { ...scanState, decisions: [...scanState.decisions, e] };
      recorder.recordSpan({
        parentId: agentSpanIds[e.agentId] ?? rootSpanId,
        kind: 'decision',
        name: e.text,
        agentId: e.agentId,
        startedAt: Date.now(),
        endedAt: Date.now(),
        durationMs: 0,
        status: 'ok',
        attributes: { type: e.type, step: e.step },
        events: [],
      });
    },
    onCommunication: (e: CommunicationEvent) => {
      scanState = { ...scanState, communications: [...scanState.communications, e] };
    },
    onTool: (e: ToolActivity) => {
      scanState = { ...scanState, tools: [...scanState.tools, e] };
      const spanId = recorder.recordSpan({
        parentId: agentSpanIds[e.agentId] ?? rootSpanId,
        kind: 'tool',
        name: `${e.tool} call`,
        agentId: e.agentId,
        startedAt: Date.now(),
        endedAt: null,
        durationMs: null,
        status: 'pending',
        attributes: { tool: e.tool, query: e.query },
        events: [],
      });
      toolSpanMap[e.id] = spanId;
    },
    onToolUpdate: (id, patch) => {
      scanState = {
        ...scanState,
        tools: scanState.tools.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      };
      const spanId = toolSpanMap[id];
      if (!spanId) return;
      const tool = scanState.tools.find((t) => t.id === id);
      if (patch.status === 'ERROR') {
        recorder.endSpan(spanId, 'error', {
          tool: tool?.tool ?? 'unknown',
          error: patch.detail ?? 'tool error',
        });
        recorder.recordSpan({
          parentId: spanId,
          kind: 'error',
          name: `${tool?.tool ?? 'Tool'} error`,
          agentId: tool?.agentId ?? 'system',
          startedAt: Date.now(),
          endedAt: Date.now(),
          durationMs: 0,
          status: 'error',
          attributes: { tool: tool?.tool ?? 'unknown', error: patch.detail ?? 'tool error' },
          events: [],
        });
      } else if (patch.status === 'SUCCESS' || patch.status === 'NO RESULTS') {
        recorder.endSpan(spanId, 'ok', {
          tool: tool?.tool ?? 'unknown',
          results: patch.results ?? 0,
        });
      }
    },
    onAgentStatus: (agentId, status) => {
      scanState = {
        ...scanState,
        agentStatuses: { ...scanState.agentStatuses, [agentId]: status },
      };
      if (status === 'WORKING' && !agentSpanIds[agentId]) {
        agentSpanIds[agentId] = recorder.recordSpan({
          parentId: rootSpanId,
          kind: 'agent',
          name: `${agentId} agent`,
          agentId,
          startedAt: Date.now(),
          endedAt: null,
          durationMs: null,
          status: 'pending',
          attributes: {},
          events: [],
        });
      } else if ((status === 'COMPLETED' || status === 'ERROR') && agentSpanIds[agentId]) {
        recorder.endSpan(agentSpanIds[agentId], status === 'COMPLETED' ? 'ok' : 'error');
      }
    },
    onResult: (r: AgentResult) => {
      scanState = { ...scanState, results: [...scanState.results, r] };
    },
    onPatch: (patch) => {
      scanState = { ...scanState, ...patch };
    },
    onMemory: (e) => {
      scanState = { ...scanState, memoryEvents: [...scanState.memoryEvents, e] };
    },
    onContext: (updatedCtx: InvestigationContext) => {
      scanState = { ...scanState, investigationContext: updatedCtx };
    },
    onCheckpoint: (c: Checkpoint) => {
      scanState = { ...scanState, checkpoints: [...(scanState.checkpoints ?? []), c] };
    },
    onGraphState: (g: GraphState) => {
      scanState = { ...scanState, graphState: g };
    },
    onFrameworkStatus: (f: FrameworkStatus) => {
      scanState = { ...scanState, frameworkStatus: f };
    },
    onHypothesis: (h: HypothesisState) => {
      scanState = { ...scanState, hypothesis: h };
    },
    onSelfEvaluation: (se: SelfEvaluation) => {
      scanState = { ...scanState, selfEvaluation: se };
    },
  };

  let stepCounter = 0;
  const emit = createEmitter(hooks, () => ++stepCounter);

  const contextRef = { current: ctx };
  const graphStateRef = { current: createInitialGraphState() };
  const checkpointsRef: { current: Checkpoint[] } = { current: [] };
  const frameworkStatusRef: { current: FrameworkStatus } = {
    current: {
      frameworkName: 'Observability Trace',
      state: 'RUNNING',
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
    },
  };
  const toolCallsRef = { current: 0 };

  const maxToolCalls = adversarial.simulateResourceConstraint && adversarial.maxToolCallsOverride
    ? adversarial.maxToolCallsOverride
    : MAX_TOOL_CALLS;

  let evidence: EvidenceAssessment | undefined;
  let results: AgentResult[] = [];
  let prioritySignals: ScanState['prioritySignals'] = [];

  try {
    const orchestratorResult = await runOrchestrator({
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

    results = orchestratorResult.results;
    evidence = orchestratorResult.evidence;
    prioritySignals = orchestratorResult.prioritySignals;

    const allSignals = results.flatMap((r) => r.signals);
    const newSummary = buildScanSummary(query, allSignals, evidence.verdict, ctx.topics);
    const updatedMemory = {
      organization: profile.organization,
      competitors: profile.competitors,
      researchTopics: profile.researchTopics,
      keywords: profile.keywords,
      recentQueries: addRecentQuery(query, longTerm?.recentQueries ?? []),
      lastScan: newSummary,
      frequentTopics: updateFrequentTopics(ctx.topics, longTerm?.frequentTopics ?? []),
    };
    saveLongTermMemory(updatedMemory);

    scanState = {
      ...scanState,
      status: 'done',
      results,
      evidence,
      intelligence: orchestratorResult.intelligence,
      prioritySignals,
      finishedAt: Date.now(),
    };
  } catch (e) {
    scanState = {
      ...scanState,
      status: 'error',
      error: e instanceof Error ? e.message : 'Traced scan failed.',
      finishedAt: Date.now(),
    };
  }

  recorder.endSpan(rootSpanId, scanState.status === 'done' ? 'ok' : 'error');

  const run = recorder.buildRun(query, isControlledFailure);
  run.signalCount = results.reduce((sum, r) => sum + r.signals.length, 0);
  run.confidence = evidence?.overallConfidence ?? 0;
  run.verdict = evidence?.verdict ?? 'PENDING';
  run.status = scanState.status === 'done' ? 'completed' : 'error';
  run.diagnosis = diagnoseRun(run);

  // Detect fallback spans from decisions
  const fallbackDecisions = scanState.decisions.filter(
    (d) => d.type === 'fallback' && d.text.toLowerCase().includes('fallback'),
  );
  for (const fd of fallbackDecisions) {
    const match = fd.text.match(/(\w+).*fallback.*?(\w+)?/i);
    recorder.recordSpan({
      parentId: rootSpanId,
      kind: 'fallback',
      name: fd.text,
      agentId: fd.agentId,
      startedAt: Date.now(),
      endedAt: Date.now(),
      durationMs: 0,
      status: 'ok',
      attributes: {
        from: match?.[1] ?? 'primary',
        to: match?.[2] ?? 'secondary',
      },
      events: [],
    });
  }
  // Rebuild run with fallback spans
  const updatedRun = recorder.buildRun(query, isControlledFailure);
  updatedRun.signalCount = run.signalCount;
  updatedRun.confidence = run.confidence;
  updatedRun.verdict = run.verdict;
  updatedRun.status = run.status;
  updatedRun.diagnosis = diagnoseRun(updatedRun);

  return { run: updatedRun, scanState, durationMs: Date.now() - start };
}

export async function runControlledFailureTest(
  query: string,
  profile: MonitoringProfile,
): Promise<{ beforeRun: TraceRun; afterRun: TraceRun; comparison: BeforeAfterComparison }> {
  // Phase 1: Run with controlled failure (OpenAlex intentionally fails)
  const failureAdversarial: AdversarialConfig = {
    enabled: true,
    mode: 'adversarial',
    simulateOpenAlexFailure: true,
    simulateNewsFailure: false,
    simulateConflictingEvidence: false,
    simulateLowConfidence: false,
    simulateResourceConstraint: false,
    maxToolCallsOverride: null,
  };

  const beforeResult = await runTracedScan(query, profile, failureAdversarial, true);

  await wait(500);

  // Phase 2: Run the same task again normally (recovery / after)
  const normalAdversarial: AdversarialConfig = {
    enabled: false,
    mode: 'live',
    simulateOpenAlexFailure: false,
    simulateNewsFailure: false,
    simulateConflictingEvidence: false,
    simulateLowConfidence: false,
    simulateResourceConstraint: false,
    maxToolCallsOverride: null,
  };

  const afterResult = await runTracedScan(query, profile, normalAdversarial, false);

  const comparison = buildBeforeAfterComparison(beforeResult.run, afterResult.run);

  return {
    beforeRun: beforeResult.run,
    afterRun: afterResult.run,
    comparison,
  };
}
