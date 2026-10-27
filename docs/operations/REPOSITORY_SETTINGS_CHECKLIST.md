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

### 2.1 Branch Protection / Repository Rulesets (`Settings > Rules > Rulesets` or `Settings > Branches`)
For target branch `main`:
- [ ] **Require a pull request before merging**: Prevent direct pushes to `main`.
- [ ] **Require approvals**: Set to 1 review approval (or allow maintainer bypass if single-maintainer model).
- [ ] **Require conversation resolution**: Require all conversation threads to be resolved prior to merging.
- [ ] **Require status checks to pass before merging**:
  - `Backend Pytest & Quality Suite (3.11)`
  - `Backend Pytest & Quality Suite (3.12)`
  - `Frontend TypeScript & Production Build`
  - `Docker Compose Syntax & Configuration Verification`
  - `CodeQL Static Security Analysis`
  - `Dependency Review`
- [ ] **Require branches to be up to date before merging**: Enforce testing against latest `main` commit.
- [ ] **Do not allow force pushes**: Block `git push --force`.
- [ ] **Do not allow deletions**: Prevent accidental branch deletion.

### 2.2 Security & Analysis (`Settings > Code security and analysis`)
- [ ] **Private vulnerability reporting**: Enabled (allows external researchers to privately disclose vulnerabilities).
- [ ] **Dependency graph**: Enabled (prerequisite for Dependabot and Dependency Review Action).
- [ ] **Dependabot alerts**: Enabled.
- [ ] **Dependabot security updates**: Enabled.
- [ ] **Secret scanning**: Enabled.
- [ ] **Secret scanning push protection**: Enabled (blocks pushes containing credentials).

### 2.3 General Repository Settings (`About` section and `Settings > General`)
- [ ] **Repository Description** (in the GitHub `About` cog on repository home):
  `An extensible network security platform for contextual anomaly detection, reproducible ML experiments, vehicular communication analysis, and defensive-policy simulation.`
- [ ] **Topics** (11 official topics):
  `network-security`, `cybersecurity`, `anomaly-detection`, `machine-learning`, `vehicular-networks`, `data-engineering`, `research-platform`, `fastapi`, `react`, `python`, `typescript`
- [ ] **Website URL**: Leave empty unless an active production deployment URL exists (do not invent placeholder domains).
- [ ] **Pull Requests**: Enable "Automatically delete head branches" upon merge.
- [ ] **Discussions**: Enabled for community Q&A and architecture discussions.
