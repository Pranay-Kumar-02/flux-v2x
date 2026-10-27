import React from 'react';
import { Database } from 'lucide-react';
import { Dataset } from '../api/client';

interface HeaderProps {
  title: string;
  subtitle: string;
  activeDataset?: Dataset | null;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, activeDataset }) => {
  return (
    <header className="h-13 border-b border-flux-border/60 bg-flux-shell/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-10 select-none">
      <div className="flex items-center gap-2.5">
        <h2 className="text-xs font-medium text-flux-text tracking-tight">
          {title}
        </h2>
        <span className="text-flux-muted/50 text-xs">/</span>
        <p className="text-xs text-flux-secondary font-normal truncate max-w-md">{subtitle}</p>
      </div>

      <div className="flex items-center gap-4 text-xs">
        {/* Active Dataset */}
        {activeDataset ? (
          <div className="flex items-center gap-2 text-flux-secondary">
            <Database size={13} className="text-flux-accent" />
            <span className="text-xs text-flux-text truncate max-w-[180px] font-medium">{activeDataset.name}</span>
            <span className="text-[11px] text-flux-muted font-mono tabular-nums">({activeDataset.row_count.toLocaleString()} rows)</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-flux-muted text-xs">
            <Database size={13} />
            <span>No active trace</span>
          </div>
        )}

        <div className="h-3 w-[1px] bg-flux-border/80" />

        {/* Security Baseline Status */}
        <div className="flex items-center gap-1.5 text-xs text-flux-sage">
          <span className="w-1.5 h-1.5 rounded-full bg-flux-sage" />
          <span className="font-medium text-[11px]">Poison Gate Active</span>
        </div>

        <div className="h-3 w-[1px] bg-flux-border/80" />

        {/* User Pill */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-medium bg-flux-surface border border-white/[0.06] text-flux-accent">
            PK
          </div>
          <span className="text-flux-secondary text-xs hidden sm:inline font-medium">Lead Researcher</span>
        </div>
      </div>
    </header>
  );
};
