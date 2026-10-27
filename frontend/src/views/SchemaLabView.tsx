import React, { useState, useEffect } from 'react';
import { ArrowRight, CheckCircle2, Save } from 'lucide-react';
import { api, Dataset } from '../api/client';

interface SchemaLabViewProps {
  activeDataset?: Dataset | null;
}

export const SchemaLabView: React.FC<SchemaLabViewProps> = ({ activeDataset }) => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [suggested, setSuggested] = useState<Record<string, string>>({});
  const [availableCols, setAvailableCols] = useState<string[]>([]);
  const [canonicalFields, setCanonicalFields] = useState<Record<string, any>>({});
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function init() {
      const list = await api.listDatasets();
      setDatasets(list);
      if (activeDataset) {
        setSelectedDatasetId(activeDataset.id);
        loadSuggestions(activeDataset.id);
      } else if (list.length > 0) {
        setSelectedDatasetId(list[0].id);
        loadSuggestions(list[0].id);
      }
    }
    init();
  }, [activeDataset]);

  const loadSuggestions = async (dsId: string) => {
    setLoading(true);
    setSavedSuccess(false);
    try {
      const prev = await api.previewDataset(dsId, 0, 1);
      const res = await api.suggestSchema(prev.version_id);
      setSuggested(res.suggested_mapping);
      setAvailableCols(res.available_columns);
      setCanonicalFields(res.canonical_fields);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMappingChange = (sourceCol: string, targetCanonical: string) => {
    setSuggested((prev) => ({
      ...prev,
      [sourceCol]: targetCanonical,
    }));
  };

  const handleSaveMapping = async () => {
    if (!selectedDatasetId) return;
    try {
      const prev = await api.previewDataset(selectedDatasetId, 0, 1);
      await api.saveSchemaMapping(prev.version_id, {
        name: 'VCN Canonical Adapter',
        target_domain: 'vcn',
        target_label: 'label',
        column_mappings: suggested,
        feature_configs: {
          clustering_features: ['rx_x', 'rx_y', 'rx_speed'],
          k_clusters: 4,
        },
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* 1. Header with Controls */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-4 border-b border-flux-border">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-mono tracking-widest text-flux-accent uppercase">
              Pipeline Workbench
            </span>
            <span className="text-flux-muted text-[10px]">•</span>
            <span className="text-[10px] font-mono text-flux-muted">VCN Canonical Standard</span>
          </div>
          <h1 className="text-xl font-medium text-flux-text tracking-tight">
            Schema & Feature Normalizer
          </h1>
          <p className="text-xs text-flux-secondary mt-1 max-w-xl">
            Map arbitrary packet columns into canonical mobility attributes (<span className="font-mono text-flux-accent">rx_x, rx_y, rx_speed, packet_rate</span>) for spatiotemporal baselining.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedDatasetId}
            onChange={(e) => {
              setSelectedDatasetId(e.target.value);
              loadSuggestions(e.target.value);
            }}
            className="bg-flux-surface border border-flux-border rounded px-2.5 py-1.5 text-xs text-flux-text focus:outline-none focus:border-flux-accent font-mono"
          >
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleSaveMapping}
            className="flux-btn-primary flex items-center gap-1.5"
          >
            <Save size={12} />
            <span>Freeze & Save Mapping</span>
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3 rounded bg-flux-sage/10 border border-flux-sage/20 text-xs text-flux-sage flex items-center gap-2">
          <CheckCircle2 size={14} />
          <span>Schema mapping saved and versioned as an immutable contract.</span>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-xs text-flux-muted">
          Evaluating heuristic column matches and statistical cardinality...
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-flux-border">
            <h2 className="text-xs font-mono uppercase tracking-wider text-flux-secondary">
              Canonical Column Alignment Matrix
            </h2>
            <span className="text-[11px] font-mono text-flux-muted">
              {availableCols.length} columns detected
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-flux-shell text-flux-muted font-mono text-[10px] uppercase">
                <tr>
                  <th className="px-3 py-2 border-b border-flux-border font-medium">Source Column</th>
                  <th className="px-3 py-2 border-b border-flux-border font-medium text-center">Map</th>
                  <th className="px-3 py-2 border-b border-flux-border font-medium">Target Canonical Attribute</th>
                  <th className="px-3 py-2 border-b border-flux-border font-medium">Type & Functional Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-flux-border/40 font-mono text-xs">
                {availableCols.map((srcCol) => {
                  const currentMapped = suggested[srcCol] || '';
                  const canonDef = canonicalFields[currentMapped];
                  return (
                    <tr key={srcCol} className="hover:bg-flux-subsurface/40 transition-colors">
                      <td className="px-3 py-2.5 font-medium text-flux-text">{srcCol}</td>
                      <td className="px-3 py-2.5 text-center text-flux-muted">
                        <ArrowRight size={12} className="mx-auto text-flux-accent" />
                      </td>
                      <td className="px-3 py-2.5">
                        <select
                          value={currentMapped}
                          onChange={(e) => handleMappingChange(srcCol, e.target.value)}
                          className="bg-flux-surface border border-flux-border/80 rounded px-2 py-1 text-xs text-flux-text focus:outline-none focus:border-flux-accent font-mono"
                        >
                          <option value="">-- Exclude from Baseline --</option>
                          {Object.keys(canonicalFields).map((canon) => (
                            <option key={canon} value={canon}>
                              {canon} {canonicalFields[canon].required ? '*' : ''}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2.5 text-flux-secondary text-[11px] font-sans">
                        {canonDef ? (
                          <span>
                            <strong className="font-mono text-flux-accent font-medium mr-1.5">[{canonDef.type}]</strong>
                            {canonDef.description}
                          </span>
                        ) : (
                          <span className="text-flux-muted">Excluded from baseline calculation</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
