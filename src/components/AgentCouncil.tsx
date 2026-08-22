import { Brain, FileSearch, Newspaper } from 'lucide-react';
import type { AgentId, AgentStatus } from '@/types';
import { Panel, StatusDot } from './ui';

const AGENTS: {
  id: AgentId;
  name: string;
  role: string;
  tools: string;
  icon: typeof Brain;
}[] = [
  { id: 'orchestrator', name: 'Orchestrator', role: 'Task Coordination & Synthesis', tools: 'Delegates to agents', icon: Brain },
  { id: 'research', name: 'Research Agent', role: 'Research & Publications', tools: 'OpenAlex, Crossref', icon: FileSearch },
  { id: 'news', name: 'News Agent', role: 'Competitor & Industry Intelligence', tools: 'Hacker News', icon: Newspaper },
];

export function AgentCouncil({ statuses }: { statuses: Record<AgentId, AgentStatus> }) {
  return (
    <Panel title="Agent Council" icon={<Brain size={16} />}>
      <div className="grid gap-3 sm:grid-cols-3">
        {AGENTS.map((a) => {
          const status = statuses[a.id];
          const Icon = a.icon;
          return (
            <div
              key={a.id}
              className="glass glass-hover rounded-xl p-3.5"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-signal-cyan/20 to-signal-blue/20 text-signal-cyan">
                  <Icon size={18} />
                </div>
                <div className="flex items-center gap-1.5">
                  <StatusDot status={status} />
                  <span
                    className={`text-[10px] font-semibold tracking-wider ${
                      status === 'WORKING'
                        ? 'text-signal-cyan'
                        : status === 'COMPLETED'
                          ? 'text-signal-green'
                          : status === 'ERROR'
                            ? 'text-signal-red'
                            : 'text-slate-500'
                    }`}
                  >
                    {status}
                  </span>
                </div>
              </div>
              <p className="mt-3 font-display text-sm font-semibold text-slate-100">{a.name}</p>
              <p className="mt-0.5 text-xs text-slate-400">{a.role}</p>
              <p className="mt-2 text-[11px] text-slate-500">
                <span className="text-slate-600">Tools:</span> {a.tools}
              </p>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
