const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');
const { contractFor } = require('./contracts');

const DEFAULT_DB = process.env.AI_CORP_WORKFLOW_DB || path.join(__dirname, '..', '..', 'storage', 'workflow.db');

const SOCIAL_MEDIA_QUESTIONS = [
  { id: 'goal', label: 'İlk hedefin nedir? İş planı, ajans iç aracı, müşteriye sunulacak yazılım veya bunların birleşimi mi?', required: true },
  { id: 'customer', label: 'İlk hedef müşteri grubun kim? Örneğin yerel işletmeler, e-ticaret markaları veya içerik üreticileri.', required: true },
  { id: 'services', label: 'Hangi hizmetleri ve sosyal medya platformlarını kapsamak istiyorsun?', required: true },
  { id: 'first_delivery', label: 'İlk somut teslimat ne olmalı ve başarılı olduğunu nasıl anlayacağız?', required: true },
  { id: 'constraints', label: 'Bütçe, süre, dil, ülke veya kullanmamızı istediğin araçlarla ilgili sınırların neler?', required: true },
];

const GENERAL_QUESTIONS = [
  { id: 'goal', label: 'Bu fikrin çözmesini istediğin temel sorun nedir?', required: true },
  { id: 'audience', label: 'İlk kullanıcı veya müşteri kim olacak?', required: true },
  { id: 'first_delivery', label: 'İlk somut teslimat ne olmalı?', required: true },
  { id: 'constraints', label: 'Bütçe, süre, teknoloji veya başka sınırların var mı?', required: true },
];

function createIntake(idea) {
  const socialMedia = /sosyal medya|social media/i.test(idea);
  return {
    summary: socialMedia
      ? 'Fikir bir sosyal medya ajansı kurmaya yönelik. İş modeli ile yazılım ihtiyacının kapsamı henüz belirlenmedi. Aşağıdaki cevaplar derin araştırmanın yönünü belirleyecek.'
      : 'Fikir kaydedildi. Hedef kullanıcı, ilk teslimat ve sınırlar henüz netleşmedi. Aşağıdaki cevaplar araştırmanın yönünü belirleyecek.',
    method: 'rule_based_intake',
    questions: socialMedia ? SOCIAL_MEDIA_QUESTIONS : GENERAL_QUESTIONS,
  };
}

