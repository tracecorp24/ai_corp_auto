"""
core.telemetry.db - SQLite Telemetry and State Database per plan.md section 5
Stores token usage, execution logs, and project state persistently.
"""
import sqlite3
import os
from pathlib import Path
from typing import List, Dict, Any, Optional

DB_DIR = Path(__file__).resolve().parent.parent.parent / "storage"
TELEMETRY_DB = DB_DIR / "telemetry.db"

def init_db():
    DB_DIR.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(TELEMETRY_DB) as conn:
        cursor = conn.cursor()
        # Telemetry logs
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS telemetry (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                project_id TEXT,
                agent_name TEXT,
                model TEXT,
                prompt_tokens INTEGER,
                completion_tokens INTEGER,
                cost_usd REAL
            )
        """)
        # Project checkpoints
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS project_checkpoints (
                project_id TEXT PRIMARY KEY,
                name TEXT,
                status TEXT,
                health INTEGER,
                progress INTEGER,
                budget_limit REAL,
                budget_spent REAL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()

def log_llm_call(project_id: str, agent_name: str, model: str, prompt_tokens: int, completion_tokens: int, cost_usd: float):
    init_db()
    with sqlite3.connect(TELEMETRY_DB) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO telemetry (project_id, agent_name, model, prompt_tokens, completion_tokens, cost_usd)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (project_id, agent_name, model, prompt_tokens, completion_tokens, cost_usd))
        conn.commit()

def get_telemetry_summary(project_id: Optional[str] = None) -> Dict[str, Any]:
    init_db()
    with sqlite3.connect(TELEMETRY_DB) as conn:
        cursor = conn.cursor()
        if project_id:
            cursor.execute("""
                SELECT SUM(prompt_tokens), SUM(completion_tokens), SUM(cost_usd), COUNT(*)
                FROM telemetry WHERE project_id = ?
            """, (project_id,))
        else:
            cursor.execute("""
                SELECT SUM(prompt_tokens), SUM(completion_tokens), SUM(cost_usd), COUNT(*)
                FROM telemetry
            """)
        row = cursor.fetchone()
        return {
            "total_prompt_tokens": row[0] or 0,
            "total_completion_tokens": row[1] or 0,
            "total_cost_usd": round(row[2] or 0.0, 4),
            "total_calls": row[3] or 0
        }

if __name__ == "__main__":
    init_db()
    print("Database initialized at:", TELEMETRY_DB)
