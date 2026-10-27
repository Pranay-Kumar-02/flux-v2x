# FluxV2X Product Roadmap

This document outlines the engineering and research milestones for FluxV2X.
Every item is categorized by its actual development state: `Implemented`, `In Progress`, or `Planned`.

---

## 1. Release Timeline Overview

| Milestone | Target Horizon | Focus Area | Status |
| :--- | :--- | :--- | :--- |
| **v0.1.0** | Q3 2026 | Initial Architecture, VCN Clustering, ML Lab, Offline Simulator | Completed |
| **v0.2.0** | Q4 2026 | Critical Security Remediation, Workspace Isolation, Task Runner | Completed |
| **v0.3.0** | Q1 2027 | Distributed Celery / Redis Queues, Remote S3/GCS Object Storage | In Progress |
| **v0.4.0** | Q2 2027 | Streaming Telemetry Ingest (Kafka / WebSockets), Real-Time Snort Sink | Planned |
| **v1.0.0** | Q4 2027 | Production Release: Multi-Node High Availability, Long-Term Support | Planned |

---

## 2. Detailed Capability Status

### Phase 1: Security, Integrity, and Architecture (Completed in v0.2.0)
- [x] **Authentication Hardening**: Fail-closed 401 enforcement, PyJWT validation, PBKDF2 password hashing.
- [x] **Workspace Isolation**: Multi-tenant chain-of-custody authorization (`DatasetVersion` $\to$ `Dataset` $\to$ `Workspace`).
- [x] **Truthful Research Data Provenance**: Explicit synthetic fixture marking (`is_synthetic=True`) and independent Mendeley importer.
- [x] **Non-Blocking Background Tasks**: Async `TaskRunner` with session isolation and cancellation endpoints.
- [x] **Leakage-Safe ML Pipelines**: Strict target leakage checks, scenario-stratified splits, paired McNemar significance testing.
- [x] **Production Secret Guards**: Startup configuration invariant validation preventing default secrets in production.

### Phase 2: Distributed Infrastructure & Remote Storage (In Progress — v0.3.0)
- [ ] **Distributed Task Queue**: Integration with Celery and Redis broker for multi-worker distributed training.
- [ ] **Object Storage Abstraction**: Pluggable S3/MinIO and Google Cloud Storage drivers for Parquet datasets and model weights.
- [ ] **Automated Database Migrations**: Full Alembic migration scripts supporting zero-downtime PostgreSQL upgrades.
- [ ] **Extended Model Zoo**: Integration of XGBoost, LightGBM, and CatBoost with GPU-accelerated training.
- [ ] **Accessible Telemetry Drill-Downs**: Alternative tabular views for high-density spatial scatter plots (WCAG 2.2 AA).

### Phase 3: Real-Time Streaming & Hardware Emulation (Planned — v0.4.0)
- [ ] **Kafka / Redpanda Ingestion Connector**: Streaming network event consumer with sliding micro-batch windowing.
- [ ] **OMNeT++ / Veins / SUMO Direct Exporter**: Bidirectional network simulation connector to ingest synthetic trace outputs.
- [ ] **Adaptive Mitigation Rule Exporter**: Exporting calibrated ACAFDM rules to Snort, Suricata, and Linux eBPF/XDP filters.
- [ ] **Federated Baseline Learning**: Multi-RSU (Roadside Unit) collaborative baseline synchronization without centralizing raw packet logs.

### Phase 4: Long-Term Enterprise & Production Readiness (Planned — v1.0.0)
- [ ] **OpenID Connect (OIDC) & SAML SSO**: Enterprise identity provider integration (Okta, Keycloak, Azure AD).
- [ ] **Fine-Grained Role-Based Access Control (RBAC)**: Custom roles (Viewer, Operator, ML Engineer, Workspace Admin).
- [ ] **Cryptographic Audit Log Signing**: Immutable append-only audit trail with cryptographic signatures.
- [ ] **Certified Multi-Arch Container Images**: Multi-platform Docker images (`linux/amd64`, `linux/arm64`) with signed Cosign attestations.
