// Dedicated loopback port for a narrow, authenticated remote API. Expose only this port via a trusted tunnel.
const http = require('node:http');
const crypto = require('node:crypto');
const { createWorkflowStore } = require('./store');

const token = process.env.AI_CORP_REMOTE_TOKEN;
if (!token) { console.error('AI_CORP_REMOTE_TOKEN gerekli.'); process.exit(2); }
const port = Number(process.env.AI_CORP_REMOTE_PORT || 3001);
const store = createWorkflowStore();
const send = (res, status, value) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(value)); };

http.createServer(async (req, res) => {
  const actual = crypto.createHash('sha256').update(String(req.headers.authorization || '')).digest();
  const expected = crypto.createHash('sha256').update(`Bearer ${token}`).digest();
  if (!crypto.timingSafeEqual(actual, expected)) return send(res, 401, { error: 'Yetki gerekli.' });
  const url = new URL(req.url, 'http://localhost');
  const match = url.pathname.match(/^\/api\/remote\/workflows\/([0-9a-f-]+)(?:\/(answers))?$/);
  try {
    if (url.pathname === '/api/remote/workflows' && req.method === 'GET') return send(res, 200, store.listRuns());
    if (match && req.method === 'GET' && !match[2]) {
      const run = store.getRun(match[1]);
      return send(res, run ? 200 : 404, run || { error: 'İş akışı bulunamadı.' });
    }
    if (req.method !== 'POST') return send(res, 404, { error: 'Uç nokta bulunamadı.' });
    let data = '';
    for await (const chunk of req) { data += chunk; if (data.length > 1024 * 1024) throw Object.assign(new Error('İstek çok büyük.'), { status: 413 }); }
    const body = JSON.parse(data || '{}');
    if (url.pathname === '/api/remote/workflows') return send(res, 201, store.createRun(body.idea));
    if (match && match[2] === 'answers') return send(res, 200, store.submitAnswers(match[1], body.answers));
    return send(res, 404, { error: 'Uç nokta bulunamadı.' });
  } catch (error) { return send(res, error.status || 400, { error: error.message }); }
}).listen(port, '127.0.0.1', () => console.log(`Remote API: http://127.0.0.1:${port}`));
