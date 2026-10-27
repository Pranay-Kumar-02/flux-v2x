# FluxV2X REST API Design & Specification

## 1. Architectural Conventions

All endpoints adhere to RESTful design principles and are versioned under the `/api/v1` namespace.

- **Base URL**: `http://localhost:8000/api/v1`
- **Content Type**: `application/json` (except multi-part file uploads using `multipart/form-data`)
- **Character Encoding**: UTF-8
- **Date/Time Standard**: ISO 8601 UTC strings (`YYYY-MM-DDTHH:MM:SS.mmmmmmZ`)

---

## 2. Authentication & Multi-Tenancy Headers

Every protected endpoint requires two HTTP request headers:

1. **`Authorization: Bearer <jwt_token>`**
   - Cryptographically signed JSON Web Token (HS256).
   - Validated against active status in the database.
   - Missing, expired, malformed, or forged tokens receive **HTTP 401 Unauthorized**.

2. **`X-Workspace-Id: <workspace_uuid>`** (Optional or explicit header)
   - Resolves the active tenant workspace.
   - Must correspond to an active `WorkspaceMembership` belonging to the requesting user.
   - If missing, resolves the user's primary owned workspace.
   - If an unauthorized or foreign workspace ID is supplied, the request is rejected with **HTTP 403 Forbidden**.

---

## 3. Standard HTTP Status Codes

| Status Code | Meaning | Context in FluxV2X |
| :--- | :--- | :--- |
| `200 OK` | Success | Successful resource retrieval or synchronous calculation. |
| `201 Created` | Created | Successfully registered a new user, dataset, or configuration. |
| `202 Accepted` | Accepted | Background task queued (e.g., model training or simulation). |
| `400 Bad Request` | Client Error | Malformed parameters or invalid payload structure. |
| `401 Unauthorized` | Unauthenticated | Missing, expired, or invalid JWT token. |
| `403 Forbidden` | Access Denied | Authenticated user lacks membership in requested workspace. |
| `404 Not Found` | Not Found | Resource does not exist or does not belong to active workspace. |
| `413 Payload Too Large` | Limit Exceeded | Upload exceeds the 100MB streaming upload bound. |
| `422 Unprocessable` | Validation Error | Pydantic schema validation failure or ML target leakage violation. |
| `500 Server Error` | Internal Error | Internal engine failure (shielded from exposing stack traces). |

---

## 4. Error Response Schema

All error responses strictly follow the standardized RFC 7807 problem detail structure:
```json
{
  "detail": "Descriptive and actionable error message explaining the failure."
}
```

---

## 5. API Endpoint Catalog

### 5.1 Authentication (`/auth`)
- `POST /auth/register` — Register a new researcher account (`email`, `password`, `full_name`). Returns `201 Created` and provisions default workspace.
- `POST /auth/login` — Authenticate with email and password. Returns `200 OK` with `access_token` and `token_type: "bearer"`.
- `GET /auth/me` — Retrieve the authenticated user's profile and active status.
- `GET /auth/workspaces` — List all authorized workspaces where the user holds membership.

### 5.2 Datasets & Ingestion (`/datasets`)
- `GET /datasets` — List all datasets belonging to the active workspace.
- `POST /datasets/upload` — Multipart upload (`file`, `name`, `description`). Enforces 100MB limit, SHA-256 fingerprinting, and Polars profiling.
- `GET /datasets/{id}` — Retrieve dataset metadata, version history, and row counts.
- `GET /datasets/{id}/preview` — Return a bounded tabular preview (default 100 rows).
- `GET /datasets/{id}/profile` — Return the statistical profile (nulls, distributions, types).
- `DELETE /datasets/{id}` — Delete a dataset, physical Parquet files, and derived profiles.

### 5.3 Schema & Canonical Mapping (`/schemas`)
- `GET /schemas/suggest/{version_id}` — Auto-detect columns and propose canonical VCN mappings.
- `POST /schemas/{version_id}` — Save or update a canonical schema mapping.
- `GET /schemas/{version_id}` — Retrieve active schema mappings for a version.

### 5.4 Network Context Explorer (`/context`)
- `GET /context/explorer-data/{dataset_id}` — Retrieve destination-centric spatiotemporal clusters, spatial coordinate points, and cluster packet rate statistics.

### 5.5 Machine Learning & Experiments (`/experiments`)
- `GET /experiments` — List all experiments in the active workspace.
- `POST /experiments` — Submit model training job (`dataset_version_id`, `model_family`, `features`, `split_strategy`). Validates target leakage and returns `200 OK` (queued).
- `GET /experiments/{id}` — Retrieve experiment metrics (`accuracy`, `f1_score`, `roc_auc`, `mcc`), duration, and confusion matrix.

### 5.6 Benchmarks (`/benchmarks`)
- `GET /benchmarks/compare` — Comparative metrics table across multiple experiment IDs.
- `GET /benchmarks/mcnemar` — Compute paired two-tailed McNemar test between Model A and Model B using a 2x2 contingency matrix. Returns `statistic`, `p_value`, and `is_significant`.

### 5.7 ACAFDM Engine (`/acafdm`)
- `GET /acafdm/configs` — List ACAFDM parameter profiles.
- `POST /acafdm/configs` — Create a new ACAFDM profile (`cluster_count`, `z_threshold`, `persistence_k`, `benign_validation_gate`).
- `POST /acafdm/evaluate/{version_id}` — Execute ACAFDM evaluation on a telemetry trace. Returns chronological decision traces, accepted updates, and blocked poison attempts.

### 5.8 Mitigation Simulator (`/simulator`)
- `GET /simulator/list` — List historical mitigation simulations.
- `POST /simulator/run` — Execute defensive policy simulation (`policy_action`, `rate_limit_ratio`, `priority_preservation`). Returns drop counts and preservation rates.
- `GET /simulator/{simulation_id}` — Retrieve simulation outcome and metrics.

### 5.9 Background Jobs (`/jobs`)
- `GET /jobs` — List background jobs for the active workspace.
- `GET /jobs/{job_id}` — Poll job status (`pending`, `processing`, `completed`, `failed`), progress percentage (0-100), and errors.
- `POST /jobs/{job_id}/cancel` — Trigger graceful cooperative cancellation of a running job.

### 5.10 System Health (`/health`)
- `GET /health` — Health check endpoint verifying database connectivity and disk storage availability. Returns status `healthy` or `degraded`.
- `GET /health/stats` — System-wide operational statistics (total records, datasets, worker status).
