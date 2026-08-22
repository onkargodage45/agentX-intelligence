import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Brain,
  Cpu,
  ExternalLink,
  GitCompareArrows,
  GitBranch,
  LayoutDashboard,
  Loader2,
  Play,
  RotateCcw,
  ScanSearch,
  Signal as SignalIcon,
  Sparkles,
  Terminal,
  Users,
  Zap,
} from 'lucide-react';
import type { MonitoringProfile, SignalCategory } from '@/types';
import { loadProfile, saveProfile, AGENT_LABELS } from '@/lib/utils';
import { useScan } from '@/hooks/useScan';
import { ProfilePanel } from '@/components/ProfilePanel';
import { AgentCouncil } from '@/components/AgentCouncil';
import { DecisionTimeline } from '@/components/DecisionTimeline';
import { CommunicationPanel } from '@/components/CommunicationPanel';
import { ToolActivityPanel } from '@/components/ToolActivityPanel';
import { SignalPanel } from '@/components/SignalPanel';
import { EvidencePanel } from '@/components/EvidencePanel';
import { PriorityAlerts } from '@/components/PriorityAlerts';
import { FinalIntelligencePanel } from '@/components/FinalIntelligencePanel';
import { Tabs, type TabId } from '@/components/Tabs';
import { cn } from '@/components/cn';
import { InvestigationMemoryCard } from '@/components/InvestigationMemoryCard';
import { MemoryInspector } from '@/components/MemoryInspector';
import { FileSearch, Flame, Newspaper, Wrench } from 'lucide-react';
import { loadLongTermMemory } from '@/lib/memory';
import { FrameworkPanel } from '@/components/FrameworkPanel';
import { GraphView } from '@/components/GraphView';
import { AdversarialControls } from '@/components/AdversarialControls';
import { EvaluationDashboard } from '@/components/EvaluationDashboard';
import { useEvaluation } from '@/hooks/useEvaluation';
import { ObservabilityDashboard } from '@/components/ObservabilityDashboard';
import { useObservability } from '@/hooks/useObservability';
import { ClipboardCheck, Stethoscope } from 'lucide-react';

const EXAMPLES = [
  'Find recent research trends in AI agents.',
  'What are the latest developments in AI agent technology?',
  'Compare recent academic research on AI agents with current industry developments.',
  'Investigate AI agent research, competitor activity and industry trends. Identify the three most important signals and recommend what an organization should do next.',
];

