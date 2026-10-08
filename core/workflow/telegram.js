const fs = require('node:fs');
const path = require('node:path');
const { createWorkflowStore } = require('./store');

const token = process.env.AI_CORP_TELEGRAM_BOT_TOKEN;
const chatId = String(process.env.AI_CORP_TELEGRAM_CHAT_ID || '');
if (!token || !chatId) { console.error('AI_CORP_TELEGRAM_BOT_TOKEN ve AI_CORP_TELEGRAM_CHAT_ID gerekli.'); process.exit(2); }
const stateFile = path.join(__dirname, '..', '..', 'storage', 'telegram-state.json');
const state = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, 'utf8')) : { offset: 0, seen: {} };
const store = createWorkflowStore();

async function bot(method, payload) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!data.ok) throw new Error(`Telegram ${method}: ${data.description || response.status}`);
  return data.result;
}
const send = text => bot('sendMessage', { chat_id: chatId, text: text.slice(0, 4000) });
const persist = () => fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));

function report(run) {
  const research = run.tasks.find(t => t.kind === 'deep')?.output;
  const develop = run.tasks.find(t => t.kind === 'develop')?.output;
  const analyze = run.tasks.find(t => t.kind === 'analyze')?.output;
  return `${run.idea}\nDurum: ${run.stage}\nGerçek maliyet: ${run.cost_summary.actual_usd == null ? 'bildirilmedi' : '$' + run.cost_summary.actual_usd.toFixed(4)}\n` +
    `Araştırma: ${research?.summary || 'bekliyor'}\nTeslimat: ${develop?.summary || 'bekliyor'}\n` +
    `Analiz: ${analyze?.owner_report || 'bekliyor'}\nBağlantılar: ${run.links.map(l => l.url).join(', ') || 'yok'}`;
}

async function handle(message) {
  if (String(message.chat?.id) !== chatId || typeof message.text !== 'string') return;
  const [command, ...parts] = message.text.trim().split(/\s+/);
  if (command === '/status') {
    const runs = store.listRuns();
    await send(runs.length ? runs.map(r => `${r.id.slice(0, 8)} · ${r.stage} · ${r.idea}`).join('\n') : 'Henüz iş akışı yok.');
  } else if (command === '/questions') {
    const id = parts[0];
    const run = store.getRun(id) || store.listRuns().find(r => r.id.startsWith(id || '!'));
    if (!run) return send('İş akışı bulunamadı.');
    const detail = store.getRun(run.id);
    await send(detail.questions.filter(q => detail.missing_questions.includes(q.id))
      .map(q => `${q.id}: ${q.label}`).join('\n') || 'Cevap bekleyen soru yok.');
  } else if (command === '/answer') {
    const [id, question, ...answer] = parts;
    const run = store.getRun(id) || store.listRuns().find(r => r.id.startsWith(id || '!'));
    if (!run || !question || !answer.length) return send('Kullanım: /answer <iş-id> <soru-id> <cevap>');
    try { const updated = store.submitAnswers(run.id, { [question]: answer.join(' ') });
      await send(`Cevap kaydedildi. Durum: ${updated.stage}. Eksik soru: ${updated.missing_questions.join(', ') || 'yok'}`);
    } catch (error) { await send(error.message); }
  } else if (command === '/report') {
    const id = parts[0];
    const run = store.getRun(id) || store.listRuns().find(r => r.id.startsWith(id || '!'));
    await send(run ? report(store.getRun(run.id)) : 'İş akışı bulunamadı.');
  } else if (command === '/help' || command === '/start') {
    await send('/status, /questions <iş-id>, /answer <iş-id> <soru-id> <cevap>, /report <iş-id>');
  }
}

async function loop() {
  while (true) {
    try {
      const updates = await bot('getUpdates', { offset: state.offset, timeout: 25, allowed_updates: ['message'] });
      for (const update of updates) {
        await handle(update.message || {});
        state.offset = update.update_id + 1;
        persist();
      }
      for (const summary of store.listRuns()) {
        const run = store.getRun(summary.id);
        const last = run.events.at(-1);
        if (!last || state.seen[run.id] === last.id) continue;
        if (state.seen[run.id]) await send(`AI Corp · ${run.idea}\nDurum: ${run.stage}\nSon olay: ${last.type}`);
        state.seen[run.id] = last.id;
        persist();
      }
    } catch (error) {
      console.error(error.message);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}
loop();
