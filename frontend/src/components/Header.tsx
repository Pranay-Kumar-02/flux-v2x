import React from 'react';
import { Database, ShieldCheck } from 'lucide-react';
import { Dataset } from '../api/client';

interface HeaderProps {
  title: string;
  subtitle: string;
  activeDataset?: Dataset | null;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, activeDataset }) => {
  return (
    <header className="h-12 border-b border-flux-border bg-flux-shell/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-10 select-none">
      <div className="flex items-center gap-3">
        <h2 className="text-xs font-medium text-flux-text tracking-tight">
          {title}
        </h2>
        <span className="text-flux-muted text-xs">/</span>
        <p className="text-[11px] text-flux-secondary font-normal truncate max-w-md">{subtitle}</p>
      </div>

      <div className="flex items-center gap-4 text-xs">
        {/* Active Dataset */}
        {activeDataset ? (
          <div className="flex items-center gap-1.5 text-flux-secondary">
            <Database size={12} className="text-flux-accent" />
            <span className="font-mono text-[11px] text-flux-text truncate max-w-[180px]">{activeDataset.name}</span>
            <span className="text-[10px] text-flux-muted font-mono tabular-nums">({activeDataset.row_count.toLocaleString()} rows)</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-flux-muted text-[11px]">
            <Database size={12} />
            <span>No active trace</span>
          </div>
        )}

        <div className="h-3 w-[1px] bg-flux-border" />

        {/* Security Baseline Status */}
        <div className="flex items-center gap-1.5 text-[11px] text-flux-sage">
          <span className="w-1.5 h-1.5 rounded-full bg-flux-sage" />
          <span>Poison Gate Active</span>
        </div>

        <div className="h-3 w-[1px] bg-flux-border" />

        {/* User Pill */}
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-mono font-medium bg-flux-surface text-flux-accent">
            PK
          </div>
          <span className="text-flux-secondary text-[11px] hidden sm:inline">Lead Researcher</span>
        </div>
      </div>
    </header>
  );
};
