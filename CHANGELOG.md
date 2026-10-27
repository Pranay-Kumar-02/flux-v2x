# Changelog

All notable changes to the FluxV2X platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned
- Distributed Celery / Redis task queue deployment for large cluster workloads.
- S3/GCS blob storage driver abstraction alongside local filesystem storage.
- Real-time streaming network telemetry ingest via Kafka and WebSocket sinks.
- Multi-dataset benchmark aggregations and exportable LaTeX statistical comparison tables.

---

## [0.2.0] - 2026-10-27

### Security & Remediations
- **Authentication Fail-Closed Enforcement**: Removed developer bypass in `get_current_user` that previously allowed unauthenticated access with a mock researcher account. All protected routes now strictly return HTTP 401 Unauthorized for missing, expired, malformed, or inactive user tokens.
- **Cryptographic Hardening**: Standardized JWT verification using `PyJWT` with explicit `HS256` signature validation and required `exp`, `iat`, and `sub` claims. Replaced custom password hashing with standard PBKDF2-HMAC-SHA256 (100,000 iterations and 16-byte random salt).
- **Workspace & Multi-Tenant Isolation**: Enforced strict chain-of-custody authorization (`DatasetVersion` $\to$ `Dataset` $\to$ `Workspace`). Prohibited cross-workspace access via `X-Workspace-Id` spoofing (returns HTTP 403 Forbidden). Removed all fallbacks that defaulted to the first database workspace.
- **Production Secret Validation**: Added fail-closed startup validation in `Settings` ensuring production mode halts immediately if default/weak secrets, `DEBUG=True`, `ENABLE_DEV_BOOTSTRAP=True`, or `AUTO_LOAD_DEMO_DATASET=True` are configured.
- **Network Isolation**: Placed PostgreSQL on an internal container network in Docker Compose, removing published host ports by default. Added `docker-compose.override.yml.example` for local host port forwarding.

### Research Integrity & Provenance
- **Truthful Research Data Attribution**: Relabeled default seed data as `"FluxV2X Synthetic VCN Development Fixture (Seed: 42)"` with explicit `is_synthetic=True` flag and full generator metadata. Prohibited claims of downloading published research datasets without genuine retrieval.
- **Independent Mendeley Importer**: Implemented `MendeleyDatasetImporter` for public dataset DOI `10.17632/2jvknhv465.1`, verifying SHA-256 checksums, schema fidelity, and licensing terms prior to registration.
- **Machine Learning Target Leakage Prevention**: Enforced strict API-level checks rejecting training requests where `target_column` is present in the feature list. Stratified scenario/temporal splits fit all scalers exclusively on training partitions.
- **Statistical Benchmark Integrity**: Implemented valid paired two-tailed McNemar tests operating strictly on shared test partitions with aligned predictions.

### Architecture & Delivery
- **Non-Blocking Background Execution**: Refactored model training and heavy computations to execute asynchronously via `TaskRunner` with threadpool isolation and dedicated database sessions per worker.
- **Job Management APIs**: Added `/jobs`, `/jobs/{id}`, and `/jobs/{id}/cancel` endpoints supporting live progress tracking, error capturing, and cooperative task cancellation.
- **Secure File Ingestion**: Enforced 100MB streaming upload bounds, strict filename sanitization, extension allowlists, and automatic temporary file cleanup.
- **Regression Test Suite**: Added `tests/test_security_remediation.py` with 10 comprehensive security regression tests covering 401 rejection, cross-tenant isolation, fail-closed secrets, and leakage prevention. Full test suite passing with 100% pass rate.

---

## [0.1.0] - 2026-10-26

### Added
- Core full-stack architecture with FastAPI backend and React/Vite frontend.
- Polars-based dataset ingestion pipeline with automatic schema profiling and type inference.
- Spatiotemporal destination-centric clustering (K-Means) for receiver node group discovery.
- Adaptive Context-Aware Malicious Flooding Detection and Mitigation (ACAFDM) engine with dual-gate poison prevention.
- Machine learning laboratory supporting Random Forest, Gradient Boosting, Logistic Regression, Decision Tree, and Multi-Layer Perceptron.
- Offline Mitigation Simulator evaluating packet drop, rate limiting, and priority preservation policies.
- Interactive Web dashboard with dark mode, responsive telemetry visualization, and experiment inspection.
