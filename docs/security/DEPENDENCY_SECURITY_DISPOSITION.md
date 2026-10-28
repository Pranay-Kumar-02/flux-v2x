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

| Alert # | Affected Package | Patched Version | Advisory & CVE ID | Severity | Scope | Remediation Status | Verification |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **#1** | `esbuild` | `^0.25.0` | `GHSA-67mh-4wv8-2f99` | Medium | Dev (transitive) | **Remediated** | Upgraded via Vite 6.4.5 to `esbuild@0.25.0`. `npm audit` reports 0 vulnerabilities. |
| **#2** | `vite` | `^6.4.5` | `GHSA-4w7w-66w2-5vf9`<br>CVE-2026-39365 | Medium | Dev | **Remediated** | Upgraded to `vite@6.4.5`. |
| **#3** | `vite` | `^6.4.5` | `GHSA-fx2h-pf6j-xcff`<br>CVE-2026-53571 | Medium | Dev | **Remediated** | Upgraded to `vite@6.4.5`. |
| **#4** | `vite` (launch-editor) | `^6.4.5` | `GHSA-v6wh-96g9-6wx3`<br>CVE-2026-53632 | Medium | Dev (transitive) | **Remediated** | Upgraded to `vite@6.4.5` (`launch-editor` patched). |
| **#5** | `echarts` | `^6.1.0` | `GHSA-fgmj-fm8m-jvvx`<br>CVE-2026-45249 | Medium | **Direct Runtime** | **Remediated** | Upgraded to `echarts@6.1.0` and `echarts-for-react@3.0.6`. |
| **#6** | `vite` (launch-editor) | `^6.4.5` | `GHSA-698v-4r3x-3vcv`<br>CVE-2026-112943 | Medium | Dev (transitive) | **Remediated** | Upgraded to `vite@6.4.5`. |
| **#7** | `vite` (launch-editor) | `^6.4.5` | `GHSA-587h-7wmj-h5pm`<br>CVE-2026-112942 | High | Dev (transitive) | **Remediated** | Upgraded to `vite@6.4.5`. |
| **#8** | `vite` (launch-editor) | `^6.4.5` | `GHSA-r825-w8mm-5pxw`<br>CVE-2026-112944 | Medium | Dev (transitive) | **Remediated** | Upgraded to `vite@6.4.5`. |
| **#9** | `vite` | `^6.4.5` | `GHSA-rq7h-c2jc-7f22`<br>CVE-2026-112946 | Medium | Dev | **Remediated** | Upgraded to `vite@6.4.5`. |
| **#10** | `vite` | `^6.4.5` | `GHSA-9jrq-w75r-8gcw`<br>CVE-2026-112945 | Low | Dev | **Remediated** | Upgraded to `vite@6.4.5`. |

---

## Verification & Build Validation

All upgrades have been integrated and verified:
1. **Frontend Compilation & Build**: `tsc -b && vite build` completed in 1m 22s with zero errors on Vite 6.4.5 and ECharts 6.1.0.
2. **Audit Validation**: `npm audit` in `frontend/` reports: `found 0 vulnerabilities`.
3. **Backend Test Suite**: `uv run pytest` executed 24/24 tests with 100% pass rate.
4. **Code Scanning**: All unused imports, empty excepts, and mixed returns in backend and tests have been resolved.
