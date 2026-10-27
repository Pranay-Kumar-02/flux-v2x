# FluxV2X Quality Gates & Acceptance Criteria

To ensure FluxV2X maintains world-class engineering standards, all code changes and releases must satisfy the following measurable quality gates before merging to `main` or tagging a release.

---

## 1. Code Quality & Static Analysis Gates

| Gate ID | Quality Requirement | Verification Command / Tool | Acceptance Criteria |
| :--- | :--- | :--- | :--- |
| **QG-01** | Python Static Typing & Syntax | `uv run ruff check .` / `mypy` | Zero unhandled syntax errors or critical type ambiguities in core routes. |
| **QG-02** | Frontend TypeScript Compilation | `npm run build` (`tsc -b && vite build`) | Zero TypeScript compilation errors (`tsc -b` exits with code 0). |
| **QG-03** | Format & Line Endings | Git line ending normalization | Consistent LF/CRLF formatting with no binary corruption. |

---

## 2. Test Execution & Regression Gates

| Gate ID | Quality Requirement | Verification Command / Tool | Acceptance Criteria |
| :--- | :--- | :--- | :--- |
| **TG-01** | Test Suite Pass Rate | `uv run pytest -v` | **100% passing tests** (24 of 24 tests passed). Zero test skips on core paths. |
| **TG-02** | Security Isolation Regressions | `test_security_remediation.py` | Must prove 401 on missing/expired tokens, 403 on cross-workspace tampering, and fail-closed secrets. |
| **TG-03** | Deterministic Reproducibility | Multi-run pytest execution | Tests produce identical outcomes regardless of execution order or random seed. |

---

## 3. Security & Vulnerability Gates

| Gate ID | Quality Requirement | Verification Command / Tool | Acceptance Criteria |
| :--- | :--- | :--- | :--- |
| **SG-01** | Secret Leakage Prevention | Automated git commit hooks / CodeQL | Zero committed API keys, JWT secrets, passwords, or private encryption keys. |
| **SG-02** | Dependency Vulnerability Scanning | Dependabot / `dependency-review-action` | Zero high or critical severity CVEs in direct runtime dependencies. |
| **SG-03** | Fail-Closed Production Defaults | `Settings.validate_security_invariants` | Production startup fails immediately if secrets are weak or debug flags are active. |
| **SG-04** | Streaming Ingestion Protection | `MAX_UPLOAD_SIZE_BYTES=100MB` | Streaming file uploads exceeding 100MB are immediately aborted with HTTP 413. |

---

## 4. Scientific Integrity & Machine Learning Gates

| Gate ID | Quality Requirement | Verification Command / Tool | Acceptance Criteria |
| :--- | :--- | :--- | :--- |
| **MLG-01**| Target Leakage Prevention | `test_ml_target_leakage_prohibited` | Requests including the ground-truth target label in feature sets are rejected with HTTP 422. |
| **MLG-02**| Partition Isolation | `test_leakage_safe_scenario_split` | All feature scalers, imputers, and encoders must fit exclusively on training folds. |
| **MLG-03**| Statistical Benchmarking Validity | `test_two_tailed_mcnemar_test` | McNemar tests must operate on identical test observations with correctly aligned predictions. |
| **MLG-04**| Zero Fabricated Metrics | Code audit of evaluation routes | All evaluation metrics (`accuracy`, `f1_score`, `roc_auc`, `mcc`) computed from genuine model predictions. |

---

## 5. Accessibility & UX Gates

| Gate ID | Quality Requirement | Verification Standard | Acceptance Criteria |
| :--- | :--- | :--- | :--- |
| **AG-01** | Keyboard Navigation | Manual TAB traversal | All interactive buttons, tabs, and form inputs reachable and activatable via keyboard. |
| **AG-02** | Visual Contrast & Typography | WCAG 2.2 AA Contrast Checker | Contrast ratio $\ge 4.5:1$ for normal text, $\ge 3:1$ for large headings and icons. |
| **AG-03** | Semantic Landmark Tagging | DOM Structure Audit | Correct usage of `<header>`, `<main>`, `<aside>`, `<nav>`, and `<section>` elements. |

---

## 6. Release & Deployment Gates

| Gate ID | Quality Requirement | Verification Standard | Acceptance Criteria |
| :--- | :--- | :--- | :--- |
| **DG-01** | Docker Compose Validation | `docker compose config` | Compose file parses cleanly with no syntax errors or unassigned variables. |
| **DG-02** | Container Network Isolation | Docker Compose inspection | PostgreSQL port 5432 is strictly confined to internal network, not exposed to host. |
| **DG-03** | Changelog & Version Sync | `CHANGELOG.md` & `pyproject.toml` | Release version numbers match across `config.py`, `package.json`, and `CHANGELOG.md`. |
