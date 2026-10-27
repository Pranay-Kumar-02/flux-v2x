import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
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
    const clusterColors = ['#AD8D69', '#8B9B83', '#C4AE8D', '#7E8F96', '#5E5A54'];

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: '#0C0C0C',
        borderColor: '#292723',
        borderWidth: 1,
        textStyle: { color: '#F0EDE7', fontSize: 11, fontFamily: 'monospace' },
        formatter: (params: any) => {
          const d = params.value;
          return `
            <div style="font-weight: 500; color: #F0EDE7; margin-bottom: 2px;">Node: ${d[6]}</div>
            <div style="color: #898277;">Coord: (${d[0]}, ${d[1]})</div>
            <div style="color: #898277;">Cluster: C${d[2]} • Rate: ${d[4]} pps</div>
            <div style="color: #898277;">Contextual Z: ${d[5]}</div>
            <div style="margin-top: 3px;">
              ${d[3] === 1 ? '<span style="color:#B85951">Malicious Flood</span>' : '<span style="color:#8B9B83">Benign Congestion</span>'}
            </div>
          `;
        },
      },
      grid: { left: '5%', right: '3%', top: '6%', bottom: '10%' },
      xAxis: {
        name: contextData.has_spatial_coordinates ? 'X (m)' : 'Time (s)',
        nameTextStyle: { color: '#898277', fontSize: 10 },
        axisLine: { lineStyle: { color: '#292723' } },
        splitLine: { lineStyle: { color: '#171715' } },
        axisLabel: { color: '#898277', fontSize: 10, fontFamily: 'monospace' },
      },
      yAxis: {
        name: contextData.has_spatial_coordinates ? 'Y (m)' : 'Rate (pps)',
        nameTextStyle: { color: '#898277', fontSize: 10 },
        axisLine: { lineStyle: { color: '#292723' } },
        splitLine: { lineStyle: { color: '#171715' } },
        axisLabel: { color: '#898277', fontSize: 10, fontFamily: 'monospace' },
      },
      series: [
        {
          type: 'scatter',
          symbolSize: (val: any) => Math.min(16, Math.max(5, val[4] / 10)),
          data: seriesData,
          itemStyle: {
            color: (params: any) => {
              if (colorBy === 'label') {
                return params.value[3] === 1 ? '#B85951' : '#8B9B83';
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
        backgroundColor: '#0C0C0C',
        borderColor: '#292723',
        textStyle: { color: '#F0EDE7', fontSize: 11 },
      },
      grid: { left: '8%', right: '4%', top: '12%', bottom: '18%' },
      xAxis: {
        type: 'category',
        data: scenarios.map((s) => s.replace(/_/g, ' ')),
        axisLabel: { color: '#898277', fontSize: 10 },
        axisLine: { lineStyle: { color: '#292723' } },
      },
      yAxis: {
        type: 'value',
        name: 'Rate (pps)',
        nameTextStyle: { color: '#898277', fontSize: 10 },
        splitLine: { lineStyle: { color: '#171715' } },
        axisLabel: { color: '#898277', fontSize: 10, fontFamily: 'monospace' },
      },
      series: [
        {
          name: 'Mean Rate',
          type: 'bar',
          data: avgRates,
          itemStyle: { color: '#AD8D69', borderRadius: [2, 2, 0, 0] },
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
              Spatiotemporal Mobility
            </span>
            <span className="text-flux-muted text-[10px]">•</span>
            <span className="text-[10px] font-mono text-flux-muted">Destination-Centric Clustering</span>
          </div>
          <h1 className="text-xl font-medium text-flux-text tracking-tight">
            Network Context Explorer
          </h1>
          <p className="text-xs text-flux-secondary mt-1 max-w-xl">
            Evaluate receiver coordinates, mobility dynamics, and localized baseline parameters (μc, σc) to distinguish road congestion from malicious surges.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedDatasetId}
            onChange={(e) => {
              setSelectedDatasetId(e.target.value);
              loadExplorerData(e.target.value);
            }}
            className="bg-flux-surface border border-flux-border rounded px-2.5 py-1.5 text-xs text-flux-text focus:outline-none focus:border-flux-accent font-mono"
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
        <div className="py-16 text-center text-xs text-flux-muted">Computing spatiotemporal clustering...</div>
      ) : (
        contextData && (
          <div className="space-y-8">
            {/* Visual Analytics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* 2D Coordinates Map (8 cols) */}
              <div className="lg:col-span-8 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-flux-border">
                  <h2 className="text-xs font-mono uppercase tracking-wider text-flux-secondary">
                    Receiver Coordinates & Spatiotemporal Clusters
                  </h2>

                  {/* Toggle Color By without heavy borders */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-flux-muted text-[11px]">Color by:</span>
                    <button
                      onClick={() => setColorBy('cluster')}
                      className={`text-[11px] px-2 py-0.5 rounded transition-colors ${
                        colorBy === 'cluster' ? 'bg-flux-subsurface text-flux-text font-medium' : 'text-flux-muted hover:text-flux-text'
                      }`}
                    >
                      Cluster
                    </button>
                    <button
                      onClick={() => setColorBy('label')}
                      className={`text-[11px] px-2 py-0.5 rounded transition-colors ${
                        colorBy === 'label' ? 'bg-flux-subsurface text-flux-accent font-medium' : 'text-flux-muted hover:text-flux-text'
                      }`}
                    >
                      Ground Truth
                    </button>
                  </div>
                </div>

                <div className="h-80 w-full">
                  <ReactECharts option={getScatterOption()} style={{ height: '100%', width: '100%' }} />
                </div>

                <div className="text-[10px] text-flux-muted flex items-center justify-between font-mono pt-1">
                  <span>Sample: {contextData.spatial_points.length} points plotted</span>
                  <span>Point radius proportional to packet rate</span>
                </div>
              </div>

              {/* Scenario Average Rates (4 cols) */}
              <div className="lg:col-span-4 space-y-3">
                <div className="pb-2 border-b border-flux-border">
                  <h2 className="text-xs font-mono uppercase tracking-wider text-flux-secondary">
                    Scenario Mean Rates
                  </h2>
                </div>
                <div className="h-80 w-full">
                  <ReactECharts option={getScenarioBarOption()} style={{ height: '100%', width: '100%' }} />
                </div>
              </div>
            </div>

            {/* Localized Statistical Baselines Reference */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between pb-2 border-b border-flux-border">
                <h2 className="text-xs font-mono uppercase tracking-wider text-flux-secondary">
                  Localized Statistical Baselines (Khan et al. 2026 Formulation)
                </h2>
                <span className="text-[11px] font-mono text-flux-muted">
                  Contextual Parameters (μc, σc)
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 font-mono text-xs">
                {Object.entries(contextData.cluster_baselines).map(([cName, stats]: any) => (
                  <div key={cName} className="space-y-1">
                    <div className="font-semibold text-flux-text text-xs flex items-center justify-between">
                      <span>{cName}</span>
                      <span className="text-[10px] text-flux-muted tabular-nums">{stats.sample_count} samples</span>
                    </div>
                    <div className="text-[11px] text-flux-secondary flex justify-between pt-1">
                      <span className="text-flux-muted">Mean (μ):</span>
                      <span className="text-flux-accent font-medium tabular-nums">{stats.mean_rate_pps} pps</span>
                    </div>
                    <div className="text-[11px] text-flux-secondary flex justify-between">
                      <span className="text-flux-muted">Std Dev (σ):</span>
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
