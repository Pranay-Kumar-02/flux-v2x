# FluxV2X Security Controls & Verification Matrix

This matrix maps foundational security requirements to their specific implementation modules, automated tests, and verification status.

---

## 1. Security Controls Mapping

| Control ID | Control Category | Requirement Description | Implementation Location | Verification Evidence | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | Authentication | Protected routes must require valid Bearer JWT. | `backend/app/api/deps.py` (`get_current_user`) | `test_unauthenticated_requests_rejected_with_401` | **Implemented & Tested** |
| **SEC-02** | Token Validation | Reject expired, malformed, or forged JWT tokens. | `backend/app/core/security.py` (`decode_token`) | `test_invalid_expired_and_forged_tokens_rejected_with_401` | **Implemented & Tested** |
| **SEC-03** | Inactive User Guard | Reject tokens for deactivated or deleted users. | `backend/app/api/deps.py` | `test_inactive_user_token_rejected_with_401` | **Implemented & Tested** |
| **SEC-04** | Password Security | Standard PBKDF2-HMAC-SHA256 with 100k rounds & 16B salt. | `backend/app/core/security.py` | Unit tests in `test_security_remediation.py` | **Implemented & Tested** |
| **SEC-05** | Workspace Isolation | Multi-tenant scoping on all dataset and model queries. | `backend/app/api/deps.py` (`get_current_workspace`) | `test_cross_workspace_isolation` | **Implemented & Tested** |
| **SEC-06** | Ownership Chain | Verify `DatasetVersion` $\to$ `Dataset` $\to$ `Workspace`. | All `/api/v1/*` routes | `test_dataset_version_ownership_enforcement` | **Implemented & Tested** |
| **SEC-07** | Fail-Closed Config | Halt production startup on default/weak secrets. | `backend/app/core/config.py` (`validate_security_invariants`) | `test_production_refuses_unsafe_secrets_fail_closed` | **Implemented & Tested** |
| **SEC-08** | Ingestion Bounds | 100MB streaming upload limit and path sanitization. | `backend/app/api/v1/datasets.py` (`upload_dataset`) | `test_ingestion_profiling.py` | **Implemented & Tested** |
| **SEC-09** | Baseline Integrity | Dual-gate poison prevention for adaptive baselines. | `backend/app/acafdm/engine.py` | `test_acafdm_poison_prevention_gate` | **Implemented & Tested** |
| **SEC-10** | ML Leakage Guard | Prohibit target column in ML feature selection sets. | `backend/app/api/v1/experiments.py` | `test_ml_target_leakage_prohibited` | **Implemented & Tested** |
| **SEC-11** | Container Isolation | PostgreSQL confined to internal bridge network. | `docker-compose.yml` (`fluxv2x-network`) | Compose syntax audit & network port check | **Implemented & Tested** |
| **SEC-12** | At-Rest Encryption | Transparent envelope encryption for Parquet storage. | Parquet filesystem storage | In development (Roadmap v0.3.0) | *Incomplete / Planned* |
| **SEC-13** | Rate Throttling | Ingress rate limiting on authentication routes. | Reverse proxy / Nginx | Documented in `DEPLOYMENT.md` | *External / Operational* |

---

## 2. Verification Protocol

All security controls are verified prior to each release using automated regression tests:
```bash
cd backend
uv run pytest tests/test_security_remediation.py -v
```
Any regression immediately fails the CI pipeline and blocks merging to `main`.
