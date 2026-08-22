import { MessagesSquare, ArrowRight } from 'lucide-react';
import type { AgentId, CommunicationEvent } from '@/types';
import { Panel, EmptyState } from './ui';

const AGENT_LABEL: Record<AgentId, string> = {
  orchestrator: 'Orchestrator',
  research: 'Research Agent',
  news: 'News Agent',
};

const AGENT_COLOR: Record<AgentId, string> = {
  orchestrator: 'text-signal-violet',
  research: 'text-signal-cyan',
  news: 'text-signal-amber',
};

export function CommunicationPanel({ events }: { events: CommunicationEvent[] }) {
  return (
    <Panel title="Agent Communication" icon={<MessagesSquare size={16} />}>
      {events.length === 0 ? (
        <EmptyState label="No communication yet" hint="Inter-agent messages appear here at runtime." />
      ) : (
        <ul className="space-y-2.5">
          {events.map((e) => (
            <li key={e.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-3 animate-fadeInUp">
              <div className="flex items-center gap-2 text-xs">
                <span className={`font-semibold ${AGENT_COLOR[e.from]}`}>{AGENT_LABEL[e.from]}</span>
                <ArrowRight size={12} className="text-slate-600" />
                <span className={`font-semibold ${AGENT_COLOR[e.to]}`}>{AGENT_LABEL[e.to]}</span>
              </div>
              <p className="mt-1.5 text-sm leading-snug text-slate-300">"{e.message}"</p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
