"""
agents.explorer - Pattern Hub and Reference Code Miner
Scans references/ directory and retrieves architectural design patterns and best practices.
"""
from pathlib import Path
from typing import List
from core.graph.state import AgencyState

class ExplorerAgent:
    def __init__(self, references_dir: str = "references"):
        self.references_dir = Path(references_dir)

    def mine_patterns(self, state: AgencyState) -> AgencyState:
        patterns = []
        if self.references_dir.exists():
            for ref_file in self.references_dir.glob("**/*.*"):
                if ref_file.is_file() and ref_file.name != ".gitkeep":
                    patterns.append(f"Reference: {ref_file.name}")

        if not patterns:
            # Standard enterprise patterns
            patterns = [
                "FastAPI Dependency Injection Pattern",
                "Sliding Window Algorithm with Redis Sorted Sets",
                "Repository Pattern with SQLAlchemy / AsyncSession",
                "Pure Vendorless Standard Library Pattern"
            ]

        state["reference_patterns"] = patterns
        return state
