import React, { useState, useEffect } from 'react';
import { Play, Flame, ShieldAlert, Sparkles } from 'lucide-react';
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-flux-accent/10 border border-flux-accent/20 text-flux-accent text-[11px] font-medium mb-1.5">
            <Flame size={11} />
            <span>Deterministic Defensive Emulation</span>
          </div>
          <h1 className="text-2xl font-semibold text-flux-text tracking-tight">
            Mitigation Simulator
          </h1>
          <p className="text-xs text-flux-secondary mt-1 max-w-xl leading-relaxed">
            Simulate defensive rate-limiting and priority preservation against recorded telemetry traces to quantify attack suppression and collateral impact.
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

      {/* 2. Simulator Configuration Panel */}
      <div className="flux-panel p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-flux-border/60">
          <div>
            <h2 className="text-sm font-medium text-flux-text tracking-tight">
              Defensive Policy Configuration
            </h2>
            <p className="text-[11px] text-flux-muted mt-0.5 font-normal">
              Tune rate-limiting throttles and safety-critical message protection
            </p>
          </div>
          <span className="text-xs text-flux-muted font-normal">
            Deterministic Offline Replay
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          <div>
            <label className="text-xs font-medium text-flux-muted block mb-1">
              Defensive Action
            </label>
            <select
              value={policyAction}
              onChange={(e) => setPolicyAction(e.target.value)}
              className="w-full bg-flux-subsurface border border-white/[0.04] rounded-md px-3 py-1.5 text-xs text-flux-text font-medium focus:border-flux-accent outline-none"
            >
              <option value="selective_rate_limiting">Selective Rate Limiting (Throttle)</option>
              <option value="traffic_deprioritization">Traffic Deprioritization Queue</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-medium text-flux-muted">
                Throttle Ratio
              </label>
              <span className="text-xs font-mono font-medium text-flux-accent tabular-nums">
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
              className="w-full accent-[#B0906C] mt-2"
            />
          </div>

          <div className="flex items-center gap-2 pt-5">
            <input
              type="checkbox"
              id="priorityPreserve"
              checked={priorityPreservation}
              onChange={(e) => setPriorityPreservation(e.target.checked)}
              className="rounded bg-flux-subsurface border-flux-border text-flux-accent focus:ring-0"
            />
            <label htmlFor="priorityPreserve" className="text-xs text-flux-secondary select-none cursor-pointer leading-tight font-medium">
              Preserve safety messages (0% drops)
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
                  <span>Replaying Trace...</span>
                </>
              ) : (
                <>
                  <Play size={12} fill="currentColor" />
                  <span>Run Simulation</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Safety Disclaimer */}
        <div className="p-3 rounded-lg bg-flux-subsurface/60 border border-white/[0.03] text-xs text-flux-secondary flex items-center gap-2">
          <ShieldAlert size={14} className="text-flux-warning shrink-0" />
          <span>
            <strong className="text-flux-text font-medium">Safety Sandbox:</strong> All policy evaluations are calculated offline on recorded flow traces.
            No packets are transmitted onto live vehicular networks.
          </span>
        </div>
      </div>

      {/* 3. Simulation Results Display */}
      {resData && (
        <div className="space-y-6">
          <div className="flux-panel p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="sm:pr-4 sm:border-r border-flux-border/60">
              <span className="text-xs font-medium text-flux-muted">Attack Mitigation</span>
              <div className="text-2xl font-semibold text-flux-sage mt-1 font-mono tabular-nums">
                {resData.malicious_traffic?.mitigation_efficiency_percentage}%
              </div>
              <span className="text-[11px] text-flux-muted mt-0.5 block font-mono tabular-nums">
                {resData.malicious_traffic?.packets_dropped.toLocaleString()} packets dropped
              </span>
            </div>

            <div className="sm:pr-4 sm:border-r border-flux-border/60">
              <span className="text-xs font-medium text-flux-muted">Collateral Degradation</span>
              <div className="text-2xl font-semibold text-flux-warning mt-1 font-mono tabular-nums">
                {resData.benign_traffic?.collateral_damage_percentage}%
              </div>
              <span className="text-[11px] text-flux-muted mt-0.5 block font-mono tabular-nums">
                {resData.benign_traffic?.packets_passed.toLocaleString()} benign passed
              </span>
            </div>

            <div className="sm:pr-4 sm:border-r border-flux-border/60">
              <span className="text-xs font-medium text-flux-muted">Overhead Bandwidth Saved</span>
              <div className="text-2xl font-semibold text-flux-accent mt-1 font-mono tabular-nums">
                {resData.bandwidth_saved_percentage}%
              </div>
              <span className="text-[11px] text-flux-muted mt-0.5 block font-mono tabular-nums">
                {resData.simulated_dropped_packets.toLocaleString()} flood suppressed
              </span>
            </div>

            <div>
              <span className="text-xs font-medium text-flux-muted">Total Flow Records</span>
              <div className="text-2xl font-semibold text-flux-text mt-1 font-mono tabular-nums">
                {resData.total_flow_records.toLocaleString()}
              </div>
              <span className="text-[11px] text-flux-muted mt-0.5 block font-mono tabular-nums">
                {resData.unmitigated_total_packets.toLocaleString()} baseline pkts
              </span>
            </div>
          </div>

          {/* Breakdown Comparison Box */}
          <div className="flux-panel p-5 space-y-4">
            <div className="pb-2 border-b border-flux-border/60">
              <h2 className="text-sm font-medium text-flux-text tracking-tight">
                Traffic Impact Breakdown: Baseline Unmitigated vs ACAFDM Active Policy
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {/* Malicious Attack Traffic */}
              <div className="p-4 rounded-lg bg-flux-subsurface/60 border border-white/[0.03] space-y-2.5 text-xs">
                <div className="font-medium text-flux-danger flex items-center justify-between pb-2 border-b border-flux-border/60">
                  <span>Malicious Flooding Stream</span>
                  <span className="font-mono tabular-nums">{resData.malicious_traffic?.total_packets.toLocaleString()} pkts</span>
                </div>
                <div className="flex justify-between text-flux-secondary">
                  <span>Packets Successfully Dropped:</span>
                  <span className="text-flux-sage font-medium font-mono tabular-nums">
                    {resData.malicious_traffic?.packets_dropped.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-flux-secondary">
                  <span>Residual Leaked Flood Packets:</span>
                  <span className="text-flux-danger font-mono tabular-nums">
                    {resData.malicious_traffic?.packets_passed.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Benign Congestion Traffic */}
              <div className="p-4 rounded-lg bg-flux-subsurface/60 border border-white/[0.03] space-y-2.5 text-xs">
                <div className="font-medium text-flux-sage flex items-center justify-between pb-2 border-b border-flux-border/60">
                  <span>Benign Congestion Stream</span>
                  <span className="font-mono tabular-nums">{resData.benign_traffic?.total_packets.toLocaleString()} pkts</span>
                </div>
                <div className="flex justify-between text-flux-secondary">
                  <span>Packets Delivered:</span>
                  <span className="text-flux-sage font-medium font-mono tabular-nums">
                    {resData.benign_traffic?.packets_passed.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-flux-secondary">
                  <span>Collateral False Drops:</span>
                  <span className="text-flux-warning font-mono tabular-nums">
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
