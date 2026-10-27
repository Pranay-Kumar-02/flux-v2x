# FluxV2X — Initial Repository Audit & Implementation Blueprint

**Date:** October 2026  
**Auditor:** Principal Software Architect & Lead Security/ML Engineer  
**Document ID:** `docs/initial-audit.md`  
**Target Repository:** `flux-v2x` (FluxV2X)  
**Research Framework:** Adaptive Context-Aware Malicious Flooding Detection and Mitigation (ACAFDM)  
**Primary Reference:** Khan, M. D., Nnamoko, N., Rafiq, H., and Abubahia, A., *"Congestion-context-aware spatiotemporal detection of malicious flooding in vehicular communication networks,"* Vehicular Communications, 60 (2026), Article 101045. DOI: `10.1016/j.vehcom.2026.101045`.  
**Primary Dataset:** *"A spatiotemporal, congestion-context-aware vehicular communication dataset for malicious flooding attack analysis,"* Mendeley Data, version 1. DOI: `10.17632/2jvknhv465.1`.

---

## 1. Executive Summary & Existing State Inspection

A thorough inspection of the workspace (`c:\Users\PRANAY KUMAR\OneDrive\Desktop\FluxV2X`) was performed.

### 1.1 Verified Capabilities & Current State
* **Workspace Status:** Greenfield workspace. Prior to initialization, no code files, legacy prototypes, mock frontend templates, or partial Python scripts were present.
* **Environment Toolchain Verified:**
  * **Python:** `3.12.5` (64-bit Windows)
  * **uv:** `0.12.12` installed and available on PATH
  * **Node.js:** `v22.20.0`
  * **npm:** `10.9.3`
  * **Git:** `2.54.0.windows.1` initialized on `main` branch.
* **Baseline Integrity:** There are zero legacy mock endpoints or fake frontend charts to dismantle. We have a pristine environment to construct the complete, scientifically defensible platform adhering strictly to the Master Engineering Directive.

---

## 2. Feature Status Matrix

| Module / Component | Status | Verified Capabilities / Gaps | Action Required |
|---|---|---|---|
| **Data Ingestion Engine** | Missing | No parser for CSV, TSV, JSON, JSONL, Parquet, XLSX | Build pluggable streaming/chunked ingestion with format sniffers |
| **Data Profiler & Validator** | Missing | No schema inference, type checks, missing-value or class balance analysis | Build Polars/DuckDB-backed profiling with cryptographic fingerprinting |
| **Schema Mapping & Feature Lab** | Missing | No schema normalization or VCN adapter mapping | Implement normalized schema contract with domain adapters |
| **Base Paper Pipeline (Khan et al. 2026)** | Missing | No spatiotemporal clustering, session/RX-window aggregation, Z-scores | Implement exact destination-centric spatiotemporal clustering, baseline calculation, and deviation features |
| **Baseline & ML Models** | Missing | No classifier implementations or benchmark pipeline | Implement Global Threshold, Raw GB, Contextual GB, RF, Extra Trees, AdaBoost, DT, KNN, LR, SVC (RBF/Linear) |
| **ACAFDM Adaptive Engine** | Missing | No adaptive rolling baseline, confidence/persistence, or mitigation | Implement rolling baseline updater with benign validation gate, leaky-bucket/k-consecutive persistence policy |
| **Mitigation Simulator** | Missing | No traffic deprioritization or selective rate-limiting simulation | Build isolated simulator measuring throughput, drops, and impact on benign vs malicious traffic |
| **Experiment Center & History** | Missing | No persistent runs, metrics, confusion matrices, or artifacts | Implement SQLite/PostgreSQL experiment persistence with JSON/Parquet artifact storage |
| **REST API Layer** | Missing | No FastAPI routes, Pydantic schemas, or health checks | Implement versioned FastAPI application with OpenAPI specs and typed responses |
| **Frontend Workstation** | Missing | No UI components or data visualizations | Build Vite + React + TypeScript + Tailwind + ECharts workstation |
| **Test Suite & CI** | Missing | No pytest, Vitest, or integration tests | Add comprehensive unit, integration, and statistical validation tests |

---

## 3. Critical Risks: Security, Data Integrity, Methodology & Performance

### 3.1 Research Methodology & Leakage Risks
* **Data Leakage in Spatiotemporal Splitting:** Random row-level splitting leaks receiver trajectory context and session states between train and test folds. Splitting must be performed along scenario, simulation run, or disjoint time-spatial blocks.
* **Normalization & Clustering Leakage:** Spatiotemporal cluster assignments and cluster-specific baseline statistics ($\mu_c, \sigma_c$) must be computed strictly on the training partition and applied to validation/test partitions without test-label leakage.
* **Baseline Poisoning in Online Updates:** The ACAFDM adaptive baseline engine must only ingest observations passing an explicit benign-validation policy. Updating baselines on unverified traffic allows flooding attacks to gradually shift the baseline (concept drift exploitation).
* **Statistical Rigor:** Statistical comparisons between non-contextual and contextual models must use two-tailed McNemar's tests on paired test predictions, reporting exact $p$-values and contingency tables.

### 3.2 Data Integrity & Security Risks
* **Unbounded File Uploads:** Uploaded datasets must have bounded sizes, validated MIME types, safe sanitized file paths, and protection against zip-slip / traversal attacks.
* **No Dynamic Code Execution:** All data transformations and feature mappings must execute via declared, validated configuration schemas, never using `eval()` or arbitrary Python execution.
* **Zero Fabrication Principle:** The platform must never invent coordinates, simulate network packets with fake random walks, or present placeholder graphs as empirical results.

