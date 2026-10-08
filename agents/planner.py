"""
agents.planner - Milestone and Atomic Task Divider
Breaks high-level user prompt or boss directives into concrete atomic tasks.
"""
from typing import List
from core.graph.state import AgencyState, TaskItem

class PlannerAgent:
    def __init__(self, model: str = "gpt-4o"):
        self.model = model

    def plan_tasks(self, state: AgencyState) -> AgencyState:
        prompt = state.get("user_prompt", "")
        tasks: List[TaskItem] = []

        # Generate atomic tasks based on prompt keywords
        if "auth" in prompt.lower() or "jwt" in prompt.lower():
            tasks = [
                {
                    "id": f"{state['project_id']}-task-01",
                    "title": "Auth Servisi & JWT Token Üretici",
                    "target_files": ["core/gateway/auth.py"],
                    "status": "pending",
                    "diff": None,
                    "error_message": None
                },
                {
                    "id": f"{state['project_id']}-task-02",
                    "title": "Password Hashing & Argon2 Doğrulayıcı",
                    "target_files": ["core/engine/security.py"],
                    "status": "pending",
                    "diff": None,
                    "error_message": None
                }
            ]
        elif "redis" in prompt.lower() or "rate" in prompt.lower() or "limit" in prompt.lower():
            tasks = [
                {
                    "id": f"{state['project_id']}-task-01",
                    "title": "Sliding Window Rate Limiter Algoritması",
                    "target_files": ["core/engine/rate_limit.py"],
                    "status": "pending",
                    "diff": None,
                    "error_message": None
                },
                {
                    "id": f"{state['project_id']}-task-02",
                    "title": "FastAPI Rate Limit Middleware Entegrasyonu",
                    "target_files": ["core/gateway/middleware.py"],
                    "status": "pending",
                    "diff": None,
                    "error_message": None
                }
            ]
        else:
            tasks = [
                {
                    "id": f"{state['project_id']}-task-01",
                    "title": f"Mimari Tasarım ve Şema: {prompt[:40]}",
                    "target_files": ["app/schema.py", "app/models.py"],
                    "status": "pending",
                    "diff": None,
                    "error_message": None
                },
                {
                    "id": f"{state['project_id']}-task-02",
                    "title": f"Çekirdek Implementasyon ve Servis Mantığı",
                    "target_files": ["app/service.py"],
                    "status": "pending",
                    "diff": None,
                    "error_message": None
                },
                {
                    "id": f"{state['project_id']}-task-03",
                    "title": "Birim ve Entegrasyon Testleri",
                    "target_files": ["tests/test_service.py"],
                    "status": "pending",
                    "diff": None,
                    "error_message": None
                }
            ]

        state["tasks"] = tasks
        state["active_task_index"] = 0
        state["manager"]["last_report"] = f"{len(tasks)} adet atomik görev oluşturuldu. Explorer ve Developer ajanlara devredildi."
        return state
