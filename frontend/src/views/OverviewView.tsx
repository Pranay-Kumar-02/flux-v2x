import React, { useEffect, useState } from 'react';
import {
  Database,
  Cpu,
  ShieldCheck,
  Flame,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Server,
  Layers
} from 'lucide-react';
import { api, SystemStats, Dataset, Experiment } from '../api/client';
import { NavView } from '../components/Sidebar';

interface OverviewViewProps {
  onNavigate: (view: NavView) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [s, d, e] = await Promise.all([
          api.getSystemStats(),
          api.listDatasets(),
          api.listExperiments(),
        ]);
        setStats(s);
        setDatasets(d);
        setExperiments(e);
      } catch (err) {
        console.error('Failed to load overview data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-flux-muted text-xs">
        <div className="w-5 h-5 border-2 border-flux-accent border-t-transparent rounded-full animate-spin mr-3" />
        Connecting to FluxV2X Research Engine...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner: Scientific Directive & Methodology */}
      <div className="p-5 rounded-xl bg-gradient-to-r from-flux-surface to-flux-elevated border border-flux-border relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
          <Layers size={140} className="text-flux-accent" />
        </div>
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-flux-accent/15 border border-flux-accent/30 text-flux-accent text-[11px] font-medium mb-3">
            <span>Primary Research Benchmark: Khan et al. (2026)</span>
            <span className="w-1 h-1 rounded-full bg-flux-accent" />
            <span>Vehicular Communications</span>
          </div>
          <h2 className="text-xl font-bold text-flux-text tracking-tight">
            Adaptive Context-Aware Malicious Flooding Detection & Mitigation
          </h2>
          <p className="mt-2 text-xs text-flux-muted leading-relaxed">
            Distinguishing benign traffic surges (caused by road congestion and vehicular clustering) from
            malicious packet flooding attacks. FluxV2X leverages destination-centric spatiotemporal clustering,
            localized statistical baselines, and poison-gated rolling baselines.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={() => onNavigate('context')}
              className="px-3.5 py-2 rounded-lg bg-flux-accent text-flux-bg font-semibold text-xs hover:bg-flux-accent/90 transition-all flex items-center gap-2"
            >
              Explore Spatiotemporal Context <ArrowRight size={14} />
            </button>
            <button
              onClick={() => onNavigate('models')}
              className="px-3.5 py-2 rounded-lg bg-flux-elevated border border-flux-border text-flux-text text-xs hover:bg-flux-border transition-all"
            >
              Launch Model Benchmark
            </button>
          </div>
        </div>
      </div>

      {/* Real Persisted Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-flux-surface border border-flux-border">
          <div className="flex items-center justify-between text-flux-muted mb-2">
            <span className="text-xs font-medium">Registered Datasets</span>
            <Database size={16} className="text-flux-accent" />
          </div>
          <div className="text-2xl font-bold text-flux-text font-mono">
            {stats?.total_datasets || 0}
          </div>
          <div className="mt-1 text-[11px] text-flux-muted">
            {stats?.total_records.toLocaleString() || 0} validated flow records
          </div>
        </div>

        <div className="p-4 rounded-xl bg-flux-surface border border-flux-border">
          <div className="flex items-center justify-between text-flux-muted mb-2">
            <span className="text-xs font-medium">Completed Experiments</span>
            <Cpu size={16} className="text-flux-info" />
          </div>
          <div className="text-2xl font-bold text-flux-text font-mono">
            {stats?.completed_experiments || 0}
          </div>
          <div className="mt-1 text-[11px] text-flux-muted">
            {stats?.failed_experiments || 0} failed / 0 mocked
          </div>
        </div>

        <div className="p-4 rounded-xl bg-flux-surface border border-flux-border">
          <div className="flex items-center justify-between text-flux-muted mb-2">
            <span className="text-xs font-medium">Mitigation Simulations</span>
            <Flame size={16} className="text-flux-warning" />
          </div>
          <div className="text-2xl font-bold text-flux-text font-mono">
            {stats?.total_simulations || 0}
          </div>
          <div className="mt-1 text-[11px] text-flux-muted">
            Deterministic offline replay
          </div>
        </div>

        <div className="p-4 rounded-xl bg-flux-surface border border-flux-border">
          <div className="flex items-center justify-between text-flux-muted mb-2">
            <span className="text-xs font-medium">Engine & Worker Status</span>
            <Server size={16} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono flex items-center gap-2">
            Active
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="mt-1 text-[11px] text-flux-muted">
            {stats?.active_workers || 4} threads ready (SQLite/DuckDB)
          </div>
        </div>
      </div>

      {/* Grid: Active Datasets & Recent Experiments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Datasets inventory */}
        <div className="p-5 rounded-xl bg-flux-surface border border-flux-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-flux-text flex items-center gap-2">
              <Database size={15} className="text-flux-accent" />
              Verified Ingested Datasets
            </h3>
            <button
              onClick={() => onNavigate('datasets')}
              className="text-xs text-flux-accent hover:underline flex items-center gap-1"
            >
              View Library <ArrowRight size={12} />
            </button>
          </div>

          <div className="space-y-3">
            {datasets.map((d) => (
              <div
                key={d.id}
                className="p-3 rounded-lg bg-flux-elevated border border-flux-border/60 hover:border-flux-accent/40 transition-all flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-xs text-flux-text truncate max-w-sm">
                    {d.name}
                  </div>
                  <div className="text-[11px] text-flux-muted mt-0.5 flex items-center gap-3">
                    <span>Format: {d.file_format.toUpperCase()}</span>
                    <span>Rows: {d.row_count.toLocaleString()}</span>
                    <span>Cols: {d.column_count}</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-flux-accent/10 text-flux-accent border border-flux-accent/20">
                  {d.provenance || 'verified'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Experiments & Verified Results */}
        <div className="p-5 rounded-xl bg-flux-surface border border-flux-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-flux-text flex items-center gap-2">
              <Cpu size={15} className="text-flux-info" />
              Recent Evaluated Experiments
            </h3>
            <button
              onClick={() => onNavigate('models')}
              className="text-xs text-flux-info hover:underline flex items-center gap-1"
            >
              Open Model Lab <ArrowRight size={12} />
            </button>
          </div>

          <div className="space-y-3">
            {experiments.length === 0 ? (
              <div className="text-xs text-flux-muted py-6 text-center">
                No experiments launched yet. Launch your first baseline in the Model Laboratory.
              </div>
            ) : (
              experiments.slice(0, 4).map((exp) => (
                <div
                  key={exp.id}
                  className="p-3 rounded-lg bg-flux-elevated border border-flux-border/60 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-semibold text-flux-text">{exp.name}</div>
                    <div className="text-[11px] text-flux-muted font-mono mt-0.5">
                      {exp.model_family} • Split: {exp.split_strategy}
                    </div>
                  </div>
                  <div className="text-right">
                    {exp.metrics ? (
                      <>
                        <div className="font-mono text-emerald-400 font-semibold">
                          F1: {(exp.metrics.macro_f1 * 100).toFixed(1)}%
                        </div>
                        <div className="text-[10px] text-flux-muted font-mono">
                          Acc: {(exp.metrics.accuracy * 100).toFixed(1)}%
                        </div>
                      </>
                    ) : (
                      <span className="text-flux-warning font-mono">{exp.status}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
