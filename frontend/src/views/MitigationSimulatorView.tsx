import React, { useState, useEffect } from 'react';
import {
  Flame,
  Play,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sliders,
  ShieldAlert,
  Percent,
  TrendingDown
} from 'lucide-react';
import { api, Dataset, MitigationSimulation } from '../api/client';

interface MitigationSimulatorViewProps {
  activeDataset?: Dataset | null;
}

export const MitigationSimulatorView: React.FC<MitigationSimulatorViewProps> = ({ activeDataset }) => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [simulations, setSimulations] = useState<MitigationSimulation[]>([]);
  const [selectedSim, setSelectedSim] = useState<MitigationSimulation | null>(null);
  const [rateLimitRatio, setRateLimitRatio] = useState<number>(0.5);
  const [priorityPreservation, setPriorityPreservation] = useState<boolean>(true);
  const [policyAction, setPolicyAction] = useState<string>('selective_rate_limiting');
  const [running, setRunning] = useState<boolean>(false);

  useEffect(() => {
    async function init() {
      const [dsList, simList] = await Promise.all([
        api.listDatasets(),
        api.listMitigationSimulations(),
      ]);
      setDatasets(dsList);
      setSimulations(simList);

      if (activeDataset) {
        setSelectedDatasetId(activeDataset.id);
      } else if (dsList.length > 0) {
        setSelectedDatasetId(dsList[0].id);
      }

      if (simList.length > 0) {
        setSelectedSim(simList[0]);
      }
    }
    init();
  }, [activeDataset]);

  const handleRunSimulation = async () => {
    if (!selectedDatasetId) return;
    setRunning(true);
    try {
      const prev = await api.previewDataset(selectedDatasetId, 0, 1);
      const res = await api.runMitigationSimulation({
        dataset_version_id: prev.version_id,
        name: `Selective Rate Limiting (Throttle ${(rateLimitRatio * 100).toFixed(0)}%)`,
        policy_action: policyAction,
        rate_limit_ratio: rateLimitRatio,
        priority_preservation: priorityPreservation,
      });
      const list = await api.listMitigationSimulations();
      setSimulations(list);
      setSelectedSim(res);
    } catch (err: any) {
      alert(`Simulation failed: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  const resData = selectedSim?.results;

  return (
    <div className="space-y-6">
      {/* Top Banner: Safe Offline Simulation Notice */}
      <div className="p-5 rounded-xl bg-flux-surface border border-flux-border flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-mono mb-2">
            Deterministic Offline Replay
          </div>
          <h3 className="text-sm font-semibold text-flux-text flex items-center gap-2">
            <Flame size={16} className="text-flux-warning" />
            Offline Mitigation & Defensive Policy Simulator
          </h3>
          <p className="text-xs text-flux-muted mt-1">
            Simulate the defensive impact of selective rate limiting and deprioritization against actual traces.
            Measures attack mitigation efficiency, collateral damage to legitimate traffic, and channel overhead saved.
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

      {/* Simulator Controls Bar */}
      <div className="p-5 rounded-xl bg-flux-surface border border-flux-border space-y-4">
        <h4 className="text-xs font-semibold text-flux-text flex items-center gap-2">
          <Sliders size={14} className="text-flux-warning" />
          Defensive Policy Configuration
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-[11px] font-medium text-flux-muted block mb-1">
              Defensive Action
            </label>
            <select
              value={policyAction}
              onChange={(e) => setPolicyAction(e.target.value)}
              className="w-full bg-flux-elevated border border-flux-border rounded-lg px-3 py-1.5 text-xs text-flux-text font-mono"
            >
              <option value="selective_rate_limiting">Selective Rate Limiting (pps Throttling)</option>
              <option value="traffic_deprioritization">Traffic Deprioritization Queue</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-medium text-flux-muted block mb-1">
              Throttle Ratio: {(rateLimitRatio * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0.1"
              max="0.9"
              step="0.05"
              value={rateLimitRatio}
              onChange={(e) => setRateLimitRatio(Number(e.target.value))}
              className="w-full accent-flux-accent"
            />
          </div>

          <div className="flex items-center gap-2 pt-4">
            <input
              type="checkbox"
              id="priorityPreserve"
              checked={priorityPreservation}
              onChange={(e) => setPriorityPreservation(e.target.checked)}
              className="rounded bg-flux-elevated border-flux-border text-flux-accent focus:ring-0"
            />
            <label htmlFor="priorityPreserve" className="text-xs text-flux-text select-none cursor-pointer">
              Preserve Safety Critical Messages (0% drops)
            </label>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleRunSimulation}
              disabled={running || !selectedDatasetId}
              className="w-full px-4 py-2 rounded-lg bg-flux-warning text-flux-bg font-semibold text-xs hover:bg-flux-warning/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              {running ? 'Replaying Trace...' : 'Run Mitigation Simulation'}
            </button>
          </div>
        </div>

        {/* Safety Disclaimer */}
        <div className="p-3 rounded-lg bg-flux-elevated/70 border border-flux-border text-[11px] text-flux-muted flex items-center gap-2">
          <ShieldAlert size={14} className="text-flux-warning shrink-0" />
          <span>
            <strong>Safety Sandbox:</strong> All policy evaluations are calculated offline on recorded flow traces.
            No packets are transmitted onto live vehicular networks.
          </span>
        </div>
      </div>

      {/* Simulation Results Display */}
      {resData && (
        <div className="space-y-6">
          {/* Key Metric Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-flux-surface border border-flux-border">
              <span className="text-[10px] font-medium text-flux-muted">Attack Mitigation Efficiency</span>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                {resData.malicious_traffic?.mitigation_efficiency_percentage}%
              </div>
              <span className="text-[10px] text-flux-muted mt-1 block">
                {resData.malicious_traffic?.packets_dropped.toLocaleString()} attack packets blocked
              </span>
            </div>

            <div className="p-4 rounded-xl bg-flux-surface border border-flux-border">
              <span className="text-[10px] font-medium text-flux-muted">Collateral Damage (Benign Drop)</span>
              <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                {resData.benign_traffic?.collateral_damage_percentage}%
              </div>
              <span className="text-[10px] text-flux-muted mt-1 block">
                {resData.benign_traffic?.packets_passed.toLocaleString()} benign packets delivered
              </span>
            </div>

            <div className="p-4 rounded-xl bg-flux-surface border border-flux-border">
              <span className="text-[10px] font-medium text-flux-muted">Bandwidth Overhead Saved</span>
              <div className="text-2xl font-bold font-mono text-flux-accent mt-1">
                {resData.bandwidth_saved_percentage}%
              </div>
              <span className="text-[10px] text-flux-muted mt-1 block">
                {resData.simulated_dropped_packets.toLocaleString()} flood packets suppressed
              </span>
            </div>

            <div className="p-4 rounded-xl bg-flux-surface border border-flux-border">
              <span className="text-[10px] font-medium text-flux-muted">Total Flow Records Evaluated</span>
              <div className="text-2xl font-bold font-mono text-flux-text mt-1">
                {resData.total_flow_records.toLocaleString()}
              </div>
              <span className="text-[10px] text-flux-muted mt-1 block">
                {resData.unmitigated_total_packets.toLocaleString()} initial packets
              </span>
            </div>
          </div>

          {/* Breakdown Comparison Box */}
          <div className="p-5 rounded-xl bg-flux-surface border border-flux-border space-y-4">
            <h4 className="text-xs font-semibold text-flux-text flex items-center gap-2">
              <ShieldCheck size={14} className="text-flux-accent" />
              Traffic Impact Breakdown: Unmitigated Baseline vs ACAFDM Defensive Policy
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Malicious Attack Traffic */}
              <div className="p-4 rounded-lg bg-flux-elevated border border-flux-border space-y-2 text-xs font-mono">
                <div className="font-semibold text-flux-danger flex items-center justify-between">
                  <span>Malicious Flooding Traffic</span>
                  <span>{resData.malicious_traffic?.total_packets.toLocaleString()} pkts</span>
                </div>
                <div className="flex justify-between text-flux-muted text-[11px]">
                  <span>Packets Successfully Dropped:</span>
                  <span className="text-emerald-400 font-bold">
                    {resData.malicious_traffic?.packets_dropped.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-flux-muted text-[11px]">
                  <span>Residual Leaked Flood Packets:</span>
                  <span className="text-flux-danger">
                    {resData.malicious_traffic?.packets_passed.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Benign Congestion Traffic */}
              <div className="p-4 rounded-lg bg-flux-elevated border border-flux-border space-y-2 text-xs font-mono">
                <div className="font-semibold text-emerald-400 flex items-center justify-between">
                  <span>Benign Congestion Traffic</span>
                  <span>{resData.benign_traffic?.total_packets.toLocaleString()} pkts</span>
                </div>
                <div className="flex justify-between text-flux-muted text-[11px]">
                  <span>Packets Successfully Delivered:</span>
                  <span className="text-emerald-400 font-bold">
                    {resData.benign_traffic?.packets_passed.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-flux-muted text-[11px]">
                  <span>Collateral Damage (False Positive Drops):</span>
                  <span className="text-amber-400">
                    {resData.benign_traffic?.packets_dropped_collateral.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
