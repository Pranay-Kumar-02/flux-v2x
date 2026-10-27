import React from 'react';
import {
  LayoutDashboard,
  Database,
  SlidersHorizontal,
  Compass,
  Cpu,
  ShieldAlert,
  BarChart3,
  Flame,
  FileSearch,
  Activity,
  Layers
} from 'lucide-react';

export type NavView =
  | 'overview'
  | 'datasets'
  | 'schema'
  | 'context'
  | 'models'
  | 'acafdm'
  | 'benchmarks'
  | 'simulator'
  | 'inspector'
  | 'audit';

interface SidebarProps {
  currentView: NavView;
  onNavigate: (view: NavView) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate }) => {
  const navItems: { id: NavView; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'overview', label: 'Command Center', icon: <LayoutDashboard size={14} /> },
    { id: 'datasets', label: 'Dataset Library', icon: <Database size={14} /> },
    { id: 'schema', label: 'Schema & Feature Lab', icon: <SlidersHorizontal size={14} /> },
    { id: 'context', label: 'Context Explorer', icon: <Compass size={14} /> },
    { id: 'models', label: 'Model Laboratory', icon: <Cpu size={14} /> },
    { id: 'acafdm', label: 'ACAFDM Engine', icon: <ShieldAlert size={14} />, badge: 'Dual-Gate' },
    { id: 'benchmarks', label: 'Benchmark Center', icon: <BarChart3 size={14} /> },
    { id: 'simulator', label: 'Mitigation Simulator', icon: <Flame size={14} /> },
    { id: 'inspector', label: 'Experiment Inspector', icon: <FileSearch size={14} /> },
    { id: 'audit', label: 'Audit & Health', icon: <Activity size={14} /> },
  ];

  return (
    <aside className="w-56 bg-flux-shell border-r border-flux-border flex flex-col h-screen sticky top-0 select-none z-20 shrink-0">
      {/* Brand Header */}
      <div className="h-13 px-4 border-b border-flux-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded flex items-center justify-center bg-flux-surface text-flux-accent">
            <Layers size={14} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-xs tracking-tight text-flux-text">FluxV2X</span>
            <span className="text-[9px] font-mono text-flux-muted px-1 rounded bg-flux-surface">
              v0.2.0
            </span>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        <div className="px-2.5 pt-2 pb-1.5 text-[9px] font-mono tracking-wider text-flux-muted uppercase">
          Workspace
        </div>
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition-colors text-left ${
                isActive
                  ? 'bg-flux-subsurface text-flux-text font-medium'
                  : 'text-flux-secondary hover:text-flux-text hover:bg-flux-subsurface/60'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <span className={isActive ? 'text-flux-accent' : 'text-flux-muted'}>
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[9px] px-1 py-0.2 rounded font-mono text-flux-accent bg-flux-surface">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-flux-border text-[10px] bg-flux-shell">
        <div className="flex items-center justify-between text-flux-secondary">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-flux-sage" />
            <span className="text-[11px]">ACAFDM Engine Active</span>
          </div>
          <span className="font-mono text-[9px] text-flux-muted">Khan '26</span>
        </div>
      </div>
    </aside>
  );
};
