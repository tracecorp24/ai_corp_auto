// Vendor-neutral local worker. The configured executable receives one JSON task on stdin
// and must write one JSON object {output, usage?} to stdout. No shell is used.
const { spawn } = require('node:child_process');
const { createWorkflowStore } = require('./store');
const { synchronizeRun, githubClient } = require('./github');

const executable = process.env.AI_CORP_AGENT_EXECUTABLE;
const args = JSON.parse(process.env.AI_CORP_AGENT_ARGS_JSON || '[]');
const worker = process.env.AI_CORP_WORKER_NAME || 'local-adapter';
const pollMs = Number(process.env.AI_CORP_POLL_MS || 3000);
const timeoutMs = Math.min(Number(process.env.AI_CORP_TASK_TIMEOUT_MS || 10 * 60 * 1000), 14 * 60 * 1000);
if (!executable || !Array.isArray(args) || !args.every(item => typeof item === 'string')) {
  console.error('AI_CORP_AGENT_EXECUTABLE ve JSON argüman dizisi gerekli.');
  process.exit(2);
}

const store = createWorkflowStore();
let stopping = false;
process.on('SIGINT', () => { stopping = true; });
process.on('SIGTERM', () => { stopping = true; });

function execute(task) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, AI_CORP_DEPARTMENT: task.department, AI_CORP_TASK_KIND: task.kind } });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => child.kill(), timeoutMs);
    child.stdout.on('data', data => { stdout += data; if (stdout.length > 5 * 1024 * 1024) child.kill(); });
    child.stderr.on('data', data => { stderr += data; if (stderr.length > 256 * 1024) child.kill(); });
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('close', code => {
      clearTimeout(timer);
      if (code !== 0) return reject(new Error(`Adapter çıkış kodu ${code}: ${stderr.slice(-2000)}`));
      try { resolve(JSON.parse(stdout)); } catch { reject(new Error('Adapter geçerli JSON üretmedi.')); }
    });
    child.stdin.end(JSON.stringify({ protocol: 'ai-corp-task-v1', task }));
  });
}

async function main() {
  while (!stopping) {
    const task = store.claimTask(worker);
    if (task) {
      let completedRun = null;
      let result = null;
      try {
        result = await execute(task);
        if (Array.isArray(result.events)) {
          if (result.events.length > 500) throw new Error('Adapter en çok 500 olay gönderebilir.');
          for (const event of result.events) {
            store.appendTaskEvent(task.id, task.lease_token, event.type, event.details || {});
          }
        }
        completedRun = store.finishTask(task.id, task.lease_token, result.output, result.usage, task.contract_sha256);
        console.log(`${task.id} tamamlandı (${task.department}/${task.kind}).`);
      } catch (error) {
        store.failTask(task.id, task.lease_token, error.message, result?.usage, result?.output?.audit_artifact);
        console.error(`${task.id}: ${error.message}`);
      }
      if (completedRun && githubClient()) {
        try { await synchronizeRun(store, completedRun.id); }
        catch (error) { console.error(`GitHub eşitlemesi (${completedRun.id}): ${error.message}`); }
      }
    } else {
      await new Promise(resolve => setTimeout(resolve, pollMs));
    }
  }
  store.close();
}

main().catch(error => { console.error(error); process.exitCode = 1; });
