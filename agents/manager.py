"""
agents.manager - Project Manager Agent
Responsibilities:
- Acts as the Project Director / Manager dedicated to a specific project.
- Receives directives from the Boss (User).
- Validates project scope and enforces budget limits.
- Coordinates Planner, Developer, and Tester.
- Produces concise executive reports for the Boss.
"""
from typing import Dict, Any, List
from core.graph.state import AgencyState

class ManagerAgent:
    def __init__(self, name: str = "Atlas", model: str = "gpt-4o"):
        self.name = name
        self.model = model

    def evaluate_project_request(self, state: AgencyState) -> AgencyState:
        """Evaluates incoming prompt and verifies budget and feasibility."""
        prompt = state.get("user_prompt", "")
        budget_limit = state.get("budget_limit_usd", 2.00)
        current_cost = state.get("current_cost_usd", 0.0)

        if current_cost >= budget_limit:
            state["circuit_breaker_triggered"] = True
            state["manager"]["status"] = "blocked"
            state["manager"]["mood"] = "critical"
            state["manager"]["last_report"] = f"Patron, bütçe limiti (${budget_limit:.2f}) doldu! Onay vermeden devam edemem."
            return state

        state["manager"]["status"] = "working"
        state["manager"]["mood"] = "confident"
        state["manager"]["last_report"] = f"Patron, talimatını aldım: '{prompt[:60]}...'. Planner ajanı milestone planlamasına başlattı."
        return state

    def review_completed_task(self, state: AgencyState, task_id: str, success: bool) -> AgencyState:
        """Reviews a task executed by the team."""
        if success:
            state["manager"]["mood"] = "confident"
            state["manager"]["last_report"] = f"Görev {task_id} başarıyla doğrulandı ve tamamlandı! Ekip bir sonraki aşamaya geçiyor."
        else:
            state["manager"]["mood"] = "concerned"
            state["manager"]["last_report"] = f"Görev {task_id} testleri geçemedi. Tester ve Implementor revize üzerinde çalışıyor."
        return state
