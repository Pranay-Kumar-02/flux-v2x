# FluxV2X Testing Strategy & Verification Guide

FluxV2X maintains a strict testing pyramid combining unit tests, mathematical verification, scientific leakage safeguards, multi-tenant isolation regressions, and API integration tests.

---

## 1. Test Architecture & Pytest Layout

All backend tests reside in `backend/tests/`:

```
backend/tests/
├── conftest.py                       # Shared test fixtures (isolated SQLite DB, clients, auth headers)
├── test_security_remediation.py      # Regression tests: 401 unauth, 403 cross-tenant, fail-closed secrets
├── test_api_endpoints.py             # End-to-end REST API workflows (datasets, experiments, benchmarks)
├── test_acafdm_and_mitigation.py     # ACAFDM persistence policy, dual-gate poison prevention, simulator
├── test_ingestion_profiling.py       # Polars streaming parser, SHA-256 custody, statistical profiler
└── test_research_methodology.py      # K-Means clustering, localized baselines, scenario splits, McNemar
```

---

## 2. Test Execution Commands

### 2.1 Backend Tests (Pytest)
```bash
cd backend

# Execute all tests verbosely
uv run pytest -v

# Run only security regression tests
uv run pytest tests/test_security_remediation.py -v

# Run tests with test coverage reporting
uv run pytest --cov=app tests/ -v
```

### 2.2 Frontend Build & Typecheck
```bash
cd frontend

# Verify TypeScript static types and Vite production bundle
npm run build
```

---

## 3. Key Regression Scenarios Tested

### 3.1 Authentication & Fail-Closed Enforcement
- `test_unauthenticated_requests_rejected_with_401`: Protected routes reject missing bearer tokens with HTTP 401.
- `test_invalid_expired_and_forged_tokens_rejected_with_401`: Tampered signatures, expired timestamps, or malformed strings return HTTP 401.
- `test_inactive_user_token_rejected_with_401`: Tokens belonging to deactivated users return HTTP 401.

### 3.2 Multi-Tenant Workspace Isolation
- `test_cross_workspace_isolation`: User A cannot access User B's datasets, experiments, or models by substituting `X-Workspace-Id` headers or resource IDs. Returns HTTP 403 or 404.
- `test_dataset_version_ownership_enforcement`: Prohibits launching experiments or simulations on dataset versions belonging to foreign workspaces.

### 3.3 Research Integrity & Scientific Validity
- `test_ml_target_leakage_prohibited`: Requests containing `target_column` in the feature set are rejected with HTTP 422.
- `test_synthetic_seed_truthfully_marked`: Confirms synthetic fixtures carry `is_synthetic=True` and generator provenance.
- `test_two_tailed_mcnemar_test`: Validates paired McNemar test calculations against known mathematical tables.

### 3.4 Background Job Lifecycle
- `test_background_job_lifecycle_and_cancellation`: Verifies async execution, state progression (`pending` $\to$ `processing` $\to$ `completed`), live progress percentages, and cancellation.

---

## 4. Test Determinism & Reproducibility Guidelines

1. **Deterministic Random Seeds**: Machine learning and clustering tests must pass fixed seeds (`random_seed=42`) to guarantee identical results.
2. **Ephemeral Databases**: Automated tests run against isolated in-memory or temporary SQLite databases created and torn down in fixtures (`conftest.py`). Never test against production databases.
3. **No External Network Calls**: Unit and integration tests must execute entirely offline without relying on external web servers or APIs.
