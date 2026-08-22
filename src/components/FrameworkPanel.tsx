import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  GitBranch,
  Loader2,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import type { FrameworkStatus } from '@/types';
import { Panel } from './ui';

export function FrameworkPanel({ status }: { status?: FrameworkStatus }) {
  if (!status) {
    return (
      <Panel title="Agent Framework" icon={<Cpu size={15} />}>
        <p className="py-6 text-center text-sm text-slate-500">
          Framework status will appear here when a scan is running.
        </p>
      </Panel>
    );
  }

  const stateColor: Record<string, string> = {
    IDLE: 'text-slate-400',
    RUNNING: 'text-signal-cyan',
    COMPLETED: 'text-signal-green',
    RECOVERING: 'text-signal-amber',
    REPLANNING: 'text-signal-amber',
    ERROR: 'text-signal-red',
  };

  const selfEvalColor: Record<string, string> = {
    PENDING: 'text-slate-400',
    PASSED: 'text-signal-green',
    REPLAN_REQUIRED: 'text-signal-amber',
    SKIPPED: 'text-slate-500',
  };

  const loopColor: Record<string, string> = {
    ACTIVE: 'text-signal-cyan',
    TRIGGERED: 'text-signal-red',
    CLEARED: 'text-signal-green',
  };

  const toolBudgetPct = Math.round((status.toolCallsUsed / status.maxToolCalls) * 100);
  const budgetColor = toolBudgetPct >= 80 ? 'text-signal-red' : toolBudgetPct >= 50 ? 'text-signal-amber' : 'text-signal-green';

  return (
    <Panel title="Agent Framework" icon={<Cpu size={15} />}>
      <div className="space-y-3">
        {/* Framework name */}
        <div className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Framework</p>
          <p className="mt-0.5 text-sm font-medium text-slate-200">{status.frameworkName}</p>
        </div>

        {/* State */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">State</p>
            <p className={`mt-0.5 flex items-center gap-1.5 text-sm font-semibold ${stateColor[status.state] ?? 'text-slate-400'}`}>
              {status.state === 'RUNNING' && <Loader2 size={12} className="animate-spin" />}
              {status.state === 'REPLANNING' && <RefreshCw size={12} className="animate-spin" />}
              {status.state === 'RECOVERING' && <ShieldAlert size={12} />}
              {status.state === 'COMPLETED' && <CheckCircle2 size={12} />}
              {status.state === 'ERROR' && <AlertTriangle size={12} />}
              {status.state}
            </p>
          </div>
          <div className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Current Node</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-slate-200">
              <GitBranch size={12} className="text-signal-cyan" />
              {status.currentNode}
            </p>
          </div>
        </div>

        {/* Resource tracking */}
        <div className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Tool Budget</p>
            <p className={`text-xs font-mono font-semibold ${budgetColor}`}>
              {status.toolCallsUsed} / {status.maxToolCalls}
            </p>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                toolBudgetPct >= 80 ? 'bg-signal-red' : toolBudgetPct >= 50 ? 'bg-signal-amber' : 'bg-signal-green'
              }`}
              style={{ width: `${Math.min(toolBudgetPct, 100)}%` }}
            />
          </div>
          <p className="mt-1 text-[10px] text-slate-500">{status.toolBudget} calls remaining</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2">
          <StatItem label="Checkpoint" value={`#${status.checkpointNumber}`} icon={<CheckCircle2 size={11} />} />
          <StatItem label="Retries" value={`${status.retries} / ${status.maxRetriesPerTool}`} icon={<RefreshCw size={11} />} />
          <StatItem label="Replans" value={`${status.replans} / ${status.maxReplans}`} icon={<GitBranch size={11} />} />
          <StatItem label="Agent Steps" value={`${status.agentSteps} / ${status.maxAgentSteps}`} icon={<Activity size={11} />} />
        </div>

        {/* Loop detection & self-eval */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Loop Detection</p>
            <p className={`mt-0.5 text-xs font-semibold ${loopColor[status.loopDetection] ?? 'text-slate-400'}`}>
              {status.loopDetection}
            </p>
          </div>
          <div className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Self Evaluation</p>
            <p className={`mt-0.5 text-xs font-semibold ${selfEvalColor[status.selfEvaluation] ?? 'text-slate-400'}`}>
              {status.selfEvaluation.replace(/_/g, ' ')}
            </p>
          </div>
        </div>

        {/* Restored indicator */}
        {status.restored && (
          <div className="rounded-lg border border-signal-amber/30 bg-signal-amber/10 px-3 py-2 text-xs text-signal-amber">
            Checkpoint restored — investigation resumed.
          </div>
        )}
      </div>
    </Panel>
  );
}

function StatItem({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-0.5 flex items-center gap-1 text-xs font-mono font-semibold text-slate-200">
        <span className="text-signal-cyan">{icon}</span>
        {value}
      </p>
    </div>
  );
}
