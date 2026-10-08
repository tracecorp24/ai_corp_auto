const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createWorkflowStore } = require('./store');

test('kapsam soruları cevaplanana kadar Research bekler', () => {
  const store = createWorkflowStore(':memory:');
  try {
    const run = store.createRun('Sosyal medya ajansı kurmak istiyorum');
    assert.equal(run.stage, 'preliminary_research');
    assert.equal(run.intake.method, 'rule_based_intake');
    assert.equal(run.missing_questions.length, 0);
    assert.deepEqual(run.events.map(event => event.type), ['IDEA_RECEIVED']);
    const preliminary = store.claimTask('research-worker', ['research']);
    assert.equal(preliminary.kind, 'preliminary');
    assert.match(preliminary.contract_markdown, /Research departmanı/);
    assert.throws(() => store.finishTask(preliminary.id, preliminary.lease_token,
      { summary: 'Yanlış sözleşme', questions: [] }, {}, 'wrong'), { status: 409 });
    assert.throws(() => store.submitAnswers(run.id, { goal: 'Erken cevap' }), { status: 409 });
    const asked = store.finishTask(preliminary.id, preliminary.lease_token, {
      summary: 'Hedef net değil', questions: [
        { id: 'goal', label: 'İlk teslimat?', required: true },
        { id: 'customer', label: 'İlk müşteri?', required: true },
      ], sources: [{ url: 'https://example.org/intro' }], unknowns: ['Hedef'],
    }, {}, preliminary.contract_sha256);
    assert.equal(asked.stage, 'waiting_for_owner');
    assert.equal(asked.missing_questions.length, 2);

    const partial = store.submitAnswers(run.id, { goal: 'Ajans iş planı' });
    assert.equal(partial.stage, 'waiting_for_owner');
    assert.equal(partial.missing_questions.length, 1);
    assert.equal(partial.events.at(-1).type, 'ANSWERS_SAVED');

    const ready = store.submitAnswers(run.id, {
      customer: 'Yerel işletmeler',
    });
    assert.equal(ready.stage, 'research_ready');
    assert.deepEqual(ready.missing_questions, []);
    assert.equal(ready.events.at(-1).type, 'RESEARCH_READY');
    const deep = store.claimTask('model-b', ['research']);
    assert.equal(deep.kind, 'deep');
    assert.equal(deep.input.answers.goal, 'Ajans iş planı');
    assert.notEqual(deep.contract_sha256, '');
    const developed = store.finishTask(deep.id, deep.lease_token, {
      summary: 'Araştırma tamam', first_delivery: 'Ajans planı', handoff: 'İlk sürüm planı',
      sources: [{ url: 'https://example.org/source', claim: 'Kapsam' }], candidates: [],
    }, {}, deep.contract_sha256);
    assert.equal(developed.stage, 'developing');
    const build = store.claimTask('model-c', ['develop']);
    assert.equal(build.department, 'develop');
    assert.throws(() => store.finishTask(build.id, build.lease_token, { summary: 'Hazır', verification: [] }, {}, build.contract_sha256), { status: 400 });
    const analyzing = store.finishTask(build.id, build.lease_token, {
      summary: 'Plan hazır', delivery_type: 'document', verification: [{ command: 'node --check', exit_code: 0 }], files_changed: [],
    }, { provider: 'example', model: 'model-c', actual_usd: 0.04 }, build.contract_sha256);
    assert.equal(analyzing.stage, 'analyzing');
    assert.equal(analyzing.cost_summary.actual_usd, 0.04);
    const review = store.claimTask('model-d', ['analyze']);
    const completed = store.finishTask(review.id, review.lease_token, {
      summary: 'İnceleme tamam', findings: [], owner_report: 'İlk plan hazır.', merge_recommendation: 'ready',
    }, {}, review.contract_sha256);
    assert.equal(completed.stage, 'completed');
    assert.equal(completed.tasks.length, 4);
    assert.throws(() => store.submitAnswers(run.id, { goal: 'Değişiklik' }), { status: 409 });
  } finally { store.close(); }
});

test('durum ve olaylar yeniden açılan SQLite veritabanında kalır', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-corp-workflow-'));
  const dbPath = path.join(dir, 'state.db');
  let first;
  let second;
  try {
    first = createWorkflowStore(dbPath);
    const run = first.createRun('Küçük işletmeler için sosyal medya ajansı kurmak istiyorum');
    const task = first.claimTask('research-worker');
    first.finishTask(task.id, task.lease_token, { summary: 'Sorular', questions: [{ id: 'customer', label: 'Müşteri?', required: true }], sources: [{ url: 'https://example.org/intro' }] }, {}, task.contract_sha256);
    first.submitAnswers(run.id, { customer: 'Küçük işletmeler' });
    first.close();
    first = null;

    second = createWorkflowStore(dbPath);
    const restored = second.getRun(run.id);
    assert.equal(restored.answers.customer, 'Küçük işletmeler');
    assert.equal(restored.stage, 'research_ready');
    assert.equal(restored.events.length, 4);
  } finally {
    first?.close();
    second?.close();
    for (const suffix of ['', '-wal', '-shm']) {
      const file = dbPath + suffix;
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
    fs.rmdirSync(dir);
  }
});

test('Analyze engelleyici bulguyu iki kez Develop ekibine geri yollar', () => {
  const store = createWorkflowStore(':memory:');
  try {
    const run = store.createRun('Yeni bir sosyal medya aracı geliştir');
    let task = store.claimTask('research');
    store.finishTask(task.id, task.lease_token, { summary: 'Ön araştırma', questions: [], sources: [{ url: 'https://example.org' }] }, {}, task.contract_sha256);
    task = store.claimTask('research');
    store.finishTask(task.id, task.lease_token, { summary: 'Derin araştırma', first_delivery: 'Araç', handoff: 'Araç',
      sources: [{ url: 'https://example.org' }], candidates: [] }, {}, task.contract_sha256);
    for (let cycle = 1; cycle <= 3; cycle++) {
      task = store.claimTask('developer', ['develop']);
      store.finishTask(task.id, task.lease_token, { summary: `Sürüm ${cycle}`, delivery_type: 'document',
        verification: [{ command: 'dir', exit_code: 0 }] }, {}, task.contract_sha256);
      task = store.claimTask('analyst', ['analyze']);
      const result = store.finishTask(task.id, task.lease_token, { summary: 'Eksik var', findings: [{ severity: 'high', title: 'Eksik' }],
        owner_report: 'Düzeltme gerekli.', merge_recommendation: 'blocked' }, {}, task.contract_sha256);
      assert.equal(result.stage, cycle < 3 ? 'developing' : 'blocked');
      if (cycle < 3) assert.equal(result.tasks.at(-1).input.revision, cycle);
    }
    assert.equal(store.getRun(run.id).tasks.filter(t => t.kind === 'develop').length, 3);
  } finally { store.close(); }
});
