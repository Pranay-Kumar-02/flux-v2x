import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Plus,
  Layers,
  Activity
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
      <div className="flex items-center justify-center h-72 text-flux-muted text-xs">
        <div className="w-4 h-4 border border-flux-accent border-t-transparent rounded-full animate-spin mr-2.5" />
        Synchronizing analytical telemetry...
      </div>
    );
  }

  const primaryDataset = datasets[0] || null;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* 1. Sophisticated Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-4 border-b border-flux-border">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-mono tracking-widest text-flux-accent uppercase">
              Operational Workspace
            </span>
            <span className="text-flux-muted text-[10px]">•</span>
            <span className="text-[10px] font-mono text-flux-muted">Primary Environment</span>
          </div>
          <h1 className="text-xl font-medium text-flux-text tracking-tight">
            Research Command Center
          </h1>
          <p className="text-xs text-flux-secondary mt-1 max-w-xl">
            Live telemetry ingestion, spatiotemporal mobility clustering, and empirical evaluation metrics for vehicular flooding defenses.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('datasets')}
            className="flux-btn-ghost flex items-center gap-1.5"
          >
            <Plus size={13} className="text-flux-accent" />
            <span>Import Dataset</span>
          </button>
          <button
            onClick={() => onNavigate('models')}
            className="flux-btn-primary flex items-center gap-1.5"
          >
            <span>Launch Experiment</span>
            <ArrowRight size={12} />
          </button>
        </div>
      </div>

      {/* 2. Quiet Operational Status Strip (No Boxed Cards) */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-mono text-flux-secondary py-1 border-b border-flux-border/60">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-flux-sage" />
          <span className="text-flux-muted text-[11px]">API:</span>
          <span className="text-flux-text">REST Online</span>
        </div>
        <span className="text-flux-border hidden sm:inline">|</span>
        <div className="flex items-center gap-2">
          <span className="text-flux-muted text-[11px]">Storage Engine:</span>
          <span className="text-flux-text">Polars / DuckDB</span>
        </div>
        <span className="text-flux-border hidden sm:inline">|</span>
        <div className="flex items-center gap-2">
          <span className="text-flux-muted text-[11px]">Worker Pool:</span>
          <span className="text-flux-text">{stats?.active_workers || 4} threads ready</span>
        </div>
        <span className="text-flux-border hidden sm:inline">|</span>
        <div className="flex items-center gap-2 truncate">
          <span className="text-flux-muted text-[11px]">Active Trace:</span>
          <span className="text-flux-accent truncate max-w-[220px]">
            {primaryDataset ? primaryDataset.name : 'None selected'}
          </span>
        </div>
      </div>

      {/* 3. Refined Key Metrics with Minimal Framing (No heavy rectangles!) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-1">
        <div>
          <div className="text-[10px] font-mono tracking-wider uppercase text-flux-muted">
            Telemetry Datasets
          </div>
          <div className="text-3xl font-light font-mono text-flux-text mt-1.5 tabular-nums">
            {stats?.total_datasets || 0}
          </div>
          <div className="text-[11px] text-flux-secondary mt-1 font-mono">
            {stats?.total_records.toLocaleString() || 0} records
          </div>
        </div>

        <div>
          <div className="text-[10px] font-mono tracking-wider uppercase text-flux-muted">
            Evaluated Models
          </div>
          <div className="text-3xl font-light font-mono text-flux-text mt-1.5 tabular-nums">
            {stats?.completed_experiments || 0}
          </div>
          <div className="text-[11px] text-flux-secondary mt-1">
            Across 10 classifier families
          </div>
        </div>

        <div>
          <div className="text-[10px] font-mono tracking-wider uppercase text-flux-muted">
            Offline Replays
          </div>
          <div className="text-3xl font-light font-mono text-flux-text mt-1.5 tabular-nums">
            {stats?.total_simulations || 0}
          </div>
          <div className="text-[11px] text-flux-secondary mt-1">
            Deterministic defense tests
          </div>
        </div>

        <div>
          <div className="text-[10px] font-mono tracking-wider uppercase text-flux-muted">
            Poison Protection
          </div>
          <div className="text-3xl font-light font-mono text-flux-sage mt-1.5">
            Active
          </div>
          <div className="text-[11px] text-flux-secondary mt-1">
            Rolling baseline gate online
          </div>
        </div>
      </div>

      {/* 4. Asymmetric Content Grid: Real Activity vs Methodological Context */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
        {/* Main Column (8 Cols): Recent Datasets & Experiments */}
        <div className="lg:col-span-8 space-y-8">
          {/* Recent Ingested Datasets List */}
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-flux-border">
              <h2 className="text-xs font-mono uppercase tracking-wider text-flux-secondary">
                Verified Ingestion Telemetry
              </h2>
              <button
                onClick={() => onNavigate('datasets')}
                className="text-[11px] text-flux-accent hover:text-flux-champagne flex items-center gap-1 transition-colors"
              >
                <span>Full Library</span>
                <ArrowRight size={11} />
              </button>
            </div>

            {datasets.length === 0 ? (
              <div className="py-8 text-center text-xs text-flux-muted">
                No datasets ingested yet. Use the Dataset Library to upload CSV or Parquet captures.
              </div>
            ) : (
              <div className="divide-y divide-flux-border/60">
                {datasets.slice(0, 4).map((d) => (
                  <div
                    key={d.id}
                    className="py-3 flex items-center justify-between hover:bg-flux-subsurface/40 px-2 rounded -mx-2 transition-colors"
                  >
                    <div className="min-w-0 pr-4">
                      <div className="text-xs font-medium text-flux-text truncate">
                        {d.name}
                      </div>
                      <div className="text-[11px] text-flux-muted font-mono mt-0.5 flex items-center gap-3">
                        <span>{d.file_format.toUpperCase()}</span>
                        <span>•</span>
                        <span className="tabular-nums">{d.row_count.toLocaleString()} rows</span>
                        <span>•</span>
                        <span>{d.column_count} cols</span>
                        <span>•</span>
                        <span className="text-flux-secondary">{d.provenance || 'verified'}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => onNavigate('schema')}
                      className="text-xs text-flux-muted hover:text-flux-text font-mono text-[11px] shrink-0"
                    >
                      Inspect →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Experiment Results */}
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-flux-border">
              <h2 className="text-xs font-mono uppercase tracking-wider text-flux-secondary">
                Model Evaluations & Results
              </h2>
              <button
                onClick={() => onNavigate('models')}
                className="text-[11px] text-flux-accent hover:text-flux-champagne flex items-center gap-1 transition-colors"
              >
                <span>Model Lab</span>
                <ArrowRight size={11} />
              </button>
            </div>

            {experiments.length === 0 ? (
              <div className="py-8 text-center text-xs text-flux-muted">
                No experiments recorded yet. Run a training session in the Model Laboratory.
              </div>
            ) : (
              <div className="divide-y divide-flux-border/60">
                {experiments.slice(0, 4).map((exp) => (
                  <div
                    key={exp.id}
                    className="py-3 flex items-center justify-between hover:bg-flux-subsurface/40 px-2 rounded -mx-2 transition-colors"
                  >
                    <div className="min-w-0 pr-4">
                      <div className="text-xs font-medium text-flux-text truncate">
                        {exp.name}
                      </div>
                      <div className="text-[11px] text-flux-muted font-mono mt-0.5 flex items-center gap-2">
                        <span>{exp.model_family}</span>
                        <span>•</span>
                        <span>Split: {exp.split_strategy}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {exp.metrics ? (
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="text-[10px] text-flux-muted block font-mono">Macro F1</span>
                            <span className="font-mono text-xs font-semibold text-flux-accent tabular-nums">
                              {(exp.metrics.macro_f1 * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-flux-muted block font-mono">Accuracy</span>
                            <span className="font-mono text-xs text-flux-secondary tabular-nums">
                              {(exp.metrics.accuracy * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-flux-warning font-mono">
                          {exp.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Supporting Column (4 Cols): Research Methodology & Defense Architecture */}
        <div className="lg:col-span-4 space-y-6">
          {/* Editorial Context Panel (Subtle gradient, warm background) */}
          <div className="p-5 rounded bg-gradient-to-b from-flux-surface to-flux-subsurface border border-flux-border/80 space-y-3">
            <div className="flex items-center gap-2 text-xs font-medium text-flux-text">
              <Layers size={14} className="text-flux-accent" />
              <span>ACAFDM Architecture</span>
            </div>
            <p className="text-xs text-flux-secondary leading-relaxed font-normal">
              Dual-gate framework distinguishing road congestion surges from packet flooding attacks via destination-centric clustering and dynamic z-score baselines.
            </p>
            <div className="pt-2 border-t border-flux-border/60 space-y-1.5 text-xs">
              <div className="flex justify-between text-flux-secondary">
                <span className="text-flux-muted">Reference:</span>
                <span className="font-mono text-[11px] text-flux-text">Khan et al. (2026)</span>
              </div>
              <div className="flex justify-between text-flux-secondary">
                <span className="text-flux-muted">Publication:</span>
                <span className="font-mono text-[11px] text-flux-text">Vehicular Comms</span>
              </div>
              <div className="flex justify-between text-flux-secondary">
                <span className="text-flux-muted">Validation:</span>
                <span className="font-mono text-[11px] text-flux-text">2-Tailed McNemar</span>
              </div>
              <div className="flex justify-between text-flux-secondary">
                <span className="text-flux-muted">Execution:</span>
                <span className="font-mono text-[11px] text-flux-text">Deterministic Offline</span>
              </div>
            </div>
            <div className="pt-2">
              <button
                onClick={() => onNavigate('context')}
                className="w-full py-1.5 px-3 rounded bg-flux-elevated text-flux-secondary hover:text-flux-text text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Inspect Context Dynamics</span>
                <ArrowRight size={11} />
              </button>
            </div>
          </div>

          {/* Quality & Security Safeguards (Unboxed, pure typography & alignment) */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-mono uppercase tracking-wider text-flux-secondary">
              Security Safeguards
            </h3>
            <div className="space-y-2.5 text-xs">
              <div>
                <div className="font-medium text-flux-text">PyJWT Signature Enforcement</div>
                <p className="text-[11px] text-flux-muted mt-0.5 leading-normal">
                  Strict asymmetric and HS256 signature verification with fail-closed 401 challenge.
                </p>
              </div>
              <div>
                <div className="font-medium text-flux-text">Workspace Isolation</div>
                <p className="text-[11px] text-flux-muted mt-0.5 leading-normal">
                  Tenant boundaries enforced at query time across all datasets and experiment logs.
                </p>
              </div>
              <div>
                <div className="font-medium text-flux-text">Bounded Ingestion Quota</div>
                <p className="text-[11px] text-flux-muted mt-0.5 leading-normal">
                  100MB chunked streaming limit to prevent memory exhaustion and zip-slip attacks.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
