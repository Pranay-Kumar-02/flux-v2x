import React, { useState, useEffect } from 'react';
import { Play, CheckCircle2, Ban, ShieldAlert, Sparkles } from 'lucide-react';
import { api, Dataset, ACAFDMConfig, ACAFDMRunResult } from '../api/client';

interface AcafdmViewProps {
  activeDataset?: Dataset | null;
}

export const AcafdmView: React.FC<AcafdmViewProps> = ({ activeDataset }) => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [configs, setConfigs] = useState<ACAFDMConfig[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string>('');
  const [result, setResult] = useState<ACAFDMRunResult | null>(null);
  const [evaluating, setEvaluating] = useState<boolean>(false);

  // Form parameters
  const [clusterCount, setClusterCount] = useState<number>(4);
  const [alphaRate, setAlphaRate] = useState<number>(0.08);
  const [zThreshold, setZThreshold] = useState<number>(2.5);
  const [persistenceK, setPersistenceK] = useState<number>(3);
  const [poisonGate, setPoisonGate] = useState<boolean>(true);

  useEffect(() => {
    async function init() {
      const [dsList, cfgList] = await Promise.all([
        api.listDatasets(),
        api.listACAFDMConfigs(),
      ]);
      setDatasets(dsList);
      setConfigs(cfgList);

      if (activeDataset) {
        setSelectedDatasetId(activeDataset.id);
      } else if (dsList.length > 0) {
        setSelectedDatasetId(dsList[0].id);
      }

      if (cfgList.length > 0) {
        setSelectedConfigId(cfgList[0].id);
        const c = cfgList[0];
        setClusterCount(c.cluster_count);
        setAlphaRate(c.alpha_update_rate);
        setZThreshold(c.z_threshold);
        setPersistenceK(c.persistence_k);
        setPoisonGate(c.benign_validation_gate);
      }
    }
    init();
  }, [activeDataset]);

  const handleRunEvaluation = async () => {
    if (!selectedDatasetId) return;
    setEvaluating(true);
    try {
      const prev = await api.previewDataset(selectedDatasetId, 0, 1);
      const res = await api.evaluateACAFDM(prev.version_id, selectedConfigId);
      setResult(res);
    } catch (err: any) {
      alert(`Evaluation failed: ${err.message}`);
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* 1. Technical Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-flux-accent/10 border border-flux-accent/20 text-flux-accent text-[11px] font-medium mb-1.5">
            <ShieldAlert size={11} />
            <span>Dual-Gate Rolling Baseline Defense</span>
          </div>
          <h1 className="text-2xl font-semibold text-flux-text tracking-tight">
            ACAFDM Engine
          </h1>
          <p className="text-xs text-flux-secondary mt-1 max-w-xl leading-relaxed">
            Online EWMA baseline drift tracking with adversarial poison protection. 
            Anomalous surges (<span className="font-mono text-flux-accent">|Z| ≥ Z_thresh</span>) are isolated from cluster statistics to prevent threshold pollution.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedDatasetId}
            onChange={(e) => setSelectedDatasetId(e.target.value)}
            className="bg-flux-surface border border-white/[0.06] rounded-md px-3 py-1.5 text-xs text-flux-text focus:outline-none focus:border-flux-accent font-medium shadow-sm"
          >
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. Policy Controls Bar */}
      <div className="flux-panel p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-flux-border/60">
          <div>
            <h2 className="text-sm font-medium text-flux-text tracking-tight">
              Adaptive Policy Parameters & Benign Gate
            </h2>
            <p className="text-[11px] text-flux-muted mt-0.5 font-normal">
              Tune rolling EWMA adaptation rate, Z-score thresholds, and persistence streak counts
            </p>
          </div>
          <span className="text-xs text-flux-sage flex items-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-flux-sage" />
            Poison Gate Active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-1">
          <div>
            <label className="text-xs font-medium text-flux-muted block mb-1">
              Clusters (k)
            </label>
            <input
              type="number"
              min="2"
              max="8"
              value={clusterCount}
              onChange={(e) => setClusterCount(Number(e.target.value))}
              className="w-full bg-flux-subsurface border border-white/[0.04] rounded-md px-3 py-1.5 text-xs text-flux-text font-mono focus:border-flux-accent outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-flux-muted block mb-1">
              Update Rate (α)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max="0.5"
              value={alphaRate}
              onChange={(e) => setAlphaRate(Number(e.target.value))}
              className="w-full bg-flux-subsurface border border-white/[0.04] rounded-md px-3 py-1.5 text-xs text-flux-text font-mono focus:border-flux-accent outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-flux-muted block mb-1">
              Z Threshold (Z_thresh)
            </label>
            <input
              type="number"
              step="0.1"
              value={zThreshold}
              onChange={(e) => setZThreshold(Number(e.target.value))}
              className="w-full bg-flux-subsurface border border-white/[0.04] rounded-md px-3 py-1.5 text-xs text-flux-text font-mono focus:border-flux-accent outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-flux-muted block mb-1">
              Persistence Streak (k)
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={persistenceK}
              onChange={(e) => setPersistenceK(Number(e.target.value))}
              className="w-full bg-flux-subsurface border border-white/[0.04] rounded-md px-3 py-1.5 text-xs text-flux-text font-mono focus:border-flux-accent outline-none"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleRunEvaluation}
              disabled={evaluating || !selectedDatasetId}
              className="flux-btn-primary w-full flex items-center justify-center gap-1.5 disabled:opacity-40"
            >
              {evaluating ? (
                <>
                  <div className="w-3 h-3 border border-flux-bg border-t-transparent rounded-full animate-spin" />
                  <span>Evaluating...</span>
                </>
              ) : (
                <>
                  <Play size={12} fill="currentColor" />
                  <span>Execute Trace</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 3. Evaluation Results Strip */}
      {result && (
        <div className="space-y-6">
          <div className="flux-panel p-5 grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="sm:pr-4 sm:border-r border-flux-border/60">
              <span className="text-xs font-medium text-flux-muted">Evaluated Flows</span>
              <div className="text-2xl font-semibold text-flux-text mt-1 font-mono tabular-nums">
                {result.total_observations.toLocaleString()}
              </div>
            </div>

            <div className="sm:pr-4 sm:border-r border-flux-border/60">
              <span className="text-xs font-medium text-flux-muted">Normal Allowed</span>
              <div className="text-2xl font-semibold text-flux-sage mt-1 font-mono tabular-nums">
                {result.allowed_count.toLocaleString()}
              </div>
            </div>

            <div className="sm:pr-4 sm:border-r border-flux-border/60">
              <span className="text-xs font-medium text-flux-muted">Flagged Suspicious</span>
              <div className="text-2xl font-semibold text-flux-warning mt-1 font-mono tabular-nums">
                {result.flagged_suspicious_count.toLocaleString()}
              </div>
            </div>

            <div className="sm:pr-4 sm:border-r border-flux-border/60">
              <span className="text-xs font-medium text-flux-muted">Mitigated (Persistent)</span>
              <div className="text-2xl font-semibold text-flux-danger mt-1 font-mono tabular-nums">
                {result.mitigated_count.toLocaleString()}
              </div>
            </div>

            <div>
              <span className="text-xs font-medium text-flux-muted">Poison Attempts Blocked</span>
              <div className="text-2xl font-semibold text-flux-accent mt-1 font-mono tabular-nums">
                {result.baseline_updates_rejected_poison_prevented.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Chronological Decision Trace Table */}
          <div className="flux-panel p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-flux-border/60">
              <div>
                <h2 className="text-sm font-medium text-flux-text tracking-tight">
                  Decision Trace & Explainability Breakdown
                </h2>
                <p className="text-[11px] text-flux-muted mt-0.5">
                  Chronological trace showing online EWMA baseline update decisions and gate rejections
                </p>
              </div>
            </div>

            <div className="flux-inset overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-flux-surface text-flux-muted sticky top-0 z-10 text-[11px] border-b border-flux-border/60">
                  <tr>
                    <th className="px-3 py-2.5 font-medium">Time (s)</th>
                    <th className="px-3 py-2.5 font-medium">Node</th>
                    <th className="px-3 py-2.5 font-medium">Cluster</th>
                    <th className="px-3 py-2.5 font-medium">Obs Rate (pps)</th>
                    <th className="px-3 py-2.5 font-medium">Baseline Rate</th>
                    <th className="px-3 py-2.5 font-medium">Contextual Z</th>
                    <th className="px-3 py-2.5 font-medium">Streak</th>
                    <th className="px-3 py-2.5 font-medium">Decision</th>
                    <th className="px-3 py-2.5 font-medium">Gate Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-flux-border/30 text-xs">
                  {result.decision_trace.map((r, i) => {
                    const isMitigate = r.decision === 'MITIGATE_RATE_LIMIT';
                    const isSuspicious = r.decision === 'FLAG_SUSPICIOUS';
                    return (
                      <tr key={i} className="hover:bg-flux-subsurface/40 transition-colors">
                        <td className="px-3 py-2 text-flux-muted font-mono text-[11px]">{r.timestamp}</td>
                        <td className="px-3 py-2 text-flux-text font-medium">{r.rx_id}</td>
                        <td className="px-3 py-2 text-flux-muted font-mono text-[11px]">C{r.cluster_id}</td>
                        <td className="px-3 py-2 text-flux-text font-mono text-[11px] tabular-nums">{r.raw_rate}</td>
                        <td className="px-3 py-2 text-flux-muted font-mono text-[11px] tabular-nums">{r.baseline_rate}</td>
                        <td className={`px-3 py-2 font-mono text-[11px] font-medium tabular-nums ${absZColor(r.z_score)}`}>{r.z_score}</td>
                        <td className="px-3 py-2 text-flux-muted font-mono text-[11px] tabular-nums">{r.persistence_count}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                              isMitigate
                                ? 'text-flux-danger bg-flux-danger/10 border border-flux-danger/20'
                                : isSuspicious
                                ? 'text-flux-warning bg-flux-warning/10 border border-flux-warning/20'
                                : 'text-flux-sage bg-flux-sage/10 border border-flux-sage/20'
                            }`}
                          >
                            {r.decision}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {r.baseline_updated ? (
                            <span className="text-flux-sage flex items-center gap-1 font-medium text-[11px]">
                              <CheckCircle2 size={12} /> Accepted
                            </span>
                          ) : (
                            <span className="text-flux-warning flex items-center gap-1 font-medium text-[11px]">
                              <Ban size={12} /> Blocked (Gate)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function absZColor(z: number): string {
  const absZ = Math.abs(z);
  if (absZ >= 3.0) return 'text-flux-danger';
  if (absZ >= 2.0) return 'text-flux-warning';
  return 'text-flux-accent';
}
