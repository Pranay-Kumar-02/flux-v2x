from typing import Dict, Any, Tuple


class ACAFDMDecisionPolicy:
    """
    Implements multi-step confidence and persistence state machine with hysteresis.
    Differentiates transient congestion spikes from persistent malicious flooding.
    """

    def __init__(
        self,
        persistence_k: int = 3,
        z_threshold: float = 2.5,
        confidence_threshold: float = 0.70,
        cooldown_ticks: int = 5
    ):
        self.persistence_k = persistence_k
        self.z_threshold = z_threshold
        self.confidence_threshold = confidence_threshold
        self.cooldown_ticks = cooldown_ticks

        # State tracking: receiver_or_sender_id -> {"streak": int, "cooldown": int, "state": str}
        self.tracker: Dict[str, Dict[str, Any]] = {}

    def evaluate_observation(
        self,
        node_id: str,
        z_score: float,
        model_score: float
    ) -> Tuple[str, str, int, bool]:
        """
        Evaluates observation. Returns:
        (decision, reason_code, persistence_streak, is_eligible_for_baseline_update)
        """
        if node_id not in self.tracker:
            self.tracker[node_id] = {"streak": 0, "cooldown": 0, "state": "NORMAL"}

        node_state = self.tracker[node_id]

        # Determine suspicion level
        is_statistically_deviant = abs(z_score) >= self.z_threshold
        is_model_suspicious = model_score >= self.confidence_threshold
        is_suspicious = is_statistically_deviant or is_model_suspicious

        if is_suspicious:
            node_state["streak"] += 1
            node_state["cooldown"] = self.cooldown_ticks

            if node_state["streak"] >= self.persistence_k:
                node_state["state"] = "MITIGATED"
                decision = "MITIGATE_RATE_LIMIT"
                reason = (
                    f"Persistent anomaly confirmed (streak={node_state['streak']}>={self.persistence_k}, "
                    f"z={z_score:.2f}, score={model_score:.2f}). Selective mitigation active."
                )
                # Poison prevention: Do NOT update normal baseline with malicious flood!
                return decision, reason, node_state["streak"], False
            else:
                node_state["state"] = "SUSPICIOUS"
                decision = "FLAG_SUSPICIOUS"
                reason = (
                    f"Elevated traffic detected (streak={node_state['streak']}/{self.persistence_k}, "
                    f"z={z_score:.2f}). Awaiting persistence confirmation."
                )
                # Do NOT contaminate baseline during ambiguous burst
                return decision, reason, node_state["streak"], False

        else:
            # Observation is benign/normal
            if node_state["cooldown"] > 0:
                node_state["cooldown"] -= 1
                if node_state["streak"] > 0:
                    node_state["streak"] -= 1

            if node_state["cooldown"] == 0:
                node_state["state"] = "NORMAL"
                node_state["streak"] = 0

            decision = "ALLOW"
            reason = f"Traffic consistent with localized spatiotemporal baseline (z={z_score:.2f}, score={model_score:.2f})."
            # Benign observation is safe to update baseline
            return decision, reason, node_state["streak"], True
