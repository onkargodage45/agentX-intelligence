import type { EvaluationMetricScore } from '@/types';
import { cn } from './cn';

export function MetricBar({ metric }: { metric: EvaluationMetricScore }) {
  const percentage = metric.max > 0 ? Math.min(100, (metric.value / metric.max) * 100) : 0;
  const isInverse = metric.label === 'Hallucination Rate' || metric.label === 'Latency' || metric.label === 'Tool Usage';
  const barColor = isInverse
    ? percentage > 60 ? 'bg-signal-red' : percentage > 30 ? 'bg-signal-amber' : 'bg-signal-green'
    : percentage > 80 ? 'bg-signal-green' : percentage > 50 ? 'bg-signal-cyan' : percentage > 25 ? 'bg-signal-amber' : 'bg-signal-red';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-300">{metric.label}</span>
        <span className="font-mono text-xs text-slate-400">
          {metric.value}{metric.unit}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/5">
        <div
          className={cn('h-full rounded-full transition-all duration-700', barColor)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-[10px] text-slate-600">{metric.description}</p>
    </div>
  );
}

export function MetricGrid({ metrics }: { metrics: EvaluationMetricScore[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {metrics.map((m) => (
        <MetricBar key={m.label} metric={m} />
      ))}
    </div>
  );
}

export function ScoreGauge({ score, grade }: { score: number; grade: string }) {
  const circumference = 2 * Math.PI * 52;
  const offset = circumference - (score / 100) * circumference;
  const gradeColor =
    grade === 'A' ? 'text-signal-green' :
    grade === 'B' ? 'text-signal-cyan' :
    grade === 'C' ? 'text-signal-amber' :
    grade === 'D' ? 'text-signal-amber' :
    'text-signal-red';
  const strokeColor =
    grade === 'A' ? '#22c55e' :
    grade === 'B' ? '#22d3ee' :
    grade === 'C' ? '#f59e0b' :
    grade === 'D' ? '#f59e0b' :
    '#ef4444';

  return (
    <div className="relative flex h-32 w-32 items-center justify-center">
      <svg className="h-32 w-32 -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
        <circle
          cx="60"
          cy="60"
          r="52"
          fill="none"
          stroke={strokeColor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={cn('font-display text-2xl font-bold', gradeColor)}>{grade}</span>
        <span className="font-mono text-xs text-slate-500">{score}/100</span>
      </div>
    </div>
  );
}

export function ScenarioBar({
  label,
  passed,
  total,
  passRate,
}: {
  label: string;
  passed: number;
  total: number;
  passRate: number;
}) {
  const color = passRate === 100 ? 'bg-signal-green' : passRate >= 50 ? 'bg-signal-cyan' : 'bg-signal-red';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-300">{label}</span>
        <span className="font-mono text-slate-500">{passed}/{total}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
        <div className={cn('h-full rounded-full transition-all duration-500', color)} style={{ width: `${passRate}%` }} />
      </div>
    </div>
  );
}

export function ConsistencyBar({ label, consistency }: { label: string; consistency: number }) {
  const color = consistency > 80 ? 'bg-signal-green' : consistency > 50 ? 'bg-signal-cyan' : 'bg-signal-amber';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-300">{label}</span>
        <span className="font-mono text-slate-500">{consistency}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
        <div className={cn('h-full rounded-full transition-all duration-500', color)} style={{ width: `${consistency}%` }} />
      </div>
    </div>
  );
}
