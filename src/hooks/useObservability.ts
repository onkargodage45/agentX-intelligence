import { useCallback, useRef, useState } from 'react';
import type {
  BeforeAfterComparison,
  MonitoringProfile,
  ObservabilityState,
  TraceRun,
} from '@/types';
import {
  loadStoredRuns,
  saveStoredRuns,
  runControlledFailureTest,
} from '@/lib/observability';

const INITIAL_STATE: ObservabilityState = {
  status: 'idle',
  currentRunId: null,
  runs: [],
  comparison: null,
  diagnosis: null,
  isControlledFailureTest: false,
  error: null,
};

export function useObservability() {
  const [state, setState] = useState<ObservabilityState>(() => ({
    ...INITIAL_STATE,
    runs: loadStoredRuns(),
  }));
  const runningRef = useRef(false);

  const runControlledFailure = useCallback(async (
    query: string,
    profile: MonitoringProfile,
  onProgress?: (phase: 'before' | 'after', label: string) => void,
  ) => {
    if (runningRef.current) return;
    runningRef.current = true;

    setState((s) => ({
      ...s,
      status: 'running',
      error: null,
      comparison: null,
      isControlledFailureTest: true,
    }));

    try {
      onProgress?.('before', 'Running controlled failure scan (OpenAlex intentionally failed)…');
      const result = await runControlledFailureTest(query, profile);
      onProgress?.('after', 'Running same task again with recovery (normal mode)…');

      const newRuns = [result.beforeRun, result.afterRun, ...state.runs].slice(0, 20);
      saveStoredRuns(newRuns);

      setState((s) => ({
        ...s,
        status: 'done',
        runs: [result.beforeRun, result.afterRun, ...s.runs].slice(0, 20),
        comparison: result.comparison,
        diagnosis: result.comparison.diagnosis,
        currentRunId: result.afterRun.id,
      }));
    } catch (e) {
      setState((s) => ({
        ...s,
        status: 'error',
        error: e instanceof Error ? e.message : 'Controlled failure test failed.',
      }));
    } finally {
      runningRef.current = false;
    }
  }, [state.runs]);

  const addRun = useCallback((run: TraceRun) => {
    setState((s) => {
      const runs = [run, ...s.runs].slice(0, 20);
      saveStoredRuns(runs);
      return { ...s, runs };
    });
  }, []);

  const resetObservability = useCallback(() => {
    runningRef.current = false;
    setState({ ...INITIAL_STATE, runs: loadStoredRuns() });
  }, []);

  const clearRuns = useCallback(() => {
    saveStoredRuns([]);
    setState((s) => ({ ...s, runs: [] }));
  }, []);

  return {
    obsState: state,
    runControlledFailure,
    addRun,
    resetObservability,
    clearRuns,
  };
}