function createWorkflowStore(dbPath = DEFAULT_DB) {
  if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA busy_timeout = 5000');
  if (dbPath !== ':memory:') db.exec('PRAGMA journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS workflow_runs (
      id TEXT PRIMARY KEY,
      idea TEXT NOT NULL,
      stage TEXT NOT NULL,
      intake_summary TEXT NOT NULL,
      intake_method TEXT NOT NULL,
      questions_json TEXT NOT NULL,
      answers_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS workflow_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id TEXT NOT NULL REFERENCES workflow_runs(id),
      type TEXT NOT NULL,
      actor TEXT NOT NULL,
      from_stage TEXT,
      to_stage TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS agent_runs (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL REFERENCES workflow_runs(id),
      department TEXT NOT NULL,
      agent TEXT NOT NULL,
      method TEXT NOT NULL,
      status TEXT NOT NULL,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      output_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS workflow_events_by_run ON workflow_events(run_id, id);
    CREATE INDEX IF NOT EXISTS agent_runs_by_run ON agent_runs(run_id, started_at);
    CREATE TABLE IF NOT EXISTS workflow_tasks (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL REFERENCES workflow_runs(id),
      department TEXT NOT NULL,
      kind TEXT NOT NULL,
      status TEXT NOT NULL,
      attempt INTEGER NOT NULL DEFAULT 0,
      worker TEXT,
      lease_token TEXT,
      lease_until TEXT,
      contract_sha256 TEXT NOT NULL,
      contract_markdown TEXT NOT NULL,
      input_json TEXT NOT NULL,
      output_json TEXT,
      error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS workflow_tasks_available ON workflow_tasks(status, lease_until, created_at);
    CREATE INDEX IF NOT EXISTS workflow_tasks_by_run ON workflow_tasks(run_id, created_at);
    CREATE TABLE IF NOT EXISTS workflow_costs (
      id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES workflow_runs(id), task_id TEXT NOT NULL REFERENCES workflow_tasks(id),
      provider TEXT NOT NULL, model TEXT NOT NULL, input_tokens INTEGER, output_tokens INTEGER,
      actual_usd REAL, estimated_usd REAL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS workflow_links (
      run_id TEXT NOT NULL REFERENCES workflow_runs(id), kind TEXT NOT NULL, key TEXT NOT NULL,
      url TEXT NOT NULL, payload_json TEXT NOT NULL, created_at TEXT NOT NULL,
      PRIMARY KEY (run_id, kind, key)
    );
  `);

  const selectRun = db.prepare('SELECT * FROM workflow_runs WHERE id = ?');
  const selectEvents = db.prepare('SELECT * FROM workflow_events WHERE run_id = ? ORDER BY id ASC');
  const selectAgents = db.prepare('SELECT * FROM agent_runs WHERE run_id = ? ORDER BY started_at ASC');
  const selectTasks = db.prepare('SELECT * FROM workflow_tasks WHERE run_id = ? ORDER BY created_at ASC, rowid ASC');
  const selectCosts = db.prepare('SELECT * FROM workflow_costs WHERE run_id = ? ORDER BY created_at ASC');
  const selectLinks = db.prepare('SELECT * FROM workflow_links WHERE run_id = ? ORDER BY created_at ASC');
  const insertRun = db.prepare(`INSERT INTO workflow_runs
    (id, idea, stage, intake_summary, intake_method, questions_json, answers_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const insertEvent = db.prepare(`INSERT INTO workflow_events
    (run_id, type, actor, from_stage, to_stage, payload_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`);
  const insertAgent = db.prepare(`INSERT INTO agent_runs
    (id, run_id, department, agent, method, status, started_at, finished_at, output_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const updateRun = db.prepare(`UPDATE workflow_runs
    SET stage = ?, answers_json = ?, updated_at = ?, version = version + 1
    WHERE id = ? AND version = ?`);
  const updateStage = db.prepare('UPDATE workflow_runs SET stage = ?, questions_json = ?, updated_at = ?, version = version + 1 WHERE id = ?');
  const insertTask = db.prepare(`INSERT INTO workflow_tasks
    (id, run_id, department, kind, status, contract_sha256, contract_markdown, input_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'queued', ?, ?, ?, ?, ?)`);

  function enqueue(runId, department, kind, input, now) {
    const contract = contractFor(department);
    const id = crypto.randomUUID();
    insertTask.run(id, runId, department, kind, contract.sha256, contract.markdown, JSON.stringify(input), now, now);
    return id;
  }

  function hydrateTask(row, includeContract = false) {
    const task = { id: row.id, run_id: row.run_id, department: row.department, kind: row.kind,
      status: row.status, attempt: row.attempt, worker: row.worker, lease_until: row.lease_until,
      contract_sha256: row.contract_sha256, input: JSON.parse(row.input_json),
      output: row.output_json ? JSON.parse(row.output_json) : null, error: row.error,
      created_at: row.created_at, updated_at: row.updated_at };
    if (includeContract) task.contract_markdown = row.contract_markdown;
    return task;
  }

  function transaction(fn) {
    db.exec('BEGIN IMMEDIATE');
    try {
      const result = fn();
      db.exec('COMMIT');
      return result;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  function hydrate(row, detail = false) {
    if (!row) return null;
    const run = {
      id: row.id,
      idea: row.idea,
      stage: row.stage,
      intake: { summary: row.intake_summary, method: row.intake_method },
      questions: JSON.parse(row.questions_json),
      answers: JSON.parse(row.answers_json),
      created_at: row.created_at,
      updated_at: row.updated_at,
      version: row.version,
    };
    run.missing_questions = run.questions.filter(q => q.required && !run.answers[q.id]?.trim()).map(q => q.id);
    if (detail) {
      run.events = selectEvents.all(row.id).map(event => ({
        id: event.id, type: event.type, actor: event.actor,
        from_stage: event.from_stage, to_stage: event.to_stage,
        payload: JSON.parse(event.payload_json), created_at: event.created_at,
      }));
      run.agent_runs = selectAgents.all(row.id).map(agent => ({
        id: agent.id, department: agent.department, agent: agent.agent,
        method: agent.method, status: agent.status,
        started_at: agent.started_at, finished_at: agent.finished_at,
        output: JSON.parse(agent.output_json),
      }));
      run.tasks = selectTasks.all(row.id).map(task => hydrateTask(task));
      run.costs = selectCosts.all(row.id).map(cost => ({ ...cost }));
      run.cost_summary = {
        actual_usd: run.costs.some(item => item.actual_usd != null)
          ? run.costs.reduce((sum, item) => sum + (item.actual_usd || 0), 0) : null,
        estimated_usd: run.costs.some(item => item.estimated_usd != null)
          ? run.costs.reduce((sum, item) => sum + (item.estimated_usd || 0), 0) : null,
      };
      run.links = selectLinks.all(row.id).map(link => ({ kind: link.kind, key: link.key, url: link.url,
        payload: JSON.parse(link.payload_json), created_at: link.created_at }));
    }
    return run;
  }

  function getRun(id) { return hydrate(selectRun.get(id), true); }

  function listRuns() {
    return db.prepare('SELECT * FROM workflow_runs ORDER BY created_at DESC, id DESC').all().map(row => hydrate(row));
  }

  function createRun(idea) {
    if (typeof idea !== 'string' || idea.trim().length < 10 || idea.length > 4000) {
      throw Object.assign(new Error('Fikir 10-4000 karakter arasında olmalı.'), { status: 400 });
    }
    const cleanIdea = idea.trim();
    const intake = createIntake(cleanIdea);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    transaction(() => {
      insertRun.run(id, cleanIdea, 'preliminary_research', intake.summary, intake.method,
        '[]', '{}', now, now);
      const taskId = enqueue(id, 'research', 'preliminary', { idea: cleanIdea, scope_hint: intake }, now);
      insertEvent.run(id, 'IDEA_RECEIVED', 'owner', null, 'preliminary_research', JSON.stringify({ idea: cleanIdea, task_id: taskId }), now);
    });
    return getRun(id);
  }

  function submitAnswers(id, submitted, actor = 'owner') {
    const row = selectRun.get(id);
    if (!row) throw Object.assign(new Error('İş akışı bulunamadı.'), { status: 404 });
    if (row.stage !== 'waiting_for_owner') {
      throw Object.assign(new Error('Bu iş akışı artık cevap beklemiyor.'), { status: 409 });
    }
    if (!submitted || typeof submitted !== 'object' || Array.isArray(submitted)) {
      throw Object.assign(new Error('Cevaplar bir nesne olmalı.'), { status: 400 });
    }
    const questions = JSON.parse(row.questions_json);
    const knownIds = new Set(questions.map(q => q.id));
    const answers = JSON.parse(row.answers_json);
    for (const [key, value] of Object.entries(submitted)) {
      if (!knownIds.has(key) || typeof value !== 'string' || value.length > 2000) {
        throw Object.assign(new Error(`Geçersiz cevap: ${key}`), { status: 400 });
      }
      answers[key] = value.trim();
    }
    const missing = questions.filter(q => q.required && !answers[q.id]?.trim()).map(q => q.id);
    const nextStage = missing.length ? 'waiting_for_owner' : 'research_ready';
    const now = new Date().toISOString();
    transaction(() => {
      const result = updateRun.run(nextStage, JSON.stringify(answers), now, id, row.version);
      if (result.changes !== 1) throw Object.assign(new Error('Durum değişti; sayfayı yenileyip tekrar deneyin.'), { status: 409 });
      insertEvent.run(id, missing.length ? 'ANSWERS_SAVED' : 'RESEARCH_READY', actor, row.stage, nextStage,
        JSON.stringify({ answered_ids: Object.keys(submitted), missing_ids: missing }), now);
      if (!missing.length) enqueue(id, 'research', 'deep', { idea: row.idea, answers }, now);
    });
    return getRun(id);
  }

  function reopenForRevision(id, reason, actor = 'system') {
    if (typeof reason !== 'string' || !reason.trim() || reason.length > 1000) {
      throw Object.assign(new Error('Düzeltme gerekçesi gerekli.'), { status: 400 });
    }
    return transaction(() => {
      const row = selectRun.get(id);
      if (!row) throw Object.assign(new Error('İş akışı bulunamadı.'), { status: 404 });
      if (row.stage !== 'github_pending') {
        throw Object.assign(new Error('Yalnızca GitHub devri bekleyen iş yeniden açılabilir.'), { status: 409 });
      }
      const previous = db.prepare("SELECT output_json FROM workflow_tasks WHERE run_id = ? AND kind = 'develop' AND status = 'completed' ORDER BY created_at DESC LIMIT 1").get(id);
      if (!previous) throw Object.assign(new Error('Geliştirme kaydı bulunamadı.'), { status: 409 });
      const now = new Date().toISOString();
      const taskId = enqueue(id, 'develop', 'develop', {
        idea: row.idea, answers: JSON.parse(row.answers_json),
        previous_development: JSON.parse(previous.output_json), revision_reason: reason.trim(),
      }, now);
      updateStage.run('developing', row.questions_json, now, id);
      insertEvent.run(id, 'REVISION_REQUESTED', actor, 'github_pending', 'developing',
        JSON.stringify({ reason: reason.trim(), task_id: taskId }), now);
      return getRun(id);
    });
  }

  function claimTask(worker, departments = ['research', 'develop', 'analyze']) {
    if (typeof worker !== 'string' || !/^[a-zA-Z0-9_.-]{2,80}$/.test(worker)) throw Object.assign(new Error('Geçersiz işçi kimliği.'), { status: 400 });
    if (!Array.isArray(departments)) throw Object.assign(new Error('Departmanlar dizi olmalı.'), { status: 400 });
    const allowed = departments.filter(name => ['research', 'develop', 'analyze'].includes(name));
    if (!allowed.length) return null;
    return transaction(() => {
      const now = new Date().toISOString();
      const row = db.prepare(`SELECT * FROM workflow_tasks WHERE department IN (${allowed.map(() => '?').join(',')})
        AND (status = 'queued' OR (status = 'running' AND lease_until < ?))
        ORDER BY created_at ASC, rowid ASC LIMIT 1`).get(...allowed, now);
      if (!row) return null;
      const token = crypto.randomUUID();
      const leaseUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      if (row.status === 'running') {
        db.prepare("UPDATE agent_runs SET status = 'expired', finished_at = ? WHERE run_id = ? AND status = 'running' AND json_extract(output_json, '$.task_id') = ?")
          .run(now, row.run_id, row.id);
        insertEvent.run(row.run_id, 'TASK_LEASE_EXPIRED', 'system', selectRun.get(row.run_id).stage,
          selectRun.get(row.run_id).stage, JSON.stringify({ task_id: row.id, previous_worker: row.worker }), now);
      }
      db.prepare(`UPDATE workflow_tasks SET status = 'running', attempt = attempt + 1, worker = ?, lease_token = ?,
        lease_until = ?, updated_at = ? WHERE id = ?`).run(worker, token, leaseUntil, now, row.id);
      insertAgent.run(crypto.randomUUID(), row.run_id, row.department, worker, 'external_worker', 'running', now, null,
        JSON.stringify({ task_id: row.id, attempt: row.attempt + 1, contract_sha256: row.contract_sha256 }));
      insertEvent.run(row.run_id, 'TASK_CLAIMED', worker, selectRun.get(row.run_id).stage,
        selectRun.get(row.run_id).stage, JSON.stringify({ task_id: row.id, attempt: row.attempt + 1 }), now);
      return { ...hydrateTask(db.prepare('SELECT * FROM workflow_tasks WHERE id = ?').get(row.id), true), lease_token: token };
    });
  }

  function appendTaskEvent(id, token, type, details = {}) {
    if (typeof type !== 'string' || !/^[A-Z][A-Z0-9_]{2,39}$/.test(type)) {
      throw Object.assign(new Error('Geçersiz olay türü.'), { status: 400 });
    }
    const payload = JSON.stringify(details);
    if (!details || typeof details !== 'object' || Array.isArray(details) || payload.length > 16000) {
      throw Object.assign(new Error('Olay ayrıntısı geçersiz veya çok büyük.'), { status: 400 });
    }
    return transaction(() => {
      const task = db.prepare('SELECT * FROM workflow_tasks WHERE id = ?').get(id);
      if (!task || task.status !== 'running' || task.lease_token !== token) {
        throw Object.assign(new Error('Görev veya kira anahtarı geçersiz.'), { status: 409 });
      }
      const row = selectRun.get(task.run_id);
      const now = new Date().toISOString();
      insertEvent.run(task.run_id, 'AGENT_EVENT', task.worker, row.stage, row.stage,
        JSON.stringify({ task_id: id, type, details }), now);
      return { run_id: task.run_id, created_at: now };
    });
  }

  function validateOutput(kind, output) {
    if (!output || typeof output !== 'object' || Array.isArray(output)) throw Object.assign(new Error('Çıktı JSON nesnesi olmalı.'), { status: 400 });
    if (typeof output.summary !== 'string' || !output.summary.trim()) throw Object.assign(new Error('summary gerekli.'), { status: 400 });
    if (kind === 'preliminary' && (!Array.isArray(output.sources) || !output.sources.length ||
      output.sources.some(source => typeof source.url !== 'string' || !/^https?:\/\//.test(source.url)) ||
      !Array.isArray(output.questions) || output.questions.length > 7 ||
      output.questions.some(q => !/^[a-z0-9_]{1,40}$/.test(q.id || '') || typeof q.label !== 'string' || !q.label.trim()))) {
      throw Object.assign(new Error('Kaynak URL’leri ve en çok 7 geçerli soru gerekli.'), { status: 400 });
    }
    if (kind === 'deep' && (!Array.isArray(output.sources) || !output.sources.length ||
      output.sources.some(source => typeof source.url !== 'string' || !/^https?:\/\//.test(source.url)) ||
      !Array.isArray(output.candidates) || !output.first_delivery || !output.handoff)) {
      throw Object.assign(new Error('Kaynak URL’leri, adaylar ve Develop devri gerekli.'), { status: 400 });
    }
    if (kind === 'develop' && (!['software', 'document'].includes(output.delivery_type) ||
      !Array.isArray(output.verification) || !output.verification.length ||
      output.verification.some(v => typeof v.command !== 'string' || !Number.isInteger(v.exit_code)) ||
      !output.verification.some(v => v.exit_code === 0))) {
      throw Object.assign(new Error('Teslimat türü ve gerçek doğrulama kaydı gerekli.'), { status: 400 });
    }
    if (kind === 'develop' && output.delivery_type === 'software' && !output.branch) {
      throw Object.assign(new Error('Yazılım teslimatı için Git dalı gerekli.'), { status: 400 });
    }
    if (kind === 'develop' && output.branch && (!/^ai-corp\/[0-9a-f]{8}$/.test(output.branch) ||
      !/^[0-9a-f]{40}$/.test(output.commit || ''))) {
      throw Object.assign(new Error('GitHub devri için AI Corp dalı ve gerçek commit SHA gerekli.'), { status: 400 });
    }
    if (kind === 'analyze' && (!Array.isArray(output.findings) || !['ready', 'blocked'].includes(output.merge_recommendation) ||
      typeof output.owner_report !== 'string')) throw Object.assign(new Error('Bulgular ve patron raporu gerekli.'), { status: 400 });
  }

  function recordUsage(runId, taskId, usage, now) {
    if (!usage || typeof usage !== 'object' ||
        (usage.actual_usd == null && usage.estimated_usd == null && usage.input_tokens == null && usage.output_tokens == null)) return;
    db.prepare(`INSERT INTO workflow_costs VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      crypto.randomUUID(), runId, taskId, String(usage.provider || 'unknown'), String(usage.model || 'unknown'),
      Number.isInteger(usage.input_tokens) ? usage.input_tokens : null,
      Number.isInteger(usage.output_tokens) ? usage.output_tokens : null,
      Number.isFinite(usage.actual_usd) ? usage.actual_usd : null,
      Number.isFinite(usage.estimated_usd) ? usage.estimated_usd : null, now);
  }

  function finishTask(id, token, output, usage = {}, contractHash) {
    const task = db.prepare('SELECT * FROM workflow_tasks WHERE id = ?').get(id);
    if (!task) throw Object.assign(new Error('Görev bulunamadı.'), { status: 404 });
    if (task.status === 'completed' && task.lease_token === token) return getRun(task.run_id);
    if (task.status !== 'running' || task.lease_token !== token) throw Object.assign(new Error('Kira anahtarı geçersiz veya süresi doldu.'), { status: 409 });
    if (contractHash !== task.contract_sha256) throw Object.assign(new Error('Departman Markdown özeti uyuşmuyor.'), { status: 409 });
    validateOutput(task.kind, output);
    const now = new Date().toISOString();
    transaction(() => {
      const row = selectRun.get(task.run_id);
      let next = row.stage;
      let questions = row.questions_json;
      if (task.kind === 'preliminary') {
        next = output.questions.length ? 'waiting_for_owner' : 'research_ready';
        questions = JSON.stringify(output.questions.map(q => ({ id: q.id, label: q.label, required: q.required !== false })));
        if (!output.questions.length) enqueue(task.run_id, 'research', 'deep', { idea: row.idea, answers: {} }, now);
      } else if (task.kind === 'deep') {
        next = 'developing';
        enqueue(task.run_id, 'develop', 'develop', { idea: row.idea, answers: JSON.parse(row.answers_json), research: output }, now);
      } else if (task.kind === 'develop') {
        next = 'analyzing';
        const research = db.prepare("SELECT output_json FROM workflow_tasks WHERE run_id = ? AND kind = 'deep' AND status = 'completed' ORDER BY created_at DESC LIMIT 1").get(task.run_id);
        enqueue(task.run_id, 'analyze', 'analyze', { idea: row.idea,
          research: research ? JSON.parse(research.output_json) : null, develop: output,
          prior_costs: selectCosts.all(task.run_id).map(cost => ({ provider: cost.provider, model: cost.model,
            actual_usd: cost.actual_usd, estimated_usd: cost.estimated_usd })),
          current_usage: usage && typeof usage === 'object' ? {
            provider: usage.provider, model: usage.model, actual_usd: usage.actual_usd,
            estimated_usd: usage.estimated_usd, input_tokens: usage.input_tokens,
            output_tokens: usage.output_tokens } : {} }, now);
      } else if (task.kind === 'analyze') {
        const development = db.prepare("SELECT output_json FROM workflow_tasks WHERE run_id = ? AND kind = 'develop' AND status = 'completed' ORDER BY created_at DESC LIMIT 1").get(task.run_id);
        const developmentOutput = development ? JSON.parse(development.output_json) : {};
        const blocked = output.merge_recommendation === 'blocked' || output.findings.some(f => ['blocker', 'high'].includes(f.severity));
        if (blocked) {
          const cycles = db.prepare("SELECT COUNT(*) AS total FROM workflow_tasks WHERE run_id = ? AND kind = 'analyze'").get(task.run_id).total;
          if (cycles < 3) {
            next = 'developing';
            enqueue(task.run_id, 'develop', 'develop', { idea: row.idea, answers: JSON.parse(row.answers_json),
              previous_development: developmentOutput, analysis_feedback: output, revision: cycles }, now);
          } else next = 'blocked';
        } else next = developmentOutput.delivery_type === 'software' && developmentOutput.branch ? 'github_pending' : 'completed';
      }
      db.prepare(`UPDATE workflow_tasks SET status = 'completed', output_json = ?, error = NULL, updated_at = ? WHERE id = ?`).run(JSON.stringify(output), now, id);
      updateStage.run(next, questions, now, task.run_id);
      db.prepare("UPDATE agent_runs SET status = 'completed', finished_at = ?, output_json = ? WHERE run_id = ? AND status = 'running' AND json_extract(output_json, '$.task_id') = ?")
        .run(now, JSON.stringify({ task_id: id, summary: output.summary }), task.run_id, id);
      recordUsage(task.run_id, id, usage, now);
      insertEvent.run(task.run_id, 'TASK_COMPLETED', task.worker, row.stage, next,
        JSON.stringify({ task_id: id, department: task.department, kind: task.kind, contract_sha256: task.contract_sha256 }), now);
    });
    return getRun(task.run_id);
  }

  function failTask(id, token, message, usage = {}, auditArtifact = null) {
    const task = db.prepare('SELECT * FROM workflow_tasks WHERE id = ?').get(id);
    if (!task || task.status !== 'running' || task.lease_token !== token) throw Object.assign(new Error('Görev veya kira anahtarı geçersiz.'), { status: 409 });
    const now = new Date().toISOString();
    transaction(() => {
      recordUsage(task.run_id, id, usage, now);
      const retry = task.attempt < 3;
      db.prepare('UPDATE workflow_tasks SET status = ?, error = ?, lease_token = NULL, lease_until = NULL, updated_at = ? WHERE id = ?')
        .run(retry ? 'queued' : 'failed', String(message || 'Bilinmeyen hata').slice(0, 2000), now, id);
      db.prepare("UPDATE agent_runs SET status = 'failed', finished_at = ?, output_json = ? WHERE run_id = ? AND status = 'running' AND json_extract(output_json, '$.task_id') = ?")
        .run(now, JSON.stringify({ task_id: id, attempt: task.attempt, error: String(message).slice(0, 2000), audit_artifact: auditArtifact }), task.run_id, id);
      const row = selectRun.get(task.run_id);
      if (!retry) updateStage.run('blocked', row.questions_json, now, task.run_id);
      insertEvent.run(task.run_id, retry ? 'TASK_RETRY_QUEUED' : 'TASK_FAILED', task.worker, row.stage,
        retry ? row.stage : 'blocked', JSON.stringify({ task_id: id, attempt: task.attempt,
          error: String(message).slice(0, 2000), audit_artifact: auditArtifact }), now);
    });
    return getRun(task.run_id);
  }

  function retryBlockedRun(runId, reason, actor = 'owner') {
    if (typeof reason !== 'string' || !reason.trim() || reason.length > 1000) {
      throw Object.assign(new Error('Yeniden deneme gerekçesi gerekli.'), { status: 400 });
    }
    return transaction(() => {
      const row = selectRun.get(runId);
      if (!row || row.stage !== 'blocked') throw Object.assign(new Error('Engellenmiş iş akışı bulunamadı.'), { status: 409 });
      const task = db.prepare("SELECT * FROM workflow_tasks WHERE run_id = ? AND status = 'failed' ORDER BY updated_at DESC LIMIT 1").get(runId);
      if (!task) throw Object.assign(new Error('Yeniden denenecek başarısız görev bulunamadı.'), { status: 409 });
      const next = task.kind === 'preliminary' ? 'preliminary_research' :
        task.kind === 'deep' ? 'research_ready' : task.kind === 'develop' ? 'developing' : 'analyzing';
      const now = new Date().toISOString();
      db.prepare("UPDATE workflow_tasks SET status = 'queued', attempt = 0, worker = NULL, lease_token = NULL, lease_until = NULL, error = NULL, updated_at = ? WHERE id = ?")
        .run(now, task.id);
      updateStage.run(next, row.questions_json, now, runId);
      insertEvent.run(runId, 'MANUAL_RETRY_REQUESTED', actor, 'blocked', next,
        JSON.stringify({ task_id: task.id, reason: reason.trim() }), now);
      return getRun(runId);
    });
  }

  function saveLink(runId, kind, key, url, payload = {}) {
    if (!selectRun.get(runId)) throw Object.assign(new Error('İş akışı bulunamadı.'), { status: 404 });
    if (typeof url !== 'string' || !url.startsWith('https://github.com/')) throw Object.assign(new Error('Geçersiz GitHub bağlantısı.'), { status: 400 });
    const now = new Date().toISOString();
    transaction(() => {
      db.prepare(`INSERT INTO workflow_links (run_id, kind, key, url, payload_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(run_id, kind, key) DO UPDATE SET url = excluded.url, payload_json = excluded.payload_json`)
        .run(runId, kind, key, url, JSON.stringify(payload), now);
      insertEvent.run(runId, 'EXTERNAL_LINK_RECORDED', 'integration.github', selectRun.get(runId).stage,
        selectRun.get(runId).stage, JSON.stringify({ kind, key, url }), now);
    });
    return getRun(runId);
  }

  function completeGitHub(runId, mergeUrl, sha) {
    const row = selectRun.get(runId);
    if (!row || row.stage !== 'github_pending') throw Object.assign(new Error('GitHub birleştirmesi bekleyen akış bulunamadı.'), { status: 409 });
    const now = new Date().toISOString();
    transaction(() => {
      updateStage.run('completed', row.questions_json, now, runId);
      insertEvent.run(runId, 'GITHUB_MERGED', 'integration.github', 'github_pending', 'completed',
        JSON.stringify({ url: mergeUrl, sha }), now);
    });
    return getRun(runId);
  }

  return { createRun, getRun, listRuns, submitAnswers, reopenForRevision, retryBlockedRun, claimTask, appendTaskEvent, finishTask, failTask, saveLink, completeGitHub, close: () => db.close() };
}

module.exports = { createWorkflowStore, createIntake };
