import { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Wrench,
  ShieldAlert,
  AlertTriangle,
  RotateCcw,
  TrendingUp,
} from 'lucide-react';
import type { EvaluationTestRecord } from '@/types';
import { cn } from './cn';

export function EvaluationTestDetail({ test }: { test: EvaluationTestRecord }) {
  const [expanded, setExpanded] = useState(false);

  const passIcon = test.passFail === 'PASS'
    ? <CheckCircle2 size={16} className="text-signal-green" />
    : <XCircle size={16} className="text-signal-red" />;

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02]">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.02]"
      >
        {expanded ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
        {passIcon}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-200">{test.scenarioLabel}</span>
            {test.runIndex > 0 && (
              <span className="rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-slate-500">
                Run {test.runIndex + 1}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-500">{test.actualOutcome}</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-slate-500">
            <Clock size={12} /> {(test.latencyMs / 1000).toFixed(1)}s
          </span>
          <span className="flex items-center gap-1 text-slate-500">
            <Wrench size={12} /> {test.toolCalls}
          </span>
          <span className={cn('font-mono', test.passFail === 'PASS' ? 'text-signal-green' : 'text-signal-red')}>
            {test.passFail}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-white/5 px-4 py-3">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <DetailRow label="Input" value={test.input} mono />
              <DetailRow label="Expected" value={test.expectedOutcome} />
              <DetailRow label="Actual" value={test.actualOutcome} />
              <DetailRow label="Verdict" value={test.verdict} />
              <DetailRow label="Confidence" value={`${test.confidence}%`} />
            </div>
            <div className="space-y-2">
              <DetailRow label="Signals" value={String(test.signalCount)} />
              <DetailRow label="Agent Steps" value={String(test.agentSteps)} />
              <DetailRow label="Replans" value={String(test.replanCount)} />
              <DetailRow label="Recovery" value={test.recoveryStatus} />
              <div className="flex items-center gap-2">
                {test.uncertaintyHandled ? (
                  <span className="flex items-center gap-1 text-xs text-signal-green">
                    <ShieldAlert size={12} /> Uncertainty handled
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-signal-amber">
                    <AlertTriangle size={12} /> Uncertainty not acknowledged
                  </span>
                )}
                {test.hallucinationDetected && (
                  <span className="flex items-center gap-1 text-xs text-signal-red">
                    <AlertTriangle size={12} /> Hallucination detected
                  </span>
                )}
              </div>
            </div>
          </div>

          {test.failureReason && (
            <div className="mt-3 rounded-lg border border-signal-red/20 bg-signal-red/5 px-3 py-2">
              <p className="text-xs text-signal-red">{test.failureReason}</p>
            </div>
          )}

          {test.evidenceUsed.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Evidence Used</p>
              <ul className="space-y-1">
                {test.evidenceUsed.map((e, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                    <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-signal-cyan" />
                    {e}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {test.toolCallSummary.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Tool Calls</p>
              <div className="flex flex-wrap gap-1.5">
                {test.toolCallSummary.map((tc, i) => (
                  <span
                    key={i}
                    className={cn(
                      'chip text-[10px]',
                      tc.status === 'SUCCESS' ? 'border-signal-green/30 bg-signal-green/5 text-signal-green' :
                      tc.status === 'ERROR' ? 'border-signal-red/30 bg-signal-red/5 text-signal-red' :
                      tc.status === 'NO RESULTS' ? 'border-slate-500/30 bg-slate-500/5 text-slate-400' :
                      'border-signal-amber/30 bg-signal-amber/5 text-signal-amber',
                    )}
                  >
                    {tc.tool}: {tc.status} ({tc.results})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      <p className={cn('mt-0.5 text-xs text-slate-300', mono && 'font-mono')}>{value}</p>
    </div>
  );
}

export function EvaluationTestList({ tests }: { tests: EvaluationTestRecord[] }) {
  if (tests.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">No test records yet. Run an evaluation to see results.</p>;
  }
  return (
    <div className="space-y-2">
      {tests.map((t) => (
        <EvaluationTestDetail key={t.id} test={t} />
      ))}
    </div>
  );
}

export { RotateCcw, TrendingUp };
