import { useEffect, useState } from 'react';
import { Brain, Database, Eye, Trash2, X } from 'lucide-react';
import type { InvestigationContext, LongTermMemory, MemoryEvent } from '@/types';
import { cn } from './cn';
import { clearLongTermMemory, loadLongTermMemory } from '@/lib/memory';
import { timeAgo } from '@/lib/utils';

export function MemoryInspector({
  open,
  onClose,
  shortTerm,
  memoryEvents,
  onClearShortTerm,
  onClearLongTerm,
}: {
  open: boolean;
  onClose: () => void;
  shortTerm: InvestigationContext | undefined;
  memoryEvents: MemoryEvent[];
  onClearShortTerm: () => void;
  onClearLongTerm: () => void;
}) {
  const [longTerm, setLongTerm] = useState<LongTermMemory | null>(null);

  useEffect(() => {
    if (open) setLongTerm(loadLongTermMemory());
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 max-h-[85vh] w-full max-w-2xl overflow-y-auto scrollbar-thin rounded-2xl border border-white/10 bg-ink-900 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/5 bg-ink-900/95 px-5 py-4 backdrop-blur">
          <div className="flex items-center gap-2">
            <Brain size={18} className="text-signal-cyan" />
            <h2 className="font-display text-base font-semibold text-white">Memory Inspector</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 p-5">
          {/* Short-term memory */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-signal-cyan/10 text-signal-cyan">
                  <Eye size={13} />
                </span>
                Short-Term Memory
              </h3>
              <button
                onClick={onClearShortTerm}
                className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-slate-400 transition hover:border-signal-red/30 hover:text-signal-red"
              >
                <Trash2 size={11} /> Clear Current Memory
              </button>
            </div>

            {!shortTerm ? (
              <div className="rounded-lg border border-white/5 bg-white/[0.02] px-4 py-6 text-center">
                <p className="text-sm text-slate-500">No active scan context.</p>
                <p className="mt-1 text-xs text-slate-600">Run a scan to populate short-term memory.</p>
              </div>
            ) : (
              <div className="space-y-3 rounded-lg border border-white/5 bg-white/[0.02] p-4">
                <KV k="Current Query" v={shortTerm.userQuery} />
                <KV k="Active Organization" v={shortTerm.organization} />
                <KVList k="Completed Agents" items={shortTerm.completedAgents} />
                <KVList k="Active Topics" items={shortTerm.topics} />
                <KVList k="Detected Keywords" items={shortTerm.keywords} />
                <KVList k="Tools Used" items={shortTerm.toolsUsed} />
                <KVList k="Research Findings" items={shortTerm.researchFindings} />
                <KVList k="News Findings" items={shortTerm.newsFindings} />
                <KVList k="Important Signals" items={shortTerm.importantSignals} />
                <KV k="Evidence Count" v={`${shortTerm.evidenceCount} signals`} />
                <KV k="Current Step" v={shortTerm.currentStep} accent />
              </div>
            )}

            {/* Memory events */}
            {memoryEvents.length > 0 && (
              <div className="mt-3">
                <p className="mb-2 text-[10px] uppercase tracking-wider text-slate-500">Memory Events</p>
                <ul className="space-y-1 rounded-lg border border-white/5 bg-white/[0.02] p-3">
                  {memoryEvents.map((e) => (
                    <li key={e.id} className="flex items-start gap-2 text-xs">
                      <span
                        className={cn(
                          'mt-0.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full',
                          e.type === 'boost' ? 'bg-signal-amber' :
                          e.type === 'persist' ? 'bg-signal-green' :
                          e.type === 'load' ? 'bg-signal-blue' : 'bg-signal-cyan',
                        )}
                      />
                      <span className="text-slate-400">
                        <span className="font-mono text-slate-600">#{e.step}</span>{' '}
                        <span className={cn(
                          e.type === 'boost' ? 'text-signal-amber' :
                          e.type === 'persist' ? 'text-signal-green' :
                          e.type === 'load' ? 'text-signal-blue' : 'text-signal-cyan',
                        )}>
                          [{e.type}]
                        </span>{' '}
                        {e.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* Long-term memory */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-signal-amber/10 text-signal-amber">
                  <Database size={13} />
                </span>
                Long-Term Memory
              </h3>
              <button
                onClick={() => {
                  clearLongTermMemory();
                  setLongTerm(null);
                  onClearLongTerm();
                }}
                className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-slate-400 transition hover:border-signal-red/30 hover:text-signal-red"
              >
                <Trash2 size={11} /> Clear Long-Term Memory
              </button>
            </div>

            {!longTerm ? (
              <div className="rounded-lg border border-white/5 bg-white/[0.02] px-4 py-6 text-center">
                <p className="text-sm text-slate-500">No long-term memory found.</p>
                <p className="mt-1 text-xs text-slate-600">Complete a scan to build persistent memory.</p>
              </div>
            ) : (
              <div className="space-y-3 rounded-lg border border-white/5 bg-white/[0.02] p-4">
                <KV k="Organization" v={longTerm.organization || 'Not set'} />
                <KVList k="Competitors" items={longTerm.competitors} />
                <KVList k="Research Topics" items={longTerm.researchTopics} />
                <KVList k="Keywords" items={longTerm.keywords} />
                <KVList k="Frequent Topics" items={longTerm.frequentTopics} />
                <KVList k="Recent Queries" items={longTerm.recentQueries} />
                {longTerm.lastScan && (
                  <>
                    <div className="border-t border-white/5 pt-2">
                      <p className="mb-1.5 text-[10px] uppercase tracking-wider text-slate-500">Last Scan</p>
                      <KV k="Query" v={longTerm.lastScan.query} />
                      <KV k="Signals" v={String(longTerm.lastScan.signalCount)} />
                      <KV k="Verdict" v={longTerm.lastScan.verdict} />
                      <KV k="When" v={timeAgo(longTerm.lastScan.timestamp)} />
                      <KVList k="Top Topics" items={longTerm.lastScan.topTopics} />
                    </div>
                  </>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function KV({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="shrink-0 text-xs text-slate-500">{k}</span>
      <span className={cn('text-right text-xs font-mono', accent ? 'text-signal-cyan' : 'text-slate-200')}>
        {v}
      </span>
    </div>
  );
}

function KVList({ k, items }: { k: string; items: string[] }) {
  return (
    <div>
      <span className="mb-1 block text-xs text-slate-500">{k}</span>
      {items.length === 0 ? (
        <span className="text-xs text-slate-600">None</span>
      ) : (
        <div className="flex flex-wrap gap-1">
          {items.map((item, i) => (
            <span
              key={i}
              className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 text-xs text-slate-300"
            >
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
