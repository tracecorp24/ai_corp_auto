import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
// Serve production static assets from dist/
app.use(express.static(path.join(__dirname, '../dist')));

// Initial Agency State as defined in plan.md
let agencyState = {
  project_id: 'ai-agency-os-core',
  worktree_path: '.worktrees/feature-jwt-rate-limit',
  user_prompt: 'Projeye Redis tabanlı sliding window rate limiter ve JWT Auth middleware ekle',
  budget_limit_usd: 2.00,
  current_cost_usd: 0.384,
  circuit_breaker_triggered: false,
  is_running: false,
  is_paused: false,
  retry_count: 0,
  active_task_index: 0,
  tasks: [
    {
      id: 'task-01',
      title: 'Auth Servisi: JWT token üretici ve Argon2 doğrulayıcı',
      target_files: ['core/gateway/auth.py', 'core/engine/security.py'],
      status: 'verified', // pending, in_progress, implemented, verified, failed
      diff: `@@ -1,5 +1,18 @@
+from jose import jwt
+from passlib.context import CryptContext
+
+pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
+SECRET_KEY = "agency-mesh-key-entropy"
+
+def create_access_token(data: dict) -> str:
+    return jwt.encode(data, SECRET_KEY, algorithm="HS256")
+
 def authenticate_user(username: str, secret: str):
-    return None
+    # Argon2 verification hook
+    return pwd_context.verify(secret, "$argon2id$v=19$mock")`,
      test_summary: '2 passed in 0.42s (Docker Sandbox: python:3.11-slim)'
    },
    {
      id: 'task-02',
      title: 'Redis Sliding-Window Rate Limiter Middleware',
      target_files: ['core/gateway/limiter.py', 'core/gateway/api.py'],
      status: 'in_progress',
      diff: `@@ -10,3 +10,14 @@
+class SlidingWindowLimiter:
+    def __init__(self, redis_client, max_requests: int = 100, window_secs: int = 60):
+        self.redis = redis_client
+        self.max_req = max_requests
+        self.window = window_secs
+
+    async def allow_request(self, client_ip: str) -> bool:
+        current_ts = time.time()
+        key = f"rate:{client_ip}"
+        # Caveman atomic pipeline
+        return True`,
      test_summary: 'Running pytest in container sandbox...'
    },
    {
      id: 'task-03',
      title: 'Circuit Breaker Telemetri Entegrasyonu & Alert Hook',
      target_files: ['core/telemetry/circuit_breaker.py'],
      status: 'pending',
      diff: null,
      test_summary: null
    },
    {
      id: 'task-04',
      title: 'Otomatik GitHub PR Hazırlama & Benchmark Raporu',
      target_files: ['.github/workflows/ci.yml', 'docs/SECURITY_AUDIT.md'],
      status: 'pending',
      diff: null,
      test_summary: null
    }
  ],
  current_diff: `--- a/core/gateway/limiter.py
+++ b/core/gateway/limiter.py
@@ -10,3 +10,14 @@
+class SlidingWindowLimiter:
+    def __init__(self, redis_client, max_requests: int = 100, window_secs: int = 60):
+        self.redis = redis_client
+        self.max_req = max_requests
+        self.window = window_secs
+
+    async def allow_request(self, client_ip: str) -> bool:
+        current_ts = time.time()
+        key = f"rate:{client_ip}"
+        # Caveman atomic pipeline
+        return True`,
  test_results: {
    passed: 6,
    failed: 0,
    container: 'sandbox-cgroup-091a (CPU: 1.0, RAM: 512MB)',
    duration_s: 1.84,
    last_run_timestamp: new Date().toISOString()
  },
  error_logs: []
};

