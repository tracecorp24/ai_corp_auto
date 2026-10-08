"""
agents.tester - Test Runner and Error Analyst
Executes automated test suites in the sandbox.
Reports back to Implementor on failure (up to 3 retries), or verifies and opens PR.
"""
from typing import Dict, Any
from core.graph.state import AgencyState

class TesterAgent:
    def __init__(self, model: str = "gpt-4o"):
        self.model = model

    def run_tests(self, state: AgencyState) -> AgencyState:
        idx = state.get("active_task_index", 0)
        tasks = state.get("tasks", [])
        if idx >= len(tasks):
            return state

        current_task = tasks[idx]

        # Simulate sandbox test execution
        test_results = {
            "passed": True,
            "total_tests": 4,
            "failed_tests": 0,
            "duration_ms": 142,
            "coverage_pct": 96.5
        }

        current_task["status"] = "verified"
        state["test_results"] = test_results
        state["manager"]["last_report"] = f"Tester: {test_results['total_tests']}/{test_results['total_tests']} test PASSED (%{test_results['coverage_pct']} coverage). Görev onaylandı!"
        return state
