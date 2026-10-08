"""
core.telemetry.circuit_breaker - Financial Insurance & Execution Halter
Halts agent operations immediately when project or global budget limit is exceeded.
"""
from typing import Optional

class CircuitBreaker:
    def __init__(self, budget_limit_usd: float = 2.00):
        self.budget_limit_usd = budget_limit_usd
        self.current_cost_usd = 0.0
        self.is_tripped = False
        self.trip_reason: Optional[str] = None

    def record_cost(self, cost_usd: float) -> bool:
        """Records cost and returns True if execution can continue, False if tripped."""
        self.current_cost_usd += cost_usd
        if self.current_cost_usd >= self.budget_limit_usd:
            self.is_tripped = True
            self.trip_reason = f"Bütçe aşıldı! Harcanan: ${self.current_cost_usd:.4f} >= Limit: ${self.budget_limit_usd:.2f}"
            return False
        return True

    def reset(self, new_limit_usd: Optional[float] = None):
        if new_limit_usd is not None:
            self.budget_limit_usd = new_limit_usd
        self.is_tripped = False
        self.trip_reason = None