// 7 Agents registry from plan.md
let agentsData = [
  {
    id: 'manager',
    name: 'Manager Agent',
    role: 'Görev Dağıtımı & Üst Onay',
    status: 'IDLE', // IDLE, ACTIVE, PLANNING, PATCHING, TESTING, VERIFIED, FAILED
    model: 'gpt-4o',
    tokensPrompt: 4120,
    tokensCompletion: 890,
    costUsd: 0.052,
    speedTps: 84,
    description: 'Bütçe doğrulama, proje başlangıcı ve son PR onayından sorumlu tepe ajan.',
    systemPrompt: 'You are Manager Agent. Validate user project budget limits, orchestrate sub-agents, and perform final PR approval.',
    color: '#38bdf8' // cyan
  },
  {
    id: 'planner',
    name: 'Planner Agent',
    role: 'Milestone & Atomik Task Bölücü',
    status: 'IDLE',
    model: 'claude-3-5-sonnet',
    tokensPrompt: 7850,
    tokensCompletion: 1420,
    costUsd: 0.078,
    speedTps: 72,
    description: 'AST haritasını analiz ederek büyük talepleri izole görevlere ve dosya hedeflerine böler.',
    systemPrompt: 'You are Planner Agent. Decompose user request into atomic tasks with exact target files based on Tree-Sitter AST.',
    color: '#818cf8' // indigo
  },
  {
    id: 'explorer',
    name: 'Explorer Agent',
    role: 'Pattern Hub & Kod Madencisi',
    status: 'IDLE',
    model: 'gemini-1.5-pro',
    tokensPrompt: 6200,
    tokensCompletion: 980,
    costUsd: 0.038,
    speedTps: 98,
    description: 'references/ klasöründeki kodları tarayarak denenmiş ve onaylanmış tasarım kalıplarını çeker.',
    systemPrompt: 'You are Explorer Agent. Extract reference architectural patterns from repo samples without hallucination.',
    color: '#a78bfa' // purple
  },
  {
    id: 'developer',
    name: 'Developer Agent',
    role: 'Fonksiyonel Tasarım & Test Mimarı',
    status: 'PLANNING',
    model: 'claude-3-5-sonnet',
    tokensPrompt: 11200,
    tokensCompletion: 2100,
    costUsd: 0.114,
    speedTps: 76,
    description: 'Algoritma mantığını, edge-case testlerini ve fonksiyonel sözleşmeleri hazırlar.',
    systemPrompt: 'You are Developer Agent. Design atomic functions, type signatures, and pytest unit tests.',
    color: '#34d399' // emerald
  },
  {
    id: 'implementor',
    name: 'Implementor Agent',
    role: 'Git Patch & AST Entegratörü',
    status: 'PATCHING',
    model: 'gpt-4o',
    tokensPrompt: 8900,
    tokensCompletion: 1840,
    costUsd: 0.091,
    speedTps: 88,
    description: 'Caveman protokolü ile minimal operasyonel diff üretir ve git worktree üzerine patch uygular.',
    systemPrompt: 'You are Implementor Agent. Produce unified git diffs strictly in Caveman compact JSON format.',
    color: '#f59e0b' // amber
  },
  {
    id: 'tester',
    name: 'Tester Agent',
    role: 'Docker Sandbox Koşumu & Analiz',
    status: 'TESTING',
    model: 'gpt-4o-mini',
    tokensPrompt: 3400,
    tokensCompletion: 640,
    costUsd: 0.011,
    speedTps: 110,
    description: 'İzole Docker konteynerinde pytest ve linter koşturur, stack trace çözer.',
    systemPrompt: 'You are Tester Agent. Execute tests in isolated docker worktrees, parse failure logs, and verify exit codes.',
    color: '#ec4899' // pink
  },
  {
    id: 'analyst',
    name: 'Analyst Agent',
    role: 'Token, Bütçe & Mimari Denetçi',
    status: 'IDLE',
    model: 'gemini-1.5-flash',
    tokensPrompt: 2400,
    tokensCompletion: 510,
    costUsd: 0.008,
    speedTps: 125,
    description: 'telemetry.db verilerini sorgular, maliyet anomalilerini ve token verimliliğini raporlar.',
    systemPrompt: 'You are Analyst Agent. Perform post-hoc SQL queries on telemetry.db and compute token savings.',
    color: '#06b6d4' // cyan
  }
];

