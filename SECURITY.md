# Security Policy and Threat Model

## Threat Model & Security Controls

FluxV2X is designed as a secure research platform handling untrusted network traces and structured data files.

### 1. Adversarial Baseline Poisoning Protection
- **Vulnerability:** Attackers frequently inject gradual, low-intensity flooding bursts into online detectors to shift the baseline mean upwards (concept drift manipulation), causing subsequent large-scale flooding attacks to appear normal.
- **ACAFDM Mitigation:** The engine implements a strict **Benign-Validation Gate**. Any observation flagged as statistically anomalous ($|Z| \ge Z_{threshold}$) or suspicious by the classifier is blocked from updating the rolling baseline statistics ($\mu_c, \sigma_c$).

### 2. File Upload & Ingestion Safety
- All file uploads are checked using content signatures and format sniffers.
- Filenames and paths are sanitized using `os.path.basename` and resolved inside isolated dataset directories to prevent directory traversal and zip-slip attacks.
- Standardized data files are converted into immutable Parquet containers indexed with SHA-256 cryptographic fingerprints.
- No dynamic code execution (`eval()`, `exec()`) is allowed on user-supplied schemas.

### 3. Safe Simulation Sandbox
- Mitigation evaluations run in an isolated deterministic offline replay sandbox.
- Live network packet injection, raw socket manipulation, and radio transmissions are excluded from the default platform.

## Reporting a Vulnerability

If you discover a security vulnerability within FluxV2X, please submit a report to:
`security@fluxv2x.internal` or open a private security advisory on GitHub.
