# FluxV2X Architecture Decision Records (ADRs)

This document tracks significant architectural decisions made during the engineering of FluxV2X, recording the context, options considered, decisions, trade-offs, and consequences.

---

## ADR-001: Decoupled Single Page Application & Asynchronous REST API
- **Date**: 2026-10-26
- **Status**: Accepted
- **Context**: FluxV2X requires an interactive, responsive dashboard for high-volume telemetry visualization, coupled with an analytics engine capable of streaming data analysis and machine learning.
- **Decision**: Adopt a decoupled architecture utilizing a React 18 + TypeScript SPA for the client presentation tier, and FastAPI + Python 3.11 for the backend REST API tier.
- **Consequences**:
  - Positive: Clean separation of presentation and business logic; independent frontend and backend scaling; standard REST contracts.
  - Negative: Requires token-based CORS handling and dual build toolchains (Node/npm and Python/uv).

---

## ADR-002: PyJWT & PBKDF2-HMAC-SHA256 Cryptographic Hardening
- **Date**: 2026-10-27
- **Status**: Accepted (Supersedes prototype custom cryptography)
- **Context**: A security review of the prototype identified that custom token handling and authentication fallbacks allowed unauthenticated bypass.
- **Decision**: Migrate entirely to industry-standard `PyJWT` with explicit `HS256` signature verification, mandatory `exp`, `iat`, and `sub` claims validation, and standard PBKDF2-HMAC-SHA256 password hashing (100,000 iterations, 16-byte random salt). All protected endpoints strictly fail closed (HTTP 401).
- **Consequences**:
  - Positive: Immune to token forgery, timing attacks, and custom cryptographic flaws. Complies with OWASP Authentication standards.
  - Negative: Requires explicit client login before accessing any protected endpoint.

---

## ADR-003: Strict Multi-Tenant Workspace Isolation & Ownership Chain
- **Date**: 2026-10-27
- **Status**: Accepted
- **Context**: The prototype permitted cross-tenant access via unverified `X-Workspace-Id` headers and defaulted to the first available database workspace.
- **Decision**: Enforce strict chain-of-custody authorization on all operations (`DatasetVersion` $\to$ `Dataset` $\to$ `Workspace`). Every request must resolve the tenant through verified `WorkspaceMembership`. Unauthorized workspace headers or identifiers are rejected with HTTP 403 Forbidden.
- **Consequences**:
  - Positive: Eliminates horizontal privilege escalation and resource enumeration.
  - Negative: Requires every database query to include joins validating workspace ownership.

---

## ADR-004: Parquet Columnar Storage & Streaming SHA-256 Custody
- **Date**: 2026-10-26
- **Status**: Accepted
- **Context**: Large network telemetry datasets (100k+ rows) cause memory exhaustion and sluggish queries when stored in row-oriented relational tables or raw CSVs.
- **Decision**: Ingested files are validated, converted, and stored as Apache Parquet files using `Polars` and `pyarrow`. A streaming SHA-256 cryptographic hash is calculated during upload to guarantee data immutability.
- **Consequences**:
  - Positive: 5x–10x disk compression; sub-second column scans; strict cryptographic auditability.
  - Negative: Requires physical file storage management alongside relational metadata.

---

## ADR-005: Asynchronous TaskRunner for Computationally Heavy Tasks
- **Date**: 2026-10-27
- **Status**: Accepted
- **Context**: Training machine learning models and evaluating ACAFDM simulations on multi-megabyte datasets previously blocked the synchronous HTTP request thread, triggering client timeouts.
- **Decision**: Implement an asynchronous `TaskRunner` using Python `ThreadPoolExecutor` and dedicated database sessions per worker. Endpoints return HTTP 200/202 with a queued `BackgroundJob` record. Clients track progress via `/jobs/{id}` and can trigger cooperative cancellation.
- **Consequences**:
  - Positive: Unblocks the FastAPI web event loop; eliminates HTTP timeouts; provides real-time progress feedback.
  - Negative: Requires state polling or websocket notifications on the frontend.

---

## ADR-006: Machine Learning Target Leakage Prevention & Scenario Splits
- **Date**: 2026-10-27
- **Status**: Accepted
- **Context**: Naive machine learning evaluations often suffer from target leakage (including ground truth labels in features) and random K-Fold splits that leak spatiotemporally adjacent vehicular packets between train and test sets.
- **Decision**: Implement mandatory API-level checks rejecting training requests containing `target_column` in the feature set (HTTP 422). Provide scenario-stratified and chronological train/test splitting, ensuring all scaling and preprocessing fit exclusively on the training partition.
- **Consequences**:
  - Positive: Scientifically valid, reproducible ML benchmarks; prevents artificially inflated accuracy metrics.
  - Negative: Requires explicit target designation in schema mappings.

---

## ADR-007: Truthful Research Provenance & Dual-Gate ACAFDM Baselining
- **Date**: 2026-10-27
- **Status**: Accepted
- **Context**: Synthetic fixtures were previously seed-labeled in a manner that implied actual retrieval of the published Mendeley VCN dataset.
- **Decision**: Relabel synthetic sample fixtures as `is_synthetic=True` with explicit generator provenance. Implement a dedicated `MendeleyDatasetImporter` for DOI `10.17632/2jvknhv465.1` that only claims public data status after genuine retrieval and checksum verification. Integrate the dual-gate ACAFDM mechanism to reject baseline updates during anomalous or suspicious flows.
- **Consequences**:
  - Positive: Complete research integrity and protection against baseline poisoning attacks.
  - Negative: Users must run an explicit import script or supply genuine files to evaluate the published research data.

---

## ADR-008: Open-Source Governance under Apache License 2.0
- **Date**: 2026-10-27
- **Status**: Accepted
- **Context**: FluxV2X is intended for global reuse by researchers, developers, and security professionals. A clear, permissive, legally sound open-source license is required.
- **Decision**: Adopt the Apache License 2.0.
- **Consequences**:
  - Positive: Permits commercial and non-commercial use, modification, and distribution; includes explicit patent grants; provides liability disclaimers.
  - Negative: Requires retaining copyright notices and tracking modifications in derivative distributions.