// In-memory terminal log buffer
let logBuffer = [
  { id: 1, timestamp: new Date(Date.now() - 45000).toLocaleTimeString(), agent: 'MANAGER', level: 'INFO', message: 'Agency OS başlatıldı. Proje: ai-agency-os-core. Bütçe Limiti: $2.00.' },
  { id: 2, timestamp: new Date(Date.now() - 40000).toLocaleTimeString(), agent: 'MANAGER', level: 'INFO', message: 'Worktree hazırlandı: .worktrees/feature-jwt-rate-limit [branch: feature/agent-task-01]' },
  { id: 3, timestamp: new Date(Date.now() - 35000).toLocaleTimeString(), agent: 'PLANNER', level: 'INFO', message: 'Tree-Sitter AST analizi tamamlandı (.agent/ast_map.md). 4 atomik milestone oluşturuldu.' },
  { id: 4, timestamp: new Date(Date.now() - 30000).toLocaleTimeString(), agent: 'EXPLORER', level: 'INFO', message: 'Pattern Hub: Sliding-window rate limiter & Argon2 tokens eşleşti.' },
  { id: 5, timestamp: new Date(Date.now() - 25000).toLocaleTimeString(), agent: 'DEVELOPER', level: 'CAVEMAN', message: 'Caveman AST tasarımı onaylandı: core/gateway/auth.py', payload: { op: 'CREATE', file: 'core/gateway/auth.py', symbols: ['create_access_token', 'authenticate_user'] } },
  { id: 6, timestamp: new Date(Date.now() - 20000).toLocaleTimeString(), agent: 'IMPLEMENTOR', level: 'CAVEMAN', message: 'Git patch uygulandı: core/gateway/auth.py (+18, -1 lines)', payload: { op: 'PATCH', diff_lines: 18, token_cost: 142 } },
  { id: 7, timestamp: new Date(Date.now() - 15000).toLocaleTimeString(), agent: 'TESTER', level: 'SANDBOX', message: 'Docker Sandbox (python:3.11-slim): pytest tests/test_auth.py -> 2 PASSED (0.42s)' },
  { id: 8, timestamp: new Date(Date.now() - 10000).toLocaleTimeString(), agent: 'MANAGER', level: 'INFO', message: 'Task-01 onaylandı (VERIFIED). Task-02 işleme alınıyor...' },
  { id: 9, timestamp: new Date(Date.now() - 5000).toLocaleTimeString(), agent: 'DEVELOPER', level: 'INFO', message: 'Task-02 için Redis Sliding-Window algoritması tasarlanıyor...' }
];

let logCounter = 10;

// Telemetry breakdown
function computeTelemetry() {
  const totalPromptTokens = agentsData.reduce((acc, a) => acc + a.tokensPrompt, 0);
  const totalCompletionTokens = agentsData.reduce((acc, a) => acc + a.tokensCompletion, 0);
  const totalTokens = totalPromptTokens + totalCompletionTokens;
  const totalCost = parseFloat(agentsData.reduce((acc, a) => acc + a.costUsd, 0).toFixed(4));
  agencyState.current_cost_usd = totalCost;

  // Estimate savings through Tree-sitter & Caveman compression
  const rawEstimatedTokens = totalTokens * 3.4;
  const savedTokens = Math.round(rawEstimatedTokens - totalTokens);
  const savedUsd = parseFloat(((savedTokens / 1000) * 0.015).toFixed(2));

  return {
    totalPromptTokens,
    totalCompletionTokens,
    totalTokens,
    totalCost,
    budgetLimit: agencyState.budget_limit_usd,
    budgetUtilizationPct: Math.min(100, parseFloat(((totalCost / agencyState.budget_limit_usd) * 100).toFixed(1))),
    circuitBreakerTriggered: agencyState.circuit_breaker_triggered,
    savedTokens,
    savedUsd,
    cavemanEfficiencyPct: 71.4,
    byAgent: agentsData.map(a => ({
      id: a.id,
      name: a.name,
      costUsd: a.costUsd,
      tokens: a.tokensPrompt + a.tokensCompletion,
      percentage: totalCost > 0 ? parseFloat(((a.costUsd / totalCost) * 100).toFixed(1)) : 0
    }))
  };
}

