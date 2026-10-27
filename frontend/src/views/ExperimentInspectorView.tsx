import React, { useState, useEffect } from 'react';
import { Copy, CheckCircle2, Terminal } from 'lucide-react';
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
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-4 border-b border-flux-border">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-mono tracking-widest text-flux-accent uppercase">
              Scientific Audit
            </span>
            <span className="text-flux-muted text-[10px]">•</span>
            <span className="text-[10px] font-mono text-flux-muted">Reproducibility & Manifest Archive</span>
          </div>
          <h1 className="text-xl font-medium text-flux-text tracking-tight">
            Experiment Inspector
          </h1>
          <p className="text-xs text-flux-secondary mt-1 max-w-xl">
            Audit trained model parameters, feature manifests, split configurations, confusion matrices, and export JSON reproducibility manifests.
          </p>
        </div>
      </div>

      {/* 2. Main Layout: Saved Runs (4 cols) & Manifest Inspector (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Experiment Selector List */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-flux-border">
            <h2 className="text-xs font-mono uppercase tracking-wider text-flux-secondary">
              Saved Runs ({experiments.length})
            </h2>
            <span className="text-[10px] font-mono text-flux-muted">PERSISTED</span>
          </div>

          <div className="divide-y divide-flux-border/60 max-h-[520px] overflow-y-auto">
            {experiments.map((exp) => {
              const isSelected = selectedExp?.id === exp.id;
              return (
                <div
                  key={exp.id}
                  onClick={() => setSelectedExp(exp)}
                  className={`py-2.5 px-2.5 rounded cursor-pointer transition-colors text-xs flex items-center justify-between ${
                    isSelected
                      ? 'bg-flux-subsurface text-flux-text font-medium'
                      : 'text-flux-secondary hover:text-flux-text hover:bg-flux-subsurface/40'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="truncate text-xs">{exp.name}</div>
                    <div className="text-[10px] text-flux-muted font-mono mt-0.5 flex items-center gap-2">
                      <span>{exp.model_family}</span>
                      <span>•</span>
                      <span>{new Date(exp.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Experiment Inspector */}
        <div className="lg:col-span-8 space-y-5">
          {selectedExp ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-flux-border">
                <div>
                  <h3 className="text-sm font-medium text-flux-text">{selectedExp.name}</h3>
                  <span className="text-[11px] font-mono text-flux-muted">Artifact ID: {selectedExp.id}</span>
                </div>

                <button
                  onClick={handleCopyJson}
                  className="flux-btn-ghost flex items-center gap-1.5"
                >
                  {copied ? <CheckCircle2 size={13} className="text-flux-sage" /> : <Copy size={13} />}
                  <span>{copied ? 'Copied Manifest' : 'Copy JSON'}</span>
                </button>
              </div>

              {/* Overview Details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4 border-b border-flux-border font-mono text-xs">
                <div>
                  <span className="text-[10px] text-flux-muted uppercase block">Family</span>
                  <span className="text-flux-text font-medium mt-0.5 block truncate">{selectedExp.model_family}</span>
                </div>
                <div>
                  <span className="text-[10px] text-flux-muted uppercase block">Split Strategy</span>
                  <span className="text-flux-accent font-medium mt-0.5 block truncate">{selectedExp.split_strategy}</span>
                </div>
                <div>
                  <span className="text-[10px] text-flux-muted uppercase block">Execution Duration</span>
                  <span className="text-flux-text font-medium mt-0.5 block tabular-nums">{selectedExp.duration_seconds}s</span>
                </div>
                <div>
                  <span className="text-[10px] text-flux-muted uppercase block">Random Seed</span>
                  <span className="text-flux-text font-medium mt-0.5 block tabular-nums">{selectedExp.random_seed}</span>
                </div>
              </div>

              {/* JSON Manifest Terminal Viewer */}
              <div className="space-y-2">
                <span className="text-[11px] font-mono text-flux-secondary flex items-center gap-1.5">
                  <Terminal size={12} className="text-flux-accent" />
                  Reproducibility Metadata Manifest
                </span>
                <div className="p-3.5 rounded bg-flux-shell border border-flux-border font-mono text-[11px] text-flux-secondary overflow-x-auto max-h-[380px]">
                  <pre className="text-flux-secondary leading-relaxed">
                    {JSON.stringify(selectedExp, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-xs text-flux-muted">
              Select an experiment from the history list to inspect its artifact manifest.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
