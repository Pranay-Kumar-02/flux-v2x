# Security Policy & Threat Model

## 1. Security Architecture & Threat Model

FluxV2X is engineered to process untrusted structured network traces, user-submitted datasets, and machine learning experimentation workflows across multiple research workspaces.

### 1.1 Authentication & Session Security
- **Strict Bearer JWT Validation:** All protected API endpoints enforce cryptographically signed JSON Web Tokens using PyJWT with HMAC-SHA256 (`HS256`).
- **Zero Backdoors or Auto-Superusers:** Requests with missing, expired, malformed, or forged tokens fail closed with HTTP 401. No fallback accounts or default superusers exist.
- **OWASP-Compliant Password Hashing:** User passwords are encrypted using PBKDF2-HMAC-SHA256 with 100,000 iterations and a 16-byte cryptographically secure random salt.
- **Account Inactivation Enforcement:** Disabled user accounts immediately reject subsequent token requests.

### 1.2 Multi-Tenant Workspace & Resource Isolation
- **Complete Ownership Chain Enforcement:** Every resource (datasets, dataset versions, schema mappings, experiments, model artifacts, ACAFDM policies, simulation runs) is verified against the authenticated user's active `WorkspaceMembership`.
- **Fail-Closed Header Handling:** Substituting another tenant's `X-Workspace-Id` header is rejected with HTTP 403 Forbidden. Requests cannot fall back to other users' workspaces.
- **Cross-Tenant Regression Tests:** Automated test suites verify that User A cannot read, preview, delete, train on, or export User B's resources.

### 1.3 Ingestion Security & Path Traversal Prevention
- **Bounded Upload Streaming:** Uploads are chunk-streamed to disk with an enforced hard limit (`MAX_UPLOAD_SIZE_BYTES = 100MB`) to protect against memory exhaustion and decompression attacks.
- **Extension & Content Sniffing:** Permitted file formats are restricted to `.csv`, `.tsv`, `.json`, `.jsonl`, `.ndjson`, `.parquet`, `.xlsx`.
- **Path Sanitization:** User-supplied filenames are sanitized via `os.path.basename` and regex character whitelisting, preventing directory traversal (`../`, `..\`, null bytes).
- **Temporary File Lifecycle:** Unsuccessful ingestions clean up temporary files in `try...finally` blocks, leaving zero orphaned disk artifacts.

### 1.4 Adversarial Machine Learning & Poisoning Defenses
- **Concept Drift Manipulation:** In online detectors, adversaries inject subtle flooding bursts to shift baseline means upward.
- **Benign-Validation Gate:** ACAFDM enforces that only verified benign observations update the rolling EWMA baseline. Attack records are rejected from baseline calculations.
- **Target Leakage Prevention:** Feature selection validates that target labels or target-derived columns cannot be passed as features.

### 1.5 Safe Offline Simulation Sandbox
- **Deterministic Replay:** The Mitigation Simulator operates exclusively on historical or synthetic recorded traces.
- **Zero Live Network Emission:** The platform executes no raw socket injection, vehicle actuation, routing changes, or radio emissions.

### 1.6 Production Secret Management
- **Fail-Closed Startup:** In production environments (`ENVIRONMENT=production`), the backend validates that `SECRET_KEY` is at least 32 characters, cryptographically random, and does not match development defaults. Weak keys abort startup immediately.
- **Database Network Isolation:** In Docker Compose, PostgreSQL is hosted on an internal container bridge network without publishing port 5432 to the host.

---

## 2. Reporting a Vulnerability

If you discover a security vulnerability or potential isolation breach within FluxV2X, please submit a report to:

- **Email:** `security@fluxv2x.internal`
- **GitHub:** Submit a private security advisory via [GitHub Security Advisories](https://github.com/Pranay-Kumar-02/flux-v2x/security/advisories)

Please include:
1. Steps to reproduce the issue.
2. Proof-of-concept payload or test case.
3. Affected components, endpoints, or versions.

We appreciate responsible disclosure and aim to acknowledge reports within 48 hours.
