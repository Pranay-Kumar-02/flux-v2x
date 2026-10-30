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
  Layers,
  Radio
} from 'lucide-react';

export type NavView =
  | 'overview'
  | 'cosim'
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
    { id: 'overview', label: 'Command Center', icon: <LayoutDashboard size={15} /> },
    { id: 'cosim', label: 'Co-Simulation Studio', icon: <Radio size={15} />, badge: 'NS-3 + SUMO' },
    { id: 'datasets', label: 'Dataset Library', icon: <Database size={15} /> },
    { id: 'schema', label: 'Schema & Feature Lab', icon: <SlidersHorizontal size={15} /> },
    { id: 'context', label: 'Context Explorer', icon: <Compass size={15} /> },
    { id: 'models', label: 'Model Laboratory', icon: <Cpu size={15} /> },
    { id: 'acafdm', label: 'ACAFDM Engine', icon: <ShieldAlert size={15} />, badge: 'Dual-Gate' },
    { id: 'benchmarks', label: 'Benchmark Center', icon: <BarChart3 size={15} /> },
    { id: 'simulator', label: 'Mitigation Simulator', icon: <Flame size={15} /> },
    { id: 'inspector', label: 'Experiment Inspector', icon: <FileSearch size={15} /> },
    { id: 'audit', label: 'Audit & Health', icon: <Activity size={15} /> },
  ];

  return (
    <aside className="w-60 bg-flux-shell border-r border-flux-border/60 flex flex-col h-screen sticky top-0 select-none z-20 shrink-0">
      {/* Brand Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-flux-border/40">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-b from-flux-surface to-flux-subsurface border border-flux-border text-flux-accent shadow-sm">
            <Layers size={15} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-xs tracking-tight text-flux-text">FluxV2X</span>
              <span className="text-[9px] font-mono text-flux-muted px-1.5 py-0.2 rounded bg-flux-subsurface">
                v0.2.0
              </span>
            </div>
            <p className="text-[10px] text-flux-muted font-normal">Security Research Platform</p>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-2.5 py-4 space-y-1">
        <div className="px-2 pb-1.5 text-[11px] font-medium text-flux-muted/80">
          Navigation
        </div>
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all text-left ${
                isActive
                  ? 'bg-flux-subsurface text-flux-text font-medium shadow-sm'
                  : 'text-flux-secondary hover:text-flux-text hover:bg-flux-subsurface/40'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <span className={isActive ? 'text-flux-accent' : 'text-flux-muted'}>
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[9px] px-1.5 py-0.2 rounded font-sans text-flux-accent bg-flux-elevated">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-3.5 border-t border-flux-border/40 text-[11px] bg-flux-shell">
        <div className="flex items-center justify-between text-flux-secondary">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-flux-sage" />
            <span className="text-[11px] font-normal">ACAFDM Defense Active</span>
          </div>
          <span className="text-[10px] text-flux-muted font-medium">Khan '26</span>
        </div>
      </div>
    </aside>
  );
};
