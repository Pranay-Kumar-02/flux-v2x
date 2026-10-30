import os
import sys
import json
import math
import subprocess
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional

logger = logging.getLogger("fluxv2x.cosim.ns3")

class NS3CoSimAdapter:
    """
    Subprocess adapter connecting the Python Co-Simulation Orchestrator
    to the native NS-3 3.41 802.11p WAVE network simulator running in WSL2 Ubuntu.
    """
    def __init__(self):
        self.proc: Optional[subprocess.Popen] = None
        self.wsl_available = self._check_wsl_binary()
        self.use_native_ns3 = self.wsl_available

    def _check_wsl_binary(self) -> bool:
        runner_path = Path(__file__).parent / "ns3_runner"
        return runner_path.exists()

    def start(self):
        if not self._check_wsl_binary():
            logger.warning("ns3_runner binary not found in cosim dir. Using native fallback mode.")
            self.use_native_ns3 = False
            return

        cosim_dir = Path(__file__).parent.resolve()
        # Convert Windows path to WSL /mnt path
        drive = cosim_dir.drive.rstrip(':').lower()
        wsl_path = f"/mnt/{drive}/{cosim_dir.as_posix().split(':', 1)[-1].lstrip('/')}"

        cmd = [
            "wsl.exe",
            "-d", "Ubuntu",
            "--", "bash", "-c",
            f"cd '{wsl_path}' && ./ns3_runner"
        ]

        try:
            logger.info(f"Starting NS-3 process via WSL: {' '.join(cmd)}")
            self.proc = subprocess.Popen(
                cmd,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1
            )
            self.use_native_ns3 = True
            logger.info("NS-3 process started successfully.")
        except Exception as e:
            logger.error(f"Failed to launch NS-3 in WSL: {e}", exc_info=True)
            self.use_native_ns3 = False

    def step(
        self,
        current_time: float,
        vehicles: List[Dict[str, Any]],
        rsus: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Feeds vehicle positions & communication parameters into NS-3 for this step,
        retrieves genuine wireless network metrics.
        """
        if self.proc and self.proc.poll() is None:
            try:
                # Write step to NS-3
                lines = [f"STEP {current_time:.2f}\n"]
                for v in vehicles:
                    att = 1 if v.get("is_attacker", False) else 0
                    rate = float(v.get("packet_rate", 10.0))
                    mit_ratio = float(v.get("rate_limit_ratio", 0.0))
                    lines.append(f"V {v['id']} {v['x']:.2f} {v['y']:.2f} {v['speed']:.2f} {att} {rate:.2f} {mit_ratio:.2f}\n")

                for r in rsus:
                    rng = float(r.get("range", 150.0))
                    lines.append(f"R {r['id']} {r['x']:.2f} {r['y']:.2f} {rng:.2f}\n")

                lines.append("END_STEP\n")
                self.proc.stdin.write("".join(lines))
                self.proc.stdin.flush()

                # Read JSON response line from NS-3
                resp_line = self.proc.stdout.readline()
                if resp_line:
                    data = json.loads(resp_line.strip())
                    data["ns3_engine"] = "NS-3.41 Native (WSL2 802.11p WAVE)"
                    return data
            except Exception as e:
                logger.error(f"Error communicating with NS-3 process: {e}")

        # IEEE 802.11p analytical fallback if process not running
        return self._fallback_step(current_time, vehicles, rsus)

    def _fallback_step(
        self,
        current_time: float,
        vehicles: List[Dict[str, Any]],
        rsus: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        total_tx = 0
        total_rx = 0
        total_dropped = 0
        malicious_dropped = 0
        benign_preserved = 0
        sum_delay = 0.0
        rx_samples = 0

        for v in vehicles:
            raw_rate = float(v.get("packet_rate", 10.0))
            mit_ratio = float(v.get("rate_limit_ratio", 0.0))
            is_att = bool(v.get("is_attacker", False))
            
            if mit_ratio > 0.0:
                drop_amount = raw_rate * mit_ratio
                eff_rate = max(10.0, raw_rate - drop_amount)
                dropped = int(drop_amount)
                total_dropped += dropped
                if is_att:
                    malicious_dropped += dropped
            else:
                eff_rate = raw_rate

            tx_cnt = int(eff_rate)
            total_tx += tx_cnt

            # Compute 802.11p reception at nearest RSU
            min_dist = 1e9
            best_pdr = 0.0
            for r in rsus:
                dx = v["x"] - r["x"]
                dy = v["y"] - r["y"]
                dist = math.sqrt(dx * dx + dy * dy)
                if dist < min_dist:
                    min_dist = dist
                    norm = dist / float(r.get("range", 150.0))
                    best_pdr = max(0.0, min(1.0, 1.0 / (1.0 + math.exp(12.0 * (norm - 0.75)))))

            rx_cnt = int(round(tx_cnt * best_pdr))
            total_rx += rx_cnt
            total_dropped += (tx_cnt - rx_cnt)
            if not is_att:
                benign_preserved += rx_cnt

            delay = 1.8 + (min_dist * 0.0033) + (total_tx / max(100.0, len(vehicles) * 30.0)) * 6.5
            sum_delay += delay * rx_cnt
            rx_samples += rx_cnt

        pdr = (total_rx / total_tx * 100.0) if total_tx > 0 else 100.0
        avg_delay = (sum_delay / rx_samples) if rx_samples > 0 else 2.5
        jitter = max(0.2, avg_delay * 0.18)
        tp_kbps = (total_rx * 300.0 * 8.0) / 1000.0

        return {
            "time": round(current_time, 2),
            "tx": total_tx,
            "rx": total_rx,
            "dropped": total_dropped,
            "malicious_dropped": malicious_dropped,
            "benign_preserved": benignPreserved if 'benignPreserved' in locals() else benign_preserved,
            "pdr": round(pdr, 2),
            "throughput_kbps": round(tp_kbps, 2),
            "throughput_mbps": round(tp_kbps / 1000.0, 3),
            "delay_ms": round(avg_delay, 2),
            "jitter_ms": round(jitter, 2),
            "active_nodes": len(vehicles),
            "active_rsus": len(rsus),
            "ns3_engine": "IEEE 802.11p Analytical Engine"
        }

    def stop(self):
        if self.proc:
            try:
                self.proc.stdin.write("QUIT\n")
                self.proc.stdin.flush()
                self.proc.wait(timeout=2.0)
            except Exception:
                self.proc.kill()
            self.proc = None
            logger.info("NS-3 adapter stopped.")

