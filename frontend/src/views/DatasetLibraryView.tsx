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
  Eye,
  CheckCircle2,
  ShieldAlert
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
    <div className="space-y-6">
      {/* Upload Zone & Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 p-5 rounded-xl bg-flux-surface border border-flux-border flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-flux-text flex items-center gap-2">
              <Upload size={16} className="text-flux-accent" />
              Upload Structured Network Dataset
            </h3>
            <p className="text-xs text-flux-muted mt-1">
              Supports CSV, TSV, JSON, JSONL, Parquet, and Excel (.xlsx).
              Files are validated, standard-fingerprinted with SHA-256, and columnar-indexed via DuckDB/Polars.
            </p>
          </div>

          <div className="mt-4 flex items-center gap-4">
            <label className="cursor-pointer px-4 py-2 rounded-lg bg-flux-accent text-flux-bg font-semibold text-xs hover:bg-flux-accent/90 transition-all flex items-center gap-2">
              <Upload size={14} />
              <span>Select File</span>
              <input
                type="file"
                className="hidden"
                accept=".csv,.tsv,.json,.jsonl,.ndjson,.parquet,.xlsx"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </label>
            {uploading && (
              <div className="flex items-center gap-2 text-xs text-flux-accent animate-pulse">
                <RefreshCw size={14} className="animate-spin" />
                Ingesting and calculating SHA-256 fingerprint...
              </div>
            )}
            {uploadError && (
              <div className="text-xs text-flux-danger flex items-center gap-1.5">
                <AlertTriangle size={14} />
                {uploadError}
              </div>
            )}
          </div>
        </div>

        {/* Selected Dataset Summary */}
        <div className="p-5 rounded-xl bg-flux-surface border border-flux-border">
          <span className="text-[10px] font-semibold tracking-wider text-flux-muted uppercase">
            Active Dataset SHA-256
          </span>
          {selectedDataset ? (
            <div className="mt-2 space-y-2">
              <div className="text-xs font-semibold text-flux-text truncate">{selectedDataset.name}</div>
              <div className="p-2 rounded bg-flux-bg font-mono text-[10px] text-flux-muted break-all select-all border border-flux-border/50">
                {selectedDataset.sha256_hash}
              </div>
              <div className="text-[11px] text-flux-muted flex items-center justify-between">
                <span>Rows: {selectedDataset.row_count.toLocaleString()}</span>
                <span>Size: {(selectedDataset.file_size_bytes / (1024 * 1024)).toFixed(2)} MB</span>
              </div>
            </div>
          ) : (
            <div className="mt-4 text-xs text-flux-muted">No dataset selected</div>
          )}
        </div>
      </div>

      {/* Dataset Inventory & Preview Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Datasets List */}
        <div className="p-5 rounded-xl bg-flux-surface border border-flux-border space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-flux-text flex items-center gap-2">
              <Database size={15} className="text-flux-accent" />
              Registered Datasets ({datasets.length})
            </h3>
            <button onClick={loadDatasets} className="p-1 rounded text-flux-muted hover:text-flux-text">
              <RefreshCw size={13} />
            </button>
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-flux-muted" />
            <input
              type="text"
              placeholder="Search datasets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-flux-elevated border border-flux-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-flux-text placeholder:text-flux-muted/60 focus:outline-none focus:border-flux-accent"
            />
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {filtered.map((d) => {
              const isSelected = selectedDataset?.id === d.id;
              return (
                <div
                  key={d.id}
                  onClick={() => selectDataset(d)}
                  className={`p-3 rounded-lg cursor-pointer border transition-all text-xs ${
                    isSelected
                      ? 'bg-flux-elevated border-flux-accent/60 shadow-sm'
                      : 'bg-flux-elevated/40 border-flux-border/50 hover:border-flux-border'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="font-semibold text-flux-text truncate max-w-[180px]">{d.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(d.id);
                      }}
                      className="text-flux-muted hover:text-flux-danger p-0.5"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-flux-muted font-mono">
                    <span className="px-1.5 py-0.5 rounded bg-flux-bg border border-flux-border">
                      {d.file_format.toUpperCase()}
                    </span>
                    <span>{d.row_count.toLocaleString()} rows</span>
                    <span>{d.column_count} cols</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Data Preview & Profiling Tabs */}
        <div className="lg:col-span-2 space-y-6">
          {selectedDataset && (
            <>
              {/* Profile Alerts & Class Distribution */}
              {profile && (
                <div className="p-5 rounded-xl bg-flux-surface border border-flux-border space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-flux-text flex items-center gap-2">
                      <FileCheck size={14} className="text-flux-accent" />
                      Automated Data Quality & Profiling
                    </h4>
                    <span className="text-[11px] font-mono text-flux-muted">
                      Memory: {profile.memory_usage_mb} MB • Duplicates: {profile.duplicate_percentage}%
                    </span>
                  </div>

                  {/* Leakage warnings */}
                  {profile.leakage_warnings.length > 0 && (
                    <div className="p-3 rounded-lg bg-flux-warning/10 border border-flux-warning/30 text-xs text-flux-warning flex items-start gap-2">
                      <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                      <div>
                        <div className="font-semibold">Target Leakage Warning</div>
                        <ul className="list-disc list-inside mt-0.5 text-[11px]">
                          {profile.leakage_warnings.map((w, idx) => (
                            <li key={idx}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Class distribution */}
                  {profile.class_distribution && (
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-flux-muted font-medium">Ground Truth Class Balance:</span>
                      {Object.entries(profile.class_distribution).map(([cls, count]) => {
                        const isMalicious = cls === '1' || cls.toLowerCase().includes('attack');
                        return (
                          <div
                            key={cls}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-mono border ${
                              isMalicious
                                ? 'bg-flux-danger/10 text-flux-danger border-flux-danger/30'
                                : 'bg-flux-accent/10 text-flux-accent border-flux-accent/30'
                            }`}
                          >
                            {isMalicious ? 'Malicious Flood (1)' : 'Benign Congestion (0)'}: {count.toLocaleString()}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Data Preview Table */}
              <div className="p-5 rounded-xl bg-flux-surface border border-flux-border space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-flux-text flex items-center gap-2">
                    <Table size={14} className="text-flux-info" />
                    Data Preview (Showing rows {previewOffset} - {previewOffset + (preview?.data.length || 0)} of {preview?.total_rows || 0})
                  </h4>

                  {/* Pagination Controls */}
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      onClick={() => handlePageChange(Math.max(0, previewOffset - 25))}
                      disabled={previewOffset === 0}
                      className="px-2 py-1 rounded bg-flux-elevated border border-flux-border text-flux-text disabled:opacity-40"
                    >
                      Prev
                    </button>
                    <button
                      onClick={() => handlePageChange(previewOffset + 25)}
                      disabled={!preview || previewOffset + 25 >= preview.total_rows}
                      className="px-2 py-1 rounded bg-flux-elevated border border-flux-border text-flux-text disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>

                {preview && (
                  <div className="overflow-x-auto rounded-lg border border-flux-border max-h-96">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-flux-elevated text-flux-muted font-mono sticky top-0 z-10">
                        <tr>
                          {preview.columns.map((c) => (
                            <th key={c} className="p-2.5 border-b border-flux-border font-medium whitespace-nowrap">
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-flux-border font-mono text-[11px] text-flux-text">
                        {preview.data.map((row, i) => (
                          <tr key={i} className="hover:bg-flux-elevated/40 transition-colors">
                            {preview.columns.map((col) => (
                              <td key={col} className="p-2.5 whitespace-nowrap text-flux-muted/90">
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
          )}
        </div>
      </div>
    </div>
  );
};
