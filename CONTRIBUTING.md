# Contributing to FluxV2X

Thank you for your interest in contributing to **FluxV2X — Context-Aware Network Security Platform**!

FluxV2X is built for software engineers, security analysts, and researchers worldwide. We hold our codebase to rigorous engineering standards: genuine implementation, zero fabricated evaluation metrics, deterministic testing, multi-tenant isolation, and explicit scientific provenance.

---

## 1. Code of Conduct
All contributors and maintainers are expected to adhere to our [Code of Conduct](CODE_OF_CONDUCT.md). Please report violations to [security@fluxv2x.org](mailto:security@fluxv2x.org).

---

## 2. Supported Development Environments

- **Operating Systems**: Linux (Ubuntu 22.04+), macOS (13+ Ventura/Sonoma), Windows 11 (native PowerShell or WSL2).
- **Python**: Python 3.11 or 3.12 (managed via `uv` or standard `python -m venv`).
- **Node.js**: Node.js 18.x or 20.x LTS with `npm` 9+.
- **Database**: PostgreSQL 15+ (production / containerized) or SQLite 3.38+ (local development).
- **Containerization**: Docker Engine 24.0+ and Docker Compose v2.20+.

---

## 3. Local Development Setup

### 3.1 Repository Cloning
```bash
git clone https://github.com/Pranay-Kumar-02/flux-v2x.git
cd flux-v2x
```

### 3.2 Backend Setup (Python)
We use `uv` for fast, deterministic dependency resolution:
```bash
cd backend

# Create virtual environment and synchronize dependencies
uv sync --extra dev

# Copy environment template if not present
cp ../.env.example .env

# Run database table initialization and development seed
uv run python -c "from app.db.init_db import init_database; init_database()"

# Execute tests to verify environment health
uv run pytest -v

# Start FastAPI development server
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 3.3 Frontend Setup (React / TypeScript)
```bash
cd ../frontend

# Install dependencies
npm install

# Start Vite dev server with Hot Module Replacement (HMR)
npm run dev

# Run static type checking and production build
npm run build
```

---

## 4. Architecture & Engineering Conventions

```
flux-v2x/
├── backend/
│   ├── app/
│   │   ├── acafdm/          # ACAFDM adaptive baseline engine & dual-gate
│   │   ├── api/             # FastAPI REST routers, deps, and validation
│   │   ├── core/            # Security (PyJWT, PBKDF2), settings & invariant validation
│   │   ├── db/              # SQLAlchemy sessions, base model, init logic
│   │   ├── ingestion/       # Polars data streaming, SHA-256, schema profiling
│   │   ├── ml/              # Scikit-learn pipelines, scenario splits, McNemar test
│   │   ├── models/          # Relational entities (User, Workspace, Dataset, Experiment, Job)
│   │   ├── schemas/         # Pydantic v2 request/response contracts
│   │   ├── simulation/      # Offline mitigation simulator (priority preservation, drop, rate limit)
│   │   └── workers/         # Asynchronous task runners, session lifecycle, cancellation
│   └── tests/               # Pytest suite (unit, integration, isolation regressions)
├── frontend/
│   ├── src/
│   │   ├── api/             # Typed API client, authentication tokens, workspace headers
│   │   ├── components/      # Reusable UI components (Sidebar, Header, Layout)
│   │   └── views/           # Views (Overview, Datasets, Context, Models, ACAFDM, Simulator)
```

### Architectural Principles:
1. **Multi-Tenant Isolation**: Never access a resource without verifying the chain of ownership (`DatasetVersion` $\to$ `Dataset` $\to$ `Workspace`).
2. **Fail-Closed Security**: Reject invalid tokens with HTTP 401. Reject cross-workspace requests with HTTP 403. Reject weak production secrets at startup.
3. **Non-Blocking Background Tasks**: Heavy computation (model fitting, ACAFDM simulation) must run asynchronously in worker pools, never blocking the synchronous HTTP request thread.
4. **Target Leakage Prohibition**: Feature lists must never contain the ground-truth target label column. Scalers and encoders must fit exclusively on training data.

---

## 5. How to Add New Capabilities

### 5.1 Adding a New Machine Learning Model
1. Open `backend/app/ml/trainers.py`.
2. Add your model initialization to `ModelTrainer.train_model(...)` under the appropriate `model_family` string.
3. Ensure hyperparameters are validated against permitted bounds.
4. Fit the estimator exclusively on `X_train` and record training/inference latency.
5. In `frontend/src/views/ModelLabView.tsx`, add the option to the model family dropdown.

### 5.2 Adding a New Mitigation Policy
1. Open `backend/app/simulation/simulator.py`.
2. Implement your defensive action in `MitigationSimulator.run_simulation(...)`.
3. Support parameterization (e.g., rate-limit ratios, priority preservation rules).
4. Return genuine drop counts, latency overhead estimates, and priority preservation rates.
5. Add unit tests in `backend/tests/test_acafdm_and_mitigation.py`.

### 5.3 Adding a Data Adapter or Parser
1. Open `backend/app/ingestion/profiler.py` and `backend/app/ingestion/readers.py`.
2. Implement safe parsing with streaming chunk bounds and path sanitization.
3. Validate that unsupported or corrupted files produce informative errors without crashing the server.

---

## 6. Testing & Quality Requirements

Before submitting code, ensure all quality gates pass:

```bash
# 1. Run all backend tests
cd backend
uv run pytest -v

# 2. Run backend type/lint checks (where configured)
uv run ruff check .

# 3. Run frontend type check and production build
cd ../frontend
npm run build
```

### Writing Deterministic Tests:
- Fix random seeds (`random_seed=42`) in ML tests.
- Use isolated temporary directories (`tmp_path`) for file uploads and database instances.
- Never rely on network availability or external third-party servers in unit tests.
- Add regression tests whenever resolving a bug or security issue.

---

## 7. Git Workflow & Commit Guidelines

### Branch Naming:
- `feature/description-of-feature`
- `fix/security-remediation-title`
- `docs/clarify-provenance`
- `refactor/worker-task-isolation`

### Commit Message Format:
We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:
```
<type>(<scope>): <short description in imperative present tense>

[optional body explaining motivation and architectural impact]

[optional footer referencing issue numbers]
```
Examples:
- `feat(ml): integrate XGBoost classifier with scenario split support`
- `fix(security): reject expired JWT tokens with HTTP 401`
- `test(isolation): add cross-workspace dataset access regression test`

---

## 8. Pull Request Submission Checklist

When opening a Pull Request, verify that you have:
- [ ] Read and followed this Contributing Guide and Code of Conduct.
- [ ] Added or updated unit/integration tests covering the change.
- [ ] Verified that `uv run pytest -v` passes with 100% success rate.
- [ ] Verified that `npm run build` completes with zero TypeScript errors.
- [ ] Avoided hardcoded production secrets, API keys, or mock evaluation metrics.
- [ ] Documented any new environment variables in `.env.example` and `docs/development/ENVIRONMENT.md`.
- [ ] Updated relevant user or architecture documentation.