### 3.3 Performance & Scalability Risks
* **Memory Exhaustion on Large Traces:** Million-row packet traces cannot be held naively in Python memory. Processing will utilize columnar storage (Parquet), DuckDB/Polars streaming execution, and server-side pagination for UI browsing.
* **Synchronous Long-Running Jobs:** Model training and heavy clustering must run asynchronously with persistent job tracking, progress state, and non-blocking API interactions.

---

## 4. Architectural Blueprint

```
FluxV2X/
├── backend/
│   ├── app/
│   │   ├── api/             # FastAPI routers (datasets, schemas, experiments, models, acafdm, simulator, health)
│   │   ├── core/            # Config, security, database session, logging
│   │   ├── db/              # SQLAlchemy models, SQLite/PostgreSQL persistence
│   │   ├── ingestion/       # Pluggable data parsers (CSV, TSV, JSON, JSONL, Parquet, XLSX)
│   │   ├── profiling/       # Column profiling, type inference, class imbalance, leakage detection
│   │   ├── schema/          # Normalized schema definitions, domain adapters (VCN, generic tabular)
│   │   ├── research/
│   │   │   ├── base_paper/  # Khan et al. (2026): Destination-centric clustering, RX-window, Z-scores
│   │   │   ├── acafdm/      # Adaptive baseline updater, benign gate, persistence policy
│   │   │   ├── models/      # Classifiers: Global threshold, Raw GB, Contextual GB, RF, ET, AB, DT, KNN, LR, SVC
│   │   │   ├── evaluation/  # Metrics, confusion matrices, ROC/PR, McNemar test, ablation
│   │   │   └── simulator/   # Selective rate-limiting & deprioritization simulator
│   │   └── tasks/           # Background job execution runner
│   ├── tests/               # Comprehensive pytest test suite
│   └── pyproject.toml       # Locked python dependencies via uv
├── frontend/
│   ├── src/
│   │   ├── api/             # Typed API clients for backend
│   │   ├── components/      # UI components (Design system, navigation, data tables, modals)
│   │   ├── views/           # Research Workstation views (Command Center, Datasets, Feature Lab, Context Explorer, Model Lab, ACAFDM, Simulator, Results)
│   │   ├── lib/             # ECharts configurations, formatting, utility helpers
│   │   └── types/           # Strict TypeScript interfaces matching backend Pydantic models
│   ├── package.json
│   └── vite.config.ts
├── data/                    # Storage directory for uploaded/curated datasets & parquets
├── artifacts/               # Persistent experiment artifacts (models, metrics, predictions, reports)
├── docs/                    # Architectural specs, methodology docs, user guides
└── docker-compose.yml       # Production/reproducibility container setup
```

---

## 5. Prioritized Implementation Plan

1. **Phase 1: Reliable Foundations**
   * Initialize Python project with `pyproject.toml` (FastAPI, Polars, DuckDB, scikit-learn, SQLAlchemy, Pydantic, etc.).
   * Create database persistence engine, schema migrations, and core configuration.
   * Implement pluggable ingestion engine (CSV, TSV, JSON, JSONL, Parquet, XLSX) with format sniffing and cryptographic hashing.
   * Build dataset profiler (type detection, missing values, class distributions, leakage warning indicators).
2. **Phase 2: Research Data Pipeline & Base Paper (Khan et al. 2026)**
   * Implement VCN domain schema adapter.
   * Implement destination-centric spatiotemporal clustering with automatic or configured cluster count ($k$).
   * Implement transmitter-receiver session aggregation and receiver-window (RX-window) construction.
   * Implement localized baseline statistics ($\mu_c, \sigma_c$) and metric-specific Z-score anomaly features.
   * Provide curated sample dataset conforming to Mendeley Data 2jvknhv465.1 structure for instant reproducibility.
3. **Phase 3: Baseline & Contextual Experiments Engine**
   * Implement all 10 model families: Global Rate Threshold, Raw Gradient Boosting, Contextual Gradient Boosting, Random Forest, Extra Trees, AdaBoost, Decision Tree, KNN, Logistic Regression, Linear SVC, RBF SVC.
   * Implement leakage-free scenario/temporal train-val-test split strategy.
   * Build paired evaluation engine with McNemar's test, confusion matrices, ROC-AUC, PR-AUC, macro-F1, and malicious-class F1.
4. **Phase 4: ACAFDM Engine & Mitigation Simulator**
   * Implement adaptive rolling baseline with benign validation policy gate.
   * Implement multi-step confidence and persistence policy ($k$-consecutive anomalies, leaky-bucket).
   * Implement selective rate limiting and traffic deprioritization simulator with legitimate vs malicious impact metrics.
5. **Phase 5: Full-Stack Integration & Polished Frontend Workstation**
   * Build Vite + React + TypeScript + Tailwind CSS workstation matching research command center visual direction (graphite/teal/amber/red palette, responsive, accessible).
   * Connect all 10 application areas to live backend endpoints.
   * Integrate Apache ECharts for interactive spatiotemporal maps, ROC/PR curves, confusion matrices, and ablation comparisons.
6. **Phase 6 & 7: Test Hardening, CI, Documentation & Packaging**
   * Run backend pytest suite with 100% passing tests covering formulas, ingestion, leakage, models, and ACAFDM logic.
   * Verify frontend build, TypeScript types, and unit tests.
   * Document complete reproducible setup in README.md, model cards, methodology docs, and Dockerfile/docker-compose.
