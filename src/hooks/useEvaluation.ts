import { useCallback, useRef, useState } from 'react';
import type {
  AdversarialConfig,
  Checkpoint,
  EvaluationState,
  EvaluationTestRecord,
  FrameworkStatus,
  MonitoringProfile,
  ScanState,
} from '@/types';
import { DEFAULT_ADVERSARIAL } from '@/types';
import {
  EVALUATION_SCENARIOS,
  buildAdversarialForScenario,
  buildTestRecord,
  buildEvaluationSummary,
  simulateBaselineScan,
  type ScanResultForEval,
} from '@/lib/evaluation';
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
import { wait } from '@/lib/utils';

const INITIAL_EVAL_STATE: EvaluationState = {
  status: 'idle',
  currentScenarioIndex: 0,
  currentRunIndex: 0,
  tests: [],
  summary: null,
};

export function useEvaluation() {
  const [evalState, setEvalState] = useState<EvaluationState>(INITIAL_EVAL_STATE);
  const runningRef = useRef(false);

  const runEvaluation = useCallback(
    async (
      profile: MonitoringProfile,
      baseAdversarial: AdversarialConfig,
      onScanStart?: (scenarioLabel: string, runIndex: number, totalRuns: number) => void,
    ) => {
      if (runningRef.current) return;
      runningRef.current = true;

      setEvalState({
        ...INITIAL_EVAL_STATE,
        status: 'running',
        startedAt: Date.now(),
      });

      const allTests: EvaluationTestRecord[] = [];

      for (let si = 0; si < EVALUATION_SCENARIOS.length; si++) {
        const scenario = EVALUATION_SCENARIOS[si];
        setEvalState((s) => ({
          ...s,
          currentScenarioIndex: si,
          currentRunIndex: 0,
        }));

        for (let ri = 0; ri < scenario.repeatCount; ri++) {
          setEvalState((s) => ({ ...s, currentRunIndex: ri }));
          onScanStart?.(scenario.label, ri + 1, scenario.repeatCount);

          let result: ScanResultForEval;

          if (scenario.id === 'baseline') {
            await wait(300);
            result = simulateBaselineScan(scenario.query, profile);
          } else {
            const adversarial = buildAdversarialForScenario(scenario, baseAdversarial);
            result = await runSingleEvaluationScan(scenario.query, profile, adversarial);
          }

          const record = buildTestRecord(scenario, ri, result);
          allTests.push(record);

          setEvalState((s) => ({
            ...s,
            tests: [...allTests],
          }));
        }
      }

      const summary = buildEvaluationSummary(allTests);
      setEvalState({
        status: 'done',
        currentScenarioIndex: EVALUATION_SCENARIOS.length,
        currentRunIndex: 0,
        tests: allTests,
        summary,
        startedAt: evalState.startedAt,
        finishedAt: Date.now(),
      });
      runningRef.current = false;
    },
    [],
  );

  const resetEvaluation = useCallback(() => {
    runningRef.current = false;
    setEvalState(INITIAL_EVAL_STATE);
  }, []);

  return { evalState, runEvaluation, resetEvaluation };
}

async function runSingleEvaluationScan(
  query: string,
  profile: MonitoringProfile,
  adversarial: AdversarialConfig,
): Promise<ScanResultForEval> {
  const start = Date.now();

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

  const hooks: RuntimeHooks = {
    onDecision: (e) => { scanState = { ...scanState, decisions: [...scanState.decisions, e] }; },
    onCommunication: (e) => { scanState = { ...scanState, communications: [...scanState.communications, e] }; },
    onTool: (e) => { scanState = { ...scanState, tools: [...scanState.tools, e] }; },
    onToolUpdate: (id, patch) => {
      scanState = { ...scanState, tools: scanState.tools.map((t) => (t.id === id ? { ...t, ...patch } : t)) };
    },
    onAgentStatus: (agentId, status) => {
      scanState = { ...scanState, agentStatuses: { ...scanState.agentStatuses, [agentId]: status } };
    },
    onResult: (r) => { scanState = { ...scanState, results: [...scanState.results, r] }; },
    onPatch: (patch) => { scanState = { ...scanState, ...patch }; },
    onMemory: (e) => { scanState = { ...scanState, memoryEvents: [...scanState.memoryEvents, e] }; },
    onContext: (updatedCtx) => { scanState = { ...scanState, investigationContext: updatedCtx }; },
    onCheckpoint: (c) => { scanState = { ...scanState, checkpoints: [...(scanState.checkpoints ?? []), c] }; },
    onGraphState: (g) => { scanState = { ...scanState, graphState: g }; },
    onFrameworkStatus: (f) => { scanState = { ...scanState, frameworkStatus: f }; },
    onHypothesis: (h) => { scanState = { ...scanState, hypothesis: h }; },
    onSelfEvaluation: (se) => { scanState = { ...scanState, selfEvaluation: se }; },
  };

  let stepCounter = 0;
  const emit = createEmitter(hooks, () => ++stepCounter);

  const contextRef = { current: ctx };
  const graphStateRef = { current: createInitialGraphState() };
  const checkpointsRef: { current: Checkpoint[] } = { current: [] };
  const frameworkStatusRef: { current: FrameworkStatus } = {
    current: {
      frameworkName: 'Evaluation Scan',
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
      intelligence,
      prioritySignals,
      finishedAt: Date.now(),
    };
  } catch (e) {
    scanState = {
      ...scanState,
      status: 'error',
      error: e instanceof Error ? e.message : 'Evaluation scan failed.',
      finishedAt: Date.now(),
    };
  }

  return { scan: scanState, durationMs: Date.now() - start };
}
