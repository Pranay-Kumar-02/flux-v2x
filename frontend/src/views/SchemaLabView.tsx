import React, { useState, useEffect } from 'react';
import { SlidersHorizontal, ArrowRight, CheckCircle2, Save, HelpCircle } from 'lucide-react';
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
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-5 rounded-xl bg-flux-surface border border-flux-border flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-flux-text flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-flux-accent" />
            VCN Canonical Schema Normalizer & Feature Lab
          </h3>
          <p className="text-xs text-flux-muted mt-1">
            Map arbitrary tabular network data into normalized Vehicular Communication Network (VCN) representations
            for destination-centric spatiotemporal clustering and RX-window aggregation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedDatasetId}
            onChange={(e) => {
              setSelectedDatasetId(e.target.value);
              loadSuggestions(e.target.value);
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
        <div className="p-12 text-center text-xs text-flux-muted">Analyzing dataset columns...</div>
      ) : (
        <div className="p-5 rounded-xl bg-flux-surface border border-flux-border space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-semibold text-flux-text">Canonical Field Mappings</h4>
              <p className="text-[11px] text-flux-muted">
                Assign your dataset's columns to canonical research fields. Heuristic matches are preselected.
              </p>
            </div>
            <button
              onClick={handleSaveMapping}
              className="px-4 py-2 rounded-lg bg-flux-accent text-flux-bg font-semibold text-xs hover:bg-flux-accent/90 transition-all flex items-center gap-2 shadow-sm"
            >
              <Save size={14} />
              <span>Save & Freeze Schema Mapping</span>
            </button>
          </div>

          {savedSuccess && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 flex items-center gap-2">
              <CheckCircle2 size={15} />
              Schema mapping successfully saved and frozen as an immutable pipeline version!
            </div>
          )}

          {/* Mapping Grid */}
          <div className="overflow-x-auto rounded-lg border border-flux-border">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-flux-elevated text-flux-muted font-mono">
                <tr>
                  <th className="p-3 border-b border-flux-border font-medium">Source Column</th>
                  <th className="p-3 border-b border-flux-border font-medium text-center">Mapping</th>
                  <th className="p-3 border-b border-flux-border font-medium">Canonical Field</th>
                  <th className="p-3 border-b border-flux-border font-medium">Expected Type & Purpose</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-flux-border font-mono text-xs">
                {availableCols.map((srcCol) => {
                  const currentMapped = suggested[srcCol] || '';
                  const canonDef = canonicalFields[currentMapped];
                  return (
                    <tr key={srcCol} className="hover:bg-flux-elevated/40 transition-colors">
                      <td className="p-3 font-semibold text-flux-text">{srcCol}</td>
                      <td className="p-3 text-center text-flux-muted">
                        <ArrowRight size={14} className="mx-auto text-flux-accent" />
                      </td>
                      <td className="p-3">
                        <select
                          value={currentMapped}
                          onChange={(e) => handleMappingChange(srcCol, e.target.value)}
                          className="bg-flux-elevated border border-flux-border rounded px-2.5 py-1 text-xs text-flux-text focus:outline-none focus:border-flux-accent font-mono"
                        >
                          <option value="">-- Ignored / Not Mapped --</option>
                          {Object.keys(canonicalFields).map((canon) => (
                            <option key={canon} value={canon}>
                              {canon} {canonicalFields[canon].required ? '*' : ''}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3 text-flux-muted text-[11px] font-sans">
                        {canonDef ? (
                          <span>
                            <strong className="font-mono text-flux-accent font-normal mr-2">[{canonDef.type}]</strong>
                            {canonDef.description}
                          </span>
                        ) : (
                          <span className="text-flux-muted/50">Feature will be excluded from contextual baseline calculation</span>
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
