import { ExternalLink, FileSearch, Flame, Newspaper } from 'lucide-react';
import type { Signal, SignalCategory } from '@/types';
import { Panel, EmptyState, PriorityBadge } from './ui';
import { formatDate } from '@/lib/utils';

const CATEGORY_META: Record<
  SignalCategory,
  { icon: typeof FileSearch; color: string; label: string }
> = {
  research: { icon: FileSearch, color: 'text-signal-cyan', label: 'Research' },
  competitor: { icon: Flame, color: 'text-signal-amber', label: 'Competitor' },
  industry: { icon: Newspaper, color: 'text-signal-blue', label: 'Industry' },
};

function SignalCard({ signal }: { signal: Signal }) {
  const meta = CATEGORY_META[signal.category];
  const Icon = meta.icon;
  return (
    <a
      href={signal.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-xl border border-white/5 bg-white/[0.02] p-3 transition hover:border-white/15 hover:bg-white/[0.05] animate-fadeInUp"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Icon size={13} className={meta.color} />
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${meta.color}`}>{meta.label}</span>
        </div>
        <PriorityBadge priority={signal.priority} />
      </div>
      <p className="mt-1.5 text-sm font-medium leading-snug text-slate-200 group-hover:text-white">
        {signal.title}
      </p>
      {signal.summary && (
        <p className="mt-1 text-xs leading-snug text-slate-500 line-clamp-2">{signal.summary}</p>
      )}
      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-600">
        <span className="truncate">
          {signal.source} · {formatDate(signal.date)}
          {signal.by ? ` · ${signal.by}` : ''}
        </span>
        <span className="flex items-center gap-1 text-slate-500 group-hover:text-signal-cyan">
          <ExternalLink size={11} />
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/5">
          <div
            className={`h-full rounded-full ${signal.relevance >= 70 ? 'bg-signal-green' : signal.relevance >= 45 ? 'bg-signal-cyan' : 'bg-slate-500'}`}
            style={{ width: `${signal.relevance}%` }}
          />
        </div>
        <span className="text-[10px] font-mono text-slate-500">{signal.relevance}%</span>
      </div>
    </a>
  );
}

interface Props {
  title: string;
  icon: typeof FileSearch;
  signals: Signal[];
  emptyLabel: string;
}

export function SignalPanel({ title, icon, signals, emptyLabel }: Props) {
  const Icon = icon;
  return (
    <Panel title={title} icon={<Icon size={16} />}>
      {signals.length === 0 ? (
        <EmptyState label={emptyLabel} />
      ) : (
        <div className="space-y-2">
          {signals.map((s) => (
            <SignalCard key={s.id} signal={s} />
          ))}
        </div>
      )}
    </Panel>
  );
}