export default function App() {
  const [profile, setProfile] = useState<MonitoringProfile>(() => loadProfile());
  const [query, setQuery] = useState(EXAMPLES[3]);
  const [tab, setTab] = useState<TabId>('overview');
  const [memoryInspectorOpen, setMemoryInspectorOpen] = useState(false);
  const [welcomeBack, setWelcomeBack] = useState(false);
  const [longTermVersion, setLongTermVersion] = useState(0);
  const { scan, run, reset, adversarial, updateAdversarial } = useScan();
  const { evalState, runEvaluation, resetEvaluation } = useEvaluation();
  const [evalScenarioLabel, setEvalScenarioLabel] = useState<string | undefined>(undefined);
  const { obsState, runControlledFailure, resetObservability, clearRuns } = useObservability();
  const [obsProgress, setObsProgress] = useState<string | undefined>(undefined);
  const [testingSubTab, setTestingSubTab] = useState<'evaluation' | 'observability'>('evaluation');

  useEffect(() => {
    saveProfile(profile);
  }, [profile]);

  // Detect returning user with previous memory
  useEffect(() => {
    const mem = loadLongTermMemory();
    if (mem && (mem.recentQueries.length > 0 || mem.researchTopics.length > 0)) {
      setWelcomeBack(true);
    }
  }, [longTermVersion]);

  const handleRun = useCallback(() => {
    if (!query.trim() || scan.status === 'running') return;
    setTab('framework');
    void run(query.trim(), profile);
  }, [query, profile, run, scan.status]);

  const handleReset = useCallback(() => {
    reset();
    setTab('overview');
  }, [reset]);

  const handleRunEvaluation = useCallback(() => {
    setTab('testing');
    setTestingSubTab('evaluation');
    void runEvaluation(profile, adversarial, (label) => setEvalScenarioLabel(label));
  }, [profile, adversarial, runEvaluation, setTestingSubTab]);

  const handleResetEvaluation = useCallback(() => {
    resetEvaluation();
    setEvalScenarioLabel(undefined);
  }, [resetEvaluation]);

  const handleRunControlledFailure = useCallback(() => {
    setTab('testing');
    setTestingSubTab('observability');
    setObsProgress(undefined);
    void runControlledFailure(
      query.trim() || EXAMPLES[0],
      profile,
      (phase, label) => setObsProgress(label),
    );
  }, [query, profile, runControlledFailure, setTestingSubTab]);

  const handleResetObservability = useCallback(() => {
    resetObservability();
    setObsProgress(undefined);
  }, [resetObservability]);

  const handleClearShortTerm = useCallback(() => {
    reset();
  }, [reset]);

  const handleClearLongTerm = useCallback(() => {
    setLongTermVersion((v) => v + 1);
    setWelcomeBack(false);
  }, []);

  const researchSignals = useMemo(
    () => scan.results.find((r) => r.agentId === 'research')?.signals ?? [],
    [scan.results],
  );
  const newsSignals = useMemo(
    () => scan.results.find((r) => r.agentId === 'news')?.signals ?? [],
    [scan.results],
  );
  const competitorSignals = useMemo(
    () => newsSignals.filter((s) => s.category === 'competitor'),
    [newsSignals],
  );
  const industrySignals = useMemo(
    () => newsSignals.filter((s) => (s.category as SignalCategory) === 'industry'),
    [newsSignals],
  );

  const running = scan.status === 'running';
  const totalSignals = researchSignals.length + newsSignals.length;
  const done = scan.status === 'done';
  const memEvents = scan.memoryEvents.length;

  return (
    <div className="min-h-screen text-slate-200">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-ink-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-signal-cyan to-signal-blue text-ink-950 shadow-glow">
              <Cpu size={22} />
              <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-signal-cyan opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-signal-cyan" />
              </span>
            </div>
            <div>
              <h1 className="font-display text-lg font-bold tracking-tight text-white">
                AgentX <span className="text-signal-cyan">Intelligence</span>
              </h1>
              <p className="text-[11px] text-slate-500">Autonomous Research & Competitor Tracking</p>
            </div>
          </div>
          <div className="hidden items-center gap-3 sm:flex">
            <Stat label="Agents" value="3" icon={<Cpu size={12} />} />
            <Stat label="Tools" value="3 APIs" icon={<Zap size={12} />} />
            <Stat label="Signals" value={String(totalSignals)} icon={<Activity size={12} />} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
        {/* Welcome Back banner */}
        {welcomeBack && tab === 'overview' && (
          <WelcomeBackBanner onDismiss={() => setWelcomeBack(false)} onViewMemory={() => setMemoryInspectorOpen(true)} />
        )}

        {/* Memory Boost banner */}
        {scan.memoryBoost?.matched && (
          <MemoryBoostBanner message={scan.memoryBoost.message} previousTopics={scan.memoryBoost.previousTopics} />
        )}

        {/* Query bar */}
        <div className="glass mb-5 p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="flex-1">
              <label className="label flex items-center gap-1.5">
                <ScanSearch size={12} /> Intelligence Query
              </label>
              <textarea
                className="input mt-1.5 min-h-[60px] resize-none font-sans"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleRun();
                  }
                }}
                placeholder="Describe what you want the agent council to investigate…"
              />
            </div>
            <div className="flex gap-2">
              <button className="btn-ghost" onClick={() => setMemoryInspectorOpen(true)}>
                <Brain size={14} /> Memory
              </button>
              <button className="btn-ghost" onClick={handleReset} disabled={running}>
                <RotateCcw size={14} /> Reset
              </button>
              <button className="btn-ghost" onClick={handleRunEvaluation} disabled={evalState.status === 'running'}>
                <ClipboardCheck size={14} /> Run Evaluation
              </button>
              <button className="btn-primary" onClick={handleRun} disabled={running || !query.trim()}>
                {running ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                {running ? 'Scanning…' : 'Run Intelligence Scan'}
              </button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {EXAMPLES.map((ex, i) => (
              <button
                key={i}
                onClick={() => setQuery(ex)}
                className="chip border-white/10 bg-white/[0.03] text-slate-400 transition hover:border-signal-cyan/30 hover:text-signal-cyan"
              >
                <Terminal size={10} /> Example {i + 1}
              </button>
            ))}
          </div>
          {scan.error && (
            <p className="mt-3 rounded-lg border border-signal-red/30 bg-signal-red/10 px-3 py-2 text-sm text-signal-red">
              {scan.error}
            </p>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-5 border-b border-white/5">
          <Tabs
            active={tab}
            onChange={setTab}
            tabs={[
              { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={15} /> },
              {
                id: 'agents',
                label: 'Agents',
                icon: <Users size={15} />,
                badge: scan.decisions.length,
              },
              {
                id: 'signals',
                label: 'Signals',
                icon: <SignalIcon size={15} />,
                badge: totalSignals,
              },
              {
                id: 'evidence',
                label: 'Evidence',
                icon: <GitCompareArrows size={15} />,
                badge: scan.tools.length,
              },
              {
                id: 'intelligence',
                label: 'Intelligence',
                icon: <Sparkles size={15} />,
                badge: done ? 1 : undefined,
              },
              {
                id: 'memory',
                label: 'Memory',
                icon: <Brain size={15} />,
                badge: memEvents,
              },
              {
                id: 'framework',
                label: 'Framework',
                icon: <GitBranch size={15} />,
                badge: scan.checkpoints?.length ?? undefined,
              },
              {
                id: 'testing',
                label: 'Testing & Tracing',
                icon: <ClipboardCheck size={15} />,
                badge: (evalState.tests.length || 0) + (obsState.runs.length || 0) || undefined,
              },
            ]}
          />
        </div>

        {/* Tab content */}
        {tab === 'overview' && (
          <OverviewTab
            profile={profile}
            onProfileChange={setProfile}
            scan={scan}
            running={running}
            researchSignals={researchSignals}
            competitorSignals={competitorSignals}
            industrySignals={industrySignals}
            onJump={setTab}
          />
        )}

        {tab === 'agents' && (
          <div className="space-y-5">
            <AgentCouncil statuses={scan.agentStatuses} />
            <div className="grid gap-5 lg:grid-cols-3">
              <DecisionTimeline decisions={scan.decisions} running={running} />
              <CommunicationPanel events={scan.communications} />
              <ToolActivityPanel tools={scan.tools} />
            </div>
          </div>
        )}

        {tab === 'signals' && (
          <div className="grid gap-5 md:grid-cols-3">
            <SignalPanel
              title="Research Signals"
              icon={FileSearch}
              signals={researchSignals}
              emptyLabel="No research signals yet"
            />
            <SignalPanel
              title="Competitor Signals"
              icon={Flame}
              signals={competitorSignals}
              emptyLabel="No competitor signals yet"
            />
            <SignalPanel
              title="Industry / News Signals"
              icon={Newspaper}
              signals={industrySignals}
              emptyLabel="No industry signals yet"
            />
          </div>
        )}

        {tab === 'evidence' && (
          <div className="grid gap-5 lg:grid-cols-3">
            <ToolActivityPanel tools={scan.tools} />
            <EvidencePanel evidence={scan.evidence} results={scan.results} />
            <PriorityAlerts signals={scan.prioritySignals} />
          </div>
        )}

        {tab === 'intelligence' && (
          <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
            <FinalIntelligencePanel intelligence={scan.intelligence} />
            <div className="space-y-5">
              <ArchitecturesCard />
              <ScanMetaCard scan={scan} />
            </div>
          </div>
        )}

        {tab === 'memory' && (
          <div className="grid gap-5 lg:grid-cols-[1fr_400px]">
            <InvestigationMemoryCard
              context={scan.investigationContext}
              memoryEvents={scan.memoryEvents}
              running={running}
            />
            <div className="space-y-5">
              <MemoryWelcomeCard onOpenInspector={() => setMemoryInspectorOpen(true)} />
              <MemoryActivityCard memoryEvents={scan.memoryEvents} />
              <ArchitecturesCard />
            </div>
          </div>
        )}

        {tab === 'framework' && (
          <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
            <div className="space-y-5">
              <GraphView graphState={scan.graphState} />
              <AdversarialControls
                config={adversarial}
                onChange={updateAdversarial}
                disabled={running}
              />
            </div>
            <div className="space-y-5">
              <FrameworkPanel status={scan.frameworkStatus} />
              <CheckpointsCard checkpoints={scan.checkpoints ?? []} />
              <SelfEvaluationCard selfEvaluation={scan.selfEvaluation} />
              <HypothesisCard hypothesis={scan.hypothesis} />
            </div>
          </div>
        )}

        {tab === 'testing' && (
          <div className="space-y-4">
            {/* Sub-tab toggle */}
            <div className="flex gap-2">
              <button
                className={cn(
                  'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition',
                  testingSubTab === 'evaluation'
                    ? 'bg-signal-cyan/10 text-signal-cyan border border-signal-cyan/30'
                    : 'border border-white/5 bg-white/[0.02] text-slate-400 hover:text-slate-200',
                )}
                onClick={() => setTestingSubTab('evaluation')}
              >
                <ClipboardCheck size={14} /> Evaluation
                {evalState.tests.length > 0 && (
                  <span className="rounded-full bg-signal-cyan/15 px-1.5 py-0.5 text-[10px] font-semibold text-signal-cyan">
                    {evalState.tests.length}
                  </span>
                )}
              </button>
              <button
                className={cn(
                  'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition',
                  testingSubTab === 'observability'
                    ? 'bg-signal-cyan/10 text-signal-cyan border border-signal-cyan/30'
                    : 'border border-white/5 bg-white/[0.02] text-slate-400 hover:text-slate-200',
                )}
                onClick={() => setTestingSubTab('observability')}
              >
                <Stethoscope size={14} /> Observability
                {obsState.runs.length > 0 && (
                  <span className="rounded-full bg-signal-cyan/15 px-1.5 py-0.5 text-[10px] font-semibold text-signal-cyan">
                    {obsState.runs.length}
                  </span>
                )}
              </button>
            </div>

            {testingSubTab === 'evaluation' && (
              <EvaluationDashboard
                evalState={evalState}
                onRun={handleRunEvaluation}
                onReset={handleResetEvaluation}
                currentScenarioLabel={evalScenarioLabel}
              />
            )}

            {testingSubTab === 'observability' && (
              <>
                <ObservabilityDashboard
                  obsState={obsState}
                  onRunControlledFailure={handleRunControlledFailure}
                  onReset={handleResetObservability}
                  onClearRuns={clearRuns}
                />
                {obsProgress && obsState.status === 'running' && (
                  <div className="flex items-center gap-2 rounded-lg border border-signal-cyan/20 bg-signal-cyan/5 px-4 py-2 text-sm text-signal-cyan">
                    <Loader2 size={14} className="animate-spin" /> {obsProgress}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Memory Inspector Modal */}
        <MemoryInspector
          open={memoryInspectorOpen}
          onClose={() => setMemoryInspectorOpen(false)}
          shortTerm={scan.investigationContext}
          memoryEvents={scan.memoryEvents}
          onClearShortTerm={handleClearShortTerm}
          onClearLongTerm={handleClearLongTerm}
        />

        <footer className="mt-8 border-t border-white/5 py-6 text-center text-xs text-slate-600">
          <p className="flex items-center justify-center gap-1.5">
            <Sparkles size={12} className="text-signal-cyan" />
            AgentX Intelligence — ReAct reasoning · Multi-agent orchestration · Real external APIs
          </p>
          <p className="mt-1">
            Built by Atharva Deshpande, Mangesh Gofane, Shital Kale, Lavanya Varade
          </p>
        </footer>
      </main>
    </div>
  );
}

/* ---------------- Overview tab ---------------- */

function OverviewTab({
  profile,
  onProfileChange,
  scan,
  running,
  researchSignals,
  competitorSignals,
  industrySignals,
  onJump,
}: {
  profile: MonitoringProfile;
  onProfileChange: (p: MonitoringProfile) => void;
  scan: ReturnType<typeof useScan>['scan'];
  running: boolean;
  researchSignals: ReturnType<typeof useScan>['scan']['results'][number]['signals'];
  competitorSignals: ReturnType<typeof useScan>['scan']['results'][number]['signals'];
  industrySignals: ReturnType<typeof useScan>['scan']['results'][number]['signals'];
  onJump: (t: TabId) => void;
}) {
  const totalSignals = researchSignals.length + competitorSignals.length + industrySignals.length;
  const runningAgents = Object.values(scan.agentStatuses).filter((s) => s === 'WORKING').length;

  return (
    <div className="space-y-5">
      {/* Quick stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickStat
          label="Scan Status"
          value={scan.status === 'idle' ? 'Idle' : scan.status === 'running' ? 'Running' : scan.status === 'done' ? 'Complete' : 'Error'}
          icon={<Activity size={18} />}
          accent={scan.status === 'done' ? 'green' : scan.status === 'running' ? 'cyan' : scan.status === 'error' ? 'red' : 'slate'}
        />
        <QuickStat
          label="Active Agents"
          value={running ? `${runningAgents} working` : '0 working'}
          icon={<Users size={18} />}
          accent={running ? 'cyan' : 'slate'}
        />
        <QuickStat
          label="Total Signals"
          value={String(totalSignals)}
          icon={<SignalIcon size={18} />}
          accent={totalSignals > 0 ? 'cyan' : 'slate'}
        />
        <QuickStat
          label="Evidence Verdict"
          value={scan.evidence?.verdict ?? 'Pending'}
          icon={<GitCompareArrows size={18} />}
          accent={scan.evidence ? (scan.evidence.verdict === 'CONSISTENT' ? 'green' : scan.evidence.verdict === 'CONFLICT' ? 'red' : scan.evidence.verdict === 'PARTIAL' ? 'amber' : 'slate') : 'slate'}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <ProfilePanel profile={profile} onChange={onProfileChange} />
        <div className="space-y-5">
          <AgentCouncil statuses={scan.agentStatuses} />
          {/* Live activity preview */}
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-slate-100">
                  <Cpu size={15} className="text-signal-cyan" /> Recent Decisions
                </h3>
                <button className="text-xs text-slate-500 hover:text-signal-cyan" onClick={() => onJump('agents')}>
                  View all →
                </button>
              </div>
              <div className="glass max-h-[320px] overflow-y-auto scrollbar-thin p-3">
                {scan.decisions.length === 0 ? (
                  <p className="py-6 text-center text-sm text-slate-500">No decisions yet. Run a scan.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {scan.decisions.slice(-6).reverse().map((d) => (
                      <li key={d.id} className="flex gap-2 text-xs">
                        <span className="font-mono text-slate-600">#{d.step}</span>
                        <span className="text-slate-400">{d.text}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-slate-100">
                  <Wrench size={15} className="text-signal-cyan" /> Tool Calls
                </h3>
                <button className="text-xs text-slate-500 hover:text-signal-cyan" onClick={() => onJump('evidence')}>
                  View all →
                </button>
              </div>
              <div className="glass max-h-[320px] overflow-y-auto scrollbar-thin p-3">
                {scan.tools.length === 0 ? (
                  <p className="py-6 text-center text-sm text-slate-500">No tool calls yet.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {scan.tools.map((t) => (
                      <li key={t.id} className="flex items-center justify-between text-xs">
                        <span className="text-slate-300">{t.tool}</span>
                        <span className={t.status === 'SUCCESS' ? 'text-signal-green' : t.status === 'ERROR' ? 'text-signal-red' : t.status === 'CALLING' ? 'text-signal-cyan' : 'text-slate-500'}>
                          {t.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Priority alerts preview */}
      {scan.prioritySignals.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-slate-100">
              <Sparkles size={15} className="text-signal-cyan" /> Top Priority Signals
            </h3>
            <button className="text-xs text-slate-500 hover:text-signal-cyan" onClick={() => onJump('evidence')}>
              View all →
            </button>
          </div>
          <PriorityAlerts signals={scan.prioritySignals} />
        </div>
      )}

      {/* Intelligence preview */}
      {scan.intelligence && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-slate-100">
              <Sparkles size={15} className="text-signal-cyan" /> Final Intelligence
            </h3>
            <button className="text-xs text-slate-500 hover:text-signal-cyan" onClick={() => onJump('intelligence')}>
              Full report →
            </button>
          </div>
          <FinalIntelligencePanel intelligence={scan.intelligence} />
        </div>
      )}
    </div>
  );
}

/* ---------------- Welcome Back banner ---------------- */

function WelcomeBackBanner({ onDismiss, onViewMemory }: { onDismiss: () => void; onViewMemory: () => void }) {
  const mem = loadLongTermMemory();
  if (!mem) return null;
  return (
    <div className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-signal-amber/20 bg-signal-amber/5 px-4 py-3">
      <div className="flex items-center gap-3">
        <Brain size={18} className="text-signal-amber" />
        <div>
          <p className="text-sm font-medium text-slate-100">Welcome back! Your previous monitoring profile is available.</p>
          <p className="mt-0.5 text-xs text-slate-400">
            Previously monitored: {mem.organization || 'N/A'} · {mem.researchTopics.slice(0, 3).join(', ') || 'no topics'}
            {mem.recentQueries.length > 0 && ` · last query: "${mem.recentQueries[0].slice(0, 50)}"`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button className="text-xs text-signal-amber hover:text-signal-amber/80" onClick={onViewMemory}>
          View Memory
        </button>
        <button className="text-xs text-slate-500 hover:text-slate-300" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
}

/* ---------------- Memory Boost banner ---------------- */

function MemoryBoostBanner({ message, previousTopics }: { message: string; previousTopics: string[] }) {
  return (
    <div className="mb-5 flex items-start gap-3 rounded-xl border border-signal-cyan/20 bg-signal-cyan/5 px-4 py-3">
      <Brain size={18} className="mt-0.5 shrink-0 text-signal-cyan" />
      <div>
        <p className="text-sm font-medium text-signal-cyan">Memory Boost</p>
        <p className="mt-0.5 text-xs text-slate-400">{message}</p>
        {previousTopics.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {previousTopics.slice(0, 5).map((t, i) => (
              <span key={i} className="rounded-md border border-signal-cyan/20 bg-signal-cyan/10 px-2 py-0.5 text-xs text-signal-cyan">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Memory Welcome Card ---------------- */

function MemoryWelcomeCard({ onOpenInspector }: { onOpenInspector: () => void }) {
  const mem = loadLongTermMemory();
  return (
    <section className="glass p-4">
      <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-slate-100">
        <Brain size={15} className="text-signal-cyan" /> Long-Term Memory
      </h3>
      {!mem ? (
        <div className="rounded-lg border border-white/5 bg-white/[0.02] px-4 py-6 text-center">
          <p className="text-sm text-slate-500">No previous monitoring context found.</p>
          <p className="mt-1 text-xs text-slate-600">Complete a scan to build persistent memory.</p>
        </div>
      ) : (
        <div className="space-y-2.5 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">Organization</span>
            <span className="font-mono text-slate-200">{mem.organization || 'N/A'}</span>
          </div>
          {mem.researchTopics.length > 0 && (
            <div>
              <span className="text-slate-500">Monitored Topics</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {mem.researchTopics.slice(0, 6).map((t, i) => (
                  <span key={i} className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 text-slate-300">{t}</span>
                ))}
              </div>
            </div>
          )}
          {mem.recentQueries.length > 0 && (
            <div>
              <span className="text-slate-500">Recent Queries</span>
              <ul className="mt-1 space-y-0.5">
                {mem.recentQueries.slice(0, 4).map((q, i) => (
                  <li key={i} className="truncate text-slate-400">{q}</li>
                ))}
              </ul>
            </div>
          )}
          {mem.frequentTopics.length > 0 && (
            <div>
              <span className="text-slate-500">Frequent Topics</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {mem.frequentTopics.slice(0, 6).map((t, i) => (
                  <span key={i} className="rounded-md border border-signal-amber/20 bg-signal-amber/5 px-2 py-0.5 text-signal-amber">{t}</span>
                ))}
              </div>
            </div>
          )}
          <button
            onClick={onOpenInspector}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] py-2 text-xs text-slate-300 transition hover:border-signal-cyan/30 hover:text-signal-cyan"
          >
            <Brain size={12} /> Open Memory Inspector
          </button>
        </div>
      )}
    </section>
  );
}

/* ---------------- Memory Activity Card ---------------- */

function MemoryActivityCard({ memoryEvents }: { memoryEvents: { id: string; step: number; text: string; type: string }[] }) {
  return (
    <section className="glass p-4">
      <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-slate-100">
        <Activity size={15} className="text-signal-cyan" /> Memory Activity
      </h3>
      {memoryEvents.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate-500">No memory events yet. Run a scan.</p>
      ) : (
        <ul className="space-y-2">
          {memoryEvents.map((e) => (
            <li key={e.id} className="flex items-start gap-2.5 text-xs">
              <span
                className={`mt-0.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
                  e.type === 'boost' ? 'bg-signal-amber' :
                  e.type === 'persist' ? 'bg-signal-green' :
                  e.type === 'load' ? 'bg-signal-blue' : 'bg-signal-cyan'
                }`}
              />
              <div>
                <span className="font-mono text-slate-600">#{e.step}</span>{' '}
                <span className={`font-medium ${
                  e.type === 'boost' ? 'text-signal-amber' :
                  e.type === 'persist' ? 'text-signal-green' :
                  e.type === 'load' ? 'text-signal-blue' : 'text-signal-cyan'
                }`}>
                  [{e.type}]
                </span>{' '}
                <span className="text-slate-400">{e.text}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ---------------- Shared sub-components ---------------- */

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-1.5">
      <span className="text-signal-cyan">{icon}</span>
      <div className="leading-tight">
        <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
        <p className="text-xs font-semibold text-slate-200">{value}</p>
      </div>
    </div>
  );
}

function QuickStat({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: 'green' | 'cyan' | 'red' | 'amber' | 'slate';
}) {
  const accentMap = {
    green: 'text-signal-green bg-signal-green/10 border-signal-green/20',
    cyan: 'text-signal-cyan bg-signal-cyan/10 border-signal-cyan/20',
    red: 'text-signal-red bg-signal-red/10 border-signal-red/20',
    amber: 'text-signal-amber bg-signal-amber/10 border-signal-amber/20',
    slate: 'text-slate-400 bg-white/[0.03] border-white/10',
  };
  return (
    <div className="glass flex items-center gap-3 p-4">
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${accentMap[accent]}`}>
        {icon}
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-wider text-slate-500">{label}</p>
        <p className="font-display text-base font-semibold text-slate-100">{value}</p>
      </div>
    </div>
  );
}

function ArchitecturesCard() {
  return (
    <section className="glass p-4">
      <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-slate-100">
        <Cpu size={15} className="text-signal-cyan" /> Architecture
      </h3>
      <div className="space-y-2 text-xs text-slate-400">
        <ArchRow label="User" sub="Submits intelligence query" />
        <ArchArrow />
        <ArchRow label="UNDERSTAND" sub="Classify intent · load memory" accent />
        <ArchArrow />
        <ArchRow label="PLAN" sub="Dynamic task graph" accent />
        <ArchArrow />
        <div className="grid grid-cols-2 gap-2">
          <ArchRow label={AGENT_LABELS.research} sub="OpenAlex · Crossref" compact />
          <ArchRow label={AGENT_LABELS.news} sub="Hacker News" compact />
        </div>
        <ArchArrow />
        <ArchRow label="VERIFY" sub="Conflict detection · evidence correlation" accent />
        <ArchArrow />
        <ArchRow label="SELF-EVALUATE" sub="Goal coverage · replan decision" accent />
        <ArchArrow />
        <ArchRow label="SYNTHESIS" sub="Final intelligence report" accent />
      </div>
    </section>
  );
}

function ArchRow({ label, sub, accent, compact }: { label: string; sub: string; accent?: boolean; compact?: boolean }) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 ${
        accent ? 'border-signal-cyan/30 bg-signal-cyan/5' : 'border-white/5 bg-white/[0.02]'
      } ${compact ? 'text-center' : ''}`}
    >
      <p className={`font-medium ${accent ? 'text-signal-cyan' : 'text-slate-200'}`}>{label}</p>
      <p className="text-[10px] text-slate-500">{sub}</p>
    </div>
  );
}

function ArchArrow() {
  return (
    <div className="flex justify-center text-slate-600">
      <ExternalLink size={12} className="rotate-90" />
    </div>
  );
}

function ScanMetaCard({ scan }: { scan: ReturnType<typeof useScan>['scan'] }) {
  const duration =
    scan.startedAt && scan.finishedAt ? `${((scan.finishedAt - scan.startedAt) / 1000).toFixed(1)}s` : '—';
  return (
    <section className="glass p-4">
      <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-slate-100">
        <Activity size={15} className="text-signal-cyan" /> Scan Telemetry
      </h3>
      <dl className="grid grid-cols-2 gap-2 text-xs">
        <Meta k="Status" v={scan.status} />
        <Meta k="Duration" v={duration} />
        <Meta k="Decisions" v={String(scan.decisions.length)} />
        <Meta k="Messages" v={String(scan.communications.length)} />
        <Meta k="Tool calls" v={String(scan.tools.length)} />
        <Meta k="Results" v={String(scan.results.length)} />
      </dl>
    </section>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
      <dt className="text-[10px] uppercase tracking-wider text-slate-500">{k}</dt>
      <dd className="mt-0.5 font-mono text-sm text-slate-200">{v}</dd>
    </div>
  );
}

/* ---------------- Checkpoints Card ---------------- */

function CheckpointsCard({ checkpoints }: { checkpoints: { id: string; number: number; node: string; label: string; timestamp: number }[] }) {
  return (
    <section className="glass p-4">
      <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-slate-100">
        <GitBranch size={15} className="text-signal-cyan" /> Checkpoints
      </h3>
      {checkpoints.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate-500">No checkpoints yet. Run a scan.</p>
      ) : (
        <ul className="space-y-1.5">
          {checkpoints.map((c) => (
            <li key={c.id} className="flex items-center gap-2.5 text-xs">
              <span className="rounded-md border border-signal-cyan/20 bg-signal-cyan/10 px-1.5 py-0.5 font-mono text-[10px] text-signal-cyan">
                #{c.number}
              </span>
              <span className="text-slate-300">{c.label}</span>
              <span className="ml-auto text-[10px] text-slate-600">{c.node}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ---------------- Self-Evaluation Card ---------------- */

function SelfEvaluationCard({ selfEvaluation }: { selfEvaluation?: { goalCoverage: string; evidenceQuality: string; conflicts: number; missingEvidence: string[]; confidence: string; decision: string; summary: string } }) {
  if (!selfEvaluation) {
    return (
      <section className="glass p-4">
        <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-slate-100">
          <Activity size={15} className="text-signal-cyan" /> Self-Evaluation
        </h3>
        <p className="py-4 text-center text-sm text-slate-500">Self-evaluation will appear after a scan.</p>
      </section>
    );
  }
  const decisionColor: Record<string, string> = {
    PROCEED: 'text-signal-green',
    REPLAN_REQUIRED: 'text-signal-amber',
    TERMINATE_WITH_UNCERTAINTY: 'text-signal-red',
  };
  return (
    <section className="glass p-4">
      <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-slate-100">
        <Activity size={15} className="text-signal-cyan" /> Self-Evaluation
      </h3>
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-slate-500">Goal Coverage</span>
          <span className="font-medium text-slate-200">{selfEvaluation.goalCoverage}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Evidence Quality</span>
          <span className="font-medium text-slate-200">{selfEvaluation.evidenceQuality}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Conflicts</span>
          <span className="font-medium text-slate-200">{selfEvaluation.conflicts}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Confidence</span>
          <span className="font-medium text-slate-200">{selfEvaluation.confidence}</span>
        </div>
        {selfEvaluation.missingEvidence.length > 0 && (
          <div>
            <span className="text-slate-500">Missing Evidence</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {selfEvaluation.missingEvidence.map((m, i) => (
                <span key={i} className="rounded-md border border-signal-amber/20 bg-signal-amber/5 px-2 py-0.5 text-signal-amber">{m}</span>
              ))}
            </div>
          </div>
        )}
        <div className={`rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 ${decisionColor[selfEvaluation.decision] ?? 'text-slate-300'}`}>
          <span className="text-[10px] uppercase tracking-wider text-slate-500">Decision</span>
          <p className="mt-0.5 font-semibold">{selfEvaluation.decision.replace(/_/g, ' ')}</p>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Hypothesis Card ---------------- */

function HypothesisCard({ hypothesis }: { hypothesis?: { text: string; parts: { claim: string; status: string }[]; conclusion: string } }) {
  if (!hypothesis) {
    return (
      <section className="glass p-4">
        <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-slate-100">
          <Sparkles size={15} className="text-signal-cyan" /> Hypothesis Verification
        </h3>
        <p className="py-4 text-center text-sm text-slate-500">Hypothesis will appear after a scan with sufficient evidence.</p>
      </section>
    );
  }
  const statusColor: Record<string, string> = {
    SUPPORTS: 'text-signal-green',
    PARTIALLY_SUPPORTS: 'text-signal-amber',
    CONTRADICTS: 'text-signal-red',
    INSUFFICIENT: 'text-slate-500',
    UNVERIFIED: 'text-slate-500',
  };
  const conclusionColor: Record<string, string> = {
    VERIFIED: 'text-signal-green',
    PARTIALLY_VERIFIED: 'text-signal-amber',
    REFUTED: 'text-signal-red',
    INCONCLUSIVE: 'text-slate-500',
  };
  return (
    <section className="glass p-4">
      <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-slate-100">
        <Sparkles size={15} className="text-signal-cyan" /> Hypothesis Verification
      </h3>
      <div className="space-y-2.5 text-xs">
        <div className="rounded-lg border border-signal-cyan/20 bg-signal-cyan/5 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Hypothesis</p>
          <p className="mt-0.5 text-sm text-slate-200">"{hypothesis.text}"</p>
        </div>
        {hypothesis.parts.map((p, i) => (
          <div key={i} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
            <span className="text-slate-300">{p.claim}</span>
            <span className={`font-medium ${statusColor[p.status] ?? 'text-slate-400'}`}>{p.status.replace(/_/g, ' ')}</span>
          </div>
        ))}
        <div className={`rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 ${conclusionColor[hypothesis.conclusion] ?? 'text-slate-300'}`}>
          <span className="text-[10px] uppercase tracking-wider text-slate-500">Conclusion</span>
          <p className="mt-0.5 font-semibold">{hypothesis.conclusion.replace(/_/g, ' ')}</p>
        </div>
      </div>
    </section>
  );
}
