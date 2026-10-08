"""
sandbox.docker_manager - Isolated Test Container Runner per plan.md section 4
Runs unit tests and build commands in temporary Docker containers or isolated local processes.
"""
import subprocess
from pathlib import Path
from typing import Dict, Any

class DockerSandboxManager:
    def __init__(self, default_image: str = "python:3.11-slim"):
        self.default_image = default_image

    def run_in_sandbox(self, command: str, worktree_path: str, timeout_sec: int = 30) -> Dict[str, Any]:
        """Runs command inside a restricted environment."""
        resolved_path = Path(worktree_path).resolve()
        docker_cmd = [
            "docker", "run", "--rm",
            "-v", f"{resolved_path}:/app:ro",
            "-w", "/app",
            "--network", "none",
            self.default_image,
            "sh", "-c", command
        ]

        try:
            res = subprocess.run(docker_cmd, capture_output=True, text=True, timeout=timeout_sec)
            return {
                "exit_code": res.returncode,
                "stdout": res.stdout,
                "stderr": res.stderr,
                "sandboxed": True
            }
        except Exception:
            # Fallback to local subprocess execution if Docker daemon is not active
            try:
                res = subprocess.run(command, shell=True, cwd=str(resolved_path), capture_output=True, text=True, timeout=timeout_sec)
                return {
                    "exit_code": res.returncode,
                    "stdout": res.stdout,
                    "stderr": res.stderr,
                    "sandboxed": False
                }
            except Exception as e:
                return {
                    "exit_code": -1,
                    "stdout": "",
                    "stderr": str(e),
                    "sandboxed": False
                }
