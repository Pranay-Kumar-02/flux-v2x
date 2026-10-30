import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { Play, RotateCcw, Cpu } from 'lucide-react';
import { api, Dataset, Experiment } from '../api/client';
import { useTheme } from '../context/ThemeContext';
import { getChartTokens, SVG_RENDERER_OPTS, CHART_FONT_FAMILY } from '../utils/chartTheme';

interface ModelLabViewProps {
  activeDataset?: Dataset | null;
}

export const ModelLabView: React.FC<ModelLabViewProps> = ({ activeDataset }) => {
  const { theme } = useTheme();
  const ct = getChartTokens(theme);
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
        backgroundColor: ct.tooltipBg,
        borderColor: ct.tooltipBorder,
        borderWidth: 1,
        textStyle: { color: ct.tooltipText, fontSize: 11, fontFamily: CHART_FONT_FAMILY },
        formatter: (params: any) => {
          const pt = params[0].value;
          return `FPR: ${(pt[0] * 100).toFixed(2)}%<br/>TPR: ${(pt[1] * 100).toFixed(2)}%`;
        },
      },
      grid: {
        left: 55,
        right: 30,
        top: 25,
        bottom: 48,
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        name: 'False Positive Rate',
        nameLocation: 'middle',
        nameGap: 28,
        nameTextStyle: { color: ct.nameText, fontSize: 11, fontFamily: CHART_FONT_FAMILY, fontWeight: 500 },
        min: 0,
        max: 1,
        axisLine: { lineStyle: { color: ct.axisLine } },
        splitLine: { lineStyle: { color: ct.splitLine } },
        axisLabel: {
          color: ct.axisLabel,
          fontSize: 10,
          fontFamily: CHART_FONT_FAMILY,
          formatter: (v: number) => `${(v * 100).toFixed(0)}%`,
        },
      },
      yAxis: {
        type: 'value',
        name: 'True Positive Rate',
        nameLocation: 'middle',
        nameGap: 38,
        nameTextStyle: { color: ct.nameText, fontSize: 11, fontFamily: CHART_FONT_FAMILY, fontWeight: 500 },
        min: 0,
        max: 1,
        axisLine: { lineStyle: { color: ct.axisLine } },
        splitLine: { lineStyle: { color: ct.splitLine } },
        axisLabel: {
          color: ct.axisLabel,
          fontSize: 10,
          fontFamily: CHART_FONT_FAMILY,
          formatter: (v: number) => `${(v * 100).toFixed(0)}%`,
        },
      },
      series: [
        {
          name: 'ROC',
          type: 'line',
          data: pts,
          smooth: true,
          itemStyle: { color: ct.accent },
          lineStyle: { width: 2 },
          areaStyle: { color: ct.accent, opacity: 0.12 },
        },
      ],
    };
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* 1. Page Header with Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-flux-accent/10 border border-flux-accent/20 text-flux-accent text-[11px] font-medium mb-1.5">
            <Cpu size={11} />
            <span>Empirical ML Benchmarking</span>
          </div>
          <h1 className="text-2xl font-semibold text-flux-text tracking-tight">
            Model Laboratory
          </h1>
          <p className="text-xs text-flux-secondary mt-1 max-w-xl leading-relaxed">
            Train and evaluate 10 classical and contextual classifiers under disjoint scenario partitions to verify performance gains without data leakage.
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

      {/* 2. Experiment Configuration Panel */}
      <div className="flux-panel p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-flux-border/60">
          <h2 className="text-sm font-medium text-flux-text tracking-tight">
            Experiment Configuration & Execution
          </h2>
          <span className="text-[11px] text-flux-muted font-normal">
            Leakage-Safe Partition Strategy
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-medium text-flux-muted block mb-1">Experiment Name</label>
            <input
              type="text"
              value={expName}
              onChange={(e) => setExpName(e.target.value)}
              className="w-full bg-flux-subsurface border border-white/[0.04] rounded-md px-3 py-1.5 text-xs text-flux-text focus:outline-none focus:border-flux-accent font-medium"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-flux-muted block mb-1">Model Architecture</label>
            <select
              value={modelFamily}
              onChange={(e) => {
                setModelFamily(e.target.value);
                const fam = modelFamilies.find((m) => m.id === e.target.value);
                if (fam) setExpName(fam.name);
              }}
              className="w-full bg-flux-subsurface border border-white/[0.04] rounded-md px-3 py-1.5 text-xs text-flux-text focus:outline-none focus:border-flux-accent font-medium"
            >
              {modelFamilies.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-flux-muted block mb-1">Split Strategy</label>
            <select
              value={splitStrategy}
              onChange={(e) => setSplitStrategy(e.target.value)}
              className="w-full bg-flux-subsurface border border-white/[0.04] rounded-md px-3 py-1.5 text-xs text-flux-text focus:outline-none focus:border-flux-accent font-medium"
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
                  <span>Training Model...</span>
                </>
              ) : (
                <>
                  <Play size={12} fill="currentColor" />
                  <span>Launch Experiment</span>
                </>
              )}
            </button>
          </div>
        </div>

        {launchError && (
          <div className="p-3 rounded-lg bg-flux-danger/10 border border-flux-danger/20 text-xs text-flux-danger">
            {launchError}
          </div>
        )}
      </div>

      {/* 3. Main Split: Runs (4 cols) & Evaluation Results (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Saved Runs */}
        <div className="lg:col-span-4 flux-panel p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-flux-border/60">
            <h2 className="text-sm font-medium text-flux-text tracking-tight">
              Experiment History ({experiments.length})
            </h2>
            <button
              onClick={loadExperiments}
              className="text-flux-muted hover:text-flux-text transition-colors p-1"
              title="Refresh experiments"
            >
              <RotateCcw size={13} />
            </button>
          </div>

          <div className="divide-y divide-flux-border/40 max-h-[500px] overflow-y-auto">
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
                    className={`py-3 px-2.5 rounded-lg cursor-pointer transition-colors text-xs flex items-center justify-between ${
                      isSelected
                        ? 'bg-flux-subsurface text-flux-text font-medium shadow-sm'
                        : 'text-flux-secondary hover:text-flux-text hover:bg-flux-subsurface/40'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="truncate text-xs font-medium">{exp.name}</div>
                      <div className="text-[11px] text-flux-muted mt-0.5">
                        {exp.model_family}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {f1 !== undefined ? (
                        <span className="font-mono text-xs text-flux-accent font-semibold tabular-nums">
                          {(f1 * 100).toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-[10px] text-flux-muted font-medium">
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
              <div className="flux-panel p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="sm:pr-4 sm:border-r border-flux-border/60">
                  <span className="text-xs font-medium text-flux-muted">Macro-F1</span>
                  <div className="text-2xl font-semibold text-flux-accent mt-1 font-mono tabular-nums">
                    {(selectedExp.metrics.macro_f1 * 100).toFixed(2)}%
                  </div>
                </div>
                <div className="sm:pr-4 sm:border-r border-flux-border/60">
                  <span className="text-xs font-medium text-flux-muted">Malicious F1</span>
                  <div className="text-2xl font-semibold text-flux-text mt-1 font-mono tabular-nums">
                    {(selectedExp.metrics.malicious_f1 * 100).toFixed(2)}%
                  </div>
                </div>
                <div className="sm:pr-4 sm:border-r border-flux-border/60">
                  <span className="text-xs font-medium text-flux-muted">False Positive Rate</span>
                  <div className="text-2xl font-semibold text-flux-warning mt-1 font-mono tabular-nums">
                    {(selectedExp.metrics.false_positive_rate * 100).toFixed(2)}%
                  </div>
                </div>
                <div>
                  <span className="text-xs font-medium text-flux-muted">Accuracy</span>
                  <div className="text-2xl font-semibold text-flux-secondary mt-1 font-mono tabular-nums">
                    {(selectedExp.metrics.accuracy * 100).toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* Confusion Matrix & ROC Curve */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Confusion Matrix */}
                {selectedExp.confusion_matrix && (
                  <div className="flux-panel p-5 space-y-3.5">
                    <div className="pb-2 border-b border-flux-border/60">
                      <h4 className="text-sm font-medium text-flux-text tracking-tight">
                        Empirical Confusion Matrix
                      </h4>
                      <p className="text-[11px] text-flux-muted mt-0.5">
                        Test split classification outcomes
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-center text-xs pt-1">
                      <div className="p-3.5 rounded-lg bg-flux-subsurface/60 border border-white/[0.03]">
                        <span className="text-[10px] text-flux-muted block font-medium">True Negative</span>
                        <span className="text-xl font-semibold text-flux-sage font-mono tabular-nums mt-0.5 block">
                          {selectedExp.confusion_matrix.true_negative}
                        </span>
                        <span className="text-[10px] text-flux-muted block mt-0.5">Benign Confirmed</span>
                      </div>
                      <div className="p-3.5 rounded-lg bg-flux-subsurface/60 border border-white/[0.03]">
                        <span className="text-[10px] text-flux-muted block font-medium">False Positive</span>
                        <span className="text-xl font-semibold text-flux-warning font-mono tabular-nums mt-0.5 block">
                          {selectedExp.confusion_matrix.false_positive}
                        </span>
                        <span className="text-[10px] text-flux-muted block mt-0.5">False Alarm</span>
                      </div>
                      <div className="p-3.5 rounded-lg bg-flux-subsurface/60 border border-white/[0.03]">
                        <span className="text-[10px] text-flux-muted block font-medium">False Negative</span>
                        <span className="text-xl font-semibold text-flux-danger font-mono tabular-nums mt-0.5 block">
                          {selectedExp.confusion_matrix.false_negative}
                        </span>
                        <span className="text-[10px] text-flux-muted block mt-0.5">Attack Missed</span>
                      </div>
                      <div className="p-3.5 rounded-lg bg-flux-subsurface/60 border border-white/[0.03]">
                        <span className="text-[10px] text-flux-muted block font-medium">True Positive</span>
                        <span className="text-xl font-semibold text-flux-accent font-mono tabular-nums mt-0.5 block">
                          {selectedExp.confusion_matrix.true_positive}
                        </span>
                        <span className="text-[10px] text-flux-muted block mt-0.5">Attack Caught</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ROC Curve */}
                <div className="flux-panel p-5 space-y-3.5">
                  <div className="flex items-center justify-between pb-2 border-b border-flux-border/60">
                    <div>
                      <h4 className="text-sm font-medium text-flux-text tracking-tight">
                        ROC Characteristic Curve
                      </h4>
                      <p className="text-[11px] text-flux-muted mt-0.5">
                        Sensitivity vs specificity trade-off
                      </p>
                    </div>
                    <span className="text-xs font-mono font-medium text-flux-accent tabular-nums">
                      AUC: {selectedExp.metrics.roc_auc ?? 'N/A'}
                    </span>
                  </div>
                  <div className="h-64 w-full">
                    <ReactECharts
                      option={getRocOption()}
                      notMerge={true}
                      opts={SVG_RENDERER_OPTS}
                      style={{ height: '100%', width: '100%' }}
                    />
                  </div>
                </div>
              </div>

              {/* Reproducibility Manifest Lineage */}
              <div className="flux-panel p-4 text-xs text-flux-muted space-y-2">
                <div className="font-medium text-xs text-flux-text">
                  Scientific Reproducibility Manifest
                </div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-flux-secondary text-[11px]">
                  <span>Split: <strong className="text-flux-text font-medium">{selectedExp.split_strategy}</strong></span>
                  <span>Seed: <strong className="text-flux-text font-medium">{selectedExp.random_seed}</strong></span>
                  <span>Train: <strong className="text-flux-text font-mono tabular-nums">{selectedExp.metrics.train_samples}</strong></span>
                  <span>Test: <strong className="text-flux-text font-mono tabular-nums">{selectedExp.metrics.test_samples}</strong></span>
                </div>
                {selectedExp.metrics.split_metadata?.leakage_safeguards && (
                  <div className="text-[11px] text-flux-muted pt-1 border-t border-flux-border/40">
                    Safeguards: {selectedExp.metrics.split_metadata.leakage_safeguards.join(' • ')}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="py-20 text-center text-xs text-flux-muted flux-panel">
              Select an experiment from the history to inspect scientific evaluation metrics.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
