# FluxV2X Product Overview

## 1. Executive Summary

**FluxV2X** is an extensible data engineering and network security platform for structured-data analysis, contextual anomaly detection, reproducible machine-learning experiments, vehicular communication security, and offline defensive-policy evaluation.

- **Product Identity**: FluxV2X — Context-Aware Network Security Platform
- **Tagline**: Understand traffic. Detect anomalies. Protect communication.
- **Repository**: [https://github.com/Pranay-Kumar-02/flux-v2x.git](https://github.com/Pranay-Kumar-02/flux-v2x.git)
- **Current Software Version**: `v0.2.0` (Active Pre-Stable Development)

---

## 2. Problem Statement & Core Motivation

Modern distributed communication networks—specifically Vehicular Ad-Hoc Networks (VANETs), Cellular Vehicle-to-Everything (C-V2X), and mission-critical IoT meshes—exhibit extreme spatiotemporal volatility:

1. **Traffic Congestion vs. Malicious Flooding**:
   In dense urban intersections or during bottleneck incidents, vehicular message density spikes sharply. Traditional static threshold detectors mistakenly classify legitimate congestion surges as distributed denial-of-service (DDoS) flooding attacks, leading to false-positive packet drops of safety-critical Basic Safety Messages (BSMs).
2. **Context Blindness in Machine Learning**:
   Off-the-shelf anomaly detectors evaluate observations in isolation, ignoring receiver density, roadway topology, and local vehicular clustering.
3. **Poisoning of Adaptive Baselines**:
   Adaptive threshold algorithms that update baseline expectations without rigorous validation gates can be maliciously trained by attackers gradually escalating packet rates (poisoning attacks).
4. **Research Reproducibility Crisis**:
   Security evaluations frequently suffer from data leakage (fitting scalers across train/test partitions, evaluating unaligned observations), lack of multi-tenant isolation, and fabricated metrics.

FluxV2X solves these challenges by combining spatiotemporal clustering, contextual statistical z-score baselining, the dual-gate **ACAFDM** (Adaptive Context-Aware Malicious Flooding Detection and Mitigation) engine, and an offline defensive policy simulator.

---

## 3. Intended Users & Personas

- **Network Security Engineers**: Evaluating defensive policies, rate-limiting rules, and priority preservation for critical communication protocols.
- **V2X & Automotive Researchers**: Conducting reproducible anomaly detection benchmarks, validating hypotheses against standardized datasets, and computing rigorous paired statistical tests (McNemar test).
- **Data Engineers & ML Practitioners**: Transforming high-volume network telemetry, constructing leakage-safe scenario splits, and deploying machine learning pipelines.
- **Infrastructure & DevSecOps Teams**: Deploying secure, multi-tenant network telemetry inspection infrastructure on-premises or in cloud environments.

---

## 4. System Boundaries & Core Capabilities

```
+-----------------------------------------------------------------------------------+
|                                     FLUXV2X                                       |
+-----------------------------------------------------------------------------------+
|  [Ingestion & Profiling]   -> Polars Streaming, SHA-256 Custody, Type Profiler    |
|  [Context Explorer]        -> Spatiotemporal Clustering (K-Means), Local Baselines|
|  [Model Laboratory]        -> RF, GBDT, MLP, DT, LR with Leakage-Safe Splits      |
|  [ACAFDM Engine]           -> Dual-Gate Poison Prevention & Adaptive Baselining   |
|  [Benchmark Center]        -> Paired McNemar Test (p < 0.05), Comparative Metrics |
|  [Mitigation Simulator]    -> Packet Drop, Dynamic Rate Limiting, Priority Pres.  |
|  [Security & Isolation]    -> PyJWT (HS256), PBKDF2 Hashing, Workspace RBAC       |
+-----------------------------------------------------------------------------------+
```

### 4.1 General-Purpose Capabilities
- Columnar data ingestion supporting `.parquet`, `.csv`, and `.json`.
- Automatic statistical profiling (null counts, cardinality, numeric bounds, SHA-256 fingerprinting).
- Interactive schema mapping with type casting and canonical field resolution.
- Asynchronous background job management with live progress and cancellation.
- Strict multi-tenant workspace isolation enforcing complete ownership chains.

### 4.2 Specialized VCN Security Capabilities
- Destination-centric clustering discovering receiver node clusters based on spatial coordinates and packet frequency.
- Contextual baseline tracking maintaining running means and standard deviations ($\mu_c, \sigma_c$) per cluster.
- Dual-gate baseline update policy rejecting poison updates when anomalies or suspicious rates occur.
- Policy-driven mitigation simulation measuring packet drop ratios, latency overhead, and safety priority preservation.

---

## 5. Explicit Non-Goals

To maintain high engineering focus, FluxV2X explicitly defines what it is **not**:
- **Not a Live Hardware In-Line Firewall**: FluxV2X is an analytics, research, and policy simulation platform; it does not directly inject iptables rules into kernel packet paths in real-time.
- **Not a Packet Capture Driver**: It does not replace `tcpdump` or `libpcap`; it consumes structured telemetry traces.
- **Not a Generic AutoML Cloud**: It focuses specifically on network traffic anomaly detection and contextual mitigation policies rather than arbitrary computer vision or natural language tasks.
- **Not a Commercial SaaS Hosted Service**: FluxV2X is open-source software designed for self-hosted and on-premises deployment.
