# GitHub Repository Settings & Governance Checklist

Certain security policies, access controls, and repository settings cannot be configured solely via committed repository files and require administrative actions in the GitHub web interface.

This checklist distinguishes **automated repository configurations** from **manual owner actions** required by the repository administrator (`@Pranay-Kumar-02`).

---

## 1. Verified Automated Configurations (Configured via Code)

- [x] **Continuous Integration Workflows**: `.github/workflows/ci.yml` validates backend tests across Python 3.11/3.12, frontend builds, and Docker compose syntax.
- [x] **Static Security Scanning (CodeQL)**: `.github/workflows/security.yml` configured for weekly and push-triggered AST vulnerability analysis.
- [x] **Automated Dependency Updates**: `.github/dependabot.yml` configured for weekly PRs across GitHub Actions, pip, and npm.
- [x] **Issue & Pull Request Templates**: Standardized bug report, feature request, and PR templates in `.github/`.
- [x] **Issue Routing Config**: Security vulnerabilities redirected to private channels via `.github/ISSUE_TEMPLATE/config.yml`.
- [x] **Code Ownership Rules**: Explicit ownership assigned in `.github/CODEOWNERS`.
- [x] **Authoritative Software License**: Full Apache License 2.0 text in `LICENSE`.

---

## 2. GitHub UI Settings Requiring Owner Action

The repository owner must verify or configure the following settings under `https://github.com/Pranay-Kumar-02/flux-v2x/settings`:

### 2.1 Branch Protection / Repository Rulesets (`Settings > Branches`)
For branch `main`:
- [ ] **Require a pull request before merging**: Prevent direct pushes to `main`.
- [ ] **Require approvals**: Set to at least 1 review approval.
- [ ] **Require status checks to pass before merging**:
  - `Backend Pytest & Quality Suite (3.11)`
  - `Backend Pytest & Quality Suite (3.12)`
  - `Frontend TypeScript & Production Build`
  - `Docker Compose Syntax & Configuration Verification`
- [ ] **Require branches to be up to date before merging**: Enforce rebase or fast-forward merges.
- [ ] **Do not allow force pushes**: Block `git push --force`.
- [ ] **Do not allow deletions**: Prevent accidental branch deletion.

### 2.2 Security & Analysis (`Settings > Code security and analysis`)
- [ ] **Private vulnerability reporting**: Enable to allow external security researchers to privately disclose vulnerabilities without public issues.
- [ ] **Dependency graph**: Enabled (required for Dependabot).
- [ ] **Dependabot alerts**: Enabled.
- [ ] **Dependabot security updates**: Enabled.
- [ ] **Secret scanning**: Enabled (detects accidentally committed tokens).
- [ ] **Secret scanning push protection**: Enabled (blocks pushes containing recognized credential patterns).

### 2.3 General Repository Settings (`Settings > General`)
- [ ] **Repository Description**:
  `FluxV2X: An extensible data engineering and network security platform for structured-data analysis, contextual anomaly detection, reproducible ML experiments, and vehicular communication security.`
- [ ] **Website URL**: `https://github.com/Pranay-Kumar-02/flux-v2x`
- [ ] **Topics**: `network-security`, `v2x`, `anomaly-detection`, `acafdm`, `machine-learning`, `reproducible-research`, `vanet`, `data-engineering`.
- [ ] **Pull Requests**: Enable "Automatically delete head branches" upon merge.
- [ ] **Discussions**: Enable GitHub Discussions for community Q&A and architecture discussions.
