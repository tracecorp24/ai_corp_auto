"""
sandbox.git_worktree - Multi-Project Git Worktree Pool
Creates and manages isolated worktrees per project or task without cloning entire repositories.
"""
import subprocess
from pathlib import Path
from typing import Optional

class GitWorktreeManager:
    def __init__(self, repo_root: str = "."):
        self.repo_root = Path(repo_root).resolve()
        self.worktree_dir = self.repo_root / ".worktrees"

    def create_worktree(self, task_id: str, branch_name: Optional[str] = None) -> Path:
        """Creates an isolated git worktree for the task."""
        self.worktree_dir.mkdir(parents=True, exist_ok=True)
        target_path = self.worktree_dir / task_id

        if target_path.exists():
            return target_path

        branch = branch_name or f"feature/agent-{task_id}"

        cmd = ["git", "worktree", "add", "-b", branch, str(target_path)]
        try:
            subprocess.run(cmd, cwd=str(self.repo_root), check=True, capture_output=True, text=True)
        except Exception:
            # Fallback if git worktree fails (e.g. initial commit missing or clean directory)
            target_path.mkdir(parents=True, exist_ok=True)

        return target_path

    def remove_worktree(self, task_id: str):
        """Removes a worktree after task completion."""
        target_path = self.worktree_dir / task_id
        if target_path.exists():
            subprocess.run(["git", "worktree", "remove", str(target_path)], cwd=str(self.repo_root), capture_output=True)
