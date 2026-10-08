# AI Agency OS — Repository AST Map
Automated AST Outline for Zero-Full-File LLM Context

## Module: `core/engine/ast_parser.py`
  - class AstParser
    - def __init__(self, root_dir: str)
    - def scan_directory(self, target_dir: str = None) -> Dict[str, List[str]]
    - def parse_file(self, file_path: Path) -> List[str]
    - def generate_ast_map_md(self, output_path: str = ".agent/ast_map.md") -> str

## Module: `core/engine/caveman.py`
  - class CavemanProtocol
    - def compress_text(cls, text: str) -> str
    - def format_op(cls, op: str, file: str, target: str, action: str, diff: str, token_cost: int = 0) -> str
    - def parse_op(cls, payload_str: str) -> Dict[str, Any]

## Module: `core/gateway/app.py`
  - class ProjectCreateRequest(BaseModel)
  - class DirectiveRequest(BaseModel)
  - def on_startup()
  - def health()
  - def get_telemetry(project_id: Optional[str] = None)
  - def create_project(req: ProjectCreateRequest, authorization: Optional[str] = Header(None))
  - async def websocket_telemetry(websocket: WebSocket)

## Module: `core/gateway/auth.py`
  - def verify_token(token: str) -> bool

## Module: `core/graph/state.py`
  - class TaskItem(TypedDict)
  - class ManagerInfo(TypedDict)
  - class AgencyState(TypedDict)

## Module: `core/graph/workflow.py`
  - class WorkflowOrchestrator
    - def __init__(self)
    - def register_node(self, name: str, fn: Callable[[AgencyState], AgencyState])
    - def register_transition(self, from_node: str, condition: str, to_node: str)
    - def execute_step(self, state: AgencyState, current_node: str) -> tuple[AgencyState, str]

## Module: `core/telemetry/circuit_breaker.py`
  - class CircuitBreaker
    - def __init__(self, budget_limit_usd: float = 2.00)
    - def record_cost(self, cost_usd: float) -> bool
    - def reset(self, new_limit_usd: Optional[float] = None)

## Module: `core/telemetry/db.py`
  - def init_db()
  - def log_llm_call(project_id: str, agent_name: str, model: str, prompt_tokens: int, completion_tokens: int, cost_usd: float)
  - def get_telemetry_summary(project_id: Optional[str] = None) -> Dict[str, Any]

## Module: `agents/analyst.py`
  - class AnalystAgent
    - def __init__(self)
    - def audit_project(self, state: AgencyState) -> Dict[str, Any]

## Module: `agents/developer.py`
  - class DeveloperAgent
    - def __init__(self, model: str = "gpt-4o")
    - def design_task(self, state: AgencyState) -> AgencyState

## Module: `agents/explorer.py`
  - class ExplorerAgent
    - def __init__(self, references_dir: str = "references")
    - def mine_patterns(self, state: AgencyState) -> AgencyState

## Module: `agents/implementor.py`
  - class ImplementorAgent
    - def __init__(self, model: str = "gpt-4o")
    - def apply_patch(self, state: AgencyState) -> AgencyState

## Module: `agents/manager.py`
  - class ManagerAgent
    - def __init__(self, name: str = "Atlas", model: str = "gpt-4o")
    - def evaluate_project_request(self, state: AgencyState) -> AgencyState
    - def review_completed_task(self, state: AgencyState, task_id: str, success: bool) -> AgencyState

## Module: `agents/planner.py`
  - class PlannerAgent
    - def __init__(self, model: str = "gpt-4o")
    - def plan_tasks(self, state: AgencyState) -> AgencyState

## Module: `agents/tester.py`
  - class TesterAgent
    - def __init__(self, model: str = "gpt-4o")
    - def run_tests(self, state: AgencyState) -> AgencyState

## Module: `sandbox/docker_manager.py`
  - class DockerSandboxManager
    - def __init__(self, default_image: str = "python:3.11-slim")
    - def run_in_sandbox(self, command: str, worktree_path: str, timeout_sec: int = 30) -> Dict[str, Any]

## Module: `sandbox/git_worktree.py`
  - class GitWorktreeManager
    - def __init__(self, repo_root: str = ".")
    - def create_worktree(self, task_id: str, branch_name: Optional[str] = None) -> Path
    - def remove_worktree(self, task_id: str)

## Module: `.worktrees/proj-001/main.py`
  - def main()

## Module: `.worktrees/proj-001/models.py`
  - class Config

## Module: `.worktrees/proj-002/main.py`
  - def main()

## Module: `.worktrees/proj-002/models.py`
  - class Config

## Module: `.worktrees/proj-003/main.py`
  - def main()

## Module: `.worktrees/proj-003/models.py`
  - class Config

## Module: `.worktrees/proj-004/main.py`
  - def main()

## Module: `.worktrees/proj-004/models.py`
  - class Config
