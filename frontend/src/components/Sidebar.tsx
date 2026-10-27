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
  Network
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
    { id: 'overview', label: 'Command Center', icon: <LayoutDashboard size={18} /> },
    { id: 'datasets', label: 'Dataset Library', icon: <Database size={18} /> },
    { id: 'schema', label: 'Schema & Feature Lab', icon: <SlidersHorizontal size={18} /> },
    { id: 'context', label: 'Network Context Explorer', icon: <Compass size={18} /> },
    { id: 'models', label: 'Model Laboratory', icon: <Cpu size={18} /> },
    { id: 'acafdm', label: 'ACAFDM Engine', icon: <ShieldAlert size={18} />, badge: 'Adaptive' },
    { id: 'benchmarks', label: 'Benchmark Center', icon: <BarChart3 size={18} /> },
    { id: 'simulator', label: 'Mitigation Simulator', icon: <Flame size={18} /> },
    { id: 'inspector', label: 'Experiment Inspector', icon: <FileSearch size={18} /> },
    { id: 'audit', label: 'Audit & System Health', icon: <Activity size={18} /> },
  ];

  return (
    <aside className="w-64 bg-flux-surface border-r border-flux-border flex flex-col h-screen sticky top-0 select-none z-20">
      {/* Brand Header */}
      <div className="p-5 border-b border-flux-border flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-flux-accent/15 border border-flux-accent/30 flex items-center justify-center text-flux-accent">
          <Network size={22} className="animate-pulse" />
        </div>
        <div>
          <h1 className="font-bold text-base tracking-wide text-flux-text flex items-center gap-1.5">
            FluxV2X
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-flux-accent/20 text-flux-accent font-semibold">
              v0.1
            </span>
          </h1>
          <p className="text-[11px] text-flux-muted truncate">ACAFDM Security Workbench</p>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-semibold tracking-wider text-flux-muted/70 uppercase">
          Research Workstation
        </div>
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-flux-elevated text-flux-accent border border-flux-accent/30 shadow-sm'
                  : 'text-flux-muted hover:text-flux-text hover:bg-flux-elevated/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={isActive ? 'text-flux-accent' : 'text-flux-muted'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-flux-accent/15 text-flux-accent border border-flux-accent/20">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-flux-border text-[11px] text-flux-muted/80 bg-flux-bg/30">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-flux-text font-medium text-xs">VCN Engine Online</span>
        </div>
        <p className="mt-1 text-[10px] text-flux-muted">Khan et al. (2026) Base Reproduction</p>
      </div>
    </aside>
  );
};
