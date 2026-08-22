import { AlertTriangle } from 'lucide-react';
import type { Signal } from '@/types';
import { Panel, EmptyState, PriorityBadge } from './ui';
import { formatDate } from '@/lib/utils';

export function PriorityAlerts({ signals }: { signals: Signal[] }) {
  return (
    <Panel title="Priority Alerts" icon={<AlertTriangle size={16} />}>
      {signals.length === 0 ? (
        <EmptyState label="No priority alerts" hint="Top-ranked signals appear here after a scan." />
      ) : (
        <ul className="space-y-2">
          {signals.map((s, i) => (
            <li
              key={s.id}
              className="rounded-xl border border-white/5 bg-gradient-to-r from-white/[0.04] to-transparent p-3 animate-fadeInUp"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/5 font-mono text-[10px] text-slate-400">
                    {i + 1}
                  </span>
                  <PriorityBadge priority={s.priority} />
                </div>
                <span className="text-[11px] text-slate-600">{s.sourceType}</span>
              </div>
              <p className="mt-1.5 text-sm font-medium leading-snug text-slate-200">{s.title}</p>
              <div className="mt-1 flex items-center justify-between text-[11px] text-slate-600">
                <span className="truncate">{s.source} · {formatDate(s.date)}</span>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-signal-cyan hover:underline">
                  Open →
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
