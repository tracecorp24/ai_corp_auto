"""
agents.developer - Functional Design and Test Architect
Designs clean algorithms, type annotations, and test cases for each atomic task.
Only sees the AST summary (.agent/ast_map.md) to save context tokens.
"""
from typing import Dict, Any
from core.graph.state import AgencyState

class DeveloperAgent:
    def __init__(self, model: str = "gpt-4o"):
        self.model = model

    def design_task(self, state: AgencyState) -> AgencyState:
        idx = state.get("active_task_index", 0)
        tasks = state.get("tasks", [])
        if idx >= len(tasks):
            return state

        current_task = tasks[idx]
        current_task["status"] = "in_progress"

        # Generate algorithm design specification
        design_spec = {
            "task_id": current_task["id"],
            "title": current_task["title"],
            "target_files": current_task["target_files"],
            "dependencies": ["pydantic", "typing"],
            "test_requirements": ["assert returns 200 on valid token", "assert raises RateLimitExceeded on threshold"]
        }

        state["manager"]["last_report"] = f"Developer '{current_task['title']}' için fonksiyonel tasarımı tamamladı. Implementor kod yazımına geçiyor."
        return state
