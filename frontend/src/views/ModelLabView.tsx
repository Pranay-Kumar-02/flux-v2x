import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { Play, RotateCcw, BarChart } from 'lucide-react';
import { api, Dataset, Experiment } from '../api/client';

interface ModelLabViewProps {
  activeDataset?: Dataset | null;
}

export const ModelLabView: React.FC<ModelLabViewProps> = ({ activeDataset }) => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [selectedExp, setSelectedExp] = useState<Experiment | null>(null);
  const [modelFamily, setModelFamily] = useState<string>('contextual_gradient_boosting');
  const [splitStrategy, setSplitStrategy] = useState<string>('scenario_split');
  const [expName, setExpName] = useState<string>('Contextual Gradient Boosting (Khan et al. 2026)');
  const [launching, setLaunching] = useState<boolean>(false);
  const [launchError, setLaunchError] = useState<string | null>(null);

  const modelFamilies = [
    { id: 'global_threshold', name: 'Global Traffic-Rate Threshold (Baseline)' },
    { id: 'raw_gradient_boosting', name: 'Raw Gradient Boosting (Non-Contextual)' },
    { id: 'contextual_gradient_boosting', name: 'Contextual Gradient Boosting (Khan et al. 2026)' },
    { id: 'random_forest', name: 'Random Forest Classifier' },
    { id: 'extra_trees', name: 'Extra Trees Classifier' },
    { id: 'adaboost', name: 'AdaBoost Classifier' },
    { id: 'decision_tree', name: 'Decision Tree Classifier' },
    { id: 'knn', name: 'K-Nearest Neighbors (KNN)' },
    { id: 'logistic_regression', name: 'Logistic Regression' },
    { id: 'svc_rbf', name: 'Support Vector Machine (RBF Kernel)' },
  ];

  useEffect(() => {
    async function init() {
      const list = await api.listDatasets();
      setDatasets(list);
      if (activeDataset) {
        setSelectedDatasetId(activeDataset.id);
      } else if (list.length > 0) {
        setSelectedDatasetId(list[0].id);
      }
      loadExperiments();
    }
    init();
  }, [activeDataset]);

  const loadExperiments = async () => {
    try {
      const exps = await api.listExperiments();
      setExperiments(exps);
      if (exps.length > 0 && !selectedExp) {
        setSelectedExp(exps[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLaunch = async () => {
    if (!selectedDatasetId) return;
    setLaunching(true);
    setLaunchError(null);

    try {
      const prev = await api.previewDataset(selectedDatasetId, 0, 1);
      const res = await api.launchExperiment({
        dataset_version_id: prev.version_id,
        name: expName,
        model_family: modelFamily,
        split_strategy: splitStrategy,
        test_size: 0.25,
        random_seed: 42,
      });
      await loadExperiments();
      setSelectedExp(res);
    } catch (err: any) {
      setLaunchError(err.message || 'Execution failed');
    } finally {
      setLaunching(false);
    }
  };

  // ROC Curve ECharts Option
  const getRocOption = () => {
    if (!selectedExp?.metrics?.roc_curve_points) return {};
    const pts = selectedExp.metrics.roc_curve_points.map((p: any) => [p.fpr, p.tpr]);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#0C0C0C',
        borderColor: '#292723',
        textStyle: { color: '#F0EDE7', fontSize: 11, fontFamily: 'monospace' },
        formatter: (params: any) => {
          const pt = params[0].value;
          return `FPR: ${pt[0]}<br/>TPR: ${pt[1]}`;
        },
      },
      grid: { left: '8%', right: '4%', top: '8%', bottom: '15%' },
      xAxis: {
        type: 'value',
        name: 'False Positive Rate',
        nameTextStyle: { color: '#898277', fontSize: 10 },
        min: 0,
        max: 1,
        axisLine: { lineStyle: { color: '#292723' } },
        splitLine: { lineStyle: { color: '#171715' } },
        axisLabel: { color: '#898277', fontSize: 10, fontFamily: 'monospace' },
      },
      yAxis: {
        type: 'value',
        name: 'True Positive Rate',
        nameTextStyle: { color: '#898277', fontSize: 10 },
        min: 0,
        max: 1,
        axisLine: { lineStyle: { color: '#292723' } },
        splitLine: { lineStyle: { color: '#171715' } },
        axisLabel: { color: '#898277', fontSize: 10, fontFamily: 'monospace' },
      },
      series: [
        {
          name: 'ROC',
          type: 'line',
          data: pts,
          smooth: true,
          itemStyle: { color: '#AD8D69' },
          lineStyle: { width: 1.5 },
          areaStyle: { color: 'rgba(173, 141, 105, 0.08)' },
        },
      ],
    };
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* 1. Header with Controls */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-4 border-b border-flux-border">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-mono tracking-widest text-flux-accent uppercase">
              Model Evaluation
            </span>
            <span className="text-flux-muted text-[10px]">•</span>
            <span className="text-[10px] font-mono text-flux-muted">10 Classifier Architectures</span>
          </div>
          <h1 className="text-xl font-medium text-flux-text tracking-tight">
            Model Laboratory
          </h1>
          <p className="text-xs text-flux-secondary mt-1 max-w-xl">
            Train and evaluate classical and contextual classifiers under disjoint scenario partitions to verify performance gains without data leakage.
          </p>
        </div>
      </div>

      {/* 2. Experiment Configuration Row */}
      <div className="p-4 rounded bg-flux-subsurface/40 border border-flux-border space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-[10px] font-mono uppercase text-flux-muted block mb-1">Experiment Label</label>
            <input
              type="text"
              value={expName}
              onChange={(e) => setExpName(e.target.value)}
              className="w-full bg-flux-surface border border-flux-border/80 rounded px-2.5 py-1.5 text-xs text-flux-text focus:outline-none focus:border-flux-accent font-sans"
            />
          </div>

          <div>
            <label className="text-[10px] font-mono uppercase text-flux-muted block mb-1">Architecture</label>
            <select
              value={modelFamily}
              onChange={(e) => {
                setModelFamily(e.target.value);
                const fam = modelFamilies.find((m) => m.id === e.target.value);
                if (fam) setExpName(fam.name);
              }}
              className="w-full bg-flux-surface border border-flux-border/80 rounded px-2.5 py-1.5 text-xs text-flux-text focus:outline-none focus:border-flux-accent font-mono"
            >
              {modelFamilies.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-mono uppercase text-flux-muted block mb-1">Split Strategy</label>
            <select
              value={splitStrategy}
              onChange={(e) => setSplitStrategy(e.target.value)}
              className="w-full bg-flux-surface border border-flux-border/80 rounded px-2.5 py-1.5 text-xs text-flux-text focus:outline-none focus:border-flux-accent font-mono"
            >
              <option value="scenario_split">Disjoint Scenario Partition (Safe)</option>
              <option value="chronological">Chronological Forward Split</option>
              <option value="stratified">Stratified Random Split</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleLaunch}
              disabled={launching || !selectedDatasetId}
              className="flux-btn-primary w-full flex items-center justify-center gap-1.5 disabled:opacity-40"
            >
              {launching ? (
                <>
                  <div className="w-3 h-3 border border-flux-bg border-t-transparent rounded-full animate-spin" />
                  <span>Training...</span>
                </>
              ) : (
                <>
                  <Play size={11} fill="currentColor" />
                  <span>Run Experiment</span>
                </>
              )}
            </button>
          </div>
        </div>

        {launchError && (
          <div className="p-2 text-xs text-flux-danger font-mono">
            {launchError}
          </div>
        )}
      </div>

      {/* 3. Main Split: Runs (4 cols) & Evaluation Results (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Saved Runs */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-flux-border">
            <h2 className="text-xs font-mono uppercase tracking-wider text-flux-secondary">
              Experiment History ({experiments.length})
            </h2>
            <button
              onClick={loadExperiments}
              className="text-flux-muted hover:text-flux-text transition-colors p-1"
              title="Refresh experiments"
            >
              <RotateCcw size={12} />
            </button>
          </div>

          <div className="divide-y divide-flux-border/60 max-h-[500px] overflow-y-auto">
            {experiments.length === 0 ? (
              <div className="py-8 text-center text-xs text-flux-muted">
                No experiments recorded yet.
              </div>
            ) : (
              experiments.map((exp) => {
                const isSelected = selectedExp?.id === exp.id;
                const f1 = exp.metrics?.macro_f1;
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
                      <div className="text-[10px] text-flux-muted font-mono mt-0.5">
                        {exp.model_family}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {f1 !== undefined ? (
                        <span className="font-mono text-xs text-flux-accent font-semibold tabular-nums">
                          {(f1 * 100).toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-[10px] text-flux-muted font-mono">
                          {exp.status}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Selected Experiment Analytics */}
        <div className="lg:col-span-8 space-y-6">
          {selectedExp && selectedExp.metrics ? (
            <>
              {/* Metrics Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4 border-b border-flux-border">
                <div>
                  <span className="text-[10px] font-mono uppercase text-flux-muted">Macro-F1</span>
                  <div className="text-2xl font-light font-mono text-flux-accent mt-0.5 tabular-nums">
                    {(selectedExp.metrics.macro_f1 * 100).toFixed(2)}%
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-flux-muted">Malicious F1</span>
                  <div className="text-2xl font-light font-mono text-flux-text mt-0.5 tabular-nums">
                    {(selectedExp.metrics.malicious_f1 * 100).toFixed(2)}%
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-flux-muted">False Positive Rate</span>
                  <div className="text-2xl font-light font-mono text-flux-warning mt-0.5 tabular-nums">
                    {(selectedExp.metrics.false_positive_rate * 100).toFixed(2)}%
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-flux-muted">Accuracy</span>
                  <div className="text-2xl font-light font-mono text-flux-secondary mt-0.5 tabular-nums">
                    {(selectedExp.metrics.accuracy * 100).toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* Confusion Matrix & ROC Curve */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Confusion Matrix */}
                {selectedExp.confusion_matrix && (
                  <div className="space-y-3">
                    <div className="pb-1 border-b border-flux-border">
                      <h4 className="text-xs font-mono uppercase tracking-wider text-flux-secondary">
                        Empirical Confusion Matrix
                      </h4>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono pt-1">
                      <div className="p-3 rounded bg-flux-subsurface/60">
                        <span className="text-[9px] text-flux-muted block uppercase">TN (Benign Allowed)</span>
                        <span className="text-base font-bold text-flux-sage tabular-nums mt-0.5 block">
                          {selectedExp.confusion_matrix.true_negative}
                        </span>
                      </div>
                      <div className="p-3 rounded bg-flux-subsurface/60">
                        <span className="text-[9px] text-flux-muted block uppercase">FP (False Alarm)</span>
                        <span className="text-base font-bold text-flux-warning tabular-nums mt-0.5 block">
                          {selectedExp.confusion_matrix.false_positive}
                        </span>
                      </div>
                      <div className="p-3 rounded bg-flux-subsurface/60">
                        <span className="text-[9px] text-flux-muted block uppercase">FN (Missed Attack)</span>
                        <span className="text-base font-bold text-flux-danger tabular-nums mt-0.5 block">
                          {selectedExp.confusion_matrix.false_negative}
                        </span>
                      </div>
                      <div className="p-3 rounded bg-flux-subsurface/60">
                        <span className="text-[9px] text-flux-muted block uppercase">TP (Attack Mitigated)</span>
                        <span className="text-base font-bold text-flux-accent tabular-nums mt-0.5 block">
                          {selectedExp.confusion_matrix.true_positive}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ROC Curve */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-flux-border">
                    <h4 className="text-xs font-mono uppercase tracking-wider text-flux-secondary">
                      ROC Characteristic Curve
                    </h4>
                    <span className="text-[10px] font-mono text-flux-muted">
                      AUC: {selectedExp.metrics.roc_auc ?? 'N/A'}
                    </span>
                  </div>
                  <div className="h-44 w-full">
                    <ReactECharts option={getRocOption()} style={{ height: '100%', width: '100%' }} />
                  </div>
                </div>
              </div>

              {/* Reproducibility Manifest Lineage */}
              <div className="pt-2 border-t border-flux-border text-xs text-flux-muted space-y-1.5 font-mono text-[11px]">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-flux-secondary">
                  <span>Split: <strong className="text-flux-text">{selectedExp.split_strategy}</strong></span>
                  <span>Seed: <strong className="text-flux-text">{selectedExp.random_seed}</strong></span>
                  <span>Train: <strong className="text-flux-text tabular-nums">{selectedExp.metrics.train_samples}</strong></span>
                  <span>Test: <strong className="text-flux-text tabular-nums">{selectedExp.metrics.test_samples}</strong></span>
                </div>
                {selectedExp.metrics.split_metadata?.leakage_safeguards && (
                  <div className="text-[10px] text-flux-muted pt-1">
                    Guards: {selectedExp.metrics.split_metadata.leakage_safeguards.join(' • ')}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="py-16 text-center text-xs text-flux-muted">
              Select an experiment on the left to inspect scientific evaluation metrics.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
