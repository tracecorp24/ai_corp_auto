const test = require('node:test');
const assert = require('node:assert/strict');
const { createWorkflowStore } = require('./store');
const { synchronizeRun } = require('./github');

test('Analyze onayı tek başına merge etmez; CI geçince PR birleşir', async () => {
  const store = createWorkflowStore(':memory:');
  try {
    const run = store.createRun('Sosyal medya ajansı için küçük bir yazılım kur');
    let task = store.claimTask('r1');
    store.finishTask(task.id, task.lease_token, { summary: 'Sorular', questions: [], sources: [{ url: 'https://example.org/intro' }] }, {}, task.contract_sha256);
    task = store.claimTask('r2');
    store.finishTask(task.id, task.lease_token, { summary: 'Kaynaklı plan', first_delivery: 'MVP', handoff: 'MVP',
      sources: [{ url: 'https://example.com' }], candidates: [] }, {}, task.contract_sha256);
    task = store.claimTask('d1');
    const sha = 'a'.repeat(40);
    store.finishTask(task.id, task.lease_token, { summary: 'MVP yapıldı', delivery_type: 'software',
      branch: `ai-corp/${run.id.slice(0, 8)}`, commit: sha, verification: [{ command: 'npm run build', exit_code: 0 }] }, {}, task.contract_sha256);
    task = store.claimTask('a1');
    const reviewed = store.finishTask(task.id, task.lease_token, { summary: 'İncelendi',
      findings: [{ title: 'Küçük metin hatası', severity: 'low', steps: 'Ana sayfayı aç' }],
      owner_report: 'İlk sürüm hazır.', merge_recommendation: 'ready' }, {}, task.contract_sha256);
    assert.equal(reviewed.stage, 'github_pending');

    let checksPassed = false;
    let merges = 0;
    let issues = 0;
    let createdPr = false;
    const pr = { number: 7, html_url: 'https://github.com/owner/repo/pull/7', state: 'open',
      mergeable: true, merged: false, head: { sha } };
    const client = { owner: 'owner', repository: 'owner/repo', api: async (method, endpoint) => {
      if (endpoint.includes('/pulls?')) return createdPr ? [pr] : [];
      if (method === 'POST' && endpoint.endsWith('/pulls')) { createdPr = true; return pr; }
      if (endpoint.endsWith('/issues?state=all&per_page=100')) return [];
      if (method === 'POST' && endpoint.endsWith('/issues')) { issues++; return { number: 10, html_url: 'https://github.com/owner/repo/issues/10' }; }
      if (endpoint.endsWith('/pulls/7')) return pr;
      if (endpoint.endsWith('/check-runs')) return { check_runs: checksPassed ? [{ status: 'completed', conclusion: 'success' }] : [] };
      if (endpoint.endsWith('/status')) return { statuses: [], state: 'pending' };
      if (method === 'PUT' && endpoint.endsWith('/pulls/7/merge')) { merges++; return { merged: true, sha: 'b'.repeat(40) }; }
      throw new Error(`${method} ${endpoint}`);
    } };
    assert.equal((await synchronizeRun(store, run.id, client)).status, 'checks_pending');
    assert.equal(merges, 0);
    checksPassed = true;
    assert.equal((await synchronizeRun(store, run.id, client)).status, 'merged');
    assert.equal(merges, 1);
    assert.equal(issues, 1);
    assert.equal(store.getRun(run.id).stage, 'completed');
  } finally { store.close(); }
});
