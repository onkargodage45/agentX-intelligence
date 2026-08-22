import { FlaskConical, Zap, AlertTriangle, Gauge, Newspaper, Database } from 'lucide-react';
import type { AdversarialConfig } from '@/types';
import { cn } from './cn';

interface Props {
  config: AdversarialConfig;
  onChange: (config: Partial<AdversarialConfig>) => void;
  disabled: boolean;
}

export function AdversarialControls({ config, onChange, disabled }: Props) {
  const toggle = (key: keyof AdversarialConfig) => {
    if (key === 'enabled') {
      onChange({ enabled: !config.enabled, mode: !config.enabled ? 'adversarial' : 'live' });
    } else if (key === 'simulateResourceConstraint') {
      onChange({
        simulateResourceConstraint: !config.simulateResourceConstraint,
        maxToolCallsOverride: !config.simulateResourceConstraint ? 3 : null,
      });
    } else {
      onChange({ [key]: !config[key] } as Partial<AdversarialConfig>);
    }
  };

  const modeLabel = config.enabled ? 'ADVERSARIAL TEST MODE' : 'LIVE MODE';
  const modeColor = config.enabled ? 'text-signal-amber' : 'text-signal-green';

  return (
    <section className="glass p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-slate-100">
          <FlaskConical size={15} className="text-signal-amber" />
          Adversarial Test Mode
        </h3>
        <span className={cn('text-xs font-bold tracking-wide', modeColor)}>
          {modeLabel}
        </span>
      </div>

      {/* Enable toggle */}
      <button
        onClick={() => toggle('enabled')}
        disabled={disabled}
        className={cn(
          'mb-3 flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition',
          config.enabled
            ? 'border-signal-amber/40 bg-signal-amber/10 text-signal-amber'
            : 'border-white/10 bg-white/[0.02] text-slate-400',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <span className="flex items-center gap-2">
          <Zap size={14} />
          {config.enabled ? 'Adversarial Mode Active' : 'Enable Adversarial Test Mode'}
        </span>
        <span className={cn('h-5 w-9 rounded-full p-0.5 transition', config.enabled ? 'bg-signal-amber' : 'bg-slate-700')}>
          <span className={cn('block h-4 w-4 rounded-full bg-white transition-transform', config.enabled && 'translate-x-4')} />
        </span>
      </button>

      {config.enabled && (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Simulate Failures</p>

          <ToggleRow
            icon={<Database size={13} />}
            label="Simulate OpenAlex Failure"
            description="Forces OpenAlex to fail → retry → fallback to Crossref"
            active={config.simulateOpenAlexFailure}
            onClick={() => toggle('simulateOpenAlexFailure')}
            disabled={disabled}
          />
          <ToggleRow
            icon={<Newspaper size={13} />}
            label="Simulate News Tool Failure"
            description="Forces Hacker News to fail → retry → mark unavailable"
            active={config.simulateNewsFailure}
            onClick={() => toggle('simulateNewsFailure')}
            disabled={disabled}
          />
          <ToggleRow
            icon={<AlertTriangle size={13} />}
            label="Simulate Conflicting Evidence"
            description="Injects divergent research vs industry signals"
            active={config.simulateConflictingEvidence}
            onClick={() => toggle('simulateConflictingEvidence')}
            disabled={disabled}
          />
          <ToggleRow
            icon={<Gauge size={13} />}
            label="Simulate Low Confidence"
            description="Reduces evidence confidence to trigger replanning"
            active={config.simulateLowConfidence}
            onClick={() => toggle('simulateLowConfidence')}
            disabled={disabled}
          />
          <ToggleRow
            icon={<Zap size={13} />}
            label="Simulate Resource Constraint"
            description="Limits tool budget to 3 calls max"
            active={config.simulateResourceConstraint}
            onClick={() => toggle('simulateResourceConstraint')}
            disabled={disabled}
          />

          {config.simulateResourceConstraint && (
            <div className="rounded-lg border border-signal-amber/20 bg-signal-amber/5 px-3 py-2 text-xs text-signal-amber">
              RESOURCE CONSTRAINT — Tool budget: {config.maxToolCallsOverride ?? 3}
            </div>
          )}
        </div>
      )}

      {!config.enabled && (
        <p className="text-xs text-slate-500">
          Enable to simulate controlled tool failures, evidence conflicts, and resource constraints.
          The orchestrator will recover using the same logic as normal mode.
        </p>
      )}
    </section>
  );
}

function ToggleRow({
  icon,
  label,
  description,
  active,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  active: boolean;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition',
        active
          ? 'border-signal-amber/30 bg-signal-amber/5'
          : 'border-white/5 bg-white/[0.02] hover:border-white/10',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <span className={cn('shrink-0', active ? 'text-signal-amber' : 'text-slate-500')}>{icon}</span>
      <div className="flex-1">
        <p className={cn('text-xs font-medium', active ? 'text-signal-amber' : 'text-slate-300')}>{label}</p>
        <p className="text-[10px] text-slate-500">{description}</p>
      </div>
      <span className={cn('h-4 w-8 rounded-full p-0.5 transition', active ? 'bg-signal-amber' : 'bg-slate-700')}>
        <span className={cn('block h-3 w-3 rounded-full bg-white transition-transform', active && 'translate-x-4')} />
      </span>
    </button>
  );
}
