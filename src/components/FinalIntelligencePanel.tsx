import {
  ArrowRight,
  BookOpen,
  Building,
  ExternalLink,
  FileText,
  Lightbulb,
  Sparkles,
  Target,
} from 'lucide-react';
import type { FinalIntelligence } from '@/types';
import { Panel, EmptyState } from './ui';

export function FinalIntelligencePanel({ intelligence }: { intelligence?: FinalIntelligence }) {
  if (!intelligence) {
    return (
      <Panel title="Final Intelligence" icon={<Sparkles size={16} />}>
        <EmptyState label="No intelligence report yet" hint="The Orchestrator synthesizes this after evidence evaluation." />
      </Panel>
    );
  }

  return (
    <Panel title="Final Intelligence" icon={<Sparkles size={16} />}>
      <div className="space-y-5">
        <Section icon={<FileText size={14} />} title="Executive Summary">
          <p className="text-sm leading-relaxed text-slate-300">{intelligence.executiveSummary}</p>
        </Section>

        <Section icon={<Target size={14} />} title="Key Signals">
          <ul className="space-y-1.5">
            {intelligence.keySignals.map((s, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-300">
                <span className="text-signal-cyan">▸</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section icon={<BookOpen size={14} />} title="Research Trends">
          <ul className="space-y-1.5">
            {intelligence.researchTrends.map((s, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-300">
                <span className="text-signal-cyan">▸</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section icon={<Building size={14} />} title="Competitor / Industry Activity">
          <ul className="space-y-1.5">
            {intelligence.competitorActivity.map((s, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-300">
                <span className="text-signal-amber">▸</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section icon={<Lightbulb size={14} />} title="Evidence Analysis">
          <p className="text-sm leading-relaxed text-slate-300">{intelligence.evidenceAnalysis}</p>
        </Section>

        <Section icon={<Sparkles size={14} />} title="Why It Matters">
          <p className="text-sm leading-relaxed text-slate-300">{intelligence.whyItMatters}</p>
        </Section>

        <Section icon={<ArrowRight size={14} />} title="Recommended Actions">
          <ol className="space-y-2">
            {intelligence.recommendedActions.map((s, i) => (
              <li key={i} className="flex gap-2.5 rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-signal-cyan/15 font-mono text-[10px] font-semibold text-signal-cyan">
                  {i + 1}
                </span>
                <span className="text-sm text-slate-300">{s}</span>
              </li>
            ))}
          </ol>
        </Section>

        <Section icon={<ExternalLink size={14} />} title="Sources">
          <ul className="space-y-1">
            {intelligence.sources.map((s, i) => (
              <li key={i}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-2 text-xs text-slate-400 hover:text-signal-cyan"
                >
                  <ExternalLink size={11} className="shrink-0 text-slate-600 group-hover:text-signal-cyan" />
                  <span className="truncate">{s.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </Panel>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-2 flex items-center gap-2 font-display text-xs font-semibold uppercase tracking-wider text-slate-400">
        <span className="text-signal-cyan">{icon}</span>
        {title}
      </h4>
      {children}
    </div>
  );
}
