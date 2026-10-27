import React, { useState, useEffect } from 'react';
import {
  Upload,
  Database,
  Table,
  FileCheck,
  AlertTriangle,
  Trash2,
  RefreshCw,
  Search,
  Sparkles
} from 'lucide-react';
import { api, Dataset, DatasetPreview, DatasetProfile } from '../api/client';

interface DatasetLibraryViewProps {
  onSelectDataset?: (dataset: Dataset) => void;
}

export const DatasetLibraryView: React.FC<DatasetLibraryViewProps> = ({ onSelectDataset }) => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [preview, setPreview] = useState<DatasetPreview | null>(null);
  const [profile, setProfile] = useState<DatasetProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewOffset, setPreviewOffset] = useState(0);

  const loadDatasets = async () => {
    setLoading(true);
    try {
      const data = await api.listDatasets();
      setDatasets(data);
      if (data.length > 0 && !selectedDataset) {
        selectDataset(data[0]);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDatasets();
  }, []);

  const selectDataset = async (dataset: Dataset) => {
    setSelectedDataset(dataset);
    if (onSelectDataset) onSelectDataset(dataset);
    setPreviewOffset(0);

    try {
      const [prev, prof] = await Promise.all([
        api.previewDataset(dataset.id, 0, 25),
        api.getDatasetProfile(dataset.id),
      ]);
      setPreview(prev);
      setProfile(prof);
    } catch (err) {
      console.error('Failed to load dataset details', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', file.name.replace(/\.[^/.]+$/, ''));
    formData.append('provenance', 'user_upload');

    try {
      const newDs = await api.uploadDataset(formData);
      await loadDatasets();
      selectDataset(newDs);
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this dataset?')) return;
    try {
      await api.deleteDataset(id);
      await loadDatasets();
      if (selectedDataset?.id === id) {
        setSelectedDataset(null);
        setPreview(null);
        setProfile(null);
      }
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handlePageChange = async (newOffset: number) => {
    if (!selectedDataset) return;
    setPreviewOffset(newOffset);
    try {
      const prev = await api.previewDataset(selectedDataset.id, newOffset, 25);
      setPreview(prev);
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = datasets.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.file_format.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* 1. Header with Upload Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-flux-accent/10 border border-flux-accent/20 text-flux-accent text-[11px] font-medium mb-1.5">
            <Sparkles size={11} />
            <span>Telemetry Ingestion & Parquet Warehouse</span>
          </div>
          <h1 className="text-2xl font-semibold text-flux-text tracking-tight">
            Dataset Library
          </h1>
          <p className="text-xs text-flux-secondary mt-1 max-w-xl leading-relaxed">
            Ingest structured packet traces, verify cryptographic SHA-256 provenance, and run automated leakage detection prior to split partitioning.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flux-btn-primary flex items-center gap-1.5 cursor-pointer">
            <Upload size={13} />
            <span>{uploading ? 'Ingesting Trace...' : 'Upload Telemetry Trace'}</span>
            <input
              type="file"
              className="hidden"
              accept=".csv,.tsv,.json,.jsonl,.ndjson,.parquet,.xlsx"
              onChange={handleFileUpload}
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      {uploadError && (
        <div className="p-3 rounded-lg bg-flux-danger/10 border border-flux-danger/20 text-xs text-flux-danger flex items-center gap-2">
          <AlertTriangle size={14} />
          <span>{uploadError}</span>
        </div>
      )}

      {/* 2. Cryptographic Provenance Bar (When Dataset is Selected) */}
      {selectedDataset && (
        <div className="flux-panel p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3 min-w-0">
            <Database size={15} className="text-flux-accent shrink-0" />
            <span className="font-medium text-flux-text text-sm truncate">{selectedDataset.name}</span>
            <span className="text-flux-border">|</span>
            <span className="font-mono text-[11px] text-flux-muted truncate select-all">
              SHA-256: {selectedDataset.sha256_hash}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-flux-secondary shrink-0">
            <span className="font-mono tabular-nums">{selectedDataset.row_count.toLocaleString()} rows</span>
            <span>{(selectedDataset.file_size_bytes / (1024 * 1024)).toFixed(2)} MB</span>
            <span className="font-mono text-flux-accent uppercase text-[11px]">{selectedDataset.file_format}</span>
          </div>
        </div>
      )}

      {/* 3. Main Workspace: Inventory (4 cols) & Preview/Profile (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Dataset Inventory */}
        <div className="lg:col-span-4 flux-panel p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-flux-border/60">
            <h2 className="text-sm font-medium text-flux-text tracking-tight">
              Trace Inventory ({datasets.length})
            </h2>
            <button
              onClick={loadDatasets}
              className="text-flux-muted hover:text-flux-text transition-colors p-1"
              title="Refresh trace inventory"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Search Input with soft background */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-2.5 text-flux-muted" />
            <input
              type="text"
              placeholder="Search traces..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-flux-subsurface border border-white/[0.04] rounded-lg pl-9 pr-3 py-1.5 text-xs text-flux-text placeholder:text-flux-muted focus:outline-none focus:border-flux-accent transition-colors"
            />
          </div>

          <div className="divide-y divide-flux-border/40 max-h-[500px] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="py-8 text-center text-xs text-flux-muted">
                No matching traces found.
              </div>
            ) : (
              filtered.map((d) => {
                const isSelected = selectedDataset?.id === d.id;
                return (
                  <div
                    key={d.id}
                    onClick={() => selectDataset(d)}
                    className={`py-3 px-2.5 rounded-lg cursor-pointer transition-colors text-xs flex items-center justify-between ${
                      isSelected
                        ? 'bg-flux-subsurface text-flux-text font-medium shadow-sm'
                        : 'text-flux-secondary hover:text-flux-text hover:bg-flux-subsurface/40'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="truncate text-xs font-medium">{d.name}</div>
                      <div className="text-[11px] text-flux-muted mt-0.5 flex items-center gap-2">
                        <span className="font-mono uppercase text-[10px]">{d.file_format}</span>
                        <span>•</span>
                        <span className="font-mono tabular-nums">{d.row_count.toLocaleString()} rows</span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(d.id);
                      }}
                      className="text-flux-muted hover:text-flux-danger p-1 transition-colors shrink-0"
                      title="Delete trace"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Data Profile & Columnar Preview */}
        <div className="lg:col-span-8 space-y-6">
          {selectedDataset ? (
            <>
              {/* Quality & Class Distribution Strip */}
              {profile && (
                <div className="flux-panel p-5 space-y-3.5">
                  <div className="flex items-center justify-between pb-2 border-b border-flux-border/60">
                    <h3 className="text-sm font-medium text-flux-text tracking-tight flex items-center gap-2">
                      <FileCheck size={14} className="text-flux-sage" />
                      <span>Data Profiling & Quality Audit</span>
                    </h3>
                    <span className="text-[11px] text-flux-muted font-mono tabular-nums">
                      Memory: {profile.memory_usage_mb} MB • Duplicates: {profile.duplicate_percentage}%
                    </span>
                  </div>

                  {profile.leakage_warnings.length > 0 && (
                    <div className="p-3 rounded-lg bg-flux-warning/10 border border-flux-warning/20 text-xs text-flux-warning flex items-start gap-2">
                      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                      <div>
                        <div className="font-medium text-xs">Target Leakage Warning</div>
                        <ul className="list-disc list-inside mt-0.5 text-[11px] text-flux-secondary">
                          {profile.leakage_warnings.map((w, idx) => (
                            <li key={idx}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {profile.class_distribution && (
                    <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
                      <span className="text-flux-muted text-xs">Class Distribution:</span>
                      {Object.entries(profile.class_distribution).map(([cls, count]) => {
                        const isMalicious = cls === '1' || cls.toLowerCase().includes('attack');
                        return (
                          <div
                            key={cls}
                            className="flex items-center gap-2 text-xs"
                          >
                            <span className={`w-2 h-2 rounded-full ${isMalicious ? 'bg-flux-danger' : 'bg-flux-sage'}`} />
                            <span className="text-flux-secondary font-medium">{isMalicious ? 'Malicious Flood' : 'Benign Congestion'}:</span>
                            <span className="font-mono text-flux-text tabular-nums">{count.toLocaleString()}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Data Preview Table */}
              <div className="flux-panel p-5 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-flux-border/60">
                  <div>
                    <h3 className="text-sm font-medium text-flux-text tracking-tight">
                      Columnar Data Preview
                    </h3>
                    <p className="text-[11px] text-flux-muted mt-0.5 font-normal">
                      Displaying rows {previewOffset + 1} to {previewOffset + (preview?.data.length || 0)} of {preview?.total_rows || 0}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <button
                      onClick={() => handlePageChange(Math.max(0, previewOffset - 25))}
                      disabled={previewOffset === 0}
                      className="flux-btn-secondary text-xs disabled:opacity-30"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handlePageChange(previewOffset + 25)}
                      disabled={!preview || previewOffset + 25 >= preview.total_rows}
                      className="flux-btn-secondary text-xs disabled:opacity-30"
                    >
                      Next
                    </button>
                  </div>
                </div>

                {preview && (
                  <div className="flux-inset overflow-x-auto max-h-96">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-flux-surface text-flux-muted sticky top-0 z-10 text-[11px] border-b border-flux-border/60">
                        <tr>
                          {preview.columns.map((c) => (
                            <th key={c} className="px-3 py-2.5 font-medium whitespace-nowrap">
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-flux-border/30 text-xs">
                        {preview.data.map((row, i) => (
                          <tr key={i} className="hover:bg-flux-subsurface/40 transition-colors">
                            {preview.columns.map((col) => (
                              <td key={col} className="px-3 py-2 whitespace-nowrap text-flux-secondary font-mono text-[11px] tabular-nums">
                                {String(row[col] ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="py-20 text-center text-xs text-flux-muted flux-panel">
              Select a trace from the inventory to inspect its columnar records.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
