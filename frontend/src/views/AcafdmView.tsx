import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Play,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sliders,
  ShieldCheck,
  Ban,
  Activity,
  Layers
} from 'lucide-react';
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
    <div className="space-y-6">
      {/* Top Banner: ACAFDM Extension Context */}
      <div className="p-5 rounded-xl bg-flux-surface border border-flux-border flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-flux-accent/10 border border-flux-accent/20 text-flux-accent text-[10px] font-mono mb-2">
            FluxV2X Proposed Extension
          </div>
          <h3 className="text-sm font-semibold text-flux-text flex items-center gap-2">
            <ShieldAlert size={16} className="text-flux-accent" />
            Adaptive Context-Aware Malicious Flooding Detection & Mitigation (ACAFDM) Engine
          </h3>
          <p className="text-xs text-flux-muted mt-1">
            Maintains rolling baseline statistics with an explicit Benign-Validation Gate.
            Adversarial flooding observations are blocked from polluting local cluster baselines,
            and mitigation is engaged only after persistence conditions (k-consecutive anomalies) are satisfied.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedDatasetId}
            onChange={(e) => setSelectedDatasetId(e.target.value)}
            className="bg-flux-elevated border border-flux-border rounded-lg px-3 py-1.5 text-xs text-flux-text focus:outline-none focus:border-flux-accent font-mono"
          >
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Configuration & Policy Parameter Controls */}
      <div className="p-5 rounded-xl bg-flux-surface border border-flux-border space-y-4">
        <h4 className="text-xs font-semibold text-flux-text flex items-center gap-2">
          <Sliders size={14} className="text-flux-accent" />
          Adaptive Policy Controls & Benign Validation Gate
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="text-[11px] font-medium text-flux-muted block mb-1">
              Spatiotemporal Clusters (k)
            </label>
            <input
              type="number"
              min="2"
              max="8"
              value={clusterCount}
              onChange={(e) => setClusterCount(Number(e.target.value))}
              className="w-full bg-flux-elevated border border-flux-border rounded-lg px-3 py-1.5 text-xs text-flux-text font-mono"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-flux-muted block mb-1">
              EWMA Update Rate (α)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max="0.5"
              value={alphaRate}
              onChange={(e) => setAlphaRate(Number(e.target.value))}
              className="w-full bg-flux-elevated border border-flux-border rounded-lg px-3 py-1.5 text-xs text-flux-text font-mono"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-flux-muted block mb-1">
              Z-Score Threshold (Z_thresh)
            </label>
            <input
              type="number"
              step="0.1"
              value={zThreshold}
              onChange={(e) => setZThreshold(Number(e.target.value))}
              className="w-full bg-flux-elevated border border-flux-border rounded-lg px-3 py-1.5 text-xs text-flux-text font-mono"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-flux-muted block mb-1">
              Persistence Streak (k)
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={persistenceK}
              onChange={(e) => setPersistenceK(Number(e.target.value))}
              className="w-full bg-flux-elevated border border-flux-border rounded-lg px-3 py-1.5 text-xs text-flux-text font-mono"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleRunEvaluation}
              disabled={evaluating || !selectedDatasetId}
              className="w-full px-4 py-2 rounded-lg bg-flux-accent text-flux-bg font-semibold text-xs hover:bg-flux-accent/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              {evaluating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-flux-bg border-t-transparent rounded-full animate-spin" />
                  <span>Evaluating Stream...</span>
                </>
              ) : (
                <>
                  <Play size={13} fill="currentColor" />
                  <span>Execute ACAFDM Trace</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Poison Gate Notice */}
        <div className="p-3 rounded-lg bg-flux-elevated border border-flux-border text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 text-flux-text">
            <ShieldCheck size={16} className="text-emerald-400" />
            <span>Benign-Validation Gate: Active</span>
            <span className="text-flux-muted text-[11px]">
              (Observations with |Z| ≥ {zThreshold} are blocked from updating rolling baselines)
            </span>
          </div>
          <span className="text-[11px] font-mono text-emerald-400">POISON_RESISTANT</span>
        </div>
      </div>

      {/* Evaluation Results Cards */}
      {result && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3.5 rounded-xl bg-flux-surface border border-flux-border">
              <span className="text-[10px] font-medium text-flux-muted">Evaluated Flows</span>
              <div className="text-xl font-bold font-mono text-flux-text mt-0.5">
                {result.total_observations.toLocaleString()}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-flux-surface border border-flux-border">
              <span className="text-[10px] font-medium text-flux-muted">Normal Allowed</span>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
                {result.allowed_count.toLocaleString()}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-flux-surface border border-flux-border">
              <span className="text-[10px] font-medium text-flux-muted">Flagged Suspicious</span>
              <div className="text-xl font-bold font-mono text-flux-warning mt-0.5">
                {result.flagged_suspicious_count.toLocaleString()}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-flux-surface border border-flux-border">
              <span className="text-[10px] font-medium text-flux-muted">Mitigated (Persistent)</span>
              <div className="text-xl font-bold font-mono text-flux-danger mt-0.5">
                {result.mitigated_count.toLocaleString()}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-flux-surface border border-flux-border">
              <span className="text-[10px] font-medium text-flux-muted">Poison Attempts Blocked</span>
              <div className="text-xl font-bold font-mono text-flux-accent mt-0.5">
                {result.baseline_updates_rejected_poison_prevented.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Chronological Decision Trace Table */}
          <div className="p-5 rounded-xl bg-flux-surface border border-flux-border space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-flux-text flex items-center gap-2">
                <Activity size={14} className="text-flux-accent" />
                Chronological Decision Trace & Explainability Breakdown
              </h4>
              <span className="text-[11px] font-mono text-flux-muted">
                Showing sample of anomalous & accepted updates
              </span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-flux-border max-h-96">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-flux-elevated text-flux-muted font-mono sticky top-0 z-10">
                  <tr>
                    <th className="p-2.5 border-b border-flux-border">Time (s)</th>
                    <th className="p-2.5 border-b border-flux-border">Node</th>
                    <th className="p-2.5 border-b border-flux-border">Cluster</th>
                    <th className="p-2.5 border-b border-flux-border">Obs Rate (pps)</th>
                    <th className="p-2.5 border-b border-flux-border">Baseline Rate</th>
                    <th className="p-2.5 border-b border-flux-border">Contextual Z</th>
                    <th className="p-2.5 border-b border-flux-border">Streak</th>
                    <th className="p-2.5 border-b border-flux-border">Decision</th>
                    <th className="p-2.5 border-b border-flux-border">Gate Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-flux-border font-mono text-[11px]">
                  {result.decision_trace.map((r, i) => {
                    const isMitigate = r.decision === 'MITIGATE_RATE_LIMIT';
                    const isSuspicious = r.decision === 'FLAG_SUSPICIOUS';
                    return (
                      <tr key={i} className="hover:bg-flux-elevated/40 transition-colors">
                        <td className="p-2.5 text-flux-muted">{r.timestamp}</td>
                        <td className="p-2.5 text-flux-text font-semibold">{r.rx_id}</td>
                        <td className="p-2.5 text-flux-muted">C{r.cluster_id}</td>
                        <td className="p-2.5 text-flux-text">{r.raw_rate}</td>
                        <td className="p-2.5 text-flux-muted">{r.baseline_rate}</td>
                        <td className={`p-2.5 font-bold ${absZColor(r.z_score)}`}>{r.z_score}</td>
                        <td className="p-2.5 text-flux-muted">{r.persistence_count}</td>
                        <td className="p-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              isMitigate
                                ? 'bg-flux-danger/15 text-flux-danger border-flux-danger/30'
                                : isSuspicious
                                ? 'bg-flux-warning/15 text-flux-warning border-flux-warning/30'
                                : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            }`}
                          >
                            {r.decision}
                          </span>
                        </td>
                        <td className="p-2.5">
                          {r.baseline_updated ? (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 size={12} /> Accepted
                            </span>
                          ) : (
                            <span className="text-flux-warning flex items-center gap-1">
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
        </>
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
