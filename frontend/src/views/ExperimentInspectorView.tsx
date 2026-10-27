import React, { useState, useEffect } from 'react';
import {
  FileSearch,
  Download,
  Copy,
  CheckCircle2,
  FileCheck,
  Activity,
  Layers,
  Terminal
} from 'lucide-react';
import { api, Experiment } from '../api/client';

export const ExperimentInspectorView: React.FC = () => {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [selectedExp, setSelectedExp] = useState<Experiment | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      const list = await api.listExperiments();
      setExperiments(list);
      if (list.length > 0) {
        setSelectedExp(list[0]);
      }
    }
    load();
  }, []);

  const handleCopyJson = () => {
    if (!selectedExp) return;
    navigator.clipboard.writeText(JSON.stringify(selectedExp, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-5 rounded-xl bg-flux-surface border border-flux-border flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-flux-text flex items-center gap-2">
            <FileSearch size={16} className="text-flux-accent" />
            Experiment & Artifact Inspector
          </h3>
          <p className="text-xs text-flux-muted mt-1">
            Complete scientific audit trail: Inspect trained model parameters, feature manifests,
            split configurations, confusion matrices, and export JSON reproducibility manifests.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Experiment Selector List */}
        <div className="p-5 rounded-xl bg-flux-surface border border-flux-border space-y-3">
          <h4 className="text-xs font-semibold text-flux-text flex items-center gap-2">
            <Activity size={14} className="text-flux-info" />
            Saved Experiment Runs ({experiments.length})
          </h4>

          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {experiments.map((exp) => {
              const isSelected = selectedExp?.id === exp.id;
              return (
                <div
                  key={exp.id}
                  onClick={() => setSelectedExp(exp)}
                  className={`p-3 rounded-lg cursor-pointer border transition-all text-xs ${
                    isSelected
                      ? 'bg-flux-elevated border-flux-accent/60 shadow-sm'
                      : 'bg-flux-elevated/40 border-flux-border/50 hover:border-flux-border'
                  }`}
                >
                  <div className="font-semibold text-flux-text truncate">{exp.name}</div>
                  <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-flux-muted">
                    <span>{exp.model_family}</span>
                    <span>{new Date(exp.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Experiment Inspector */}
        <div className="lg:col-span-2 space-y-6">
          {selectedExp ? (
            <div className="p-5 rounded-xl bg-flux-surface border border-flux-border space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-flux-text">{selectedExp.name}</h4>
                  <span className="text-[11px] font-mono text-flux-muted">ID: {selectedExp.id}</span>
                </div>

                <button
                  onClick={handleCopyJson}
                  className="px-3 py-1.5 rounded-lg bg-flux-elevated border border-flux-border text-xs text-flux-text hover:bg-flux-border flex items-center gap-2 transition-all"
                >
                  {copied ? <CheckCircle2 size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  <span>{copied ? 'Copied Manifest' : 'Copy JSON Manifest'}</span>
                </button>
              </div>

              {/* Overview Details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3 rounded-lg bg-flux-elevated border border-flux-border/60">
                  <span className="text-[10px] text-flux-muted block">Model Family</span>
                  <span className="text-flux-text font-bold">{selectedExp.model_family}</span>
                </div>
                <div className="p-3 rounded-lg bg-flux-elevated border border-flux-border/60">
                  <span className="text-[10px] text-flux-muted block">Split Strategy</span>
                  <span className="text-flux-accent font-bold">{selectedExp.split_strategy}</span>
                </div>
                <div className="p-3 rounded-lg bg-flux-elevated border border-flux-border/60">
                  <span className="text-[10px] text-flux-muted block">Execution Duration</span>
                  <span className="text-flux-info font-bold">{selectedExp.duration_seconds}s</span>
                </div>
                <div className="p-3 rounded-lg bg-flux-elevated border border-flux-border/60">
                  <span className="text-[10px] text-flux-muted block">Random Seed</span>
                  <span className="text-flux-text font-bold">{selectedExp.random_seed}</span>
                </div>
              </div>

              {/* JSON Manifest Terminal Viewer */}
              <div className="space-y-2">
                <span className="text-[11px] font-mono text-flux-muted flex items-center gap-1.5">
                  <Terminal size={13} />
                  Reproducibility Metadata Manifest
                </span>
                <div className="p-4 rounded-lg bg-flux-bg border border-flux-border font-mono text-[11px] text-flux-muted overflow-x-auto max-h-96">
                  <pre className="text-flux-accent/90">
                    {JSON.stringify(selectedExp, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-flux-muted">No experiment selected.</div>
          )}
        </div>
      </div>
    </div>
  );
};
