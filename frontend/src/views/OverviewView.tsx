import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Plus,
  Layers,
  CheckCircle2,
  FileCode,
  Sparkles
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
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* 1. Page Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-flux-accent/10 border border-flux-accent/20 text-flux-accent text-[11px] font-medium mb-1.5">
            <Sparkles size={11} />
            <span>Workspace: Primary Research Environment</span>
          </div>
          <h1 className="text-2xl font-semibold text-flux-text tracking-tight">
            Research Command Center
          </h1>
          <p className="text-xs text-flux-secondary mt-1 max-w-xl leading-relaxed">
            Operational status, telemetry ingestion pipeline, and verified empirical model evaluations for vehicular flooding defenses.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigate('datasets')}
            className="flux-btn-secondary flex items-center gap-1.5"
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

      {/* 2. Quiet Operational Status Strip */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-xs text-flux-secondary px-4 py-2.5 rounded-lg bg-flux-surface/60 border border-white/[0.04]">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-flux-sage" />
          <span className="text-flux-muted text-[11px]">API Core:</span>
          <span className="font-medium text-flux-text">REST Online</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-flux-muted text-[11px]">Data Engine:</span>
          <span className="text-flux-text font-medium">Polars / DuckDB</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-flux-muted text-[11px]">Worker Pool:</span>
          <span className="text-flux-text font-medium">{stats?.active_workers || 4} threads ready</span>
        </div>
        <div className="flex items-center gap-2 truncate">
          <span className="text-flux-muted text-[11px]">Active Trace:</span>
          <span className="text-flux-accent truncate max-w-[240px] font-medium">
            {primaryDataset ? primaryDataset.name : 'None selected'}
          </span>
        </div>
      </div>

      {/* 3. Refined Key Metrics Row in Cohesive Surface */}
      <div className="flux-panel p-5 grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="md:pr-6 md:border-r border-flux-border/60">
          <div className="text-xs font-medium text-flux-muted">
            Telemetry Datasets
          </div>
          <div className="text-2xl font-semibold tracking-tight text-flux-text mt-1.5 font-mono tabular-nums">
            {stats?.total_datasets || 0}
          </div>
          <div className="text-[11px] text-flux-secondary mt-0.5 font-mono">
            {stats?.total_records.toLocaleString() || 0} validated records
          </div>
        </div>

        <div className="md:pr-6 md:border-r border-flux-border/60">
          <div className="text-xs font-medium text-flux-muted">
            Evaluated Models
          </div>
          <div className="text-2xl font-semibold tracking-tight text-flux-text mt-1.5 font-mono tabular-nums">
            {stats?.completed_experiments || 0}
          </div>
          <div className="text-[11px] text-flux-secondary mt-0.5">
            Across 10 classifier families
          </div>
        </div>

        <div className="md:pr-6 md:border-r border-flux-border/60">
          <div className="text-xs font-medium text-flux-muted">
            Offline Replays
          </div>
          <div className="text-2xl font-semibold tracking-tight text-flux-text mt-1.5 font-mono tabular-nums">
            {stats?.total_simulations || 0}
          </div>
          <div className="text-[11px] text-flux-secondary mt-0.5">
            Deterministic defense tests
          </div>
        </div>

        <div>
          <div className="text-xs font-medium text-flux-muted">
            Poison Protection
          </div>
          <div className="text-2xl font-semibold tracking-tight text-flux-sage mt-1.5">
            Active
          </div>
          <div className="text-[11px] text-flux-secondary mt-0.5">
            Rolling baseline gate online
          </div>
        </div>
      </div>

      {/* 4. Asymmetric Content Grid: Real Activity vs Methodological Context */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Column (8 Cols): Recent Datasets & Experiments */}
        <div className="lg:col-span-8 space-y-6">
          {/* Recent Ingested Datasets Panel */}
          <div className="flux-panel p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-flux-border/60">
              <div>
                <h2 className="text-sm font-medium text-flux-text tracking-tight">
                  Verified Telemetry Datasets
                </h2>
                <p className="text-[11px] text-flux-muted mt-0.5 font-normal">
                  Ingested network captures with verified cryptographic checksums
                </p>
              </div>
              <button
                onClick={() => onNavigate('datasets')}
                className="text-xs text-flux-accent hover:text-flux-champagne font-medium flex items-center gap-1 transition-colors"
              >
                <span>View Library</span>
                <ArrowRight size={11} />
              </button>
            </div>

            {datasets.length === 0 ? (
              <div className="py-8 text-center text-xs text-flux-muted">
                No datasets ingested yet. Use the Dataset Library to upload CSV or Parquet captures.
              </div>
            ) : (
              <div className="divide-y divide-flux-border/40">
                {datasets.slice(0, 4).map((d) => (
                  <div
                    key={d.id}
                    className="py-3 flex items-center justify-between hover:bg-flux-subsurface/40 px-2.5 rounded-lg -mx-2.5 transition-colors"
                  >
                    <div className="min-w-0 pr-4">
                      <div className="text-xs font-medium text-flux-text truncate">
                        {d.name}
                      </div>
                      <div className="text-[11px] text-flux-muted mt-0.5 flex items-center gap-2.5">
                        <span className="font-mono uppercase text-[10px] text-flux-secondary">{d.file_format}</span>
                        <span>•</span>
                        <span className="font-mono tabular-nums">{d.row_count.toLocaleString()} rows</span>
                        <span>•</span>
                        <span>{d.column_count} columns</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-flux-subsurface text-flux-secondary font-medium border border-white/[0.04]">
                        {d.provenance || 'verified'}
                      </span>
                      <button
                        onClick={() => onNavigate('schema')}
                        className="text-xs text-flux-muted hover:text-flux-text p-1 transition-colors"
                        title="Inspect Schema"
                      >
                        <FileCode size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Experiment Results Panel */}
          <div className="flux-panel p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-flux-border/60">
              <div>
                <h2 className="text-sm font-medium text-flux-text tracking-tight">
                  Model Evaluations & Findings
                </h2>
                <p className="text-[11px] text-flux-muted mt-0.5 font-normal">
                  Recent empirical evaluations under disjoint scenario partitions
                </p>
              </div>
              <button
                onClick={() => onNavigate('models')}
                className="text-xs text-flux-accent hover:text-flux-champagne font-medium flex items-center gap-1 transition-colors"
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
              <div className="divide-y divide-flux-border/40">
                {experiments.slice(0, 4).map((exp) => (
                  <div
                    key={exp.id}
                    className="py-3 flex items-center justify-between hover:bg-flux-subsurface/40 px-2.5 rounded-lg -mx-2.5 transition-colors"
                  >
                    <div className="min-w-0 pr-4">
                      <div className="text-xs font-medium text-flux-text truncate">
                        {exp.name}
                      </div>
                      <div className="text-[11px] text-flux-muted mt-0.5 flex items-center gap-2">
                        <span>{exp.model_family}</span>
                        <span>•</span>
                        <span>Split: {exp.split_strategy}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {exp.metrics ? (
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="text-[10px] text-flux-muted block font-normal">Macro-F1</span>
                            <span className="font-mono text-xs font-semibold text-flux-accent tabular-nums">
                              {(exp.metrics.macro_f1 * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-flux-muted block font-normal">Accuracy</span>
                            <span className="font-mono text-xs text-flux-secondary tabular-nums">
                              {(exp.metrics.accuracy * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-flux-warning font-medium px-2 py-0.5 rounded bg-flux-subsurface">
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

        {/* Supporting Column (4 Cols): Research Methodology & Safeguards */}
        <div className="lg:col-span-4 space-y-6">
          {/* Focal Panel with Subtle Ambient Radial Gradient */}
          <div className="flux-panel-focal p-5 space-y-3.5">
            <div className="flex items-center gap-2 text-sm font-medium text-flux-text tracking-tight">
              <Layers size={15} className="text-flux-accent" />
              <span>ACAFDM Architecture</span>
            </div>
            <p className="text-xs text-flux-secondary leading-relaxed font-normal">
              Dual-gate detection framework that distinguishes road congestion surges from malicious flooding attacks via destination-centric clustering and dynamic z-score baselines.
            </p>
            <div className="pt-2 border-t border-flux-border/60 space-y-2 text-xs">
              <div className="flex justify-between text-flux-secondary">
                <span className="text-flux-muted">Reference:</span>
                <span className="font-medium text-flux-text">Khan et al. (2026)</span>
              </div>
              <div className="flex justify-between text-flux-secondary">
                <span className="text-flux-muted">Publication:</span>
                <span className="font-medium text-flux-text">Vehicular Comms</span>
              </div>
              <div className="flex justify-between text-flux-secondary">
                <span className="text-flux-muted">Hypothesis Test:</span>
                <span className="font-medium text-flux-text">2-Tailed McNemar</span>
              </div>
              <div className="flex justify-between text-flux-secondary">
                <span className="text-flux-muted">Execution Mode:</span>
                <span className="font-medium text-flux-text">Deterministic Offline</span>
              </div>
            </div>
            <div className="pt-2">
              <button
                onClick={() => onNavigate('context')}
                className="w-full py-2 px-3 rounded-md bg-flux-surface hover:bg-flux-elevated border border-white/[0.06] text-flux-text text-xs font-medium transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span>Inspect Context Dynamics</span>
                <ArrowRight size={11} />
              </button>
            </div>
          </div>

          {/* Quality & Security Safeguards Panel */}
          <div className="flux-panel p-5 space-y-3.5">
            <h3 className="text-sm font-medium text-flux-text tracking-tight">
              Security Safeguards
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={14} className="text-flux-sage mt-0.5 shrink-0" />
                <div>
                  <div className="font-medium text-flux-text">Signature Verification</div>
                  <p className="text-[11px] text-flux-secondary mt-0.5 leading-normal font-normal">
                    Strict PyJWT signature enforcement with fail-closed 401 challenge on expired or forged tokens.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={14} className="text-flux-sage mt-0.5 shrink-0" />
                <div>
                  <div className="font-medium text-flux-text">Workspace Isolation</div>
                  <p className="text-[11px] text-flux-secondary mt-0.5 leading-normal font-normal">
                    Tenant boundaries validated at query time across all dataset versions and experiment records.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={14} className="text-flux-sage mt-0.5 shrink-0" />
                <div>
                  <div className="font-medium text-flux-text">Bounded Ingestion Quota</div>
                  <p className="text-[11px] text-flux-secondary mt-0.5 leading-normal font-normal">
                    100MB chunked streaming limit to prevent memory exhaustion and zip-slip attacks.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
