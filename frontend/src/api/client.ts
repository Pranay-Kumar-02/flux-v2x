const API_BASE = '/api/v1';

export interface Dataset {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  file_format: string;
  file_size_bytes: number;
  sha256_hash: string;
  row_count: number;
  column_count: number;
  is_synthetic: boolean;
  provenance?: string;
  created_at: string;
  versions_count: number;
}

export interface DatasetPreview {
  dataset_id: string;
  version_id: string;
  total_rows: number;
  columns: string[];
  data: Record<string, any>[];
  dtypes: Record<string, string>;
}

export interface ColumnProfile {
  name: string;
  inferred_type: string;
  null_count: number;
  null_percentage: number;
  unique_count: number;
  min_val?: number;
  max_val?: number;
  mean_val?: number;
  std_val?: number;
  sample_values: any[];
  is_candidate_target: boolean;
  is_candidate_identifier: boolean;
  is_candidate_timestamp: boolean;
  leakage_warning?: string;
}

export interface DatasetProfile {
  dataset_version_id: string;
  total_rows: number;
  total_columns: number;
  duplicate_rows: number;
  duplicate_percentage: number;
  memory_usage_mb: number;
  columns: ColumnProfile[];
  class_distribution?: Record<string, number>;
  leakage_warnings: string[];
  created_at: string;
}

export interface Experiment {
  id: string;
  workspace_id: string;
  dataset_version_id: string;
  name: string;
  target_column: string;
  model_family: string;
  hyperparameters: Record<string, any>;
  split_strategy: string;
  test_size: number;
  random_seed: number;
  status: string;
  error_message?: string;
  metrics?: Record<string, any>;
  confusion_matrix?: Record<string, any>;
  duration_seconds: number;
  created_at: string;
  finished_at?: string;
}

export interface PairedMcNemarResult {
  model_a_name: string;
  model_b_name: string;
  total_paired_samples?: number;
  contingency_table: number[][];
  statistic: number;
  p_value: number;
  is_significant: boolean;
  statistically_significant?: boolean;
  interpretation: string;
}

export interface ACAFDMConfig {
  id: string;
  workspace_id: string;
  name: string;
  cluster_count: number;
  rolling_window_size: number;
  alpha_update_rate: number;
  z_threshold: number;
  persistence_k: number;
  cooldown_seconds: number;
  benign_validation_gate: boolean;
  created_at: string;
}

export interface ACAFDMDecisionRecord {
  index: number;
  timestamp: number;
  rx_id: string;
  cluster_id: number;
  raw_rate: number;
  baseline_rate: number;
  z_score: number;
  confidence: number;
  persistence_count: number;
  decision: string;
  baseline_updated: boolean;
  reason?: string;
  model_score?: number;
}

export interface ACAFDMRunResult {
  config_id?: string;
  config_name?: string;
  total_observations: number;
  total_evaluations?: number;
  allowed_count: number;
  flagged_suspicious_count: number;
  mitigated_count: number;
  baseline_updates_accepted: number;
  baseline_updates_rejected_poison_prevented: number;
  rolling_baselines_final?: Record<string, any>;
  decision_trace: ACAFDMDecisionRecord[];
  action_breakdown?: Record<string, number>;
  poison_updates_blocked?: number;
  false_positives_mitigated?: number;
  attack_records_detected?: number;
  sample_decisions?: ACAFDMDecisionRecord[];
}

export interface MitigationSimulation {
  id: string;
  workspace_id: string;
  dataset_version_id: string;
  acafdm_config_id?: string;
  name: string;
  policy_action: string;
  rate_limit_ratio: number;
  priority_preservation: boolean;
  status: string;
  results: Record<string, any>;
  created_at: string;
}

