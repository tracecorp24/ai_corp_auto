# AI Agency OS dashboard

React/Vite arayüzü, kökteki `server.js` API'sini kullanır. Üretim arayüzünü kök dizinden `run.bat` ile `http://127.0.0.1:3000` adresinde açabilirsiniz.

Sunucu, yerleşik `node:sqlite` modülünü kullandığı için Node.js 24 veya daha yeni bir sürüm gerektirir. `run.bat` uyumlu sürümü kontrol eder.

Geliştirme sırasında iki terminal kullanın:

```powershell
cd D:\ai_corp\dashboard
npm run server
```

```powershell
cd D:\ai_corp\dashboard
npm run dev
```

Vite arayüzü `http://127.0.0.1:5173` adresinde çalışır ve `/api` ile `/ws` isteklerini kök sunucuya yönlendirir. `npm run build` üretim dosyalarını `dist/` altına yazar.

Üç departman gerçek SQLite görev kayıtlarını gösterir. Yeni fikir önce kaynaklı ön araştırma görevine girer. Ajanın ürettiği sorular patrona gösterilir; cevaplar tamamlanınca derin araştırma, geliştirme ve analiz sırayla kuyruğa girer. Kurulu Codex CLI, `run.bat` ile varsayılan adaptör olarak seçilir; `AI_CORP_AGENT_EXECUTABLE` ile başka bir modelin adaptörü kullanılabilir. Genel Bakış'taki eski proje, ilerleme ve maliyet kayıtları demo olarak işaretlenmiştir.

İş akışı API'si:

- `GET /api/workflows` — kayıtlı akışlar
- `POST /api/workflows` — `{ "idea": "..." }` ile yeni fikir
- `GET /api/workflows/:id` — sorular, cevaplar, olaylar ve ajan çalışmaları
- `POST /api/workflows/:id/answers` — `{ "answers": { "goal": "..." } }` ile kısmi veya tam cevap

Kalıcı durum `storage/workflow.db` dosyasındadır ve Git'e eklenmez. Kurulum, uzaktan erişim ve GitHub kapısı için kökteki `OPERATIONS.md` dosyasına bakın.
