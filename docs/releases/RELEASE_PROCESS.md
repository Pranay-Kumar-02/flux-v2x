# FluxV2X Release Management & Engineering Process

This document defines the release engineering process, versioning rules, quality gates, and rollback procedures for the FluxV2X platform.

---

## 1. Versioning Standard

FluxV2X strictly adheres to [Semantic Versioning 2.0.0](https://semver.org/):
$$\text{MAJOR}.\text{MINOR}.\text{PATCH}$$

- **MAJOR**: Incompatible API breaks, database schema changes requiring manual non-backward-compatible migration, or architectural overhauls.
- **MINOR**: New functional capabilities, additional machine learning models, new mitigation policies, or backward-compatible schema additions.
- **PATCH**: Backward-compatible bug fixes, security remediations, documentation clarifications, and dependency patches.

*Pre-Release Policy*: While the platform is undergoing active pre-1.0 stabilization, releases use `0.x.y` to indicate iterative evolution prior to long-term API freezing.

---

## 2. Release Candidate Preparation Checklist

Before cutting a release tag, the release manager must complete the following verification steps:

### 2.1 Quality & Verification Gates
1. [ ] **Backend Test Suite**: `uv run pytest -v` must pass 100% (zero failures, zero unexpected errors).
2. [ ] **Frontend Build**: `npm run build` in `frontend/` must compile cleanly with zero TypeScript errors.
3. [ ] **Security Regressions**: `uv run pytest tests/test_security_remediation.py -v` passes completely.
4. [ ] **Docker Compose Verification**: `docker compose config` validates with no syntax errors.
5. [ ] **No Secret Leaks**: CodeQL analysis and git log audits confirm no committed credentials.

### 2.2 Version Synchronization
Synchronize version strings across the following files:
- `backend/app/core/config.py`: `VERSION = "X.Y.Z"`
- `backend/pyproject.toml`: `version = "X.Y.Z"`
- `frontend/package.json`: `"version": "X.Y.Z"`
- `frontend/src/components/Sidebar.tsx`: `"vX.Y.Z"`
- `CITATION.cff`: `version: X.Y.Z`

### 2.3 Documentation Updates
- Update `CHANGELOG.md` moving relevant items from `[Unreleased]` to `[X.Y.Z] - YYYY-MM-DD`.
- Verify that `THIRD_PARTY_NOTICES.md` reflects any new dependencies added.

---

## 3. Tagging & Publication Procedure

1. Commit version synchronization and changelog updates:
   ```bash
   git add -A
   git commit -m "chore(release): prepare release vX.Y.Z"
   ```
2. Create an annotated and signed Git tag:
   ```bash
   git tag -a vX.Y.Z -m "FluxV2X Release vX.Y.Z"
   ```
3. Push tag to the canonical GitHub repository:
   ```bash
   git push origin main --tags
   ```
4. GitHub Actions workflow `.github/workflows/release.yml` will automatically build the release assets (`fluxv2x-frontend-dist.tar.gz`) and publish the release notes.

---

## 4. Rollback Precautions & Post-Release Verification

### 4.1 Post-Release Verification
- Test deployment using `docker compose up -d --build`.
- Run health check: `curl http://localhost:8000/api/v1/health`.
- Execute a sample dataset upload and run an experiment to ensure end-to-end functionality.

### 4.2 Rollback Procedure
If a critical defect or security vulnerability is identified post-release:
1. Revert to the previous stable release commit or tag:
   ```bash
   git checkout tags/vPREVIOUS -b hotfix/rollback-vX.Y.Z
   ```
2. Deploy the previous container images.
3. If database migrations were executed, restore the database from the pre-release backup (see `BACKUP_AND_RECOVERY.md`).
4. Issue a security advisory and release a subsequent patch release (`vX.Y.Z+1`).
