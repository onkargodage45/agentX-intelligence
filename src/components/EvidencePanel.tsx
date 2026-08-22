import { GitCompareArrows } from 'lucide-react';
import type { EvidenceAssessment, AgentResult } from '@/types';
import { Panel, EmptyState } from './ui';

const VERDICT_META: Record<
  EvidenceAssessment['verdict'],
  { color: string; bg: string; ring: string; dot: string; label: string }
> = {
  CONSISTENT: {
    color: 'text-signal-green',
    bg: 'bg-signal-green/10',
    ring: 'border-signal-green/30',
    dot: 'bg-signal-green',
    label: '🟢 CONSISTENT',
  },
  PARTIAL: {
    color: 'text-signal-amber',
    bg: 'bg-signal-amber/10',
    ring: 'border-signal-amber/30',
    dot: 'bg-signal-amber',
    label: '🟡 PARTIAL',
  },
  CONFLICT: {
    color: 'text-signal-red',
    bg: 'bg-signal-red/10',
    ring: 'border-signal-red/30',
    dot: 'bg-signal-red',
    label: '🔴 CONFLICT',
  },
  INSUFFICIENT: {
    color: 'text-slate-400',
    bg: 'bg-slate-500/10',
    ring: 'border-slate-500/30',
    dot: 'bg-slate-500',
    label: '⚪ INSUFFICIENT',
  },
};

interface Props {
  evidence?: EvidenceAssessment;
  results: AgentResult[];
}

export function EvidencePanel({ evidence, results }: Props) {
  const research = results.find((r) => r.agentId === 'research');
  const news = results.find((r) => r.agentId === 'news');

  return (
    <Panel title="Evidence Analysis" icon={<GitCompareArrows size={16} />}>
      {!evidence ? (
        <EmptyState label="No evidence to compare" hint="Run a mixed scan to see correlation." />
      ) : (
        <div className="space-y-4">
          <div className={`rounded-xl border p-4 ${VERDICT_META[evidence.verdict].ring} ${VERDICT_META[evidence.verdict].bg}`}>
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${VERDICT_META[evidence.verdict].dot}`} />
              <span className={`font-display text-sm font-semibold ${VERDICT_META[evidence.verdict].color}`}>
                {VERDICT_META[evidence.verdict].label}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">{evidence.explanation}</p>
          </div>

          <div>
            <p className="label mb-2">Evidence Confidence</p>
            <div className="space-y-2.5">
              <ConfidenceBar label="Research Agent" value={research?.confidence ?? 0} present={!!research} />
              <ConfidenceBar label="News Agent" value={news?.confidence ?? 0} present={!!news} />
              <div className="h-px bg-white/5" />
              <ConfidenceBar label="Overall" value={evidence.overallConfidence} present highlight />
            </div>
            <p className="mt-2 text-[11px] text-slate-600">
              Evidence Confidence reflects source coverage and agreement — not scientific certainty.
            </p>
          </div>
        </div>
      )}
    </Panel>
  );
}

function ConfidenceBar({
  label,
  value,
  present,
  highlight,
}: {
  label: string;
  value: number;
  present: boolean;
  highlight?: boolean;
}) {
  const color = value >= 70 ? 'bg-signal-green' : value >= 45 ? 'bg-signal-cyan' : value > 0 ? 'bg-signal-amber' : 'bg-slate-600';
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className={highlight ? 'font-semibold text-slate-200' : 'text-slate-400'}>{label}</span>
        <span className={`font-mono ${highlight ? 'text-slate-200' : 'text-slate-500'}`}>
          {present ? `${value}%` : '—'}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${present ? value : 0}%` }} />
      </div>
    </div>
  );
}
