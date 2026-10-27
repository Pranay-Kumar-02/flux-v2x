import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Layers,
  Scale,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';
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
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-5 rounded-xl bg-flux-surface border border-flux-border flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-flux-text flex items-center gap-2">
            <BarChart3 size={16} className="text-flux-accent" />
            Benchmark Center & Statistical Significance Testing
          </h3>
          <p className="text-xs text-flux-muted mt-1">
            Compare model families side-by-side on identical test sets.
            Execute two-tailed McNemar's tests on paired test predictions to statistically validate
            the performance gain of contextual features over non-contextual baselines.
          </p>
        </div>
      </div>

      {/* Model Comparison Table */}
      <div className="p-5 rounded-xl bg-flux-surface border border-flux-border space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-flux-text flex items-center gap-2">
            <FileSpreadsheet size={14} className="text-flux-info" />
            Empirical Benchmark Leaderboard ({experiments.length} runs)
          </h4>
          <span className="text-[11px] font-mono text-flux-muted">
            All metrics calculated from actual persisted test splits
          </span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-flux-border">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-flux-elevated text-flux-muted font-mono">
              <tr>
                <th className="p-3 border-b border-flux-border font-medium">Model / Experiment</th>
                <th className="p-3 border-b border-flux-border font-medium">Family</th>
                <th className="p-3 border-b border-flux-border font-medium">Split Strategy</th>
                <th className="p-3 border-b border-flux-border font-medium text-right">Macro-F1</th>
                <th className="p-3 border-b border-flux-border font-medium text-right">Malicious-F1</th>
                <th className="p-3 border-b border-flux-border font-medium text-right">Accuracy</th>
                <th className="p-3 border-b border-flux-border font-medium text-right">FPR</th>
                <th className="p-3 border-b border-flux-border font-medium text-right">FNR</th>
                <th className="p-3 border-b border-flux-border font-medium text-right">ROC-AUC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-flux-border font-mono text-xs">
              {experiments.map((exp) => {
                const m = exp.metrics || {};
                const isContextual = exp.model_family.includes('contextual');
                return (
                  <tr
                    key={exp.id}
                    className={`hover:bg-flux-elevated/40 transition-colors ${
                      isContextual ? 'bg-flux-accent/5' : ''
                    }`}
                  >
                    <td className="p-3 font-semibold text-flux-text flex items-center gap-2">
                      {isContextual && (
                        <span className="w-1.5 h-1.5 rounded-full bg-flux-accent shrink-0" />
                      )}
                      <span>{exp.name}</span>
                    </td>
                    <td className="p-3 text-flux-muted">{exp.model_family}</td>
                    <td className="p-3 text-flux-muted text-[11px]">{exp.split_strategy}</td>
                    <td className="p-3 text-right font-bold text-flux-accent">
                      {m.macro_f1 !== undefined ? `${(m.macro_f1 * 100).toFixed(2)}%` : '-'}
                    </td>
                    <td className="p-3 text-right text-flux-info">
                      {m.malicious_f1 !== undefined ? `${(m.malicious_f1 * 100).toFixed(2)}%` : '-'}
                    </td>
                    <td className="p-3 text-right text-flux-text">
                      {m.accuracy !== undefined ? `${(m.accuracy * 100).toFixed(2)}%` : '-'}
                    </td>
                    <td className="p-3 text-right text-flux-warning">
                      {m.false_positive_rate !== undefined ? `${(m.false_positive_rate * 100).toFixed(2)}%` : '-'}
                    </td>
                    <td className="p-3 text-right text-flux-danger">
                      {m.false_negative_rate !== undefined ? `${(m.false_negative_rate * 100).toFixed(2)}%` : '-'}
                    </td>
                    <td className="p-3 text-right text-flux-text">
                      {m.roc_auc !== undefined ? m.roc_auc : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Two-Tailed McNemar Test Calculator */}
      <div className="p-5 rounded-xl bg-flux-surface border border-flux-border space-y-4">
        <div>
          <h4 className="text-xs font-semibold text-flux-text flex items-center gap-2">
            <Scale size={15} className="text-flux-accent" />
            Paired McNemar's Test for Hypothesis Testing (Khan et al. 2026 Reproduction)
          </h4>
          <p className="text-[11px] text-flux-muted mt-1">
            Tests the null hypothesis (H0) that both classifiers have equal error rates on discordant test observations.
            Rejects H0 when p &lt; 0.05 (with Edwards continuity correction).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="text-[11px] font-medium text-flux-muted block mb-1">Baseline Model (A)</label>
            <select
              value={modelAId}
              onChange={(e) => setModelAId(e.target.value)}
              className="w-full bg-flux-elevated border border-flux-border rounded-lg px-3 py-1.5 text-xs text-flux-text focus:outline-none focus:border-flux-accent font-mono"
            >
              {experiments.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.model_family})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-medium text-flux-muted block mb-1">Candidate Model (B)</label>
            <select
              value={modelBId}
              onChange={(e) => setModelBId(e.target.value)}
              className="w-full bg-flux-elevated border border-flux-border rounded-lg px-3 py-1.5 text-xs text-flux-text focus:outline-none focus:border-flux-accent font-mono"
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
              className="w-full px-4 py-2 rounded-lg bg-flux-accent text-flux-bg font-semibold text-xs hover:bg-flux-accent/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              {testing ? 'Calculating Chi-Square...' : 'Compute Paired McNemar Test'}
            </button>
          </div>
        </div>

        {testError && (
          <div className="p-3 rounded-lg bg-flux-danger/10 border border-flux-danger/30 text-xs text-flux-danger flex items-center gap-2">
            <AlertCircle size={15} />
            {testError}
          </div>
        )}

        {/* McNemar Test Results Display */}
        {mcnemarResult && (
          <div className="mt-4 p-4 rounded-xl bg-flux-elevated border border-flux-border space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-flux-text">Statistical Test Outcome</span>
              <span
                className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                  mcnemarResult.is_significant
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-flux-warning/15 text-flux-warning border-flux-warning/30'
                }`}
              >
                {mcnemarResult.is_significant ? 'SIGNIFICANT (p < 0.05)' : 'NOT SIGNIFICANT (p ≥ 0.05)'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
              <div className="p-3 rounded-lg bg-flux-bg border border-flux-border/60">
                <span className="text-flux-muted text-[10px] block">Chi-Square Statistic (χ²)</span>
                <span className="text-base font-bold text-flux-text">{mcnemarResult.statistic}</span>
              </div>
              <div className="p-3 rounded-lg bg-flux-bg border border-flux-border/60">
                <span className="text-flux-muted text-[10px] block">Exact Two-Tailed p-value</span>
                <span className="text-base font-bold text-flux-accent">{mcnemarResult.p_value}</span>
              </div>
              <div className="p-3 rounded-lg bg-flux-bg border border-flux-border/60">
                <span className="text-flux-muted text-[10px] block">Discordant Observations (b + c)</span>
                <span className="text-base font-bold text-flux-info">
                  {mcnemarResult.contingency_table[0][1] + mcnemarResult.contingency_table[1][0]}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-flux-surface border border-flux-border text-xs text-flux-text leading-relaxed">
              <strong>Interpretation: </strong> {mcnemarResult.interpretation}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
