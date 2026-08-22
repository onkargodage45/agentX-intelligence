import { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Cpu,
  GitBranch,
  GitCompareArrows,
  Loader2,
  RotateCcw,
  Stethoscope,
  Timer,
  Wrench,
  Zap,
} from 'lucide-react';
import type {
  BeforeAfterComparison,
  ObservabilityState,
  TraceRun,
  TraceSpan,
} from '@/types';
import { cn } from './cn';

const SPAN_KIND_META: Record<string, { icon: typeof Cpu; color: string; label: string }> = {
  run: { icon: Activity, color: 'text-signal-cyan', label: 'Run' },
  agent: { icon: Cpu, color: 'text-signal-blue', label: 'Agent' },
  decision: { icon: ArrowRight, color: 'text-slate-400', label: 'Decision' },
  tool: { icon: Wrench, color: 'text-signal-amber', label: 'Tool' },
  tool_result: { icon: CheckCircle2, color: 'text-signal-green', label: 'Result' },
  error: { icon: AlertTriangle, color: 'text-signal-red', label: 'Error' },
  recovery: { icon: RotateCcw, color: 'text-signal-cyan', label: 'Recovery' },
  fallback: { icon: GitCompareArrows, color: 'text-signal-amber', label: 'Fallback' },
};

function formatMs(ms: number | null): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function ObservabilityDashboard({
  obsState,
  onRunControlledFailure,
  onReset,
  onClearRuns,
}: {
  obsState: ObservabilityState;
  onRunControlledFailure: () => void;
  onReset: () => void;
  onClearRuns: () => void;
}) {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const selectedRun = obsState.runs.find((r) => r.id === selectedRunId) ?? obsState.runs[0] ?? null;

  return (
    <div className="space-y-5">
      {/* Header / Controls */}
      <div className="glass p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="flex items-center gap-2 font-display text-base font-bold text-white">
              <Stethoscope size={18} className="text-signal-cyan" />
              Observability & Tracing
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              End-to-end trace recording of every investigation run — agent execution, decisions, tool calls, errors, latency, retries, and recovery.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              className="btn-ghost"
              onClick={onReset}
              disabled={obsState.status === 'running'}
            >
              <RotateCcw size={14} /> Reset
            </button>
            <button
              className="btn-ghost"
              onClick={onClearRuns}
              disabled={obsState.status === 'running' || obsState.runs.length === 0}
            >
              Clear Traces
            </button>
            <button
              className="btn-primary"
              onClick={onRunControlledFailure}
              disabled={obsState.status === 'running'}
            >
              {obsState.status === 'running' ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Zap size={16} />
              )}
              {obsState.status === 'running' ? 'Running…' : 'Run Controlled Failure Test'}
            </button>
          </div>
        </div>
        {obsState.error && (
          <p className="mt-3 rounded-lg border border-signal-red/30 bg-signal-red/10 px-3 py-2 text-sm text-signal-red">
            {obsState.error}
          </p>
        )}
      </div>

      {/* Before vs After Comparison */}
      {obsState.comparison && (
        <ComparisonCard comparison={obsState.comparison} diagnosis={obsState.diagnosis} />
      )}

      {/* Run list + Trace tree */}
      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        {/* Run list */}
        <div className="glass p-4">
          <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-slate-100">
            <Activity size={15} className="text-signal-cyan" /> Trace Runs ({obsState.runs.length})
          </h3>
          {obsState.runs.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              No traces recorded yet. Run a controlled failure test to capture a complete trace.
            </p>
          ) : (
            <ul className="space-y-1.5 max-h-[500px] overflow-y-auto scrollbar-thin">
              {obsState.runs.map((run) => (
                <li key={run.id}>
                  <button
                    onClick={() => setSelectedRunId(run.id)}
                    className={cn(
                      'w-full rounded-lg border px-3 py-2 text-left transition',
                      (selectedRun?.id === run.id)
                        ? 'border-signal-cyan/30 bg-signal-cyan/10'
                        : 'border-white/5 bg-white/[0.02] hover:border-white/10',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-medium text-slate-200">
                        {run.isControlledFailure ? '[CONTROLLED FAILURE] ' : ''}{run.query.slice(0, 50)}
                      </span>
                      <span className={cn(
                        'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                        run.status === 'completed' ? 'bg-signal-green/15 text-signal-green' : 'bg-signal-red/15 text-signal-red',
                      )}>
                        {run.status}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-[10px] text-slate-500">
                      <span>{formatTime(run.startedAt)}</span>
                      <span>{formatMs(run.durationMs)}</span>
                      <span>{run.toolCallCount} tools</span>
                      {run.errorCount > 0 && <span className="text-signal-red">{run.errorCount} errors</span>}
                      {run.fallbackCount > 0 && <span className="text-signal-amber">{run.fallbackCount} fallbacks</span>}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Trace tree */}
        <div className="glass p-4">
          <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-slate-100">
            <GitBranch size={15} className="text-signal-cyan" /> Trace Timeline
          </h3>
          {!selectedRun ? (
            <p className="py-8 text-center text-sm text-slate-500">
              Select a run to view its trace tree.
            </p>
          ) : (
            <TraceTreeView run={selectedRun} />
          )}
        </div>
      </div>

      {/* Run summary metrics */}
      {selectedRun && (
        <div className="glass p-4">
          <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-slate-100">
            <Activity size={15} className="text-signal-cyan" /> Run Telemetry
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <TelemetryCard label="Duration" value={formatMs(selectedRun.durationMs)} icon={<Timer size={14} />} />
            <TelemetryCard label="Tool Calls" value={String(selectedRun.toolCallCount)} icon={<Wrench size={14} />} />
            <TelemetryCard label="Errors" value={String(selectedRun.errorCount)} icon={<AlertTriangle size={14} />} accent={selectedRun.errorCount > 0 ? 'red' : 'slate'} />
            <TelemetryCard label="Retries" value={String(selectedRun.retryCount)} icon={<RotateCcw size={14} />} accent={selectedRun.retryCount > 0 ? 'amber' : 'slate'} />
            <TelemetryCard label="Fallbacks" value={String(selectedRun.fallbackCount)} icon={<GitCompareArrows size={14} />} accent={selectedRun.fallbackCount > 0 ? 'amber' : 'slate'} />
            <TelemetryCard label="Recoveries" value={String(selectedRun.recoveryCount)} icon={<CheckCircle2 size={14} />} accent={selectedRun.recoveryCount > 0 ? 'green' : 'slate'} />
          </div>
          {selectedRun.diagnosis && (
            <div className="mt-4 rounded-lg border border-signal-cyan/20 bg-signal-cyan/5 px-4 py-3">
              <p className="flex items-center gap-2 text-xs font-semibold text-signal-cyan">
                <Stethoscope size={14} /> Auto-Diagnosis
              </p>
              <p className="mt-1 text-sm text-slate-300">{selectedRun.diagnosis}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- Trace Tree View ---------------- */

function TraceTreeView({ run }: { run: TraceRun }) {
  const rootSpans = run.spans.filter((s) => s.parentId === null || s.kind === 'run');
  const childMap = buildChildMap(run.spans);

  return (
    <div className="max-h-[600px] overflow-y-auto scrollbar-thin">
      <ul className="space-y-1">
        {rootSpans.map((span) => (
          <SpanNode key={span.id} span={span} childMap={childMap} depth={0} />
        ))}
      </ul>
    </div>
  );
}

function buildChildMap(spans: TraceSpan[]): Record<string, TraceSpan[]> {
  const map: Record<string, TraceSpan[]> = {};
  for (const span of spans) {
    if (span.parentId) {
      if (!map[span.parentId]) map[span.parentId] = [];
      map[span.parentId].push(span);
    }
  }
  return map;
}

function SpanNode({ span, childMap, depth }: { span: TraceSpan; childMap: Record<string, TraceSpan[]>; depth: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const children = childMap[span.id] ?? [];
  const meta = SPAN_KIND_META[span.kind] ?? SPAN_KIND_META.decision;
  const Icon = meta.icon;
  const hasChildren = children.length > 0;

  return (
    <li>
      <div
        className={cn(
          'flex items-start gap-2 rounded-md px-2 py-1.5 text-xs transition hover:bg-white/[0.03]',
          span.status === 'error' && 'bg-signal-red/5',
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-0.5 shrink-0 text-slate-500 hover:text-slate-300"
          >
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        ) : (
          <span className="mt-0.5 w-3 shrink-0" />
        )}
        <Icon size={12} className={cn('mt-0.5 shrink-0', meta.color)} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className={cn('truncate', span.status === 'error' ? 'text-signal-red' : 'text-slate-300')}>
              {span.name}
            </span>
            <span className="shrink-0 font-mono text-[10px] text-slate-600">
              {formatMs(span.durationMs)}
            </span>
          </div>
          {span.attributes && Object.keys(span.attributes).length > 0 && (
            <div className="mt-0.5 flex flex-wrap gap-1">
              {Object.entries(span.attributes).slice(0, 4).map(([k, v]) => (
                v != null && v !== '' && (
                  <span key={k} className="rounded border border-white/5 bg-white/[0.02] px-1 py-0.5 text-[10px] text-slate-500">
                    {k}: {String(v).slice(0, 40)}
                  </span>
                )
              ))}
            </div>
          )}
          {span.events.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {span.events.map((e, i) => (
                <li key={i} className="text-[10px] text-slate-600">
                  <span className="font-mono">{formatTime(e.timestamp)}</span> {e.text}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {expanded && hasChildren && (
        <ul className="space-y-0.5">
          {children.map((child) => (
            <SpanNode key={child.id} span={child} childMap={childMap} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

/* ---------------- Comparison Card ---------------- */

function ComparisonCard({ comparison, diagnosis }: { comparison: BeforeAfterComparison; diagnosis: string | null }) {
  const { beforeRun, afterRun, metrics, recoverySummary } = comparison;

  return (
    <div className="glass p-4 sm:p-5">
      <h3 className="mb-4 flex items-center gap-2 font-display text-sm font-semibold text-slate-100">
        <GitCompareArrows size={15} className="text-signal-cyan" /> Before vs After — Controlled Failure Recovery
      </h3>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Before */}
        <div className="rounded-xl border border-signal-red/20 bg-signal-red/5 p-4">
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold text-signal-red">
            <AlertTriangle size={14} /> BEFORE — Controlled Failure
          </p>
          <RunMetrics run={beforeRun} />
        </div>

        {/* After */}
        <div className="rounded-xl border border-signal-green/20 bg-signal-green/5 p-4">
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold text-signal-green">
            <CheckCircle2 size={14} /> AFTER — Recovery Run
          </p>
          <RunMetrics run={afterRun} />
        </div>
      </div>

      {/* Comparison metrics row */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <CompareMetric label="Success" before={metrics.successRate.before ? 'Yes' : 'No'} after={metrics.successRate.after ? 'Yes' : 'No'} />
        <CompareMetric label="Latency" before={formatMs(metrics.latencyMs.before)} after={formatMs(metrics.latencyMs.after)} />
        <CompareMetric label="Tool Calls" before={String(metrics.toolCalls.before)} after={String(metrics.toolCalls.after)} />
        <CompareMetric label="Errors" before={String(metrics.errors.before)} after={String(metrics.errors.after)} />
        <CompareMetric label="Recoveries" before={String(metrics.recoveryRate.before)} after={String(metrics.recoveryRate.after)} />
      </div>

      {/* Diagnosis */}
      {diagnosis && (
        <div className="mt-4 rounded-lg border border-signal-cyan/20 bg-signal-cyan/5 px-4 py-3">
          <p className="flex items-center gap-2 text-xs font-semibold text-signal-cyan">
            <Stethoscope size={14} /> Root-Cause Diagnosis
          </p>
          <p className="mt-1 text-sm text-slate-300">{diagnosis}</p>
        </div>
      )}

      {/* Recovery summary */}
      {recoverySummary && (
        <div className="mt-3 rounded-lg border border-signal-green/20 bg-signal-green/5 px-4 py-3">
          <p className="flex items-center gap-2 text-xs font-semibold text-signal-green">
            <RotateCcw size={14} /> Recovery Summary
          </p>
          <p className="mt-1 text-sm text-slate-300">{recoverySummary}</p>
        </div>
      )}
    </div>
  );
}

function RunMetrics({ run }: { run: TraceRun | null }) {
  if (!run) {
    return <p className="text-sm text-slate-500">No run data.</p>;
  }
  return (
    <div className="space-y-2 text-xs">
      <MetricRow label="Status" value={run.status} accent={run.status === 'completed' ? 'green' : 'red'} />
      <MetricRow label="Duration" value={formatMs(run.durationMs)} />
      <MetricRow label="Tool Calls" value={String(run.toolCallCount)} />
      <MetricRow label="Errors" value={String(run.errorCount)} accent={run.errorCount > 0 ? 'red' : 'slate'} />
      <MetricRow label="Retries" value={String(run.retryCount)} accent={run.retryCount > 0 ? 'amber' : 'slate'} />
      <MetricRow label="Fallbacks" value={String(run.fallbackCount)} accent={run.fallbackCount > 0 ? 'amber' : 'slate'} />
      <MetricRow label="Recoveries" value={String(run.recoveryCount)} accent={run.recoveryCount > 0 ? 'green' : 'slate'} />
      <MetricRow label="Signals" value={String(run.signalCount)} />
      <MetricRow label="Confidence" value={`${run.confidence}%`} />
      <MetricRow label="Verdict" value={run.verdict} />
    </div>
  );
}

function MetricRow({ label, value, accent }: { label: string; value: string; accent?: 'green' | 'red' | 'amber' | 'slate' }) {
  const colorMap = {
    green: 'text-signal-green',
    red: 'text-signal-red',
    amber: 'text-signal-amber',
    slate: 'text-slate-200',
  };
  return (
    <div className="flex justify-between border-b border-white/5 pb-1">
      <span className="text-slate-500">{label}</span>
      <span className={cn('font-mono font-medium', accent ? colorMap[accent] : 'text-slate-200')}>{value}</span>
    </div>
  );
}

function CompareMetric({ label, before, after }: { label: string; before: string; after: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <div className="mt-1 flex items-center gap-2 text-xs">
        <span className="text-signal-red">{before}</span>
        <ArrowRight size={10} className="text-slate-600" />
        <span className="text-signal-green">{after}</span>
      </div>
    </div>
  );
}

function TelemetryCard({ label, value, icon, accent }: { label: string; value: string; icon: React.ReactNode; accent?: 'green' | 'red' | 'amber' | 'slate' }) {
  const accentMap = {
    green: 'text-signal-green',
    red: 'text-signal-red',
    amber: 'text-signal-amber',
    slate: 'text-slate-200',
  };
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500">
        {icon} {label}
      </div>
      <p className={cn('mt-1 font-mono text-sm font-semibold', accent ? accentMap[accent] : 'text-slate-200')}>{value}</p>
    </div>
  );
}
