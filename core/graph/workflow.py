"""
core.graph.workflow - LangGraph-compatible state machine orchestrator
Manages state transitions: Manager -> Planner -> Explorer -> [Developer -> Implementor -> Tester] -> Analyst
"""
from typing import Dict, Any, Callable
from core.graph.state import AgencyState

class WorkflowOrchestrator:
    def __init__(self):
        self.nodes: Dict[str, Callable[[AgencyState], AgencyState]] = {}
        self.transitions: Dict[str, Dict[str, str]] = {}

    def register_node(self, name: str, fn: Callable[[AgencyState], AgencyState]):
        self.nodes[name] = fn

    def register_transition(self, from_node: str, condition: str, to_node: str):
        if from_node not in self.transitions:
            self.transitions[from_node] = {}
        self.transitions[from_node][condition] = to_node

    def execute_step(self, state: AgencyState, current_node: str) -> tuple[AgencyState, str]:
        """Executes a single step in the state machine and returns next node."""
        if current_node not in self.nodes:
            raise ValueError(f"Unknown node: {current_node}")

        # Check circuit breaker before execution
        if state["current_cost_usd"] >= state["budget_limit_usd"]:
            state["circuit_breaker_triggered"] = True
            state["manager"]["status"] = "blocked"
            state["manager"]["mood"] = "critical"
            state["manager"]["last_report"] = "Bütçe limiti aşıldı! Circuit breaker süreci dondurdu."
            return state, "circuit_breaker"

        # Execute node logic
        updated_state = self.nodes[current_node](state)

        # Determine transition
        node_transitions = self.transitions.get(current_node, {})
        next_node = node_transitions.get("default", "complete")

        if current_node == "tester":
            test_results = updated_state.get("test_results", {})
            passed = test_results.get("passed", False)
            if passed:
                # Check if all tasks finished
                if updated_state["active_task_index"] + 1 < len(updated_state["tasks"]):
                    updated_state["active_task_index"] += 1
                    next_node = "developer"
                else:
                    next_node = "analyst"
            else:
                if updated_state["retry_count"] < 3:
                    updated_state["retry_count"] += 1
                    next_node = "implementor"
                else:
                    next_node = "issue_reporter"

        return updated_state, next_node
