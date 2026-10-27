import React, { useState, useEffect } from 'react';
import { Scale, AlertCircle, BarChart3, Sparkles } from 'lucide-react';
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-flux-accent/10 border border-flux-accent/20 text-flux-accent text-[11px] font-medium mb-1.5">
            <BarChart3 size={11} />
            <span>Statistical Significance Testing</span>
          </div>
          <h1 className="text-2xl font-semibold text-flux-text tracking-tight">
            Benchmark Center
          </h1>
          <p className="text-xs text-flux-secondary mt-1 max-w-xl leading-relaxed">
            Compare model families side-by-side on persistent test splits and execute paired two-tailed McNemar tests to statistically confirm contextual detection gains.
          </p>
        </div>
      </div>

      {/* 2. Empirical Benchmark Leaderboard */}
      <div className="flux-panel p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-flux-border/60">
          <div>
            <h2 className="text-sm font-medium text-flux-text tracking-tight">
              Empirical Benchmark Leaderboard ({experiments.length} runs recorded)
            </h2>
            <p className="text-[11px] text-flux-muted mt-0.5 font-normal">
              Performance metrics strictly computed on disjoint test partitions
            </p>
          </div>
        </div>

        <div className="flux-inset overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-flux-surface text-flux-muted text-[11px] border-b border-flux-border/60">
              <tr>
                <th className="px-3 py-2.5 font-medium">Model / Experiment</th>
                <th className="px-3 py-2.5 font-medium">Family</th>
                <th className="px-3 py-2.5 font-medium">Split Strategy</th>
                <th className="px-3 py-2.5 font-medium text-right">Macro-F1</th>
                <th className="px-3 py-2.5 font-medium text-right">Malicious-F1</th>
                <th className="px-3 py-2.5 font-medium text-right">Accuracy</th>
                <th className="px-3 py-2.5 font-medium text-right">FPR</th>
                <th className="px-3 py-2.5 font-medium text-right">FNR</th>
                <th className="px-3 py-2.5 font-medium text-right">ROC-AUC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-flux-border/30 text-xs">
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
                    <td className="px-3 py-2.5 text-right font-medium text-flux-accent font-mono tabular-nums">
                      {m.macro_f1 !== undefined ? `${(m.macro_f1 * 100).toFixed(2)}%` : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right text-flux-secondary font-mono tabular-nums">
                      {m.malicious_f1 !== undefined ? `${(m.malicious_f1 * 100).toFixed(2)}%` : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right text-flux-text font-mono tabular-nums">
                      {m.accuracy !== undefined ? `${(m.accuracy * 100).toFixed(2)}%` : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right text-flux-warning font-mono tabular-nums">
                      {m.false_positive_rate !== undefined ? `${(m.false_positive_rate * 100).toFixed(2)}%` : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right text-flux-danger font-mono tabular-nums">
                      {m.false_negative_rate !== undefined ? `${(m.false_negative_rate * 100).toFixed(2)}%` : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right text-flux-text font-mono tabular-nums">
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
      <div className="flux-panel p-5 space-y-4">
        <div>
          <h3 className="text-sm font-medium text-flux-text tracking-tight flex items-center gap-2">
            <Scale size={15} className="text-flux-accent" />
            <span>Paired Two-Tailed McNemar Test (H0: Equal Misclassification Rates)</span>
          </h3>
          <p className="text-xs text-flux-secondary mt-0.5 leading-relaxed font-normal">
            Calculates χ² statistic with Edwards continuity correction on discordant test pairs (b + c). Rejects the null hypothesis when p &lt; 0.05.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          <div>
            <label className="text-xs font-medium text-flux-muted block mb-1">Baseline Model (A)</label>
            <select
              value={modelAId}
              onChange={(e) => setModelAId(e.target.value)}
              className="w-full bg-flux-subsurface border border-white/[0.04] rounded-md px-3 py-1.5 text-xs text-flux-text focus:outline-none focus:border-flux-accent font-medium"
            >
              {experiments.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.model_family})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-flux-muted block mb-1">Candidate Model (B)</label>
            <select
              value={modelBId}
              onChange={(e) => setModelBId(e.target.value)}
              className="w-full bg-flux-subsurface border border-white/[0.04] rounded-md px-3 py-1.5 text-xs text-flux-text focus:outline-none focus:border-flux-accent font-medium"
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
          <div className="p-3 rounded-lg bg-flux-danger/10 border border-flux-danger/20 text-xs text-flux-danger flex items-center gap-2">
            <AlertCircle size={14} />
            <span>{testError}</span>
          </div>
        )}

        {/* McNemar Test Results Display */}
        {mcnemarResult && (
          <div className="p-4 rounded-lg bg-flux-subsurface/60 border border-white/[0.04] space-y-4 mt-3">
            <div className="flex items-center justify-between pb-2 border-b border-flux-border/60">
              <span className="text-xs font-medium text-flux-text">Hypothesis Evaluation Outcome</span>
              <span
                className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${
                  mcnemarResult.is_significant
                    ? 'text-flux-sage bg-flux-sage/10 border-flux-sage/30'
                    : 'text-flux-warning bg-flux-warning/10 border-flux-warning/30'
                }`}
              >
                {mcnemarResult.is_significant ? 'STATISTICALLY SIGNIFICANT (p < 0.05)' : 'NOT SIGNIFICANT (p ≥ 0.05)'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
              <div>
                <span className="text-flux-muted text-xs block">Chi-Square (χ²)</span>
                <span className="text-2xl font-semibold text-flux-text mt-1 block font-mono tabular-nums">{mcnemarResult.statistic}</span>
              </div>
              <div>
                <span className="text-flux-muted text-xs block">Two-Tailed p-value</span>
                <span className="text-2xl font-semibold text-flux-accent mt-1 block font-mono tabular-nums">{mcnemarResult.p_value}</span>
              </div>
              <div>
                <span className="text-flux-muted text-xs block">Discordant Pairs (b + c)</span>
                <span className="text-2xl font-semibold text-flux-secondary mt-1 block font-mono tabular-nums">
                  {mcnemarResult.contingency_table[0][1] + mcnemarResult.contingency_table[1][0]}
                </span>
              </div>
            </div>

            <div className="text-xs text-flux-secondary leading-relaxed pt-2 border-t border-flux-border/40">
              <strong className="text-flux-text font-medium">Interpretation: </strong>
              {mcnemarResult.interpretation}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
