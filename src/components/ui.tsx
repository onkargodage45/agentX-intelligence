import type { ReactNode } from 'react';

export function Panel({
  title,
  icon,
  action,
  children,
  className = '',
  bodyClassName = '',
}: {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`glass flex flex-col ${className}`}>
      <header className="flex items-center justify-between gap-3 border-b border-white/5 px-4 py-3">
        <div className="flex items-center gap-2">
          {icon && <span className="text-signal-cyan">{icon}</span>}
          <h3 className="font-display text-sm font-semibold tracking-wide text-slate-100">{title}</h3>
        </div>
        {action}
      </header>
      <div className={`flex-1 overflow-y-auto scrollbar-thin p-4 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

export function EmptyState({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center py-8 text-center">
      <div className="mb-2 h-2 w-2 rounded-full bg-slate-600" />
      <p className="text-sm text-slate-500">{label}</p>
      {hint && <p className="mt-1 text-xs text-slate-600">{hint}</p>}
    </div>
  );
}

export function PriorityBadge({ priority }: { priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' }) {
  const styles: Record<string, string> = {
    CRITICAL: 'border-signal-red/40 bg-signal-red/10 text-signal-red',
    HIGH: 'border-signal-amber/40 bg-signal-amber/10 text-signal-amber',
    MEDIUM: 'border-signal-cyan/40 bg-signal-cyan/10 text-signal-cyan',
    LOW: 'border-slate-500/40 bg-slate-500/10 text-slate-400',
  };
  return <span className={`chip ${styles[priority]}`}>{priority}</span>;
}

export function StatusDot({ status }: { status: 'IDLE' | 'WORKING' | 'COMPLETED' | 'ERROR' }) {
  const map = {
    IDLE: 'bg-slate-500',
    WORKING: 'bg-signal-cyan animate-pulseSoft',
    COMPLETED: 'bg-signal-green',
    ERROR: 'bg-signal-red',
  };
  return <span className={`inline-block h-2 w-2 rounded-full ${map[status]}`} />;
}

export function ToolStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    CALLING: 'border-signal-cyan/40 bg-signal-cyan/10 text-signal-cyan animate-pulseSoft',
    SUCCESS: 'border-signal-green/40 bg-signal-green/10 text-signal-green',
    'NO RESULTS': 'border-slate-500/40 bg-slate-500/10 text-slate-400',
    ERROR: 'border-signal-red/40 bg-signal-red/10 text-signal-red',
    UNAVAILABLE: 'border-signal-amber/40 bg-signal-amber/10 text-signal-amber',
  };
  return <span className={`chip ${map[status] ?? map.ERROR}`}>{status}</span>;
}
