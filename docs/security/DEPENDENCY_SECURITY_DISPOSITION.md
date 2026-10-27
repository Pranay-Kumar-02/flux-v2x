# FluxV2X — Tracked Dependency Security Disposition

This document provides an authoritative, evidence-based audit and tracking matrix for all open Dependabot security advisories within the FluxV2X repository.

---

## Executive Summary & Architectural Scope

FluxV2X differentiates between **Development-Only Dependencies** and **Production Runtime Dependencies**:

1. **Development-Only Dependencies (`devDependencies`)**:
   - The React/TypeScript frontend uses `vite` and `esbuild` strictly as build-time tooling (`tsc -b && vite build`).
   - In production environments (as defined in `docker-compose.yml`), the application builds ahead-of-time into purely static compiled assets (`dist/`), which are served directly by an unprivileged Nginx web server or reverse proxy.
   - The Vite development server, local Node.js runtime, development websockets, and `launch-editor` middleware are **never executed or deployed in production**.

2. **Production Runtime Dependencies (`dependencies`)**:
   - Direct runtime frontend dependencies consist of `react`, `react-dom`, `echarts`, `echarts-for-react`, `lucide-react`, and CSS utilities.
   - All runtime third-party code executes client-side within the user's browser without privileged OS or filesystem access.

---

## Detailed Vulnerability & Risk Tracking Matrix

| Alert # | Affected Package | Installed Version | Advisory & CVE ID | Severity | Scope | Production Exposure | Exploitability Analysis | Owner | Remediation Target | Disposition & Status |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- | :---: | :---: | :--- |
| **#1** | `esbuild` | `0.21.5` | `GHSA-67mh-4wv8-2f99` | Medium | Dev (transitive) | **None** | Requires running the local `esbuild` development server with an active browser tab on an untrusted origin sending local cross-origin HTTP requests. Production uses pre-compiled static assets. | Frontend Lead | Release v0.3.0 | **Deferred (Non-blocking)**. Upgrading to `esbuild >= 0.25.0` requires upgrading `vite` to v6+, breaking current React 18 plugin toolchain. |
| **#2** | `vite` | `5.4.21` | `GHSA-4w7w-66w2-5vf9`<br>CVE-2026-39365 | Medium | Dev | **None** | Path traversal in dev server optimized deps `.map` handling. Requires running local Vite dev server and requesting crafted sourcemaps. Production container does not run Vite server. | Frontend Lead | Release v0.3.0 | **Deferred (Non-blocking)**. Upgrading to Vite 8.3.5 breaks `@vitejs/plugin-react` 4.x. |
| **#3** | `vite` | `5.4.21` | `GHSA-fx2h-pf6j-xcff`<br>CVE-2026-53571 | Medium | Dev | **None** | `server.fs.deny` bypass on Windows NTFS alternate data streams (`::$DATA`). Exploitable only when a developer runs `npm run dev` on a Windows host with untrusted local network access. Production runs on Linux container. | DevSecOps Lead | Release v0.3.0 | **Deferred (Non-blocking)**. Requires Vite 6+. |
| **#4** | `vite` (launch-editor) | `5.4.21` | `GHSA-v6wh-96g9-6wx3`<br>CVE-2026-53632 | Medium | Dev (transitive) | **None** | NTLMv2 hash disclosure via UNC path handling in `launch-editor`. Exploitable only if a developer on Windows clicks a crafted UNC link in the dev server error overlay. Absent in production. | Security Lead | Release v0.3.0 | **Deferred (Non-blocking)**. Developer environment security advisory. |
| **#5** | `echarts` | `5.6.0` | `GHSA-fgmj-fm8m-jvvx`<br>CVE-2026-45249 | Medium | **Direct Runtime** | **Mitigated / Unreachable** | **Not exploitable in FluxV2X.** CVE-2026-45249 specifically requires using the `Lines` series (`type: 'lines'`) with default tooltips and unescaped HTML injected into `series.data[i].name`. Codebase audit confirms FluxV2X only uses `line` (Cartesian ROC curves), `scatter` (spatial coordinates), and `bar` (packet rates). `type: 'lines'` is **nowhere in the codebase**, and all rendered metrics are sanitized floats/integers. | Frontend Lead | Release v0.3.0 | **Mitigated in Application Logic.** ECharts 6.1.0 is a breaking major rewrite incompatible with `echarts-for-react` v3. Upgrading now breaks charting; application usage guarantees zero exposure. |
| **#6** | `vite` (launch-editor) | `5.4.21` | `GHSA-698v-4r3x-3vcv`<br>CVE-2026-112943 | Medium | Dev (transitive) | **None** | `escapeCmdArgs()` omits `%` escaping on Windows in `launch-editor`. Exploitable only via developer clicking dev error overlay on Windows. | Security Lead | Release v0.3.0 | **Deferred (Non-blocking)**. |
| **#7** | `vite` (launch-editor) | `5.4.21` | `GHSA-587h-7wmj-h5pm`<br>CVE-2026-112942 | High | Dev (transitive) | **None** | `fs.existsSync()` existence check bypass on Windows in `launch-editor`. Development-only overlay interaction on Windows. | Security Lead | Release v0.3.0 | **Deferred (Non-blocking)**. |
| **#8** | `vite` (launch-editor) | `5.4.21` | `GHSA-r825-w8mm-5pxw`<br>CVE-2026-112944 | Medium | Dev (transitive) | **None** | Editor CLI flag misinterpretation causing arbitrary command execution for some editors. Development-only overlay interaction. | Security Lead | Release v0.3.0 | **Deferred (Non-blocking)**. |
| **#9** | `vite` | `5.4.21` | `GHSA-rq7h-c2jc-7f22`<br>CVE-2026-112946 | Medium | Dev | **None** | Files outside `server.fs.allow` served when project paths match system paths on non-Windows. Development server path routing only. | DevSecOps Lead | Release v0.3.0 | **Deferred (Non-blocking)**. |
| **#10** | `vite` | `5.4.21` | `GHSA-9jrq-w75r-8gcw`<br>CVE-2026-112945 | Low | Dev | **None** | Cross-origin script execution through custom middleware. Development server only. | DevSecOps Lead | Release v0.3.0 | **Deferred (Non-blocking)**. |

---

## Upgrade & Remediation Roadmap for v0.3.0

To resolve the 9 dev-server advisories and the ECharts advisory without breaking frontend functionality or build stability, the following coordinated upgrade is scheduled for release **v0.3.0**:

1. **Vite 6/8 Migration**: Coordinate upgrade of `vite` (5.4.21 -> 6.x/8.x) simultaneously with `@vitejs/plugin-react` (4.x -> 6.x) and `tailwindcss` (3.4 -> 4.x).
2. **ECharts 6 Migration**: Coordinate upgrade of `echarts` (5.6.0 -> 6.1.0) simultaneously with `echarts-for-react` (3.x -> 4.x), migrating canvas lifecycle hooks and event handlers.
3. **Continuous Verification**: Execute end-to-end browser regression testing before merging dependency upgrades to ensure zero UI regression.
