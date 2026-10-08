"""
core.engine.caveman - Caveman Semantic Communication Protocol
Strips unnecessary fluff, greetings, and conversational fillers.
Formats agent-to-agent instructions strictly as operational JSON payloads to minimize token consumption.
"""
import json
import re
from typing import Dict, Any

class CavemanProtocol:
    FILLER_WORDS = [
        r"\bhello\b", r"\bhi\b", r"\bplease\b", r"\bkindly\b", r"\bthank you\b",
        r"\bthanks\b", r"\bi think\b", r"\bi believe\b", r"\bas requested\b",
        r"\blMerhaba\b", r"\blütfen\b", r"\bteşekkürler\b", r"\brice ederim\b"
    ]

    @classmethod
    def compress_text(cls, text: str) -> str:
        """Removes filler words and collapses redundant whitespace."""
        compressed = text
        for pat in cls.FILLER_WORDS:
            compressed = re.sub(pat, "", compressed, flags=re.IGNORECASE)
        compressed = re.sub(r"\s+", " ", compressed).strip()
        return compressed

    @classmethod
    def format_op(cls, op: str, file: str, target: str, action: str, diff: str, token_cost: int = 0) -> str:
        """Formats strict operational JSON payload as defined in plan.md."""
        payload = {
            "op": op,
            "file": file,
            "target": target,
            "action": action,
            "diff": diff,
            "token_cost": token_cost
        }
        return json.dumps(payload, separators=(',', ':'), ensure_ascii=False)

    @classmethod
    def parse_op(cls, payload_str: str) -> Dict[str, Any]:
        """Parses operational JSON payload."""
        try:
            return json.loads(payload_str)
        except json.JSONDecodeError:
            return {"op": "RAW", "raw_content": payload_str}
