"""
core.graph.state - AgencyState and TaskItem type definitions per plan.md
"""
from typing import TypedDict, List, Dict, Optional, Literal

class TaskItem(TypedDict):
    id: str
    title: str
    target_files: List[str]
    status: Literal['pending', 'in_progress', 'implemented', 'verified', 'failed']
    diff: Optional[str]
    error_message: Optional[str]

class ManagerInfo(TypedDict):
    name: str
    avatar: str
    status: Literal['idle', 'working', 'reviewing', 'blocked']
    model: str
    last_report: str
    mood: Literal['confident', 'cautious', 'concerned', 'critical']

class AgencyState(TypedDict):
    project_id: str
    project_name: str
    worktree_path: str
    user_prompt: str
    budget_limit_usd: float
    current_cost_usd: float
    circuit_breaker_triggered: bool
    ast_summary: str
    reference_patterns: List[str]
    tasks: List[TaskItem]
    active_task_index: int
    current_diff: Optional[str]
    test_results: Optional[Dict]
    retry_count: int
    error_logs: List[str]
    manager: ManagerInfo
