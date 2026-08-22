import {
  ClipboardCheck,
  Loader2,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  TrendingUp,
  Clock,
  Wrench,
  Award,
  Info,
} from 'lucide-react';
import type { EvaluationState, EvaluationScenarioId } from '@/types';
import { EVALUATION_SCENARIOS } from '@/lib/evaluation';
import { MetricGrid, ScoreGauge, ScenarioBar, ConsistencyBar } from './EvaluationCharts';
import { EvaluationTestList } from './EvaluationTestDetail';
import { cn } from './cn';

interface EvaluationDashboardProps {
  evalState: EvaluationState;
  onRun: () => void;
  onReset: () => void;
  currentScenarioLabel?: string;
}

export function EvaluationDashboard({ evalState, onRun, onReset, currentScenarioLabel }: EvaluationDashboardProps) {
  const { status, tests, summary } = evalState;
  const running = status === 'running';
  const done = status === 'done';

  return (
    <div className="space-y-5">
      {/* Control Bar */}
      <div className="glass flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-signal-cyan/20 bg-signal-cyan/10">
            <ClipboardCheck size={22} className="text-signal-cyan" />
          </div>
          <div>
            <h2 className="font-display text-base font-bold text-slate-100">Evaluation Dashboard</h2>
            <p className="text-xs text-slate-500">
              Automated test runs across 8 scenarios with measurable metrics
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn-ghost"
            onClick={onReset}
            disabled={running}
          >
            <RotateCcw size={14} /> Reset
          </button>
          <button
            className="btn-primary"
            onClick={onRun}
            disabled={running}
          >
            {running ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            {running ? 'Evaluating…' : 'Run Evaluation'}
          </button>
        </div>
      </div>

      {/* Running Progress */}
      {running && (
        <div className="glass p-4">
          <div className="flex items-center gap-3">
            <Loader2 size={18} className="animate-spin text-signal-cyan" />
            <div className="flex-1">
              <p className="text-sm text-slate-200">
                Running: <span className="text-signal-cyan">{currentScenarioLabel ?? 'Initializing…'}</span>
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                Test {evalState.currentScenarioIndex + 1} of {EVALUATION_SCENARIOS.length} ·
                {' '}{tests.length} completed
              </p>
            </div>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-signal-cyan to-signal-blue transition-all duration-500"
              style={{
                width: `${(evalState.currentScenarioIndex / EVALUATION_SCENARIOS.length) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Summary */}
      {done && summary && (
        <>
          {/* Overall Score */}
          <div className="glass p-5">
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
              <ScoreGauge score={summary.overallScore} grade={summary.grade} />
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <SummaryStat
                    icon={<CheckCircle2 size={16} className="text-signal-green" />}
                    label="Passed"
                    value={`${summary.passed}/${summary.totalTests}`}
                    color="text-signal-green"
                  />
                  <SummaryStat
                    icon={<XCircle size={16} className="text-signal-red" />}
                    label="Failed"
                    value={String(summary.failed)}
                    color="text-signal-red"
                  />
                  <SummaryStat
                    icon={<TrendingUp size={16} className="text-signal-cyan" />}
                    label="Pass Rate"
                    value={`${summary.passRate}%`}
                    color="text-signal-cyan"
                  />
                  <SummaryStat
                    icon={<Award size={16} className="text-signal-amber" />}
                    label="Grade"
                    value={summary.grade}
                    color="text-signal-amber"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <SummaryStat
                    icon={<ShieldAlert size={14} className="text-signal-green" />}
                    label="Uncertainty Reward"
                    value={`${summary.uncertaintyRewardScore}%`}
                    color="text-signal-green"
                    small
                  />
                  <SummaryStat
                    icon={<Clock size={14} className="text-slate-400" />}
                    label="Avg Latency"
                    value={`${(summary.avgLatencyMs / 1000).toFixed(1)}s`}
                    color="text-slate-300"
                    small
                  />
                  <SummaryStat
                    icon={<Wrench size={14} className="text-slate-400" />}
                    label="Avg Tool Calls"
                    value={String(summary.avgToolCalls)}
                    color="text-slate-300"
                    small
                  />
                </div>

                <div className="rounded-lg border border-signal-cyan/10 bg-signal-cyan/5 px-3 py-2">
                  <p className="text-xs text-slate-400">
                    <span className="font-semibold text-signal-cyan">Uncertainty Reward:</span> The agent is rewarded
                    for identifying uncertainty and refusing unsupported conclusions. Hallucination penalty:{' '}
                    <span className="text-signal-red">{summary.hallucinationPenaltyScore}%</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Metrics */}
          <div className="glass p-5">
            <h3 className="mb-4 flex items-center gap-2 font-display text-sm font-semibold text-slate-100">
              <TrendingUp size={16} className="text-signal-cyan" /> Measured Metrics
            </h3>
            <MetricGrid metrics={summary.metrics} />
          </div>

          {/* Scenario Results + Consistency */}
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="glass p-5">
              <h3 className="mb-4 flex items-center gap-2 font-display text-sm font-semibold text-slate-100">
                <CheckCircle2 size={16} className="text-signal-cyan" /> Scenario Results
              </h3>
              <div className="space-y-3">
                {summary.scenarioResults.map((sr) => (
                  <ScenarioBar
                    key={sr.scenarioId}
                    label={sr.label}
                    passed={sr.passed}
                    total={sr.total}
                    passRate={sr.passRate}
                  />
                ))}
              </div>
            </div>

            <div className="glass p-5">
              <h3 className="mb-4 flex items-center gap-2 font-display text-sm font-semibold text-slate-100">
                <RotateCcw size={16} className="text-signal-cyan" /> Consistency Scores
              </h3>
              {summary.consistencyScores.length > 0 ? (
                <div className="space-y-3">
                  {summary.consistencyScores.map((cs) => (
                    <ConsistencyBar key={cs.scenarioId} label={cs.label} consistency={cs.consistency} />
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-slate-500">No repeated-run scenarios in this evaluation.</p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Test Records */}
      {tests.length > 0 && (
        <div className="glass p-5">
          <h3 className="mb-4 flex items-center gap-2 font-display text-sm font-semibold text-slate-100">
            <ClipboardCheck size={16} className="text-signal-cyan" /> Test Records
            <span className="rounded-full bg-signal-cyan/15 px-2 py-0.5 text-[10px] font-semibold text-signal-cyan">
              {tests.length}
            </span>
          </h3>
          <EvaluationTestList tests={tests} />
        </div>
      )}

      {/* Idle State */}
      {status === 'idle' && (
        <div className="glass p-8">
          <div className="flex flex-col items-center text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-signal-cyan/20 bg-signal-cyan/10">
              <ClipboardCheck size={28} className="text-signal-cyan" />
            </div>
            <h3 className="font-display text-base font-semibold text-slate-100">Evaluation Mode</h3>
            <p className="mt-2 max-w-lg text-sm text-slate-500">
              Run a comprehensive evaluation across 8 test scenarios. The agent is measured on accuracy,
              groundedness, hallucination rate, recovery success, consistency, and more. The agent is
              rewarded for identifying uncertainty and refusing unsupported conclusions.
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {EVALUATION_SCENARIOS.map((s) => (
                <div key={s.id} className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-left">
                  <p className="text-xs font-medium text-slate-300">{s.label}</p>
                  <p className="mt-0.5 text-[10px] text-slate-600">{s.description.slice(0, 80)}…</p>
                </div>
              ))}
            </div>
            <button className="btn-primary mt-6" onClick={onRun}>
              <Play size={16} /> Start Evaluation
            </button>
          </div>
        </div>
      )}

      {/* Methodology Info */}
      {done && (
        <div className="glass p-5">
          <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-slate-100">
            <Info size={16} className="text-signal-cyan" /> Evaluation Methodology
          </h3>
          <div className="space-y-2 text-xs text-slate-400">
            <p>
              <span className="font-semibold text-slate-300">9 metrics</span> are measured across{' '}
              <span className="font-semibold text-slate-300">8 test scenarios</span>. Each test records input,
              expected outcome, actual outcome, evidence used, confidence, recovery status, latency, tool calls,
              and pass/fail.
            </p>
            <p>
              <span className="font-semibold text-signal-green">Uncertainty reward:</span> The agent receives a
              positive score for detecting and reporting uncertainty (INSUFFICIENT/CONFLICT verdicts with explicit
              acknowledgment) instead of fabricating conclusions.
            </p>
            <p>
              <span className="font-semibold text-signal-red">Hallucination penalty:</span> Claims in the final
              intelligence report that are not supported by gathered signals are flagged as hallucinations and
              reduce the overall score.
            </p>
            <p>
              <span className="font-semibold text-slate-300">Recovery testing:</span> Tool failure scenarios
              simulate real API failures. The agent must retry, use fallback tools, and continue with available
              evidence rather than crashing.
            </p>
            <p>
              <span className="font-semibold text-slate-300">Consistency:</span> Repeated identical runs are
              compared for variance in confidence, verdict, and signal count. Lower variance = higher consistency.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryStat({
  icon,
  label,
  value,
  color,
  small,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  small?: boolean;
}) {
  return (
    <div className={cn(
      'rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2',
      small ? 'flex items-center gap-2' : 'flex flex-col gap-1',
    )}>
      {small ? (
        <>
          {icon}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
            <p className={cn('text-sm font-semibold', color)}>{value}</p>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-1.5">
            {icon}
            <span className="text-[10px] uppercase tracking-wider text-slate-500">{label}</span>
          </div>
          <p className={cn('font-display text-lg font-bold', color)}>{value}</p>
        </>
      )}
    </div>
  );
}
