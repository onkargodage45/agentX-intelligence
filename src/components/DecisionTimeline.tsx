import {
  ArrowRight,
  CheckCircle2,
  Cog,
  FileSearch,
  Lightbulb,
  Loader2,
  Newspaper,
  Send,
} from 'lucide-react';
import type { DecisionEvent } from '@/types';
import { Panel, EmptyState } from './ui';

const TYPE_META: Record<
  DecisionEvent['type'],
  { icon: typeof Cog; color: string; label: string }
> = {
  reason: { icon: Cog, color: 'text-slate-400', label: 'Reason' },
  delegate: { icon: Send, color: 'text-signal-blue', label: 'Delegate' },
  tool: { icon: FileSearch, color: 'text-signal-cyan', label: 'Tool' },
  observe: { icon: CheckCircle2, color: 'text-signal-green', label: 'Observe' },
  evaluate: { icon: Lightbulb, color: 'text-signal-amber', label: 'Evaluate' },
  synthesis: { icon: ArrowRight, color: 'text-signal-violet', label: 'Synthesis' },
  route: { icon: ArrowRight, color: 'text-signal-blue', label: 'Route' },
  checkpoint: { icon: CheckCircle2, color: 'text-signal-cyan', label: 'Checkpoint' },
  replan: { icon: Lightbulb, color: 'text-signal-amber', label: 'Replan' },
  conflict: { icon: CheckCircle2, color: 'text-signal-red', label: 'Conflict' },
  hypothesis: { icon: Lightbulb, color: 'text-signal-violet', label: 'Hypothesis' },
  selfeval: { icon: CheckCircle2, color: 'text-signal-cyan', label: 'Self-Eval' },
  resource: { icon: Cog, color: 'text-signal-amber', label: 'Resource' },
  loop: { icon: ArrowRight, color: 'text-signal-red', label: 'Loop' },
  parallel: { icon: Send, color: 'text-signal-blue', label: 'Parallel' },
  fallback: { icon: ArrowRight, color: 'text-signal-amber', label: 'Fallback' },
  memory: { icon: Cog, color: 'text-slate-400', label: 'Memory' },
};

const AGENT_ICON: Record<DecisionEvent['agentId'], typeof Cog> = {
  orchestrator: Cog,
  research: FileSearch,
  news: Newspaper,
};

export function DecisionTimeline({ decisions, running }: { decisions: DecisionEvent[]; running: boolean }) {
  return (
    <Panel
      title="Agent Decision Timeline"
      icon={<ArrowRight size={16} />}
      action={running ? <span className="chip border-signal-cyan/40 bg-signal-cyan/10 text-signal-cyan"><Loader2 size={11} className="animate-spin" /> Live</span> : undefined}
    >
      {decisions.length === 0 ? (
        <EmptyState label="No decisions yet" hint="Run an intelligence scan to see the ReAct loop." />
      ) : (
        <ol className="relative space-y-0.5">
          {decisions.map((d, i) => {
            const meta = TYPE_META[d.type];
            const Icon = meta.icon;
            const AgentIcon = AGENT_ICON[d.agentId];
            const isLast = i === decisions.length - 1;
            return (
              <li key={d.id} className="relative flex gap-3 pb-3">
                {!isLast && (
                  <span className="absolute left-[11px] top-6 bottom-0 w-px bg-gradient-to-b from-white/10 to-transparent" />
                )}
                <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-ink-900 ${meta.color}`}>
                  <Icon size={12} />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-600">#{d.step}</span>
                    <span className={`text-[10px] font-semibold uppercase tracking-wider ${meta.color}`}>{meta.label}</span>
                    <AgentIcon size={10} className="text-slate-600" />
                    <span className="text-[10px] text-slate-600">{d.agentId}</span>
                  </div>
                  <p className="mt-0.5 text-sm leading-snug text-slate-300">{d.text}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}
