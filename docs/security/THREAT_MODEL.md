# FluxV2X Security Threat Model

This document identifies assets, trust boundaries, threat vectors, mitigations, and residual risks across the FluxV2X platform according to the **STRIDE** methodology.

---

## 1. Critical Assets & Trust Boundaries

### Critical Assets:
1. **User Credentials & Access Tokens**: Password hashes, JWT signing keys, and active user sessions.
2. **Workspace Telemetry & Proprietary Datasets**: Uploaded network packet traces, vehicle locations, and speed profiles.
3. **Machine Learning Model Artifacts**: Trained weights, hyperparameter configs, and evaluation metrics.
4. **Adaptive Baselines**: Cluster running statistics ($\mu_c, \sigma_c$) driving defensive mitigation rules.
5. **System Audit Logs**: Historical records of administrative and data operations.

### Trust Boundaries:
- **TB-1: Client Browser $\leftrightarrow$ Ingress Proxy**: Unauthenticated public internet traffic.
- **TB-2: Ingress Proxy $\leftrightarrow$ FastAPI Application Tier**: Authenticated HTTP/REST boundary.
- **TB-3: Application Tier $\leftrightarrow$ Relational Database / File Storage**: Private network data enclave.
- **TB-4: Application Tier $\leftrightarrow$ Background Worker Threads**: Local process boundary with isolated DB sessions.

---

## 2. STRIDE Threat Analysis & Implemented Mitigations

| Threat Category | Specific Threat Vector | Implemented Mitigation | Verification Evidence |
| :--- | :--- | :--- | :--- |
| **Spoofing (S)** | Forged JWT access tokens or impersonating other researchers. | `PyJWT` verification of `HS256` signatures, `exp`, `iat`, `sub`. Database active user verification on every request. | `test_invalid_expired_and_forged_tokens_rejected_with_401` |
| **Tampering (T)** | Adversarial baseline poisoning (gradually increasing flooding rates to skew adaptive thresholds). | ACAFDM dual-gate poison prevention: baseline updates are blocked if flows are flagged suspicious or anomalous. | `test_acafdm_poison_prevention_gate` |
| **Tampering (T)** | Modifying or substituting dataset files on disk. | Ingestion calculates and validates streaming SHA-256 cryptographic digests stored in the database. | `test_ingestion_and_sha256` |
| **Repudiation (R)** | Malicious modifications to datasets or experiments without audit trails. | Immutable `AuditLog` records capture workspace ID, user ID, timestamp, action, and target resource. | Database `audit_logs` entity verification. |
| **Information Disclosure (I)** | Cross-workspace data enumeration via `X-Workspace-Id` header manipulation. | Multi-tenant isolation: every query joins `Dataset` $\to$ `Workspace` and checks verified `WorkspaceMembership`. Unauthorized requests return 403. | `test_cross_workspace_isolation` |
| **Information Disclosure (I)** | Exposing raw database passwords or secrets in error messages. | Shielded FastAPI exception handlers log stack traces internally and return sanitized RFC 7807 problem details. | Review of `backend/app/main.py` exception handlers. |
| **Denial of Service (D)** | Memory exhaustion via massive file uploads or infinite decompression bombs. | Strict 100MB streaming upload limit (`MAX_UPLOAD_SIZE_BYTES`); extension allowlist (`.csv`, `.parquet`, `.json`). | `test_ingestion_profiling.py` upload bounds. |
| **Elevation of Privilege (E)** | Ordinary researcher accessing superuser administrative endpoints. | Explicit `is_superuser` role checks on administrative endpoints. Superuser auto-creation removed from normal startup. | `test_unauthenticated_requests_rejected_with_401` |

---

## 3. Residual Risks & Future Hardening

1. **Host-Level File System Access**: If the underlying host operating system is compromised, local Parquet files in `data/datasets/` could be read.
   - *Mitigation Roadmap*: Introduce transparent envelope encryption for Parquet storage in v0.3.0.
2. **Distributed Denial of Service at Ingress**: Heavy L7 HTTP flood attacks on `/api/v1/auth/login`.
   - *Mitigation Roadmap*: Deploy Cloudflare or Nginx `limit_req` rate limiting on auth endpoints.
