import { Brain, CheckCircle2, Circle, Loader2, MapPin, Tag } from 'lucide-react';
import type { InvestigationContext, MemoryEvent } from '@/types';
import { Panel } from './ui';

export function InvestigationMemoryCard({
  context,
  memoryEvents,
  running,
}: {
  context: InvestigationContext | undefined;
  memoryEvents: MemoryEvent[];
  running: boolean;
}) {
  if (!context) {
    return (
      <Panel title="Investigation Memory" icon={<Brain size={15} />}>
        <div className="flex h-full flex-col items-center justify-center py-8 text-center">
          <Brain size={28} className="mb-2 text-slate-600" />
          <p className="text-sm text-slate-500">No active investigation.</p>
          <p className="mt-1 text-xs text-slate-600">Run a scan to populate memory.</p>
        </div>
      </Panel>
    );
  }

  const agentOrder: { id: string; label: string }[] = [
    { id: 'orchestrator', label: 'Orchestrator' },
    { id: 'research', label: 'Research Agent' },
    { id: 'news', label: 'News Agent' },
  ];

  return (
    <Panel
      title="Investigation Memory"
      icon={<Brain size={15} />}
      action={
        running ? (
          <span className="flex items-center gap-1 text-xs text-signal-cyan">
            <Loader2 size={12} className="animate-spin" /> live
          </span>
        ) : undefined
      }
    >
      <div className="space-y-4">
        {/* Query */}
        <MemRow label="Query" icon={<Tag size={11} />}>
          <p className="text-sm text-slate-200">{context.userQuery}</p>
        </MemRow>

        {/* Organization */}
        <MemRow label="Active Organization" icon={<MapPin size={11} />}>
          <p className="text-sm text-slate-200">{context.organization}</p>
        </MemRow>

        {/* Active Topics */}
        <MemRow label="Active Topics" icon={<Tag size={11} />}>
          <div className="flex flex-wrap gap-1">
            {context.topics.length === 0 ? (
              <span className="text-xs text-slate-500">None detected yet</span>
            ) : (
              context.topics.slice(0, 6).map((t, i) => (
                <span
                  key={i}
                  className="rounded-md border border-signal-cyan/20 bg-signal-cyan/5 px-2 py-0.5 text-xs text-signal-cyan"
                >
                  {t}
                </span>
              ))
            )}
          </div>
        </MemRow>

        {/* Detected Keywords */}
        <MemRow label="Detected Keywords" icon={<Tag size={11} />}>
          <div className="flex flex-wrap gap-1">
            {context.keywords.length === 0 ? (
              <span className="text-xs text-slate-500">None detected yet</span>
            ) : (
              context.keywords.slice(0, 8).map((k, i) => (
                <span
                  key={i}
                  className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 text-xs text-slate-400"
                >
                  {k}
                </span>
              ))
            )}
          </div>
        </MemRow>

        {/* Completed Agents */}
        <MemRow label="Completed Agents" icon={<CheckCircle2 size={11} />}>
          <div className="space-y-1">
            {agentOrder.map((a) => {
              const done = context.completedAgents.filter((id) => id === a.id).length > 0;
              return (
                <div key={a.id} className="flex items-center gap-2 text-xs">
                  {done ? (
                    <CheckCircle2 size={12} className="text-signal-green" />
                  ) : (
                    <Circle size={12} className="text-slate-600" />
                  )}
                  <span className={done ? 'text-slate-300' : 'text-slate-500'}>{a.label}</span>
                </div>
              );
            })}
          </div>
        </MemRow>

        {/* Sources Checked */}
        <MemRow label="Sources Checked" icon={<Tag size={11} />}>
          <div className="flex flex-wrap gap-1">
            {context.toolsUsed.length === 0 ? (
              <span className="text-xs text-slate-500">None yet</span>
            ) : (
              context.toolsUsed.map((t, i) => (
                <span
                  key={i}
                  className="rounded-md border border-signal-amber/20 bg-signal-amber/5 px-2 py-0.5 text-xs text-signal-amber"
                >
                  {t}
                </span>
              ))
            )}
          </div>
        </MemRow>

        {/* Important Signals */}
        <MemRow label="Important Signals" icon={<Tag size={11} />}>
          <div className="space-y-1">
            {context.importantSignals.length === 0 ? (
              <span className="text-xs text-slate-500">None detected yet</span>
            ) : (
              context.importantSignals.slice(0, 4).map((s, i) => (
                <p key={i} className="text-xs text-slate-300">
                  {i + 1}. {s.length > 70 ? `${s.slice(0, 69)}…` : s}
                </p>
              ))
            )}
          </div>
        </MemRow>

        {/* Evidence Count */}
        <MemRow label="Evidence Collected" icon={<Tag size={11} />}>
          <p className="font-mono text-sm text-slate-200">{context.evidenceCount} signals</p>
        </MemRow>

        {/* Current Step */}
        <div className="rounded-lg border border-signal-cyan/20 bg-signal-cyan/5 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Current Step</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-signal-cyan">
            {running && <Loader2 size={12} className="animate-spin" />}
            {context.currentStep}
          </p>
        </div>

        {/* Memory Events Timeline */}
        {memoryEvents.length > 0 && (
          <div>
            <p className="mb-2 text-[10px] uppercase tracking-wider text-slate-500">Memory Events</p>
            <ul className="space-y-1.5">
              {memoryEvents.slice(-6).map((e) => (
                <li key={e.id} className="flex items-start gap-2 text-xs">
                  <span
                    className={`mt-0.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
                      e.type === 'boost'
                        ? 'bg-signal-amber'
                        : e.type === 'persist'
                        ? 'bg-signal-green'
                        : e.type === 'load'
                        ? 'bg-signal-blue'
                        : 'bg-signal-cyan'
                    }`}
                  />
                  <span className="text-slate-400">
                    <span className="font-mono text-slate-600">#{e.step}</span> {e.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Panel>
  );
}

function MemRow({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500">
        {icon} {label}
      </p>
      {children}
    </div>
  );
}
