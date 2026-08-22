import { GitBranch, ArrowDown, CheckCircle2, Loader2, Circle, XCircle, MinusCircle } from 'lucide-react';
import type { GraphState, GraphNode, GraphNodeId } from '@/types';
import { Panel } from './ui';

const NODE_POSITIONS: Record<GraphNodeId, { col: number; row: number }> = {
  START: { col: 2, row: 0 },
  UNDERSTAND: { col: 2, row: 1 },
  PLAN: { col: 2, row: 2 },
  RESEARCH: { col: 1, row: 3 },
  NEWS: { col: 3, row: 3 },
  PARALLEL_RESEARCH_NEWS: { col: 2, row: 3 },
  VERIFY: { col: 2, row: 4 },
  SELF_EVALUATE: { col: 2, row: 5 },
  REPLAN: { col: 1, row: 5 },
  SYNTHESIS: { col: 2, row: 6 },
  END: { col: 2, row: 7 },
};

function NodeIcon({ status }: { status: GraphNode['status'] }) {
  switch (status) {
    case 'COMPLETED':
      return <CheckCircle2 size={14} className="text-signal-green" />;
    case 'ACTIVE':
      return <Loader2 size={14} className="animate-spin text-signal-cyan" />;
    case 'FAILED':
      return <XCircle size={14} className="text-signal-red" />;
    case 'SKIPPED':
      return <MinusCircle size={14} className="text-slate-600" />;
    default:
      return <Circle size={14} className="text-slate-600" />;
  }
}

function nodeStyles(status: GraphNode['status']): string {
  switch (status) {
    case 'COMPLETED':
      return 'border-signal-green/40 bg-signal-green/10 text-signal-green';
    case 'ACTIVE':
      return 'border-signal-cyan/50 bg-signal-cyan/10 text-signal-cyan shadow-glow';
    case 'FAILED':
      return 'border-signal-red/40 bg-signal-red/10 text-signal-red';
    case 'SKIPPED':
      return 'border-slate-700/40 bg-slate-800/20 text-slate-600';
    default:
      return 'border-white/10 bg-white/[0.02] text-slate-500';
  }
}

export function GraphView({ graphState }: { graphState?: GraphState }) {
  if (!graphState) {
    return (
      <Panel title="Graph / Execution View" icon={<GitBranch size={15} />}>
        <p className="py-6 text-center text-sm text-slate-500">
          Graph will appear here when a scan is running.
        </p>
      </Panel>
    );
  }

  const nodes = graphState.nodes;
  const colWidth = 200;
  const rowHeight = 64;

  return (
    <Panel title="Graph / Execution View" icon={<GitBranch size={15} />}>
      <div className="space-y-1">
        {/* Graph nodes */}
        <div className="relative" style={{ minHeight: rowHeight * 8 }}>
          {nodes.map((node) => {
            const pos = NODE_POSITIONS[node.id];
            if (!pos) return null;
            return (
              <div
                key={node.id}
                className="absolute"
                style={{
                  left: `${pos.col * colWidth}px`,
                  top: `${pos.row * rowHeight}px`,
                  transition: 'all 0.3s ease',
                }}
              >
                <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-all duration-300 ${nodeStyles(node.status)}`}>
                  <NodeIcon status={node.status} />
                  <span className="text-xs font-semibold tracking-wide">{node.label}</span>
                </div>
              </div>
            );
          })}

          {/* Vertical connectors */}
          {nodes.map((node) => {
            const pos = NODE_POSITIONS[node.id];
            if (!pos) return null;
            // Draw connector to next row
            const nextRow = pos.row + 1;
            const hasBelow = nodes.some((n) => {
              const np = NODE_POSITIONS[n.id];
              return np && np.row === nextRow;
            });
            if (!hasBelow) return null;
            return (
              <div
                key={`conn-${node.id}`}
                className="absolute flex justify-center"
                style={{
                  left: `${pos.col * colWidth + 60}px`,
                  top: `${pos.row * rowHeight + 36}px`,
                  height: `${rowHeight - 36}px`,
                }}
              >
                <ArrowDown size={16} className="text-slate-700" />
              </div>
            );
          })}
        </div>

        {/* Conditional routing labels */}
        <div className="mt-4 space-y-1.5 rounded-lg border border-white/5 bg-white/[0.02] p-3">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Conditional Routing</p>
          <div className="space-y-1 text-xs text-slate-400">
            <RouteLabel label="RESEARCH" condition="Evidence sufficient?" yes="→ VERIFY" no="→ REPLAN" />
            <RouteLabel label="TOOL FAILURE" condition="Retry success?" yes="→ CONTINUE" no="→ FALLBACK" />
            <RouteLabel label="CONFLICT" condition="Resolvable?" yes="→ RESOLVE" no="→ UNCERTAIN" />
            <RouteLabel label="SELF-EVAL" condition="Sufficient?" yes="→ SYNTHESIS" no="→ REPLAN" />
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 pt-2 text-[10px]">
          <LegendItem icon={<CheckCircle2 size={10} className="text-signal-green" />} label="Completed" />
          <LegendItem icon={<Loader2 size={10} className="text-signal-cyan" />} label="Active" />
          <LegendItem icon={<Circle size={10} className="text-slate-600" />} label="Pending" />
          <LegendItem icon={<XCircle size={10} className="text-signal-red" />} label="Failed" />
          <LegendItem icon={<MinusCircle size={10} className="text-slate-600" />} label="Skipped" />
        </div>

        {/* Plan info */}
        {graphState.plan && (
          <div className="mt-3 rounded-lg border border-white/5 bg-white/[0.02] p-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">
              Dynamic Plan (v{graphState.plan.planVersion})
            </p>
            <p className="mt-1 text-xs text-slate-300">{graphState.plan.executionStrategy}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {graphState.plan.tasks.map((t, i) => (
                <span
                  key={t.id}
                  className={`rounded-md border px-2 py-0.5 text-[10px] ${
                    t.status === 'COMPLETED'
                      ? 'border-signal-green/30 bg-signal-green/5 text-signal-green'
                      : t.status === 'RUNNING'
                        ? 'border-signal-cyan/30 bg-signal-cyan/5 text-signal-cyan'
                        : t.status === 'SKIPPED'
                          ? 'border-slate-700/40 text-slate-600'
                          : 'border-white/10 bg-white/[0.02] text-slate-400'
                  }`}
                >
                  {i + 1}. {t.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}

function RouteLabel({ label, condition, yes, no }: { label: string; condition: string; yes: string; no: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-24 shrink-0 font-mono text-slate-500">{label}</span>
      <span className="text-slate-400">{condition}</span>
      <span className="text-signal-green">{yes}</span>
      <span className="text-slate-600">|</span>
      <span className="text-signal-amber">{no}</span>
    </div>
  );
}

function LegendItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1 text-slate-500">
      {icon}
      <span>{label}</span>
    </div>
  );
}
