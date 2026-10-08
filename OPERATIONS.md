# AI Corp yerel çalışma kılavuzu

## Başlatma

Node.js 24+ ve `dashboard/dist` gerekir. `run.bat` yerel sunucuyu başlatır. Codex CLI yüklü ve oturum açık ise varsayılan adaptör seçilir. Başka bir AI için `AI_CORP_AGENT_EXECUTABLE` ve `AI_CORP_AGENT_ARGS_JSON` ayarlanır; protokol `departments/WORKER_PROTOCOL.md` dosyasındadır. Her görev, ilgili departmanın Markdown içeriğini ve SHA256 özetini veritabanında saklar. Model değiştirmek eski görevlerin sözleşmesini değiştirmez.

Örnek PowerShell yapılandırması (değerler örnektir, sırları dosyaya yazmayın):

```powershell
$env:AI_CORP_GITHUB_REPO = 'owner/repo'
$env:AI_CORP_GITHUB_BASE = 'main'
$env:AI_CORP_GITHUB_TOKEN = '<fine-grained-token>'
$env:AI_CORP_PROJECT_REMOTE_URL = 'https://github.com/owner/repo.git'
$env:AI_CORP_TELEGRAM_BOT_TOKEN = '<bot-token>'
$env:AI_CORP_TELEGRAM_CHAT_ID = '<chat-id>'
$env:AI_CORP_REMOTE_TOKEN = '<uzun-rastgele-token>'
$env:AI_CORP_WORKER_TOKEN = '<uzun-rastgele-token>'
./run.bat
```

Tokenlar verilmezse ilgili bağlantı devre dışı kalır; simülasyon verisi üretilmez. GitHub tokenının repo içerikleri, pull request, issue ve checks okuma/yazma izinleri göreve uygun olmalıdır. Hedef deponun CI kontrolleri tanımlanmalıdır. GitHub merge kapısı en az bir başarılı check run, başarılı commit status, Analyze onayı ve yüksek önem dereceli açık bulgu olmaması koşullarını arar. Kontroller eksikse PR açık kalır. GitHub işlemlerini tekrar denemek için `node core/workflow/github.js` çalıştırılabilir.

`AI_CORP_PROJECT_REMOTE_URL` verilmezse Develop yerel `storage/projects/<run-id>` Git deposunda çalışır. Bu durumda GitHub'a PR açılamaz. Kaynaklar `implement/import_source.ps1` ile sabit commit ve lisans bilgisiyle alınır. İndirilen arşivler ve açılmış kod Git'e eklenmez.

## Patron kanalları

Dashboard yerel `http://127.0.0.1:3000` adresindedir. Telegram botu token ve chat ID varsa uzun yoklamayla başlar: `/status`, `/questions <iş-id>`, `/answer <iş-id> <soru-id> <cevap>`, `/report <iş-id>`. Bot yalnızca yapılandırılan chat ID'den komut kabul eder.

Uzak API yalnızca `127.0.0.1:3001` üzerinde ayrı bir süreçte çalışır ve her istekte Bearer token ister. Dışarıya açılacaksa güvenilir bir tünel sadece bu portu açmalıdır; ana dashboard portunu açmayın. GPT Remote veya başka istemci şu uç noktaları kullanabilir:

- `GET /api/remote/workflows`
- `POST /api/remote/workflows` — `{ "idea": "..." }`
- `GET /api/remote/workflows/:id`
- `POST /api/remote/workflows/:id/answers` — `{ "answers": { "goal": "..." } }`

Bu bir genel HTTP protokolüdür; GPT Remote içinde ayrı bir araç tanımı kurulmadıkça kendiliğinden görünmez.

## İşçi ve denetim

Harici AI işçisi `POST /api/worker/claim` ile görevi alır ve sonuç için `complete` veya `fail` çağırır. Yerel adaptör aynı SQLite kuyruğunu kullanır. Kira 15 dakikadır; üç başarısız deneme akışı `blocked` durumuna geçirir. Her deneme, sözleşme özeti ve durum geçişi kaydedilir. `actual_usd` yalnızca sağlayıcının bildirdiği gerçek ücretse yazılır; bildirilmeyen maliyet sıfır varsayılmaz, boş kalır.

Kabul senaryosu: fikir → kaynaklı ön araştırma → sorular → patron cevabı → kaynaklı derin araştırma → Develop çalışma alanı ve doğrulama → Analyze raporu/issues → CI/Analyze kapısından sonra otomatik merge. İlk sosyal medya ajansı kaydı (`ede5fceb-3efd-4431-91ef-473f6fd37e95`) patron cevaplarıyla Research, Develop ve beş Analyze turundan geçti. `storage/projects/<run-id>` içinde çalışan müşteri yönetimi MVP'si, yerel `main` tabanı, çalışma dalı, GitHub Actions CI, sürüm ve issue iş akışları vardır. Durum `github_pending`: ayrı GitHub deposu/kimlik bilgisi, PR, gerçek CI sonucu ve merge bekleniyor. Bu eski kayıt kural tabanlı ön sorularla başladığı için ön araştırma kaynaklı sayılmaz; derin araştırma kaynaklıdır. Ana yazılımın sürüm/issue kuralları `VERSIONING.md` içindedir.
