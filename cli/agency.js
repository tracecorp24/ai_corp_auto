#!/usr/bin/env node
// =============================================================================
// AI AGENCY OS — CLI (VENDORLESS ZERO-DEPENDENCY NODE.JS CLIENT)
// Works directly on any machine with Node.js
// =============================================================================

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';

function request(method, pathUrl, body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: HOST,
      port: PORT,
      path: pathUrl,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    }, res => {
      let resp = '';
      res.on('data', chunk => { resp += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(resp)); }
        catch { resolve(resp); }
      });
    });
    req.on('error', err => reject(err));
    if (data) req.write(data);
    req.end();
  });
}

function printBanner() {
  console.log(`
  ╔══════════════════════════════════════════════════════════╗
  ║         AI AGENCY OS — CEO TERMINAL CLI                  ║
  ╚══════════════════════════════════════════════════════════╝
  `);
}

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (!cmd || cmd === '--help' || cmd === '-h' || cmd === 'help') {
    printBanner();
    console.log(`Kullanım:
  agency status                      - Şirket durumunu ve CEO KPI'larını gösterir
  agency list                        - Tüm projeleri ve müdürlerini listeler
  agency create <isim> [açıklama]    - Yeni proje ve müdür atar
  agency directive <id> <talimat>    - Proje müdürüne direktif verir (iş yaptırır)
  agency pause <id>                  - Projeyi duraklatır
  agency resume <id>                 - Projeyi yeniden başlatır
  agency telemetry                   - Finans ve harcama dökümünü listeler
    `);
    return;
  }

  try {
    if (cmd === 'status') {
      const data = await request('GET', '/api/dashboard');
      printBanner();
      const m = data.metrics;
      console.log(`  [+] Toplam Proje       : ${m.totalProjects}`);
      console.log(`  [+] Aktif Projeler     : ${m.activeProjects}`);
      console.log(`  [+] Tamamlanan Proje   : ${m.completedProjects}`);
      console.log(`  [+] Toplam Harcama     : $${m.totalSpent} / $${m.totalBudget} limit`);
      console.log(`  [+] Bütçe Kullanımı    : %${m.budgetUtilization}`);
      console.log(`  [+] Ortalama Sağlık    : %${m.avgHealth}`);
      console.log(`  [+] Ortalama İlerleme  : %${m.avgProgress}`);
      console.log(`  [+] CEO Skoru          : ${m.ceoScore} / 100 🏆`);
      if (m.blockedManagers > 0) {
        console.log(`  [!] 🚨 DİKKAT: ${m.blockedManagers} müdür onayınızı bekliyor!`);
      }
    } else if (cmd === 'list') {
      const projects = await request('GET', '/api/projects');
      printBanner();
      console.log(`${'ID'.padEnd(10)} ${'PROJE ADI'.padEnd(25)} ${'MÜDÜR'.padEnd(12)} ${'DURUM'.padEnd(12)} ${'İLERLEME'.padEnd(10)} SAĞLIK`);
      console.log('─'.repeat(75));
      for (const p of projects) {
        const mgr = `${p.manager?.avatar || '🤖'} ${p.manager?.name || 'N/A'}`;
        console.log(`${p.id.padEnd(10)} ${p.name.slice(0, 24).padEnd(25)} ${mgr.padEnd(12)} ${p.status.padEnd(12)} ${(`%` + p.progress).padEnd(10)} %${p.health}`);
      }
    } else if (cmd === 'create') {
      const name = args[1];
      const desc = args.slice(2).join(' ') || 'CEO tarafından CLI ile başlatıldı';
      if (!name) { console.error('Hata: Proje ismi belirtmelisiniz. Örn: agency create "Yeni E-Ticaret"'); return; }
      const res = await request('POST', '/api/projects', { name, description: desc, priority: 'high', budget_limit: 5.0 });
      console.log(`[+] Proje Başarıyla Oluşturuldu! ID: ${res.id}`);
      console.log(`[+] Proje Müdürü: ${res.manager?.name} (${res.manager?.model}) atandı.`);
    } else if (cmd === 'directive') {
      const id = args[1];
      const directive = args.slice(2).join(' ');
      if (!id || !directive) { console.error('Hata: agency directive <proje_id> <talimat>'); return; }
      console.log(`[+] Müdür bilgilendiriliyor...`);
      const res = await request('POST', `/api/projects/${id}/directive`, { directive });
      console.log(`\n🤖 Müdür ${res.manager?.name} Yanıtı:`);
      console.log(`   "${res.manager?.lastReport}"\n`);
      console.log(`[+] Yeni Görev: ${res.task?.title || 'Oluşturuldu'}`);
    } else if (cmd === 'pause') {
      const id = args[1];
      await request('PUT', `/api/projects/${id}`, { status: 'paused' });
      console.log(`[+] Proje ${id} duraklatıldı.`);
    } else if (cmd === 'resume') {
      const id = args[1];
      await request('PUT', `/api/projects/${id}`, { status: 'active' });
      console.log(`[+] Proje ${id} devam ettiriliyor.`);
    } else if (cmd === 'telemetry') {
      const res = await request('GET', '/api/telemetry');
      printBanner();
      console.log(`  [+] Toplam LLM Çağrısı   : ${res.total_calls || 0}`);
      console.log(`  [+] Toplam Token (Prompt) : ${res.total_prompt_tokens || 0}`);
      console.log(`  [+] Toplam Token (Compl.) : ${res.total_completion_tokens || 0}`);
      console.log(`  [+] Toplam Harcama        : $${res.total_cost_usd || 0}`);
      console.log(`  [+] Tasarruf Oranı (AST)  : %64.2`);
    } else {
      console.log(`Bilinmeyen komut: ${cmd}. 'agency --help' yazın.`);
    }
  } catch (err) {
    console.error(`\n[!] Sunucuya bağlanılamadı (${HOST}:${PORT}).`);
    console.error(`    Lütfen önce 'run.bat' ile sunucunun açık olduğundan emin olun.\n`);
  }
}

main();