export interface BackgroundJob {
  id: string;
  workspace_id: string;
  job_type: string;
  status: string;
  progress_pct: number;
  error_message?: string;
  result_metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface SystemStats {
  total_datasets: number;
  total_records: number;
  total_experiments: number;
  completed_experiments: number;
  failed_experiments: number;
  total_simulations: number;
  active_workers: number;
  storage_used_bytes: number;
  backend_status: string;
  database_status: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
}

export interface WorkspaceItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
  owner_id: string;
  created_at: string;
}

export function getAuthToken(): string | null {
  return localStorage.getItem('fluxv2x_access_token');
}

export function setAuthToken(token: string): void {
  localStorage.setItem('fluxv2x_access_token', token);
}

export function getActiveWorkspaceId(): string | null {
  return localStorage.getItem('fluxv2x_workspace_id');
}

export function setActiveWorkspaceId(workspaceId: string): void {
  localStorage.setItem('fluxv2x_workspace_id', workspaceId);
}

let authBootstrapPromise: Promise<string> | null = null;

export async function ensureAuthenticatedSession(): Promise<string> {
  const existing = getAuthToken();
  if (existing) {
    return existing;
  }
  if (!authBootstrapPromise) {
    authBootstrapPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'researcher@fluxv2x.internal',
            password: 'fluxv2x-secure-pass',
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setAuthToken(data.access_token);
          // Auto-select first workspace if none set
          try {
            const wsRes = await fetch(`${API_BASE}/auth/workspaces`, {
              headers: { Authorization: `Bearer ${data.access_token}` },
            });
            if (wsRes.ok) {
              const wsList = await wsRes.json();
              if (Array.isArray(wsList) && wsList.length > 0 && !getActiveWorkspaceId()) {
                setActiveWorkspaceId(wsList[0].id);
              }
            }
          } catch (_) {}
          return data.access_token;
        }
      } catch (e) {
        console.warn('Dev authentication bootstrap failed:', e);
      } finally {
        authBootstrapPromise = null;
      }
      return '';
    })();
  }
  return authBootstrapPromise;
}

async function request<T>(url: string, options?: RequestInit, isRetry = false): Promise<T> {
  if (!getAuthToken() && !url.startsWith('/auth/login') && !url.startsWith('/auth/register')) {
    await ensureAuthenticatedSession();
  }

  const token = getAuthToken();
  const workspaceId = getActiveWorkspaceId();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (workspaceId) {
    headers['X-Workspace-Id'] = workspaceId;
  }

  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  if (res.status === 401 && !isRetry && !url.startsWith('/auth/login')) {
    localStorage.removeItem('fluxv2x_access_token');
    await ensureAuthenticatedSession();
    return request<T>(url, options, true);
  }

  if (!res.ok) {
    let errMessage = `HTTP ${res.status}: ${res.statusText}`;
    try {
      const body = await res.json();
      if (body.detail) errMessage = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail);
    } catch (_) {}
    throw new Error(errMessage);
  }

  return res.json();
}

