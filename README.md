# FluxV2X — Context-Aware Network Security Platform

> **Understand traffic. Detect anomalies. Protect communication.**

[![CI Quality Suite](https://github.com/Pranay-Kumar-02/flux-v2x/actions/workflows/ci.yml/badge.svg)](https://github.com/Pranay-Kumar-02/flux-v2x/actions/workflows/ci.yml)
[![Security Scan](https://github.com/Pranay-Kumar-02/flux-v2x/actions/workflows/security.yml/badge.svg)](https://github.com/Pranay-Kumar-02/flux-v2x/actions/workflows/security.yml)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Python Version](https://img.shields.io/badge/python-3.11%20%7C%203.12-blue)](backend/pyproject.toml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](frontend/package.json)
[![Status](https://img.shields.io/badge/Status-v0.2.0--Active_Development-orange)](CHANGELOG.md)

**FluxV2X** is an extensible data engineering and network security platform for structured-data analysis, contextual anomaly detection, reproducible machine-learning experiments, vehicular communication security, and offline defensive-policy evaluation.

Its general-purpose data and experiment infrastructure supports security engineers, researchers, developers, and infrastructure teams evaluating anomalous network traffic behavior under volatile spatiotemporal operating conditions.

---

## 1. The Problem FluxV2X Solves

Modern distributed communication networks—such as Vehicular Ad-Hoc Networks (VANETs), Cellular Vehicle-to-Everything (C-V2X), and critical infrastructure sensor meshes—exhibit extreme traffic volatility:

- **Benign Traffic Surges vs. Flooding Attacks**:
  During traffic congestion, road bottlenecks, and intersection queuing, vehicular packet transmission density surges naturally. Conventional static threshold anomaly detectors mistakenly classify these benign surges as distributed denial-of-service (DDoS) packet flooding attacks, leading to false-positive drops of safety-critical Basic Safety Messages (BSMs).
- **Context Blindness in Anomaly Detection**:
  Evaluating packet flow rates in isolation from spatial coordinates, receiver density, and local vehicular clustering results in inaccurate detection thresholds.
- **Adversarial Baseline Poisoning**:
  Naïve adaptive threshold detectors that update baselines without validation gates can be maliciously trained by attackers slowly escalating flooding rates over time.
- **The Research Reproducibility Crisis**:
  Security evaluations frequently suffer from target leakage (evaluating models on features containing ground-truth labels), invalid train/test splits that leak spatiotemporally adjacent vehicular flows, and fabricated evaluation claims.

FluxV2X solves these challenges by unifying columnar data streaming, destination-centric spatiotemporal clustering, contextual statistical z-score baselining, the dual-gate **ACAFDM** (Adaptive Context-Aware Malicious Flooding Detection and Mitigation) engine, and offline defensive policy simulation into an isolated, multi-tenant engineering platform.

---

## 2. Intended Users & Personas

- **Network Security Engineers**: Evaluating defensive policies, dynamic rate-limiting thresholds, and safety message priority preservation rules.
- **V2X & Automotive Cybersecurity Researchers**: Conducting rigorous, reproducible benchmarks, validating detection hypotheses, and calculating paired two-tailed McNemar statistical tests.
- **Data & Machine Learning Engineers**: Ingesting high-throughput network telemetry traces, profiling data quality, and training leakage-safe classification models.
- **Infrastructure & DevSecOps Teams**: Self-hosting an auditable, multi-tenant network telemetry inspection workstation.

---

## 3. Feature Status Matrix

| Capability | Module / Component | Status | Automated Test Evidence | Documentation |
| :--- | :--- | :--- | :--- | :--- |
| **Authentication & Tokens** | `backend/app/core/security.py` | `Implemented & Tested` | `test_security_remediation.py` | [Security Architecture](docs/security/SECURITY_CONTROLS.md) |
| **Multi-Tenant Isolation** | `backend/app/api/deps.py` | `Implemented & Tested` | `test_cross_workspace_isolation` | [Data Model](docs/architecture/DATA_MODEL.md) |
| **Streaming Ingestion (100MB)**| `backend/app/ingestion/` | `Implemented & Tested` | `test_ingestion_and_sha256` | [Data Provenance](docs/data/DATA_PROVENANCE.md) |
| **Truthful Research Provenance**| `backend/app/db/init_db.py` | `Implemented & Tested` | `test_synthetic_seed_truthfully_marked` | [Research Methodology](docs/research/VCN_METHODOLOGY.md) |
| **Spatiotemporal Clustering** | `backend/app/acafdm/engine.py` | `Implemented & Tested` | `test_spatiotemporal_clustering` | [VCN Methodology](docs/research/VCN_METHODOLOGY.md) |
| **Leakage-Safe ML Training** | `backend/app/ml/trainers.py` | `Implemented & Tested` | `test_ml_target_leakage_prohibited` | [Decision Records](docs/architecture/DECISION_RECORDS.md) |
| **Paired McNemar Significance** | `backend/app/ml/evaluation.py` | `Implemented & Tested` | `test_two_tailed_mcnemar_test` | [VCN Methodology](docs/research/VCN_METHODOLOGY.md) |
| **ACAFDM Dual-Gate Engine** | `backend/app/acafdm/engine.py` | `Implemented & Tested` | `test_acafdm_poison_prevention_gate` | [VCN Methodology](docs/research/VCN_METHODOLOGY.md) |
| **Offline Mitigation Simulator**| `backend/app/simulation/` | `Implemented & Tested` | `test_offline_mitigation_simulator` | [Product Overview](docs/product/PRODUCT_OVERVIEW.md) |
| **Async Task Management** | `backend/app/workers/` | `Implemented & Tested` | `test_background_job_lifecycle_and_cancellation` | [System Architecture](docs/architecture/SYSTEM_ARCHITECTURE.md) |
| **Interactive Web UI** | `frontend/src/*` | `Implemented & Tested` | `npm run build` (0 errors) | [Accessibility](ACCESSIBILITY.md) |
| **Distributed Celery Queue** | `backend/app/workers/` | `Partially Implemented` | In development (ThreadPool fallback active) | [Roadmap](docs/product/ROADMAP.md) |
| **Real-Time Streaming Sinks** | Kafka / eBPF Snort Sinks | `Planned (v0.4.0)` | Scheduled on Roadmap | [Roadmap](docs/product/ROADMAP.md) |

---

## 4. System Architecture

```mermaid
flowchart TB
    subgraph Client ["Client Presentation Tier (Browser)"]
        UI["React 18 + TypeScript SPA\n(Vite, TailwindCSS, Lucide)"]
        State["Client State & Auth Tokens\n(localStorage: JWT, WorkspaceId)"]
        UI <--> State
    end

    subgraph Gateway ["Ingress & Trust Boundary"]
        HTTPS["Reverse Proxy / Port 8000\n(TLS Termination, CORS, Rate Limits)"]
        AuthMid["Security Middleware\n(PyJWT HS256, Workspace RBAC Scoping)"]
    end

    subgraph Backend ["Application Tier (FastAPI + Asynchronous Engine)"]
        Router["API Router (/api/v1)"]
        DatasetSvc["Ingestion & Polars Profiler\n(100MB Stream Limit, SHA-256)"]
        ContextSvc["Spatiotemporal Context Explorer\n(K-Means, Localized Baselines)"]
        MLEngine["ML Experiment Engine\n(RF, GBDT, MLP, DT, LR)"]
        ACAFDMSvc["ACAFDM Adaptive Engine\n(Dual-Gate Poison Gate)"]
        SimSvc["Mitigation Simulator\n(Drop, Rate Limit, Priority)"]
        WorkerPool["TaskRunner Worker Pool\n(ThreadPoolExecutor, Isolated DB Sessions)"]
    end

    subgraph Persistence ["Persistence Tier"]
        DB[(PostgreSQL / SQLite\nRelational Metadata & Audit Trail)]
        ParquetStore[("Parquet File Storage\n(data/datasets/ - SHA-256 Verified)")]
        ModelStore[("Model Artifact Storage\n(data/models/ - Serialized Estimators)")]
    end

    Client -->|HTTPS / REST API| HTTPS
    HTTPS --> AuthMid
    AuthMid --> Router
    Router --> DatasetSvc
    Router --> ContextSvc
    Router --> MLEngine
    Router --> ACAFDMSvc
    Router --> SimSvc

    MLEngine -->|Submit Async Task| WorkerPool
    WorkerPool -->|Isolated DB Session| DB
    WorkerPool -->|Save Artifact| ModelStore

    DatasetSvc -->|Read/Write Columnar Data| ParquetStore
    DatasetSvc -->|Persist Lineage & Metadata| DB
```

---

## 5. Primary Code Modules

- [`backend/app/acafdm/`](file:///backend/app/acafdm): Adaptive Context-Aware Malicious Flooding Detection engine, destination-centric K-Means clustering, and dual-gate poison prevention.
- [`backend/app/api/`](file:///backend/app/api): FastAPI REST routers, dependencies, and strict multi-tenant chain-of-custody authorization.
- [`backend/app/core/`](file:///backend/app/core): Security primitives (PyJWT HS256, PBKDF2-HMAC-SHA256) and fail-closed production settings validation.
- [`backend/app/ingestion/`](file:///backend/app/ingestion): Streaming file upload handler, SHA-256 digest computation, and Polars statistical profiler.
- [`backend/app/ml/`](file:///backend/app/ml): Estimator trainers, leakage-safe scenario/temporal splits, and paired McNemar significance testing.
- [`backend/app/simulation/`](file:///backend/app/simulation): Offline mitigation simulator evaluating packet drop, rate limiting, and priority preservation policies.
- [`backend/app/workers/`](file:///backend/app/workers): Asynchronous `TaskRunner` pool, background job tracking, and cooperative task cancellation.
- [`frontend/src/`](file:///frontend/src): React/TypeScript web application, views, API client, and accessible components.

---

## 6. System Requirements & Runtime Prerequisites

- **Supported Operating Systems**: Linux (Ubuntu 22.04 LTS+, Debian 12+, RHEL 9+), macOS (13+ Ventura/Sonoma), Windows 11 (native PowerShell or WSL2).
- **Python**: Python 3.11 or 3.12 (managed via `uv`).
- **Node.js**: Node.js 18.x or 20.x LTS with `npm` 9+.
- **Database**: PostgreSQL 15+ (production / containerized) or SQLite 3.38+ (local development).
- **Containerization**: Docker Engine 24.0+ and Docker Compose v2.20+.

---

## 7. Installation & Quick Start

### 7.1 Local Development Workflow

#### Step 1: Clone the Repository
```bash
git clone https://github.com/Pranay-Kumar-02/flux-v2x.git
cd flux-v2x
```

#### Step 2: Set Up Backend Environment
```bash
cd backend

# Install dependencies deterministically via uv
uv sync --extra dev

# Initialize database tables and seed development fixture
uv run python -c "from app.db.init_db import init_database; init_database()"

# Execute tests to verify environment health
uv run pytest -v

# Start FastAPI development server
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

#### Step 3: Set Up Frontend Environment
In a separate terminal:
```bash
cd frontend

# Install npm packages
npm install

# Start Vite development server
npm run dev
```
Open your browser to `http://127.0.0.1:5173`.

---

### 7.2 Docker-Based Deployment

Docker Compose launches the complete containerized stack (PostgreSQL, Redis, FastAPI, and Nginx-served frontend bundle):

```bash
# 1. Generate required secrets in .env
cat <<EOF > .env
POSTGRES_USER=fluxv2x_user
POSTGRES_PASSWORD=$(openssl rand -hex 24)
POSTGRES_DB=fluxv2x_db
SECRET_KEY=$(openssl rand -hex 32)
ENVIRONMENT=production
DEBUG=false
ALLOWED_ORIGINS=http://localhost,http://localhost:80
ENABLE_DEV_BOOTSTRAP=false
AUTO_LOAD_DEMO_DATASET=false
EOF

# 2. Build and launch services in background
docker compose up -d --build

# 3. Verify container health
docker compose ps
docker compose logs -f backend
```

Access the application at `http://localhost`.

---

## 8. Required Environment Variables

| Variable | Default (Dev) | Production Requirement | Purpose |
| :--- | :--- | :--- | :--- |
| `ENVIRONMENT` | `development` | `production` | Deployment mode. Production activates fail-closed checks. |
| `DEBUG` | `False` | **Must be `False`** | FastAPI debug mode. |
| `SECRET_KEY` | `fluxv2x-dev-local...` | **Must be $\ge 32$ chars** | Cryptographic secret for signing JWT tokens. |
| `DATABASE_URL`| `sqlite:///./fluxv2x.db`| `postgresql://user:pass@host:5432/db` | Relational database connection string. |
| `ALLOWED_ORIGINS` | `http://localhost:5173,...` | Explicit domain list | CORS allowed origins. |
| `ENABLE_DEV_BOOTSTRAP` | `False` | **Must be `False`** | Disables seed superuser creation in production. |
| `AUTO_LOAD_DEMO_DATASET` | `False` | **Must be `False`** | Disables automatic demo data loading in production. |

---

## 9. Verification, Quality & Testing Commands

All quality gates must pass before submitting contributions or releasing software:

```bash
# 1. Run full backend pytest suite (100% pass rate requirement)
cd backend
uv run pytest -v

# 2. Run security regression tests specifically
uv run pytest tests/test_security_remediation.py -v

# 3. Run frontend TypeScript type-check and Vite production build
cd ../frontend
npm run build

# 4. Verify Docker Compose configuration syntax
docker compose config
```

---

## 10. Core Workflows & Operational Guides

### 10.1 Dataset Ingestion & Schema Mapping
1. Navigate to **Dataset Library** in the web dashboard.
2. Click **Upload Telemetry Dataset** and select a `.parquet`, `.csv`, or `.json` file ($\le 100\text{MB}$).
3. The platform computes a streaming SHA-256 digest and automatically profiles null counts, data types, and numeric distributions.
4. Navigate to **Schema & Feature Lab** to map raw attributes to canonical VCN entities (`packet_rate`, `receiver_id`, `x_coord`, `y_coord`, `label`).

### 10.2 Launching Machine Learning Experiments
1. Open the **Model Laboratory**.
2. Select your registered dataset version and designated canonical feature set.
3. Choose an estimator family: `Random Forest`, `Gradient Boosting`, `Decision Tree`, `Logistic Regression`, or `Multi-Layer Perceptron`.
4. Select a partition split strategy: `scenario_stratified` (prevents spatiotemporal cross-scenario leakage) or `chronological`.
5. Click **Launch Model Training**. The task executes asynchronously via the background `TaskRunner`.
6. Inspect genuine confusion matrices, accuracy, precision, recall, F1 score, and ROC-AUC.

### 10.3 Statistical Benchmarking (Paired McNemar Test)
1. Open the **Benchmark Center**.
2. Select two trained models (e.g., Random Forest vs. Gradient Boosting) evaluated on the identical test split.
3. Click **Compute Paired McNemar Test**.
4. The system calculates a 2x2 contingency matrix of discordant observations ($b$ and $c$) and computes the chi-square statistic:
   $$\chi^2 = \frac{(|b - c| - 1)^2}{b + c}$$
5. A resulting $p$-value $< 0.05$ proves the performance difference is statistically significant.

### 10.4 ACAFDM & Mitigation Simulation
1. Open the **ACAFDM Engine**.
2. Configure parameters: Cluster Count ($k=4$), Z-Score Threshold ($Z_{thresh}=2.5$), Persistence Streak ($K=3$), and EMA Rate ($\alpha=0.1$).
3. Ensure **Dual-Gate Poison Prevention** is active.
4. Click **Run ACAFDM Anomaly Evaluation**. Inspect chronological decision traces showing accepted benign updates versus blocked poisoning attempts.
5. In the **Mitigation Simulator**, evaluate defensive policies (`selective_rate_limiting`, `packet_drop`, `priority_preservation`) and analyze dropped packets versus preserved safety communications.

---

## 11. API Documentation & Health Checks

When the backend is running, interactive API documentation is accessible at:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **Health Check Endpoint**: `http://localhost:8000/api/v1/health`
- **System Statistics**: `http://localhost:8000/api/v1/health/stats`

---

## 12. Documentation Index

Comprehensive engineering, architectural, and operational documentation is maintained under `docs/`:

- [Product Overview](docs/product/PRODUCT_OVERVIEW.md)
- [System Architecture](docs/architecture/SYSTEM_ARCHITECTURE.md)
- [Data Model & Entities](docs/architecture/DATA_MODEL.md)
- [REST API Specification](docs/architecture/API_DESIGN.md)
- [Architecture Decision Records (ADRs)](docs/architecture/DECISION_RECORDS.md)
- [Truthful Implementation Plan](docs/plan/IMPLEMENTATION_PLAN.md)
- [Quality Gates & Acceptance Criteria](docs/plan/QUALITY_GATES.md)
- [VCN Research Methodology & Mathematics](docs/research/VCN_METHODOLOGY.md)
- [Data Ingestion & Provenance Policy](docs/data/DATA_PROVENANCE.md)
- [Testing Strategy & Test Layers](docs/development/TESTING.md)
- [Environment Configuration & Invariant Rules](docs/development/ENVIRONMENT.md)
- [Deployment Runbook](docs/operations/DEPLOYMENT.md)
- [Backup & Disaster Recovery Procedures](docs/operations/BACKUP_AND_RECOVERY.md)
- [Troubleshooting & Diagnostics Guide](docs/operations/TROUBLESHOOTING.md)
- [Security Threat Model (STRIDE)](docs/security/THREAT_MODEL.md)
- [Security Controls & Verification Matrix](docs/security/SECURITY_CONTROLS.md)
- [Release Management & Engineering Process](docs/releases/RELEASE_PROCESS.md)
- [GitHub Repository Settings Checklist](docs/operations/REPOSITORY_SETTINGS_CHECKLIST.md)
- [Product Roadmap](docs/product/ROADMAP.md)

---

## 13. Known Limitations & Prerequisites

- **Structured Trace Ingestion**: FluxV2X processes structured telemetry files (`.parquet`, `.csv`, `.json`). It does not include an in-line kernel packet capture driver (e.g., live raw socket `libpcap` tap).
- **Asynchronous Processing in Docker**: Local single-node development uses an in-process threadpool worker. Distributed multi-node Celery queue deployments are under active development for v0.3.0.
- **Mendeley Dataset Retrieval**: To evaluate the published Mendeley dataset ([DOI: 10.17632/2jvknhv465.1](https://doi.org/10.17632/2jvknhv465.1)), the archive must be retrieved and imported via `backend/app/ingestion/mendeley_downloader.py`.

---

## 14. Governance, Community & Vulnerability Disclosure

- **Contributing**: Please review [CONTRIBUTING.md](CONTRIBUTING.md) for pull request guidelines, coding standards, and branch policies.
- **Code of Conduct**: All participants are expected to adhere to the [Contributor Covenant v2.1](CODE_OF_CONDUCT.md).
- **Reporting Vulnerabilities**: Do not disclose security vulnerabilities in public issues. Please report security defects privately via [GitHub Vulnerability Reporting](https://github.com/Pranay-Kumar-02/flux-v2x/security/advisories/new) or email [security@fluxv2x.org](mailto:security@fluxv2x.org). See [SECURITY.md](SECURITY.md) for details.
- **Support & Discussions**: Join community discussions in [GitHub Discussions](https://github.com/Pranay-Kumar-02/flux-v2x/discussions) or consult [SUPPORT.md](SUPPORT.md).
- **Accessibility**: We target WCAG 2.2 Level AA. Review our [Accessibility Statement](ACCESSIBILITY.md).
- **Citation**: If you reference FluxV2X in research, please cite using [CITATION.cff](CITATION.cff).
- **License**: FluxV2X is open-source software licensed under the [Apache License 2.0](LICENSE). Third-party software notices are documented in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
