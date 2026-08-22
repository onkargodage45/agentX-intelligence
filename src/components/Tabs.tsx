import { useEffect, useState } from 'react';
import { cn } from './cn';

export type TabId = 'overview' | 'agents' | 'signals' | 'evidence' | 'intelligence' | 'memory' | 'framework' | 'testing';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: Tab[];
  active: TabId;
  onChange: (id: TabId) => void;
}) {
  // Persist active tab across reloads for convenience.
  const [stored, setStored] = useState<TabId>(() => {
    try {
      const v = localStorage.getItem('agentx.tab');
      return (v as TabId) || 'overview';
    } catch {
      return 'overview';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('agentx.tab', stored);
    } catch {
      /* ignore */
    }
  }, [stored]);

  // Sync external active state into stored when it changes (e.g. auto-jump after scan).
  useEffect(() => {
    setStored(active);
  }, [active]);

  return (
    <nav className="flex gap-1 overflow-x-auto scrollbar-thin">
      {tabs.map((t) => {
        const isActive = stored === t.id;
        return (
          <button
            key={t.id}
            onClick={() => {
              setStored(t.id);
              onChange(t.id);
            }}
            className={cn(
              'group relative flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition',
              isActive
                ? 'bg-white/[0.06] text-white'
                : 'text-slate-400 hover:bg-white/[0.03] hover:text-slate-200',
            )}
          >
            <span className={cn(isActive ? 'text-signal-cyan' : 'text-slate-500 group-hover:text-slate-300')}>
              {t.icon}
            </span>
            {t.label}
            {typeof t.badge === 'number' && t.badge > 0 && (
              <span className="ml-0.5 rounded-full bg-signal-cyan/15 px-1.5 py-0.5 text-[10px] font-semibold text-signal-cyan">
                {t.badge}
              </span>
            )}
            {isActive && (
              <span className="absolute inset-x-2 -bottom-px h-px bg-gradient-to-r from-transparent via-signal-cyan to-transparent" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
