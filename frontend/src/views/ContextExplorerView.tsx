import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { Compass, Layers } from 'lucide-react';
import { api, Dataset } from '../api/client';

interface ContextExplorerViewProps {
  activeDataset?: Dataset | null;
}

export const ContextExplorerView: React.FC<ContextExplorerViewProps> = ({ activeDataset }) => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [contextData, setContextData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [colorBy, setColorBy] = useState<'cluster' | 'label'>('cluster');

  useEffect(() => {
    async function init() {
      const list = await api.listDatasets();
      setDatasets(list);
      if (activeDataset) {
        setSelectedDatasetId(activeDataset.id);
        loadExplorerData(activeDataset.id);
      } else if (list.length > 0) {
        setSelectedDatasetId(list[0].id);
        loadExplorerData(list[0].id);
      }
    }
    init();
  }, [activeDataset]);

  const loadExplorerData = async (dsId: string) => {
    setLoading(true);
    try {
      const data = await api.getContextExplorerData(dsId, 300);
      setContextData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ECharts Scatter Plot for 2D Spatiotemporal Coordinates
  const getScatterOption = () => {
    if (!contextData || !contextData.spatial_points) return {};

    const points = contextData.spatial_points;
    const seriesData = points.map((p: any) => [
      p.x ?? p.timestamp,
      p.y ?? p.packet_rate,
      p.cluster_id,
      p.label,
      p.packet_rate,
      p.z_score,
      p.dst_id,
    ]);

    // Muted, restrained series colors
    const clusterColors = ['#B0906C', '#8A9983', '#C8B291', '#7E8F96', '#656057'];

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: '#0C0B0A',
        borderColor: 'rgba(255, 255, 255, 0.08)',
        borderWidth: 1,
        textStyle: { color: '#F2EFEB', fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif' },
        formatter: (params: any) => {
          const d = params.value;
          return `
            <div style="font-weight: 500; color: #F2EFEB; margin-bottom: 2px;">Receiver Node: ${d[6]}</div>
            <div style="color: #807A70;">Position: (${d[0]}, ${d[1]})</div>
            <div style="color: #807A70;">Cluster: C${d[2]} • Rate: ${d[4]} pps</div>
            <div style="color: #807A70;">Contextual Z-Score: ${d[5]}</div>
            <div style="margin-top: 4px; font-weight: 500;">
              ${d[3] === 1 ? '<span style="color:#B85951">Malicious Flood (1)</span>' : '<span style="color:#8A9983">Benign Congestion (0)</span>'}
            </div>
          `;
        },
      },
      grid: { left: '4%', right: '3%', top: '6%', bottom: '10%' },
      xAxis: {
        name: contextData.has_spatial_coordinates ? 'Receiver X (m)' : 'Timestamp (s)',
        nameTextStyle: { color: '#807A70', fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif' },
        axisLine: { lineStyle: { color: '#262420' } },
        splitLine: { lineStyle: { color: '#161513' } },
        axisLabel: { color: '#807A70', fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif' },
      },
      yAxis: {
        name: contextData.has_spatial_coordinates ? 'Receiver Y (m)' : 'Packet Rate (pps)',
        nameTextStyle: { color: '#807A70', fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif' },
        axisLine: { lineStyle: { color: '#262420' } },
        splitLine: { lineStyle: { color: '#161513' } },
        axisLabel: { color: '#807A70', fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif' },
      },
      series: [
        {
          type: 'scatter',
          symbolSize: (val: any) => Math.min(18, Math.max(6, val[4] / 8)),
          data: seriesData,
          itemStyle: {
            color: (params: any) => {
              if (colorBy === 'label') {
                return params.value[3] === 1 ? '#B85951' : '#8A9983';
              }
              return clusterColors[params.value[2] % clusterColors.length];
            },
            opacity: 0.85,
          },
        },
      ],
    };
  };

  // ECharts Bar Chart for Scenario Distributions
  const getScenarioBarOption = () => {
    if (!contextData || !contextData.scenario_stats) return {};

    const scenarios = Object.keys(contextData.scenario_stats);
    const avgRates = scenarios.map((s) => contextData.scenario_stats[s].avg_rate);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#0C0B0A',
        borderColor: 'rgba(255, 255, 255, 0.08)',
        textStyle: { color: '#F2EFEB', fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif' },
      },
      grid: { left: '8%', right: '4%', top: '12%', bottom: '18%' },
      xAxis: {
        type: 'category',
        data: scenarios.map((s) => s.replace(/_/g, ' ')),
        axisLabel: { color: '#807A70', fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif' },
        axisLine: { lineStyle: { color: '#262420' } },
      },
      yAxis: {
        type: 'value',
        name: 'Rate (pps)',
        nameTextStyle: { color: '#807A70', fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif' },
        splitLine: { lineStyle: { color: '#161513' } },
        axisLabel: { color: '#807A70', fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif' },
      },
      series: [
        {
          name: 'Mean Rate',
          type: 'bar',
          data: avgRates,
          itemStyle: { color: '#B0906C', borderRadius: [3, 3, 0, 0] },
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
            <Compass size={11} />
            <span>Spatiotemporal Contextual Analytics</span>
          </div>
          <h1 className="text-2xl font-semibold text-flux-text tracking-tight">
            Network Context Explorer
          </h1>
          <p className="text-xs text-flux-secondary mt-1 max-w-xl leading-relaxed">
            Evaluate receiver coordinates, mobility dynamics, and localized baseline parameters (μc, σc) to distinguish legitimate congestion surges from malicious attacks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-0.5 bg-flux-surface rounded-lg border border-white/[0.04] text-xs">
            <button
              onClick={() => setColorBy('cluster')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                colorBy === 'cluster' ? 'bg-flux-subsurface text-flux-text shadow-sm' : 'text-flux-muted hover:text-flux-text'
              }`}
            >
              By Cluster
            </button>
            <button
              onClick={() => setColorBy('label')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                colorBy === 'label' ? 'bg-flux-subsurface text-flux-accent shadow-sm' : 'text-flux-muted hover:text-flux-text'
              }`}
            >
              By Ground Truth
            </button>
          </div>

          <select
            value={selectedDatasetId}
            onChange={(e) => {
              setSelectedDatasetId(e.target.value);
              loadExplorerData(e.target.value);
            }}
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

      {loading ? (
        <div className="py-20 text-center text-xs text-flux-muted">
          <div className="w-4 h-4 border border-flux-accent border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Computing spatiotemporal clustering and baseline parameters...
        </div>
      ) : (
        contextData && (
          <div className="space-y-6">
            {/* Visual Analytics Grid: Main Focal Scatter Plot (8 cols) vs Scenario Chart (4 cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Primary Focal Canvas: 2D Spatial Visualization */}
              <div className="lg:col-span-8 flux-panel-focal p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-flux-border/60">
                  <div>
                    <h2 className="text-sm font-medium text-flux-text tracking-tight">
                      Destination-Centric Spatiotemporal Clusters & Receiver Traces
                    </h2>
                    <p className="text-[11px] text-flux-muted mt-0.5">
                      Sampled receiver nodes mapped in 2D space with bubble radius proportional to packet rate
                    </p>
                  </div>
                  <span className="text-[11px] text-flux-muted font-mono tabular-nums">
                    {contextData.spatial_points.length} nodes plotted
                  </span>
                </div>

                <div className="h-96 w-full">
                  <ReactECharts option={getScatterOption()} style={{ height: '100%', width: '100%' }} />
                </div>
              </div>

              {/* Supporting Scenario Distribution Chart */}
              <div className="lg:col-span-4 flux-panel p-5 space-y-4 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-medium text-flux-text tracking-tight">
                    Scenario Traffic Density
                  </h3>
                  <p className="text-[11px] text-flux-muted mt-0.5">
                    Mean packet delivery rate across mobility environments
                  </p>
                </div>

                <div className="h-80 w-full my-auto">
                  <ReactECharts option={getScenarioBarOption()} style={{ height: '100%', width: '100%' }} />
                </div>

                <div className="text-[11px] text-flux-secondary pt-2 border-t border-flux-border/40">
                  High density in highway congestion reflects legitimate vehicular concentration, not attack flooding.
                </div>
              </div>
            </div>

            {/* Localized Statistical Baselines Reference Table */}
            <div className="flux-panel p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-flux-border/60">
                <div>
                  <h3 className="text-sm font-medium text-flux-text tracking-tight flex items-center gap-2">
                    <Layers size={14} className="text-flux-accent" />
                    <span>Localized Statistical Baselines (Khan et al. 2026 Formulation)</span>
                  </h3>
                  <p className="text-xs text-flux-secondary mt-0.5 font-normal">
                    Each cluster establishes dynamic parameters (μc, σc). Traffic surges are evaluated via contextual Z-scores: an observed 45 pps surge is normal in highway congestion (μc = 45), but anomalous in freeflow (μc = 15).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {Object.entries(contextData.cluster_baselines).map(([cName, stats]: any) => (
                  <div key={cName} className="p-3.5 rounded-lg bg-flux-subsurface/60 border border-white/[0.03] space-y-1.5">
                    <div className="font-medium text-xs text-flux-text flex items-center justify-between">
                      <span>{cName}</span>
                      <span className="text-[10px] text-flux-muted font-mono tabular-nums">{stats.sample_count} samples</span>
                    </div>
                    <div className="text-xs text-flux-secondary flex justify-between pt-1 font-mono">
                      <span className="text-flux-muted font-sans text-[11px]">Baseline Mean (μ):</span>
                      <span className="text-flux-accent font-medium tabular-nums">{stats.mean_rate_pps} pps</span>
                    </div>
                    <div className="text-xs text-flux-secondary flex justify-between font-mono">
                      <span className="text-flux-muted font-sans text-[11px]">Std Dev (σ):</span>
                      <span className="text-flux-text tabular-nums">{stats.std_rate_pps} pps</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
};
