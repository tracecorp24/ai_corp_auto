"""
core.gateway.app - Central FastAPI Gateway per plan.md section 6
Unifies CLI, Telegram, Webhook, and Dashboard interactions.
"""
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Header
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import json
from pathlib import Path

from core.graph.state import AgencyState
from core.telemetry.db import get_telemetry_summary, init_db
from core.gateway.auth import verify_token

app = FastAPI(title="AI Agency OS Gateway", version="1.0.0")

class ProjectCreateRequest(BaseModel):
    name: str
    description: Optional[str] = ""
    budget_limit_usd: Optional[float] = 3.00
    prompt: Optional[str] = ""

class DirectiveRequest(BaseModel):
    directive: str

# Active WebSocket connections
connected_sockets: List[WebSocket] = []

@app.on_event("startup")
def on_startup():
    init_db()

@app.get("/health")
def health():
    return {"status": "ok", "service": "AI Agency OS Gateway"}

@app.get("/api/telemetry")
def get_telemetry(project_id: Optional[str] = None):
    return get_telemetry_summary(project_id)

@app.post("/api/projects")
def create_project(req: ProjectCreateRequest, authorization: Optional[str] = Header(None)):
    # Create project state checkpoint
    return {
        "status": "created",
        "project_name": req.name,
        "budget_limit_usd": req.budget_limit_usd,
        "message": f"Proje '{req.name}' başlatıldı. Müdür ataması yapıldı."
    }

@app.websocket("/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket):
    await websocket.accept()
    connected_sockets.append(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Echo or process incoming commands
            await websocket.send_text(json.dumps({"type": "ACK", "received": data}))
    except WebSocketDisconnect:
        connected_sockets.remove(websocket)
