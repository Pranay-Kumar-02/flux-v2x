import React, { useState, useEffect } from 'react';
import { Scale, AlertCircle } from 'lucide-react';
import { api, Experiment, PairedMcNemarResult } from '../api/client';

export const BenchmarkCenterView: React.FC = () => {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [modelAId, setModelAId] = useState<string>('');
  const [modelBId, setModelBId] = useState<string>('');
  const [mcnemarResult, setMcnemarResult] = useState<PairedMcNemarResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const list = await api.listExperiments();
      setExperiments(list);
      if (list.length >= 2) {
        setModelAId(list[0].id);
        setModelBId(list[1].id);
      }
    }
    load();
  }, []);

  const handleRunMcNemar = async () => {
    if (!modelAId || !modelBId) return;
    setTesting(true);
    setTestError(null);
    try {
      const res = await api.runMcNemarTest(modelAId, modelBId);
      setMcnemarResult(res);
    } catch (err: any) {
      setTestError(err.message || 'McNemar test failed');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-4 border-b border-flux-border">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-mono tracking-widest text-flux-accent uppercase">
              Statistical Significance
            </span>
            <span className="text-flux-muted text-[10px]">•</span>
            <span className="text-[10px] font-mono text-flux-muted">Khan et al. 2026 Reproduction Protocol</span>
          </div>
          <h1 className="text-xl font-medium text-flux-text tracking-tight">
            Benchmark Center
          </h1>
          <p className="text-xs text-flux-secondary mt-1 max-w-xl">
            Compare model families side-by-side across persistent test splits and execute paired two-tailed McNemar's tests to statistically confirm contextual detection superiority.
          </p>
        </div>
      </div>

      {/* 2. Empirical Benchmark Leaderboard */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-flux-border">
          <h2 className="text-xs font-mono uppercase tracking-wider text-flux-secondary">
            Empirical Benchmark Leaderboard ({experiments.length} runs)
          </h2>
          <span className="text-[11px] font-mono text-flux-muted">
            Persisted test splits
          </span>
        </div>

        <div className="overflow-x-auto border-b border-flux-border">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-flux-shell text-flux-muted font-mono text-[10px] uppercase">
              <tr>
                <th className="px-3 py-2 border-b border-flux-border font-medium">Model / Experiment</th>
                <th className="px-3 py-2 border-b border-flux-border font-medium">Family</th>
                <th className="px-3 py-2 border-b border-flux-border font-medium">Split Strategy</th>
                <th className="px-3 py-2 border-b border-flux-border font-medium text-right">Macro-F1</th>
                <th className="px-3 py-2 border-b border-flux-border font-medium text-right">Malicious-F1</th>
                <th className="px-3 py-2 border-b border-flux-border font-medium text-right">Accuracy</th>
                <th className="px-3 py-2 border-b border-flux-border font-medium text-right">FPR</th>
                <th className="px-3 py-2 border-b border-flux-border font-medium text-right">FNR</th>
                <th className="px-3 py-2 border-b border-flux-border font-medium text-right">ROC-AUC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-flux-border/40 font-mono text-xs">
              {experiments.map((exp) => {
                const m = exp.metrics || {};
                const isContextual = exp.model_family.includes('contextual');
                return (
                  <tr
                    key={exp.id}
                    className={`hover:bg-flux-subsurface/40 transition-colors ${
                      isContextual ? 'bg-flux-subsurface/20' : ''
                    }`}
                  >
                    <td className="px-3 py-2.5 font-medium text-flux-text flex items-center gap-2">
                      {isContextual && (
                        <span className="w-1.5 h-1.5 rounded-full bg-flux-accent shrink-0" />
                      )}
                      <span>{exp.name}</span>
                    </td>
                    <td className="px-3 py-2.5 text-flux-muted">{exp.model_family}</td>
                    <td className="px-3 py-2.5 text-flux-muted text-[11px]">{exp.split_strategy}</td>
                    <td className="px-3 py-2.5 text-right font-medium text-flux-accent tabular-nums">
                      {m.macro_f1 !== undefined ? `${(m.macro_f1 * 100).toFixed(2)}%` : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right text-flux-secondary tabular-nums">
                      {m.malicious_f1 !== undefined ? `${(m.malicious_f1 * 100).toFixed(2)}%` : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right text-flux-text tabular-nums">
                      {m.accuracy !== undefined ? `${(m.accuracy * 100).toFixed(2)}%` : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right text-flux-warning tabular-nums">
                      {m.false_positive_rate !== undefined ? `${(m.false_positive_rate * 100).toFixed(2)}%` : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right text-flux-danger tabular-nums">
                      {m.false_negative_rate !== undefined ? `${(m.false_negative_rate * 100).toFixed(2)}%` : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right text-flux-text tabular-nums">
                      {m.roc_auc !== undefined ? m.roc_auc : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Paired McNemar Test Calculator */}
      <div className="space-y-4 pt-4">
        <div>
          <h3 className="text-xs font-mono uppercase tracking-wider text-flux-secondary">
            Paired Two-Tailed McNemar Test (H0: Equal Error Rates)
          </h3>
          <p className="text-xs text-flux-secondary mt-1 max-w-2xl">
            Calculates χ² statistic with Edwards continuity correction on discordant test pairs (b + c). Rejects the null hypothesis when p &lt; 0.05.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div>
            <label className="text-[10px] font-mono uppercase text-flux-muted block mb-1">Baseline Model (A)</label>
            <select
              value={modelAId}
              onChange={(e) => setModelAId(e.target.value)}
              className="w-full bg-flux-surface border border-flux-border/80 rounded px-2.5 py-1.5 text-xs text-flux-text focus:outline-none focus:border-flux-accent font-mono"
            >
              {experiments.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.model_family})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-mono uppercase text-flux-muted block mb-1">Candidate Model (B)</label>
            <select
              value={modelBId}
              onChange={(e) => setModelBId(e.target.value)}
              className="w-full bg-flux-surface border border-flux-border/80 rounded px-2.5 py-1.5 text-xs text-flux-text focus:outline-none focus:border-flux-accent font-mono"
            >
              {experiments.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.model_family})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleRunMcNemar}
              disabled={testing || !modelAId || !modelBId}
              className="flux-btn-primary w-full flex items-center justify-center gap-1.5 disabled:opacity-40"
            >
              {testing ? 'Computing χ²...' : 'Compute Paired McNemar Test'}
            </button>
          </div>
        </div>

        {testError && (
          <div className="p-2.5 rounded bg-flux-danger/10 text-xs text-flux-danger flex items-center gap-2">
            <AlertCircle size={14} />
            <span>{testError}</span>
          </div>
        )}

        {/* McNemar Test Results Display */}
        {mcnemarResult && (
          <div className="p-4 rounded bg-flux-subsurface/40 border border-flux-border space-y-4 mt-3">
            <div className="flex items-center justify-between pb-2 border-b border-flux-border/60">
              <span className="font-mono text-xs text-flux-text">Hypothesis Evaluation</span>
              <span
                className={`text-[11px] font-mono px-2 py-0.5 rounded ${
                  mcnemarResult.is_significant
                    ? 'text-flux-sage bg-flux-sage/10'
                    : 'text-flux-warning bg-flux-warning/10'
                }`}
              >
                {mcnemarResult.is_significant ? 'STATISTICALLY SIGNIFICANT (p < 0.05)' : 'NOT SIGNIFICANT (p ≥ 0.05)'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 font-mono text-xs">
              <div>
                <span className="text-flux-muted text-[10px] uppercase block">Chi-Square (χ²)</span>
                <span className="text-2xl font-light text-flux-text mt-0.5 block tabular-nums">{mcnemarResult.statistic}</span>
              </div>
              <div>
                <span className="text-flux-muted text-[10px] uppercase block">Two-Tailed p-value</span>
                <span className="text-2xl font-light text-flux-accent mt-0.5 block tabular-nums">{mcnemarResult.p_value}</span>
              </div>
              <div>
                <span className="text-flux-muted text-[10px] uppercase block">Discordant Pairs (b + c)</span>
                <span className="text-2xl font-light text-flux-secondary mt-0.5 block tabular-nums">
                  {mcnemarResult.contingency_table[0][1] + mcnemarResult.contingency_table[1][0]}
                </span>
              </div>
            </div>

            <div className="text-xs text-flux-secondary leading-relaxed pt-1">
              <strong className="text-flux-text">Interpretation: </strong>
              {mcnemarResult.interpretation}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
