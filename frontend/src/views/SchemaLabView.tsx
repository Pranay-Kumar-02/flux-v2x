import React, { useState, useEffect } from 'react';
import { ArrowRight, CheckCircle2, Save, SlidersHorizontal, Sparkles } from 'lucide-react';
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-flux-accent/10 border border-flux-accent/20 text-flux-accent text-[11px] font-medium mb-1.5">
            <SlidersHorizontal size={11} />
            <span>VCN Canonical Normalizer</span>
          </div>
          <h1 className="text-2xl font-semibold text-flux-text tracking-tight">
            Schema & Feature Lab
          </h1>
          <p className="text-xs text-flux-secondary mt-1 max-w-xl leading-relaxed">
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
            className="bg-flux-surface border border-white/[0.06] rounded-md px-3 py-1.5 text-xs text-flux-text focus:outline-none focus:border-flux-accent font-medium shadow-sm"
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
            <Save size={13} />
            <span>Freeze & Save Mapping</span>
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3.5 rounded-lg bg-flux-sage/10 border border-flux-sage/20 text-xs text-flux-sage flex items-center gap-2">
          <CheckCircle2 size={15} />
          <span className="font-medium">Schema mapping saved and versioned as an immutable pipeline contract.</span>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-xs text-flux-muted">
          <div className="w-4 h-4 border border-flux-accent border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Evaluating heuristic column matches and statistical cardinality...
        </div>
      ) : (
        <div className="flux-panel p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-flux-border/60">
            <div>
              <h2 className="text-sm font-medium text-flux-text tracking-tight">
                Canonical Column Alignment Matrix
              </h2>
              <p className="text-[11px] text-flux-muted mt-0.5">
                Assign dataset fields to canonical parameters. Verified mappings are saved as immutable pipeline versions.
              </p>
            </div>
            <span className="text-xs text-flux-muted font-normal">
              {availableCols.length} columns detected
            </span>
          </div>

          <div className="flux-inset overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-flux-surface text-flux-muted text-[11px] border-b border-flux-border/60">
                <tr>
                  <th className="px-3 py-2.5 font-medium">Source Column</th>
                  <th className="px-3 py-2.5 font-medium text-center">Map</th>
                  <th className="px-3 py-2.5 font-medium">Target Canonical Attribute</th>
                  <th className="px-3 py-2.5 font-medium">Type & Functional Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-flux-border/30 text-xs">
                {availableCols.map((srcCol) => {
                  const currentMapped = suggested[srcCol] || '';
                  const canonDef = canonicalFields[currentMapped];
                  return (
                    <tr key={srcCol} className="hover:bg-flux-subsurface/40 transition-colors">
                      <td className="px-3 py-2.5 font-medium text-flux-text font-mono text-[11px]">{srcCol}</td>
                      <td className="px-3 py-2.5 text-center text-flux-muted">
                        <ArrowRight size={13} className="mx-auto text-flux-accent" />
                      </td>
                      <td className="px-3 py-2.5">
                        <select
                          value={currentMapped}
                          onChange={(e) => handleMappingChange(srcCol, e.target.value)}
                          className="bg-flux-surface border border-white/[0.04] rounded-md px-2.5 py-1 text-xs text-flux-text focus:outline-none focus:border-flux-accent font-medium font-mono"
                        >
                          <option value="">-- Exclude from Baseline --</option>
                          {Object.keys(canonicalFields).map((canon) => (
                            <option key={canon} value={canon}>
                              {canon} {canonicalFields[canon].required ? '*' : ''}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2.5 text-flux-secondary text-xs">
                        {canonDef ? (
                          <span>
                            <strong className="font-mono text-flux-accent font-medium mr-1.5 text-[11px]">[{canonDef.type}]</strong>
                            {canonDef.description}
                          </span>
                        ) : (
                          <span className="text-flux-muted font-normal">Excluded from baseline calculation</span>
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
