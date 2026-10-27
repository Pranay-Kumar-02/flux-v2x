import polars as pl
import numpy as np
from typing import Dict, Any, List, Optional
from app.acafdm.engine import ACAFDMEngine


class MitigationSimulator:
    """
    Deterministic, offline-only traffic replay and selective mitigation simulator.
    Simulates defensive rate-limiting and prioritization without live network execution.
    """

    @classmethod
    def run_simulation(
        cls,
        df: pl.DataFrame,
        policy_action: str = "selective_rate_limiting",
        rate_limit_ratio: float = 0.5,
        priority_preservation: bool = True,
        cluster_count: int = 4,
        z_threshold: float = 2.5,
        persistence_k: int = 3
    ) -> Dict[str, Any]:
        # Run ACAFDM pipeline to obtain deterministic decisions
        engine = ACAFDMEngine(
            cluster_count=cluster_count,
            z_threshold=z_threshold,
            persistence_k=persistence_k,
            benign_validation_gate=True
        )

        trace_result = engine.process_trace(df)
        decision_map = {d["index"]: d["decision"] for d in trace_result["decision_trace"]}

        total_records = df.height
        has_labels = "label" in df.columns
        has_priority = "priority" in df.columns or "is_safety" in df.columns

        labels = df["label"].to_numpy() if has_labels else np.zeros(total_records, dtype=int)
        packet_counts = df["packet_count"].fill_null(10).to_numpy() if "packet_count" in df.columns else np.ones(total_records) * 10
        byte_counts = df["byte_count"].fill_null(5000).to_numpy() if "byte_count" in df.columns else np.ones(total_records) * 5000

        unmitigated_total_packets = float(np.sum(packet_counts))
        unmitigated_total_bytes = float(np.sum(byte_counts))

        simulated_delivered_packets = 0.0
        simulated_dropped_packets = 0.0
        malicious_packets_dropped = 0.0
        malicious_packets_passed = 0.0
        benign_packets_dropped = 0.0
        benign_packets_passed = 0.0
        safety_packets_protected = 0

        for i in range(total_records):
            pkts = float(packet_counts[i])
            is_attack = bool(labels[i] == 1) if has_labels else False
            decision = decision_map.get(i, "ALLOW")

            if decision == "MITIGATE_RATE_LIMIT":
                # Apply rate limiting
                drop_ratio = rate_limit_ratio
                dropped = pkts * drop_ratio
                passed = pkts - dropped

                simulated_dropped_packets += dropped
                simulated_delivered_packets += passed

                if is_attack:
                    malicious_packets_dropped += dropped
                    malicious_packets_passed += passed
                else:
                    benign_packets_dropped += dropped
                    benign_packets_passed += passed

            else:
                # Allowed without dropping
                simulated_delivered_packets += pkts
                if is_attack:
                    malicious_packets_passed += pkts
                else:
                    benign_packets_passed += pkts

        total_malicious_pkts = malicious_packets_dropped + malicious_packets_passed
        total_benign_pkts = benign_packets_dropped + benign_packets_passed

        mitigation_efficiency = (
            round((malicious_packets_dropped / total_malicious_pkts) * 100, 2)
            if total_malicious_pkts > 0 else 0.0
        )
        collateral_damage_pct = (
            round((benign_packets_dropped / total_benign_pkts) * 100, 2)
            if total_benign_pkts > 0 else 0.0
        )
        bandwidth_saved_pct = (
            round((simulated_dropped_packets / unmitigated_total_packets) * 100, 2)
            if unmitigated_total_packets > 0 else 0.0
        )

        return {
            "policy_action": policy_action,
            "rate_limit_ratio": rate_limit_ratio,
            "priority_preservation": priority_preservation,
            "total_flow_records": total_records,
            "unmitigated_total_packets": int(unmitigated_total_packets),
            "simulated_delivered_packets": int(simulated_delivered_packets),
            "simulated_dropped_packets": int(simulated_dropped_packets),
            "bandwidth_saved_percentage": bandwidth_saved_pct,
            "malicious_traffic": {
                "total_packets": int(total_malicious_pkts),
                "packets_dropped": int(malicious_packets_dropped),
                "packets_passed": int(malicious_packets_passed),
                "mitigation_efficiency_percentage": mitigation_efficiency,
            },
            "benign_traffic": {
                "total_packets": int(total_benign_pkts),
                "packets_passed": int(benign_packets_passed),
                "packets_dropped_collateral": int(benign_packets_dropped),
                "collateral_damage_percentage": collateral_damage_pct,
            },
            "acafdm_summary": {
                "mitigated_decisions": trace_result["mitigated_count"],
                "suspicious_decisions": trace_result["flagged_suspicious_count"],
                "allowed_decisions": trace_result["allowed_count"],
                "poison_prevention_blocks": trace_result["baseline_updates_rejected_poison_prevented"],
            },
            "environment_note": "OFFLINE REPLAY SIMULATION: Measurements calculated deterministically from recorded flow traces. No packets transmitted onto live physical network.",
        }
