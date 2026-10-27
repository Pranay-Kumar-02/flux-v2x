import React, { useState, useEffect } from 'react';
import { Play, CheckCircle2, Ban } from 'lucide-react';
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
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-4 border-b border-flux-border">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-mono tracking-widest text-flux-accent uppercase">
              Adaptive Mitigation
            </span>
            <span className="text-flux-muted text-[10px]">•</span>
            <span className="text-[10px] font-mono text-flux-muted">Dual-Gate Poison Defense</span>
          </div>
          <h1 className="text-xl font-medium text-flux-text tracking-tight">
            ACAFDM Engine
          </h1>
          <p className="text-xs text-flux-secondary mt-1 max-w-xl">
            Online EWMA baseline drift tracking with adversarial poison protection. 
            Anomalous surges (<span className="font-mono text-flux-accent">|Z| ≥ Z_thresh</span>) are isolated from cluster statistics to prevent threshold pollution.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedDatasetId}
            onChange={(e) => setSelectedDatasetId(e.target.value)}
            className="bg-flux-surface border border-flux-border rounded px-2.5 py-1.5 text-xs text-flux-text focus:outline-none focus:border-flux-accent font-mono"
          >
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. Policy Controls Bar (Subtle surface, no heavy borders) */}
      <div className="p-4 rounded bg-flux-subsurface/40 border border-flux-border space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-flux-border/60">
          <h2 className="text-xs font-mono uppercase tracking-wider text-flux-secondary">
            Adaptive Policy Parameters & Benign Gate
          </h2>
          <span className="text-[10px] font-mono text-flux-sage flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-flux-sage" />
            Poison Gate Active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
          <div>
            <label className="text-[10px] font-mono uppercase text-flux-muted block mb-1">
              Clusters (k)
            </label>
            <input
              type="number"
              min="2"
              max="8"
              value={clusterCount}
              onChange={(e) => setClusterCount(Number(e.target.value))}
              className="w-full bg-flux-surface border border-flux-border/80 rounded px-2.5 py-1.5 text-xs text-flux-text font-mono focus:border-flux-accent outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-mono uppercase text-flux-muted block mb-1">
              Update Rate (α)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max="0.5"
              value={alphaRate}
              onChange={(e) => setAlphaRate(Number(e.target.value))}
              className="w-full bg-flux-surface border border-flux-border/80 rounded px-2.5 py-1.5 text-xs text-flux-text font-mono focus:border-flux-accent outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-mono uppercase text-flux-muted block mb-1">
              Z Threshold (Z_thresh)
            </label>
            <input
              type="number"
              step="0.1"
              value={zThreshold}
              onChange={(e) => setZThreshold(Number(e.target.value))}
              className="w-full bg-flux-surface border border-flux-border/80 rounded px-2.5 py-1.5 text-xs text-flux-text font-mono focus:border-flux-accent outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-mono uppercase text-flux-muted block mb-1">
              Streak (k)
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={persistenceK}
              onChange={(e) => setPersistenceK(Number(e.target.value))}
              className="w-full bg-flux-surface border border-flux-border/80 rounded px-2.5 py-1.5 text-xs text-flux-text font-mono focus:border-flux-accent outline-none"
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
                  <Play size={11} fill="currentColor" />
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
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-6 pb-4 border-b border-flux-border">
            <div>
              <span className="text-[10px] font-mono uppercase text-flux-muted">Evaluated Flows</span>
              <div className="text-2xl font-light font-mono text-flux-text mt-0.5 tabular-nums">
                {result.total_observations.toLocaleString()}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase text-flux-muted">Normal Allowed</span>
              <div className="text-2xl font-light font-mono text-flux-sage mt-0.5 tabular-nums">
                {result.allowed_count.toLocaleString()}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase text-flux-muted">Flagged Suspicious</span>
              <div className="text-2xl font-light font-mono text-flux-warning mt-0.5 tabular-nums">
                {result.flagged_suspicious_count.toLocaleString()}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase text-flux-muted">Mitigated (Persistent)</span>
              <div className="text-2xl font-light font-mono text-flux-danger mt-0.5 tabular-nums">
                {result.mitigated_count.toLocaleString()}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase text-flux-muted">Poison Attempts Blocked</span>
              <div className="text-2xl font-light font-mono text-flux-accent mt-0.5 tabular-nums">
                {result.baseline_updates_rejected_poison_prevented.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Chronological Decision Trace Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-flux-border">
              <h2 className="text-xs font-mono uppercase tracking-wider text-flux-secondary">
                Decision Trace & Explainability Breakdown
              </h2>
              <span className="text-[11px] font-mono text-flux-muted">
                Online EWMA Gate Log
              </span>
            </div>

            <div className="overflow-x-auto max-h-96 border-b border-flux-border">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-flux-shell text-flux-muted font-mono sticky top-0 z-10 text-[10px] uppercase">
                  <tr>
                    <th className="px-3 py-2 border-b border-flux-border font-medium">Time (s)</th>
                    <th className="px-3 py-2 border-b border-flux-border font-medium">Node</th>
                    <th className="px-3 py-2 border-b border-flux-border font-medium">Cluster</th>
                    <th className="px-3 py-2 border-b border-flux-border font-medium">Obs Rate (pps)</th>
                    <th className="px-3 py-2 border-b border-flux-border font-medium">Baseline Rate</th>
                    <th className="px-3 py-2 border-b border-flux-border font-medium">Contextual Z</th>
                    <th className="px-3 py-2 border-b border-flux-border font-medium">Streak</th>
                    <th className="px-3 py-2 border-b border-flux-border font-medium">Decision</th>
                    <th className="px-3 py-2 border-b border-flux-border font-medium">Gate Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-flux-border/40 font-mono text-[11px]">
                  {result.decision_trace.map((r, i) => {
                    const isMitigate = r.decision === 'MITIGATE_RATE_LIMIT';
                    const isSuspicious = r.decision === 'FLAG_SUSPICIOUS';
                    return (
                      <tr key={i} className="hover:bg-flux-subsurface/40 transition-colors">
                        <td className="px-3 py-2 text-flux-muted">{r.timestamp}</td>
                        <td className="px-3 py-2 text-flux-text font-medium">{r.rx_id}</td>
                        <td className="px-3 py-2 text-flux-muted">C{r.cluster_id}</td>
                        <td className="px-3 py-2 text-flux-text tabular-nums">{r.raw_rate}</td>
                        <td className="px-3 py-2 text-flux-muted tabular-nums">{r.baseline_rate}</td>
                        <td className={`px-3 py-2 font-medium tabular-nums ${absZColor(r.z_score)}`}>{r.z_score}</td>
                        <td className="px-3 py-2 text-flux-muted tabular-nums">{r.persistence_count}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                              isMitigate
                                ? 'text-flux-danger bg-flux-danger/10'
                                : isSuspicious
                                ? 'text-flux-warning bg-flux-warning/10'
                                : 'text-flux-sage bg-flux-sage/10'
                            }`}
                          >
                            {r.decision}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {r.baseline_updated ? (
                            <span className="text-flux-sage flex items-center gap-1">
                              <CheckCircle2 size={11} /> Accepted
                            </span>
                          ) : (
                            <span className="text-flux-warning flex items-center gap-1">
                              <Ban size={11} /> Blocked (Gate)
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
