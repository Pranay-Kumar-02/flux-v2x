import React, { useState, useEffect } from 'react';
import { Play } from 'lucide-react';
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
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* 1. Header with Controls */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-4 border-b border-flux-border">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-mono tracking-widest text-flux-accent uppercase">
              Offline Replay
            </span>
            <span className="text-flux-muted text-[10px]">•</span>
            <span className="text-[10px] font-mono text-flux-muted">Deterministic Emulation</span>
          </div>
          <h1 className="text-xl font-medium text-flux-text tracking-tight">
            Mitigation Simulator
          </h1>
          <p className="text-xs text-flux-secondary mt-1 max-w-xl">
            Simulate defensive rate-limiting and priority preservation against recorded telemetry traces to quantify attack suppression and collateral impact.
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

      {/* 2. Simulator Configuration Bar */}
      <div className="p-4 rounded bg-flux-subsurface/40 border border-flux-border space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-flux-border/60">
          <h2 className="text-xs font-mono uppercase tracking-wider text-flux-secondary">
            Defensive Policy Parameters
          </h2>
          <span className="text-[10px] font-mono text-flux-muted">
            Offline Deterministic
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          <div>
            <label className="text-[10px] font-mono uppercase text-flux-muted block mb-1">
              Defensive Action
            </label>
            <select
              value={policyAction}
              onChange={(e) => setPolicyAction(e.target.value)}
              className="w-full bg-flux-surface border border-flux-border/80 rounded px-2 py-1.5 text-xs text-flux-text font-mono focus:border-flux-accent outline-none"
            >
              <option value="selective_rate_limiting">Selective Rate Limiting (Throttle)</option>
              <option value="traffic_deprioritization">Traffic Deprioritization Queue</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] font-mono uppercase text-flux-muted">
                Throttle Ratio
              </label>
              <span className="text-xs font-mono font-medium text-flux-accent">
                {(rateLimitRatio * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="0.9"
              step="0.05"
              value={rateLimitRatio}
              onChange={(e) => setRateLimitRatio(Number(e.target.value))}
              className="w-full accent-[#AD8D69] mt-1"
            />
          </div>

          <div className="flex items-center gap-2 pt-4">
            <input
              type="checkbox"
              id="priorityPreserve"
              checked={priorityPreservation}
              onChange={(e) => setPriorityPreservation(e.target.checked)}
              className="rounded bg-flux-surface border-flux-border text-flux-accent focus:ring-0"
            />
            <label htmlFor="priorityPreserve" className="text-xs text-flux-secondary select-none cursor-pointer leading-tight">
              Preserve safety-critical messages (0% drops)
            </label>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleRunSimulation}
              disabled={running || !selectedDatasetId}
              className="flux-btn-primary w-full flex items-center justify-center gap-1.5 disabled:opacity-40"
            >
              {running ? (
                <>
                  <div className="w-3 h-3 border border-flux-bg border-t-transparent rounded-full animate-spin" />
                  <span>Replaying...</span>
                </>
              ) : (
                <>
                  <Play size={11} fill="currentColor" />
                  <span>Execute Simulation</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 3. Simulation Results Display */}
      {resData && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pb-4 border-b border-flux-border">
            <div>
              <span className="text-[10px] font-mono uppercase text-flux-muted">Attack Mitigation</span>
              <div className="text-2xl font-light font-mono text-flux-sage mt-0.5 tabular-nums">
                {resData.malicious_traffic?.mitigation_efficiency_percentage}%
              </div>
              <span className="text-[11px] text-flux-muted font-mono mt-0.5 block">
                {resData.malicious_traffic?.packets_dropped.toLocaleString()} attack packets blocked
              </span>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase text-flux-muted">Collateral Degradation</span>
              <div className="text-2xl font-light font-mono text-flux-warning mt-0.5 tabular-nums">
                {resData.benign_traffic?.collateral_damage_percentage}%
              </div>
              <span className="text-[11px] text-flux-muted font-mono mt-0.5 block">
                {resData.benign_traffic?.packets_passed.toLocaleString()} benign packets passed
              </span>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase text-flux-muted">Overhead Bandwidth Saved</span>
              <div className="text-2xl font-light font-mono text-flux-accent mt-0.5 tabular-nums">
                {resData.bandwidth_saved_percentage}%
              </div>
              <span className="text-[11px] text-flux-muted font-mono mt-0.5 block">
                {resData.simulated_dropped_packets.toLocaleString()} flood packets suppressed
              </span>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase text-flux-muted">Total Flow Records</span>
              <div className="text-2xl font-light font-mono text-flux-text mt-0.5 tabular-nums">
                {resData.total_flow_records.toLocaleString()}
              </div>
              <span className="text-[11px] text-flux-muted font-mono mt-0.5 block">
                {resData.unmitigated_total_packets.toLocaleString()} baseline packets
              </span>
            </div>
          </div>

          {/* Breakdown Comparison Box (Unboxed layout) */}
          <div className="space-y-3">
            <div className="pb-1 border-b border-flux-border">
              <h2 className="text-xs font-mono uppercase tracking-wider text-flux-secondary">
                Traffic Impact Breakdown
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
              {/* Malicious Attack Traffic */}
              <div className="space-y-2 text-xs font-mono">
                <div className="font-medium text-flux-danger flex items-center justify-between pb-1 border-b border-flux-border">
                  <span>Malicious Flooding Stream</span>
                  <span className="tabular-nums">{resData.malicious_traffic?.total_packets.toLocaleString()} pkts</span>
                </div>
                <div className="flex justify-between text-flux-secondary text-[11px]">
                  <span>Packets Dropped:</span>
                  <span className="text-flux-sage font-medium tabular-nums">
                    {resData.malicious_traffic?.packets_dropped.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-flux-secondary text-[11px]">
                  <span>Residual Leaked Flood:</span>
                  <span className="text-flux-danger tabular-nums">
                    {resData.malicious_traffic?.packets_passed.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Benign Congestion Traffic */}
              <div className="space-y-2 text-xs font-mono">
                <div className="font-medium text-flux-sage flex items-center justify-between pb-1 border-b border-flux-border">
                  <span>Benign Congestion Stream</span>
                  <span className="tabular-nums">{resData.benign_traffic?.total_packets.toLocaleString()} pkts</span>
                </div>
                <div className="flex justify-between text-flux-secondary text-[11px]">
                  <span>Packets Delivered:</span>
                  <span className="text-flux-sage font-medium tabular-nums">
                    {resData.benign_traffic?.packets_passed.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-flux-secondary text-[11px]">
                  <span>Collateral False Drops:</span>
                  <span className="text-flux-warning tabular-nums">
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
