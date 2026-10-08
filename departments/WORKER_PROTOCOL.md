# Modelden bağımsız görev protokolü v1

AI Corp bütün modelleri aynı görev sözleşmesiyle çalıştırır. Her görev paketinde `department`, `kind`, `input`, `contract_markdown`, `contract_sha256`, `attempt` ve `lease_token` vardır. İşçi önce Markdown sözleşmesini, sonra görev girdisini uygular. Departman adından hareketle kendi talimatını varsaymaz. Başka model aynı görevi devralırsa aynı sürümlenmiş Markdown'ı alır.

## Yerel komut adaptörü

`AI_CORP_AGENT_EXECUTABLE` çalıştırılabilir dosyanın yoludur. `AI_CORP_AGENT_ARGS_JSON` JSON argüman dizisidir. Komut stdin'den `{ "protocol": "ai-corp-task-v1", "task": {...} }` alır; stdout'a yalnızca `{ "output": {...}, "usage": {...}, "events": [{ "type": "TOOL_STARTED", "details": {...} }] }` yazar. `events` isteğe bağlıdır ve en çok 500 olay içerir. Günlükleri stderr'e yazar. İşçinin kendi modeline çağrı yapması, kaynak araştırması veya kod geliştirmesi bu adaptörün sorumluluğudur. `usage.actual_usd` yalnızca sağlayıcının gerçek maliyet verisi varsa doldurulur; `estimated_usd` ayrı tutulur.

## HTTP işçi protokolü

Yerel sunucuya `Authorization: Bearer $AI_CORP_WORKER_TOKEN` ile `POST /api/worker/claim` gövdesi `{ "worker": "benzersiz-ad", "departments": ["research"] }` gönderilir. Görev yoksa `task: null` döner. Görev, 15 dakika kiralanır. Başarılı sonuç `POST /api/worker/tasks/:id/complete` gövdesi `{ "lease_token": "...", "contract_sha256": "görevdeki özet", "output": {...}, "usage": {...} }` ile, hata `.../fail` gövdesi `{ "lease_token": "...", "error": "..." }` ile bildirilir. Aynı tamamlamanın tekrarı idempotenttir. Sözleşme özeti uyuşmazsa çıktı reddedilir. Süresi dolan iş başka işçi tarafından alınabilir; eski kira anahtarının sonucu kabul edilmez. Üç başarısız denemeden sonra akış `blocked` olur.

`AI_CORP_WORKER_TOKEN` sunucu ve dış işçide aynı ortam değişkeni olmalıdır. Sırları sohbet mesajına, Git'e veya görev çıktısına koyma. Yerel komut adaptörü doğrudan SQLite kullanır ve bu tokena gerek duymaz.

İşçi, önemli ara durumları `POST /api/worker/tasks/:id/events` ile `{ "lease_token": "...", "type": "TOOL_STARTED", "details": { "tool": "..." } }` biçiminde kaydeder. Aynı uç nokta `TOOL_FINISHED`, `SOURCE_REVIEWED`, `ARTIFACT_CREATED`, `WAITING_FOR_TOOL` gibi olayları da kabul eder; olay türü büyük harf/rakam/alt çizgi kullanır. Gizli anahtarlar veya kişisel veriler olay ayrıntısına yazılmaz. Codex CLI köprüsü ayrıca ham JSONL çalışma izini yerel `storage/agent-output/` dizininde saklar; bu dizin Git dışında kalır.
