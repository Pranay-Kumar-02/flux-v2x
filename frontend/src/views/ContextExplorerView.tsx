import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { Compass, Database, Layers, Radio, AlertOctagon, TrendingUp } from 'lucide-react';
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

    const clusterColors = ['#2DD4BF', '#60A5FA', '#F59E0B', '#A78BFA', '#F43F5E'];

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: '#17212B',
        borderColor: '#273544',
        textStyle: { color: '#F1F5F9', fontSize: 11, fontFamily: 'monospace' },
        formatter: (params: any) => {
          const d = params.value;
          return `
            <div style="font-weight: bold; margin-bottom: 4px;">Node: ${d[6]}</div>
            <div>Coord: (${d[0]}, ${d[1]})</div>
            <div>Cluster: ${d[2]}</div>
            <div>Packet Rate: ${d[4]} pps</div>
            <div>Contextual Z-Score: ${d[5]}</div>
            <div>Ground Truth: ${d[3] === 1 ? '<span style="color:#EF4444">Malicious Flood</span>' : '<span style="color:#2DD4BF">Benign Congestion</span>'}</div>
          `;
        },
      },
      grid: { left: '8%', right: '5%', top: '10%', bottom: '12%' },
      xAxis: {
        name: contextData.has_spatial_coordinates ? 'Receiver X (m)' : 'Timestamp (s)',
        nameTextStyle: { color: '#94A3B8', fontSize: 11 },
        axisLine: { lineStyle: { color: '#273544' } },
        splitLine: { lineStyle: { color: '#17212B' } },
        axisLabel: { color: '#94A3B8', fontFamily: 'monospace' },
      },
      yAxis: {
        name: contextData.has_spatial_coordinates ? 'Receiver Y (m)' : 'Packet Rate (pps)',
        nameTextStyle: { color: '#94A3B8', fontSize: 11 },
        axisLine: { lineStyle: { color: '#273544' } },
        splitLine: { lineStyle: { color: '#17212B' } },
        axisLabel: { color: '#94A3B8', fontFamily: 'monospace' },
      },
      series: [
        {
          type: 'scatter',
          symbolSize: (val: any) => Math.min(22, Math.max(8, val[4] / 6)),
          data: seriesData,
          itemStyle: {
            color: (params: any) => {
              if (colorBy === 'label') {
                return params.value[3] === 1 ? '#EF4444' : '#2DD4BF';
              }
              return clusterColors[params.value[2] % clusterColors.length];
            },
            shadowBlur: 4,
            shadowColor: 'rgba(0,0,0,0.5)',
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
    const counts = scenarios.map((s) => contextData.scenario_stats[s].count);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#17212B',
        borderColor: '#273544',
        textStyle: { color: '#F1F5F9', fontSize: 11 },
      },
      grid: { left: '10%', right: '5%', top: '15%', bottom: '18%' },
      xAxis: {
        type: 'category',
        data: scenarios.map((s) => s.replace(/_/g, ' ')),
        axisLabel: { color: '#94A3B8', fontSize: 10, rotate: 15 },
        axisLine: { lineStyle: { color: '#273544' } },
      },
      yAxis: {
        type: 'value',
        name: 'Avg Rate (pps)',
        nameTextStyle: { color: '#94A3B8', fontSize: 11 },
        splitLine: { lineStyle: { color: '#17212B' } },
        axisLabel: { color: '#94A3B8', fontFamily: 'monospace' },
      },
      series: [
        {
          name: 'Avg Packet Rate',
          type: 'bar',
          data: avgRates,
          itemStyle: { color: '#2DD4BF', borderRadius: [4, 4, 0, 0] },
        },
      ],
    };
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-5 rounded-xl bg-flux-surface border border-flux-border flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-flux-text flex items-center gap-2">
            <Compass size={16} className="text-flux-accent" />
            Network Context Explorer
          </h3>
          <p className="text-xs text-flux-muted mt-1">
            Analyze vehicular mobility dynamics, highway vs urban scenarios, and destination-centric clustering
            as defined in Khan et al. (2026).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedDatasetId}
            onChange={(e) => {
              setSelectedDatasetId(e.target.value);
              loadExplorerData(e.target.value);
            }}
            className="bg-flux-elevated border border-flux-border rounded-lg px-3 py-1.5 text-xs text-flux-text focus:outline-none focus:border-flux-accent font-mono"
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
        <div className="p-12 text-center text-xs text-flux-muted">Computing spatiotemporal context...</div>
      ) : (
        contextData && (
          <>
            {/* Visual Analytics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 2D Coordinates Map */}
              <div className="lg:col-span-2 p-5 rounded-xl bg-flux-surface border border-flux-border space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio size={15} className="text-flux-accent" />
                    <h4 className="text-xs font-semibold text-flux-text">
                      Destination-Centric Spatiotemporal Clusters & Receiver Traces
                    </h4>
                  </div>

                  {/* Toggle Color By */}
                  <div className="flex items-center gap-1 p-1 bg-flux-elevated rounded-lg border border-flux-border text-[11px]">
                    <button
                      onClick={() => setColorBy('cluster')}
                      className={`px-2.5 py-1 rounded ${
                        colorBy === 'cluster' ? 'bg-flux-accent text-flux-bg font-semibold' : 'text-flux-muted'
                      }`}
                    >
                      Color by Cluster
                    </button>
                    <button
                      onClick={() => setColorBy('label')}
                      className={`px-2.5 py-1 rounded ${
                        colorBy === 'label' ? 'bg-flux-danger text-white font-semibold' : 'text-flux-muted'
                      }`}
                    >
                      Color by Ground Truth
                    </button>
                  </div>
                </div>

                <div className="h-80 w-full">
                  <ReactECharts option={getScatterOption()} style={{ height: '100%', width: '100%' }} />
                </div>

                <div className="text-[11px] text-flux-muted flex items-center justify-between font-mono pt-2 border-t border-flux-border/50">
                  <span>Plotted: {contextData.spatial_points.length} sampled points</span>
                  <span>Point radius proportional to packet rate</span>
                </div>
              </div>

              {/* Scenario Average Rates */}
              <div className="p-5 rounded-xl bg-flux-surface border border-flux-border space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingUp size={15} className="text-flux-info" />
                  <h4 className="text-xs font-semibold text-flux-text">Scenario Traffic Density</h4>
                </div>
                <div className="h-80 w-full">
                  <ReactECharts option={getScenarioBarOption()} style={{ height: '100%', width: '100%' }} />
                </div>
              </div>
            </div>

            {/* Cluster Baselines Reference Table */}
            <div className="p-5 rounded-xl bg-flux-surface border border-flux-border space-y-3">
              <h4 className="text-xs font-semibold text-flux-text flex items-center gap-2">
                <Layers size={14} className="text-flux-accent" />
                Localized Statistical Baselines (Khan et al. 2026 Formulation)
              </h4>
              <p className="text-[11px] text-flux-muted">
                Each cluster establishes localized baseline parameters (μc, σc). Traffic is evaluated via contextual Z-scores:
                an observed 45 pps surge is normal in highway congestion (μc = 45), but anomalous in freeflow (μc = 15).
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-3">
                {Object.entries(contextData.cluster_baselines).map(([cName, stats]: any) => (
                  <div key={cName} className="p-3.5 rounded-lg bg-flux-elevated border border-flux-border/60">
                    <div className="font-semibold text-xs text-flux-text flex items-center justify-between">
                      <span>{cName}</span>
                      <span className="text-[10px] font-mono text-flux-muted">{stats.sample_count} samples</span>
                    </div>
                    <div className="mt-2 space-y-1 font-mono text-xs">
                      <div className="flex justify-between text-flux-muted">
                        <span>Baseline Mean (μ):</span>
                        <span className="text-flux-accent font-semibold">{stats.mean_rate_pps} pps</span>
                      </div>
                      <div className="flex justify-between text-flux-muted">
                        <span>Std Dev (σ):</span>
                        <span className="text-flux-text">{stats.std_rate_pps} pps</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )
      )}
    </div>
  );
};