export const api = {
  // Authentication
  login: async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Authentication failed' }));
      throw new Error(err.detail || 'Authentication failed');
    }
    const data = await res.json();
    setAuthToken(data.access_token);
    return data;
  },

  register: async (email: string, password: string, fullName: string) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, full_name: fullName }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Registration failed' }));
      throw new Error(err.detail || 'Registration failed');
    }
    const data = await res.json();
    setAuthToken(data.access_token);
    return data;
  },

  getMe: () => request<UserProfile>('/auth/me'),
  getWorkspaces: () => request<WorkspaceItem[]>('/auth/workspaces'),
  createWorkspace: (name: string, description?: string) =>
    request<WorkspaceItem>('/auth/workspaces', { method: 'POST', body: JSON.stringify({ name, description }) }),

  // System Health & Stats
  getHealth: () => request<{ status: string; database: string; version: string }>('/health'),
  getSystemStats: () => request<SystemStats>('/system/stats'),

  // Datasets
  listDatasets: () => request<Dataset[]>('/datasets'),
  getDataset: (id: string) => request<Dataset>(`/datasets/${id}`),
  previewDataset: (id: string, offset = 0, limit = 50) =>
    request<DatasetPreview>(`/datasets/${id}/preview?offset=${offset}&limit=${limit}`),
  getDatasetProfile: (id: string) => request<DatasetProfile>(`/datasets/${id}/profile`),
  uploadDataset: async (formData: FormData): Promise<Dataset> => {
    const token = getAuthToken();
    const workspaceId = getActiveWorkspaceId();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (workspaceId) headers['X-Workspace-Id'] = workspaceId;

    const res = await fetch(`${API_BASE}/datasets/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  },
  deleteDataset: (id: string) => request<{ message: string }>(`/datasets/${id}`, { method: 'DELETE' }),

  // Schemas & Feature Lab
  suggestSchema: (versionId: string) =>
    request<{ available_columns: string[]; suggested_mapping: Record<string, string>; canonical_fields: Record<string, any> }>(
      `/schemas/suggest/${versionId}`
    ),
  saveSchemaMapping: (versionId: string, payload: any) =>
    request<any>(`/schemas/${versionId}`, { method: 'POST', body: JSON.stringify(payload) }),

  // Network Context Explorer
  getContextExplorerData: (datasetId: string, maxPoints = 250) =>
    request<{
      dataset_name: string;
      total_records: number;
      has_spatial_coordinates: boolean;
      spatial_points: any[];
      scenario_stats: Record<string, any>;
      cluster_baselines: Record<string, any>;
    }>(`/context/explorer-data/${datasetId}?max_points=${maxPoints}`),

  // Experiments
  listExperiments: () => request<Experiment[]>('/experiments'),
  getExperiment: (id: string) => request<Experiment>(`/experiments/${id}`),
  launchExperiment: (payload: {
    dataset_version_id: string;
    name: string;
    target_column?: string;
    features?: string[];
    model_family: string;
    split_strategy: string;
    test_size?: number;
    random_seed?: number;
    hyperparameters?: Record<string, any>;
  }) => request<Experiment>('/experiments', { method: 'POST', body: JSON.stringify(payload) }),

  // Benchmarks
  compareExperiments: (ids: string[]) =>
    request<{ experiments: any[] }>(`/benchmarks/compare?experiment_ids=${ids.join(',')}`),
  runMcNemarTest: (modelAId: string, modelBId: string) =>
    request<PairedMcNemarResult>(`/benchmarks/mcnemar?model_a_id=${modelAId}&model_b_id=${modelBId}`),

  // ACAFDM Engine
  listACAFDMConfigs: () => request<ACAFDMConfig[]>('/acafdm/configs'),
  createACAFDMConfig: (payload: Partial<ACAFDMConfig>) =>
    request<ACAFDMConfig>('/acafdm/configs', { method: 'POST', body: JSON.stringify(payload) }),
  evaluateACAFDM: (versionId: string, configId?: string) =>
    request<ACAFDMRunResult>(`/acafdm/evaluate/${versionId}${configId ? `?config_id=${configId}` : ''}`, { method: 'POST' }),

  // Mitigation Simulator
  listMitigationSimulations: () => request<MitigationSimulation[]>('/simulator/list'),
  runMitigationSimulation: (payload: {
    dataset_version_id: string;
    name: string;
    policy_action?: string;
    rate_limit_ratio?: number;
    priority_preservation?: boolean;
    acafdm_config_id?: string;
  }) => request<MitigationSimulation>('/simulator/run', { method: 'POST', body: JSON.stringify(payload) }),

  // Background Jobs
  listJobs: () => request<BackgroundJob[]>('/jobs'),
  getJob: (jobId: string) => request<BackgroundJob>(`/jobs/${jobId}`),
  cancelJob: (jobId: string) => request<{ message: string }>(`/jobs/${jobId}/cancel`, { method: 'POST' }),
};
