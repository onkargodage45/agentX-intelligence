import { Wrench } from 'lucide-react';
import type { AgentId, ToolActivity } from '@/types';
import { Panel, EmptyState, ToolStatusBadge } from './ui';

const AGENT_LABEL: Record<AgentId, string> = {
  orchestrator: 'Orchestrator',
  research: 'Research Agent',
  news: 'News Agent',
};

const TOOL_ICON: Record<string, string> = {
  OpenAlex: '📚',
  Crossref: '📄',
  'Hacker News': '📰',
};

export function ToolActivityPanel({ tools }: { tools: ToolActivity[] }) {
  return (
    <Panel title="Tool Activity" icon={<Wrench size={16} />}>
      {tools.length === 0 ? (
        <EmptyState label="No tool calls yet" hint="Real API calls appear here during a scan." />
      ) : (
        <ul className="space-y-2">
          {tools.map((t) => (
            <li key={t.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-3 animate-fadeInUp">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">{TOOL_ICON[t.tool] ?? '🔧'}</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">{t.tool}</p>
                    <p className="text-[11px] text-slate-500">
                      Agent: <span className="text-slate-400">{AGENT_LABEL[t.agentId]}</span>
                    </p>
                  </div>
                </div>
                <ToolStatusBadge status={t.status} />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                <span className="truncate font-mono">"{t.query.slice(0, 60)}"</span>
                {t.status === 'SUCCESS' && <span className="ml-2 shrink-0 text-signal-green">Results: {t.results}</span>}
                {t.status === 'NO RESULTS' && <span className="ml-2 shrink-0 text-slate-400">Results: 0</span>}
                {t.status === 'ERROR' && <span className="ml-2 shrink-0 text-signal-red">Failed</span>}
                {t.status === 'CALLING' && <span className="ml-2 shrink-0 text-signal-cyan animate-pulseSoft">Calling…</span>}
              </div>
              {t.detail && t.status === 'ERROR' && (
                <p className="mt-1 text-[11px] text-signal-red/80">{t.detail}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
