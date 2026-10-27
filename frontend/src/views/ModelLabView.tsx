import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  Cpu,
  Play,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  BarChart,
  Activity,
  Layers,
  FileCheck
} from 'lucide-react';
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
        formatter: (params: any) => {
          const pt = params[0].value;
          return `FPR: ${pt[0]}<br/>TPR: ${pt[1]}`;
        },
      },
      grid: { left: '12%', right: '8%', top: '15%', bottom: '15%' },
      xAxis: {
        type: 'value',
        name: 'False Positive Rate (FPR)',
        min: 0,
        max: 1,
        axisLine: { lineStyle: { color: '#273544' } },
        splitLine: { lineStyle: { color: '#17212B' } },
        axisLabel: { color: '#94A3B8', fontFamily: 'monospace' },
      },
      yAxis: {
        type: 'value',
        name: 'True Positive Rate (TPR)',
        min: 0,
        max: 1,
        axisLine: { lineStyle: { color: '#273544' } },
        splitLine: { lineStyle: { color: '#17212B' } },
        axisLabel: { color: '#94A3B8', fontFamily: 'monospace' },
      },
      series: [
        {
          name: 'ROC Curve',
          type: 'line',
          data: pts,
          smooth: true,
          itemStyle: { color: '#2DD4BF' },
          areaStyle: { color: 'rgba(45, 212, 191, 0.15)' },
        },
      ],
    };
  };

  return (
    <div className="space-y-6">
      {/* Configure & Launch Bar */}
      <div className="p-5 rounded-xl bg-flux-surface border border-flux-border space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-flux-text flex items-center gap-2">
            <Cpu size={16} className="text-flux-accent" />
            Model Laboratory & Experiment Runner
          </h3>
          <p className="text-xs text-flux-muted mt-1">
            Train and evaluate classical and context-aware classifiers using leakage-safe splitting.
            Reproduce the exact contextual vs raw ablation experiments from Khan et al. (2026).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-[11px] font-medium text-flux-muted block mb-1">Experiment Name</label>
            <input
              type="text"
              value={expName}
              onChange={(e) => setExpName(e.target.value)}
              className="w-full bg-flux-elevated border border-flux-border rounded-lg px-3 py-1.5 text-xs text-flux-text focus:outline-none focus:border-flux-accent font-sans"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-flux-muted block mb-1">Model Family</label>
            <select
              value={modelFamily}
              onChange={(e) => {
                setModelFamily(e.target.value);
                const fam = modelFamilies.find((m) => m.id === e.target.value);
                if (fam) setExpName(fam.name);
              }}
              className="w-full bg-flux-elevated border border-flux-border rounded-lg px-3 py-1.5 text-xs text-flux-text focus:outline-none focus:border-flux-accent font-mono"
            >
              {modelFamilies.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-medium text-flux-muted block mb-1">Leakage-Safe Split</label>
            <select
              value={splitStrategy}
              onChange={(e) => setSplitStrategy(e.target.value)}
              className="w-full bg-flux-elevated border border-flux-border rounded-lg px-3 py-1.5 text-xs text-flux-text focus:outline-none focus:border-flux-accent font-mono"
            >
              <option value="scenario_split">Disjoint Scenario Partitioning (Recommended)</option>
              <option value="chronological">Chronological Forward Split</option>
              <option value="stratified">Stratified Random Split</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleLaunch}
              disabled={launching || !selectedDatasetId}
              className="w-full px-4 py-2 rounded-lg bg-flux-accent text-flux-bg font-semibold text-xs hover:bg-flux-accent/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              {launching ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-flux-bg border-t-transparent rounded-full animate-spin" />
                  <span>Training Model...</span>
                </>
              ) : (
                <>
                  <Play size={13} fill="currentColor" />
                  <span>Launch Experiment</span>
                </>
              )}
            </button>
          </div>
        </div>

        {launchError && (
          <div className="p-3 rounded-lg bg-flux-danger/10 border border-flux-danger/30 text-xs text-flux-danger flex items-center gap-2">
            <AlertTriangle size={15} />
            {launchError}
          </div>
        )}
      </div>

      {/* Main Grid: Experiment List & Results Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Experiment History List */}
        <div className="p-5 rounded-xl bg-flux-surface border border-flux-border space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-flux-text flex items-center gap-2">
              <Activity size={14} className="text-flux-info" />
              Experiment Runs ({experiments.length})
            </h4>
            <button onClick={loadExperiments} className="text-flux-muted hover:text-flux-text">
              <RotateCcw size={12} />
            </button>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {experiments.map((exp) => {
              const isSelected = selectedExp?.id === exp.id;
              const f1 = exp.metrics?.macro_f1;
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
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-flux-text truncate max-w-[170px]">{exp.name}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      exp.status === 'completed' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-flux-warning/15 text-flux-warning'
                    }`}>
                      {exp.status}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] font-mono text-flux-muted">
                    <span>{exp.model_family}</span>
                    {f1 !== undefined && (
                      <span className="text-flux-accent font-semibold">
                        F1: {(f1 * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Experiment Analytics */}
        <div className="lg:col-span-2 space-y-6">
          {selectedExp && selectedExp.metrics ? (
            <>
              {/* Metric Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-flux-surface border border-flux-border">
                  <span className="text-[10px] font-medium text-flux-muted">Macro-F1 Score</span>
                  <div className="text-xl font-bold font-mono text-flux-accent mt-0.5">
                    {(selectedExp.metrics.macro_f1 * 100).toFixed(2)}%
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-flux-surface border border-flux-border">
                  <span className="text-[10px] font-medium text-flux-muted">Malicious-Class F1</span>
                  <div className="text-xl font-bold font-mono text-flux-info mt-0.5">
                    {(selectedExp.metrics.malicious_f1 * 100).toFixed(2)}%
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-flux-surface border border-flux-border">
                  <span className="text-[10px] font-medium text-flux-muted">False Positive Rate (FPR)</span>
                  <div className="text-xl font-bold font-mono text-flux-warning mt-0.5">
                    {(selectedExp.metrics.false_positive_rate * 100).toFixed(2)}%
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-flux-surface border border-flux-border">
                  <span className="text-[10px] font-medium text-flux-muted">Accuracy</span>
                  <div className="text-xl font-bold font-mono text-flux-text mt-0.5">
                    {(selectedExp.metrics.accuracy * 100).toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* Confusion Matrix & ROC Curve */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Confusion Matrix */}
                {selectedExp.confusion_matrix && (
                  <div className="p-5 rounded-xl bg-flux-surface border border-flux-border space-y-3">
                    <h4 className="text-xs font-semibold text-flux-text flex items-center gap-2">
                      <BarChart size={14} className="text-flux-accent" />
                      Empirical Confusion Matrix
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono pt-2">
                      <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                        <span className="text-[10px] text-flux-muted block uppercase">True Negative (TN)</span>
                        <span className="text-lg font-bold text-emerald-400">
                          {selectedExp.confusion_matrix.true_negative}
                        </span>
                        <span className="text-[10px] text-flux-muted block mt-1">Benign Congestion Confirmed</span>
                      </div>
                      <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                        <span className="text-[10px] text-flux-muted block uppercase">False Positive (FP)</span>
                        <span className="text-lg font-bold text-amber-400">
                          {selectedExp.confusion_matrix.false_positive}
                        </span>
                        <span className="text-[10px] text-flux-muted block mt-1">Congestion Misclassified</span>
                      </div>
                      <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                        <span className="text-[10px] text-flux-muted block uppercase">False Negative (FN)</span>
                        <span className="text-lg font-bold text-red-400">
                          {selectedExp.confusion_matrix.false_negative}
                        </span>
                        <span className="text-[10px] text-flux-muted block mt-1">Flood Missed</span>
                      </div>
                      <div className="p-4 rounded-lg bg-flux-accent/10 border border-flux-accent/30">
                        <span className="text-[10px] text-flux-muted block uppercase">True Positive (TP)</span>
                        <span className="text-lg font-bold text-flux-accent">
                          {selectedExp.confusion_matrix.true_positive}
                        </span>
                        <span className="text-[10px] text-flux-muted block mt-1">Malicious Flood Detected</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ROC Curve */}
                <div className="p-5 rounded-xl bg-flux-surface border border-flux-border space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-flux-text flex items-center gap-2">
                      <Activity size={14} className="text-flux-info" />
                      ROC Curve (AUC: {selectedExp.metrics.roc_auc ?? 'N/A'})
                    </h4>
                  </div>
                  <div className="h-56 w-full">
                    <ReactECharts option={getRocOption()} style={{ height: '100%', width: '100%' }} />
                  </div>
                </div>
              </div>

              {/* Reproducibility & Lineage Metadata */}
              <div className="p-4 rounded-xl bg-flux-surface border border-flux-border text-xs text-flux-muted space-y-2">
                <div className="font-semibold text-flux-text flex items-center gap-2">
                  <FileCheck size={14} className="text-flux-accent" />
                  Experiment Provenance & Leakage Protection Audit
                </div>
                <div className="font-mono text-[11px] grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div>Split Strategy: <span className="text-flux-text">{selectedExp.split_strategy}</span></div>
                  <div>Random Seed: <span className="text-flux-text">{selectedExp.random_seed}</span></div>
                  <div>Train Samples: <span className="text-flux-text">{selectedExp.metrics.train_samples}</span></div>
                  <div>Test Samples: <span className="text-flux-text">{selectedExp.metrics.test_samples}</span></div>
                </div>
                {selectedExp.metrics.split_metadata?.leakage_safeguards && (
                  <div className="p-2 rounded bg-flux-elevated border border-flux-border text-[11px] text-flux-accent font-mono mt-2">
                    {selectedExp.metrics.split_metadata.leakage_safeguards.join(' • ')}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-xs text-flux-muted rounded-xl bg-flux-surface border border-flux-border">
              Select an experiment on the left to inspect metrics and ROC curves.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