// WebSocket broadcast helper
const clients = new Set();

function broadcast(data) {
  const payload = JSON.stringify(data);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

function appendLog(agent, level, message, payload = null) {
  const item = {
    id: logCounter++,
    timestamp: new Date().toLocaleTimeString(),
    agent,
    level,
    message,
    payload
  };
  logBuffer.push(item);
  if (logBuffer.length > 500) logBuffer.shift();
  broadcast({ type: 'LOG_APPEND', log: item });
  return item;
}

// Simulation loop for live interactive demonstration
let simulationTimer = null;

function stepAgencyWorkflow() {
  if (agencyState.circuit_breaker_triggered || agencyState.is_paused) return;

  const activeIdx = agencyState.active_task_index;
  const activeTask = agencyState.tasks[activeIdx];

  // Increment tokens & cost subtly
  const devAgent = agentsData.find(a => a.id === 'developer');
  const impAgent = agentsData.find(a => a.id === 'implementor');
  const testAgent = agentsData.find(a => a.id === 'tester');
  const analystAgent = agentsData.find(a => a.id === 'analyst');

  if (activeTask && activeTask.status === 'in_progress') {
    // Stage 1: Implementor patch
    impAgent.status = 'PATCHING';
    impAgent.tokensPrompt += 140;
    impAgent.tokensCompletion += 85;
    impAgent.costUsd = parseFloat((impAgent.costUsd + 0.002).toFixed(4));
    
    appendLog('IMPLEMENTOR', 'CAVEMAN', `Caveman Patch uygulanıyor: ${activeTask.target_files[0]}`, {
      op: 'PATCH',
      target: activeTask.target_files[0],
      diff_chunk: activeTask.diff ? activeTask.diff.slice(0, 100) + '...' : '@@ ...',
      token_cost: 142
    });

    // Stage 2: Tester running
    testAgent.status = 'TESTING';
    testAgent.tokensPrompt += 90;
    testAgent.tokensCompletion += 45;
    testAgent.costUsd = parseFloat((testAgent.costUsd + 0.0008).toFixed(4));
    
    appendLog('TESTER', 'SANDBOX', `Docker Sandbox: pytest ${activeTask.target_files[0]} -v (CGroup limit: 512MB)`);

    // Verify task
    setTimeout(() => {
      activeTask.status = 'verified';
      activeTask.test_summary = 'All test suites passed (Exit code: 0)';
      testAgent.status = 'VERIFIED';
      appendLog('TESTER', 'INFO', `✓ Test Başarılı: ${activeTask.title} doğrulandı.`);
      
      // Move to next task or finish
      if (activeIdx + 1 < agencyState.tasks.length) {
        agencyState.active_task_index = activeIdx + 1;
        const nextTask = agencyState.tasks[activeIdx + 1];
        nextTask.status = 'in_progress';
        appendLog('MANAGER', 'INFO', `Sonraki göreve geçildi: [${nextTask.id}] ${nextTask.title}`);
        devAgent.status = 'PLANNING';
      } else {
        // All tasks done!
        agencyState.is_running = false;
        analystAgent.status = 'ACTIVE';
        analystAgent.tokensPrompt += 400;
        analystAgent.costUsd = parseFloat((analystAgent.costUsd + 0.004).toFixed(4));
        appendLog('ANALYST', 'INFO', `Milestone tamamlandı. Telemetry.db SQL analizi yapıldı. Token tasarrufu: %71.4.`);
        appendLog('MANAGER', 'INFO', `🚀 Otomatik GitHub PR açıldı: feature/agent-milestone-01 -> main (Branch verified)`);
        if (simulationTimer) clearInterval(simulationTimer);
      }

      broadcast({ type: 'STATE_UPDATE', state: agencyState });
      broadcast({ type: 'AGENTS_UPDATE', agents: agentsData });
      broadcast({ type: 'TELEMETRY_UPDATE', telemetry: computeTelemetry() });
    }, 2500);

  } else if (!activeTask) {
    if (simulationTimer) clearInterval(simulationTimer);
  }

  // Check circuit breaker
  const currentCost = computeTelemetry().totalCost;
  if (currentCost >= agencyState.budget_limit_usd) {
    agencyState.circuit_breaker_triggered = true;
    agencyState.is_running = false;
    appendLog('CIRCUIT_BREAKER', 'ERROR', `🚨 DİKKAT: Bütçe eşiği aşıldı ($${currentCost} >= $${agencyState.budget_limit_usd}). Süreç otomatik durduruldu! Telegram acil bildirim yollandı.`);
    if (simulationTimer) clearInterval(simulationTimer);
  }

  broadcast({ type: 'STATE_UPDATE', state: agencyState });
  broadcast({ type: 'AGENTS_UPDATE', agents: agentsData });
  broadcast({ type: 'TELEMETRY_UPDATE', telemetry: computeTelemetry() });
}

// REST Endpoints
app.get('/api/state', (req, res) => {
  res.json({
    state: agencyState,
    agents: agentsData,
    telemetry: computeTelemetry()
  });
});

app.post('/api/task', (req, res) => {
  const { prompt, budgetLimit } = req.body;
  if (prompt) {
    agencyState.user_prompt = prompt;
  }
  if (budgetLimit && !isNaN(budgetLimit)) {
    agencyState.budget_limit_usd = parseFloat(budgetLimit);
  }

  // Reset task progress with new milestone items
  agencyState.active_task_index = 0;
  agencyState.is_running = true;
  agencyState.is_paused = false;
  agencyState.circuit_breaker_triggered = false;
  agencyState.retry_count = 0;
  agencyState.tasks = [
    {
      id: 'task-01',
      title: `Planlama & AST Ayrıştırma: ${prompt.slice(0, 35)}...`,
      target_files: ['core/engine/caveman.py', 'core/gateway/api.py'],
      status: 'in_progress',
      diff: null,
      test_summary: null
    },
    {
      id: 'task-02',
      title: 'İmplementasyon & Modül Entegrasyonu',
      target_files: ['agents/implementor.py', 'core/graph/state_machine.py'],
      status: 'pending',
      diff: null,
      test_summary: null
    },
    {
      id: 'task-03',
      title: 'Docker Sandbox Test Koşumu & Doğrulama',
      target_files: ['sandbox/docker_manager.py', 'tests/test_flow.py'],
      status: 'pending',
      diff: null,
      test_summary: null
    },
    {
      id: 'task-04',
      title: 'GitHub PR Açma & Telemetri Loglama',
      target_files: ['storage/telemetry.db'],
      status: 'pending',
      diff: null,
      test_summary: null
    }
  ];

  appendLog('MANAGER', 'INFO', `Yeni görev başlatıldı: "${prompt}" (Bütçe: $${agencyState.budget_limit_usd})`);
  appendLog('PLANNER', 'INFO', `Milestone ayrıştırıldı: 4 atomik alt görev kuyruğa alındı.`);

  // Reset agent statuses
  agentsData.forEach(a => { a.status = 'IDLE'; });
  const mgr = agentsData.find(a => a.id === 'manager');
  const dev = agentsData.find(a => a.id === 'developer');
  if (mgr) mgr.status = 'ACTIVE';
  if (dev) dev.status = 'PLANNING';

  if (simulationTimer) clearInterval(simulationTimer);
  simulationTimer = setInterval(stepAgencyWorkflow, 6000);

  broadcast({ type: 'STATE_UPDATE', state: agencyState });
  broadcast({ type: 'AGENTS_UPDATE', agents: agentsData });
  broadcast({ type: 'TELEMETRY_UPDATE', telemetry: computeTelemetry() });

  res.json({ success: true, message: 'Task launched successfully', state: agencyState });
});

app.post('/api/control', (req, res) => {
  const { action } = req.body;
  
  if (action === 'pause') {
    agencyState.is_paused = true;
    appendLog('MANAGER', 'WARN', 'Operasyon kullanıcı tarafından duraklatıldı (PAUSED).');
  } else if (action === 'resume') {
    agencyState.is_paused = false;
    appendLog('MANAGER', 'INFO', 'Operasyon devam ettiriliyor (RESUMED).');
  } else if (action === 'abort' || action === 'trip_circuit') {
    agencyState.circuit_breaker_triggered = true;
    agencyState.is_running = false;
    if (simulationTimer) clearInterval(simulationTimer);
    appendLog('CIRCUIT_BREAKER', 'ERROR', 'ACİL DURDURMA: Manuel Circuit Breaker tetiklendi! Tüm konteynerler durduruldu.');
  } else if (action === 'reset_circuit') {
    agencyState.circuit_breaker_triggered = false;
    appendLog('MANAGER', 'INFO', 'Circuit Breaker sıfırlandı. Sistem hazır.');
  } else if (action === 'step') {
    stepAgencyWorkflow();
  }

  broadcast({ type: 'STATE_UPDATE', state: agencyState });
  res.json({ success: true, state: agencyState });
});

app.post('/api/budget', (req, res) => {
  const { limit } = req.body;
  if (limit && !isNaN(limit)) {
    agencyState.budget_limit_usd = parseFloat(limit);
    appendLog('MANAGER', 'INFO', `Bütçe limiti güncellendi: $${agencyState.budget_limit_usd.toFixed(2)}`);
    broadcast({ type: 'STATE_UPDATE', state: agencyState });
    broadcast({ type: 'TELEMETRY_UPDATE', telemetry: computeTelemetry() });
    return res.json({ success: true, budget_limit_usd: agencyState.budget_limit_usd });
  }
  res.status(400).json({ error: 'Invalid budget limit' });
});

app.get('/api/telemetry', (req, res) => {
  res.json(computeTelemetry());
});

app.get('/api/agents', (req, res) => {
  res.json(agentsData);
});

app.get('/api/logs', (req, res) => {
  res.json(logBuffer);
});

app.get('/api/ast', (req, res) => {
  const astPath = path.join(REPO_ROOT, '.agent', 'ast_map.md');
  let content = '';
  if (fs.existsSync(astPath)) {
    content = fs.readFileSync(astPath, 'utf8');
  }
  res.json({ content });
});

// SPA fallback middleware (Express 5 compatible)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../dist', 'index.html'));
});

// Start HTTP server & WebSocket server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[AI-Agency-OS] Core Gateway API & Server running on http://0.0.0.0:${PORT}`);
});

const wss = new WebSocketServer({ server, path: '/ws/telemetry' });

wss.on('connection', (ws, req) => {
  clients.add(ws);
  console.log(`[WS] Client connected. Total clients: ${clients.size}`);

  // Send initial snapshot
  ws.send(JSON.stringify({
    type: 'INIT_SNAPSHOT',
    state: agencyState,
    agents: agentsData,
    telemetry: computeTelemetry(),
    logs: logBuffer.slice(-50)
  }));

  ws.on('message', (message) => {
    try {
      const parsed = JSON.parse(message);
      if (parsed.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG' }));
      }
    } catch (e) {
      console.error('[WS] Parse error', e);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[WS] Client disconnected. Total: ${clients.size}`);
  });
});
