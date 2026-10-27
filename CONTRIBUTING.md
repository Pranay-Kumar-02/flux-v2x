# Contributing to FluxV2X

Thank you for your interest in contributing to FluxV2X! We welcome contributions from researchers, security engineers, and software architects.

## Development Workflow

1. Fork the repository and create your branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Backend Development:
   ```powershell
   cd backend
   uv sync --extra dev
   uv run pytest -v
   uv run uvicorn app.main:app --reload
   ```

3. Frontend Development:
   ```powershell
   cd frontend
   npm install
   npm run dev
   npm run build
   ```

4. Code Style & Integrity:
   - Run pytest before submitting any PR: `uv run pytest -v`
   - Run the frontend build: `npm run build`
   - Maintain the Zero Fabrication Principle: Never commit hardcoded metrics or mock charts in production paths.

## Pull Request Guidelines
- Provide a clear description of the research methodology or engineering capability added.
- Include automated tests in `backend/tests/` or frontend tests where applicable.
- Ensure all CI checks pass.
