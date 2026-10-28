from typing import Dict, List, Optional
import polars as pl


class VCNSchemaDefinition:
    CANONICAL_FIELDS = {
        "timestamp": {"type": "float", "description": "Observation or packet arrival timestamp", "required": True},
        "src_id": {"type": "string", "description": "Transmitter vehicle / node identifier", "required": True},
        "dst_id": {"type": "string", "description": "Receiver vehicle / destination identifier", "required": True},
        "rx_x": {"type": "float", "description": "Receiver X coordinate (spatial location)", "required": True},
        "rx_y": {"type": "float", "description": "Receiver Y coordinate (spatial location)", "required": True},
        "rx_speed": {"type": "float", "description": "Receiver vehicle speed (m/s)", "required": False},
        "packet_count": {"type": "integer", "description": "Packet count in session/window", "required": True},
        "byte_count": {"type": "integer", "description": "Total bytes transmitted", "required": False},
        "packet_rate": {"type": "float", "description": "Packet transmission rate (pps)", "required": True},
        "payload_size": {"type": "float", "description": "Average or total payload size (bytes)", "required": False},
        "scenario": {"type": "string", "description": "Scenario context (e.g. highway, urban, rush_hour)", "required": False},
        "label": {"type": "integer", "description": "Ground truth label (0: Benign/Congestion, 1: Malicious Flood)", "required": False},
    }

    HEURISTIC_SYNONYMS = {
        "timestamp": ["timestamp", "time", "start_time", "flow_start", "arrival_time", "t"],
        "src_id": ["src_id", "source", "src", "tx_id", "transmitter", "sender", "ip_src"],
        "dst_id": ["dst_id", "destination", "dst", "rx_id", "receiver", "target_node", "ip_dst"],
        "rx_x": ["rx_x", "x", "pos_x", "longitude", "lon", "coord_x", "loc_x"],
        "rx_y": ["rx_y", "y", "pos_y", "latitude", "lat", "coord_y", "loc_y"],
        "rx_speed": ["rx_speed", "speed", "velocity", "v", "rx_velocity"],
        "packet_count": ["packet_count", "packets", "pkt_count", "tot_pkts", "count"],
        "byte_count": ["byte_count", "bytes", "tot_bytes", "size_bytes"],
        "packet_rate": ["packet_rate", "rate", "pkt_rate", "pps", "pkts_per_sec", "flow_rate"],
        "payload_size": ["payload_size", "payload", "avg_payload", "pkt_len", "len"],
        "scenario": ["scenario", "env", "environment", "traffic_type", "topology"],
        "label": ["label", "attack", "is_malicious", "class", "target", "anomaly", "is_attack"],
    }

    @classmethod
    def suggest_mapping(cls, available_columns: List[str]) -> Dict[str, str]:
        """Automatically suggest mapping from source dataset columns to canonical VCN fields."""
        mapping: Dict[str, str] = {}
        used_cols = set()

        for canonical, synonyms in cls.HEURISTIC_SYNONYMS.items():
            for col in available_columns:
                if col in used_cols:
                    continue
                col_clean = col.lower().strip()
                if col_clean in synonyms or any(col_clean == syn for syn in synonyms):
                    mapping[col] = canonical
                    used_cols.add(col)
                    break
                elif any(syn in col_clean for syn in synonyms):
                    mapping[col] = canonical
                    used_cols.add(col)
                    break

        return mapping

    @classmethod
    def apply_mapping(cls, df: pl.DataFrame, mapping: Dict[str, str]) -> pl.DataFrame:
        """
        Renames columns per mapping and casts to expected numeric/string types.
        """
        rename_dict = {}
        for src_col, canon_col in mapping.items():
            if src_col in df.columns:
                rename_dict[src_col] = canon_col

        transformed = df.rename(rename_dict)
        return transformed
