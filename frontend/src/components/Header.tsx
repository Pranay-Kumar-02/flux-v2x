import React from 'react';
import { Database, ShieldCheck, Terminal, HelpCircle } from 'lucide-react';
import { Dataset } from '../api/client';

interface HeaderProps {
  title: string;
  subtitle: string;
  activeDataset?: Dataset | null;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, activeDataset }) => {
  return (
    <header className="h-16 border-b border-flux-border bg-flux-surface/60 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-10">
      <div>
        <h2 className="text-sm font-semibold text-flux-text flex items-center gap-2">
          {title}
        </h2>
        <p className="text-[11px] text-flux-muted">{subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Active Dataset Pill */}
        {activeDataset ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-flux-elevated border border-flux-border text-xs text-flux-text">
            <Database size={13} className="text-flux-accent" />
            <span className="font-mono text-[11px] truncate max-w-[220px]">{activeDataset.name}</span>
            <span className="text-[10px] text-flux-muted font-mono">({activeDataset.row_count} rows)</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-flux-elevated/40 border border-flux-border/40 text-xs text-flux-muted">
            <Database size={13} />
            <span className="text-[11px]">No active dataset selected</span>
          </div>
        )}

        {/* Security Baseline Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-flux-info/10 text-flux-info border border-flux-info/20 text-[11px] font-medium">
          <ShieldCheck size={13} />
          <span>Poison Gate: Active</span>
        </div>

        <div className="h-4 w-[1px] bg-flux-border mx-1" />

        {/* User Pill */}
        <div className="flex items-center gap-2 text-xs text-flux-muted">
          <div className="w-6 h-6 rounded-full bg-flux-accent/20 border border-flux-accent/40 flex items-center justify-center text-[10px] font-bold text-flux-accent">
            PR
          </div>
          <span className="text-flux-text text-[11px] font-medium hidden sm:inline">Lead Researcher</span>
        </div>
      </div>
    </header>
  );
};
