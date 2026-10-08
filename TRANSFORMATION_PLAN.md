# AI Agency OS dönüşüm planı

## Uygulama durumu (8 Ekim 2026)

- Mobil dashboard ve üç departman görünümü hazır.
- Research, Develop ve Analyze için sürümlü Markdown sözleşmeleri, SQLite görev kuyruğu, kira/yeniden deneme, ajan çalışması, olay ve maliyet kaydı hazır.
- İlk fikir `Sosyal medya ajansı kurmak istiyorum` olarak kaydedildi; patron cevapları alındı ve derin araştırma tamamlandı.
- Eski demo projesinin otomatik ilerleme/harcama zamanlayıcısı ve sahte direktif üretimi kapatıldı.
- Yeni fikirler önce gerçek `research/preliminary` görevine giriyor. Herhangi bir AI, aynı Markdown sözleşmesini içeren görev paketini alabilir. Cevaplardan sonra Research deep → Develop → Analyze devirleri otomatik kuyruğa alınır.
- Yerel komut adaptörü, Codex CLI köprüsü, GitHub PR/issue/merge eşitleyicisi, Telegram botu ve ayrı tokenlı remote API eklendi. Dış bağlantılar kimlik bilgisi ve hedef depo yapılandırması olmadan canlı çalışmaz.
- Mevcut ilk kayıt eski kural tabanlı soru akışından geldi; bu kayıtta kaynaklı ön araştırma yapılmış sayılmaz. Sonraki derin araştırma kaynaklıdır.
- Sosyal medya ajansı için ayrı yerel Git deposunda çalışan müşteri yönetimi MVP'si geliştirildi. İlk Analyze turunun Türkçe sistem metni bulgusu Develop'e döndü ve düzeltildi. Sonraki revizyonda PR için boş `main` tabanı ve GitHub Actions CI eklendi. Dördüncü Analyze turunda otomatik sürüm ve issue düzeni incelenip hazır bulundu. Gerçek GitHub hedefi ve hesap erişimi eksik olduğu için durum `github_pending`.

## Uygulanan durum ve kalan bağlantılar

Yerel uygulamada SQLite iş akışı, departman Markdown sözleşme özetleri, görev kirası ve yeniden deneme, olay/maliyet kayıtları, modelden bağımsız işçi protokolü, kaynak havuzu, mobil dashboard, Codex CLI köprüsü, Telegram botu, tokenlı uzak API ve GitHub PR/issue/merge eşitleyicisi hazırdır. Codex CLI JSONL izi yerel artefakt olarak saklanır; diğer modeller olay uç noktası veya adaptör `events` alanıyla ara adımlarını bildirebilir. İşçi olay bildirmiyorsa araç düzeyindeki her ayrıntı kendiliğinden oluşmaz.

İlk CRM projesinde Research, Develop ve Analyze kayıtları `github_pending` aşamasına ulaştı. Ayrı GitHub deposu, yazma kimliği ve canlı CI sonucu olmadan PR, issue ve merge gerçekleşmiş sayılmaz. Telegram bot tokenı ve chat ID'si, uzak API tokenı ve GPT Remote tarafında araç tanımı sağlanmadığı için bu kanallar canlı bağlı değildir. Mevcut GitHub entegrasyonu PAT ve periyodik eşitleme kullanır; GitHub App ve imzalı webhook aşağıdaki uzun vadeli mimari hedefleridir.

## Sabit kararlar

- İlk sürüm tek bilgisayarda yerel çalışacak.
- Sistem üç departmandan oluşacak: Research, Develop, Analyze.
- Research, ilk fikir olarak `Sosyal medya ajansı kurmak istiyorum` talebini ön araştırmaya alacak.
- Açık kaynak adaylarının arşivleri ve açılmış kaynakları yerel `implement/` klasöründe saklanacak. Seçilen parçalar hedef projenin izole dalına, kaynak ve lisans kaydıyla aktarılacak.
- GitHub işlemleri merge dahil otomatik olabilir. Merge yalnızca aşağıdaki otomatik kapılar geçilince yapılacak; patronun her PR için elle onayı aranmayacak.

## Ürün ilkesi

Panelde görünen her sonuç gerçek bir olaya, araca veya dosyaya dayanmalı. Simülasyon verisi yalnızca açıkça işaretlenmiş demo alanında bulunabilir. Harcama tahmini, sağlayıcıdan gelen gerçek harcamadan ayrı tutulur.

## Akış

1. **Fikir kaydı:** İlk metin, hedef, bütçe ve kaynak kanal değiştirilemez ilk girdi olarak saklanır.
2. **Research / ön araştırma:** Fikrin türü ve belirsizlikleri belirlenir. Çıktı: kısa ön değerlendirme ve cevaplanması gereken sorular.
3. **Patron cevabı bekleme:** Akış kalıcı olarak durur. Dashboard, Telegram veya GPT Remote aynı soru kimliğine cevap verebilir. Cevap yetersizse yalnızca eksik alanlar yeniden sorulur.
4. **Research / derin araştırma:** Kaynaklı bulgular, çözüm seçenekleri, açık kaynak adayları, lisanslar ve seçim gerekçeleri hazırlanır.
5. **Develop:** Teslimat türü ve ilk sürüm kapsamı belirlenir. Gerekirse kod, ayrı Git dalında geliştirilir; gerçek build/çalıştırma sonucu ve PR kaydedilir.
6. **Analyze:** Gereksinim karşılaştırması, güvenlik/erişilebilirlik/kalite incelemesi yapılır. Yeniden üretilebilir bulgular önem derecesiyle issue olur.
7. **Otomatik karar:** Engelleyici bulgu varsa PR açık kalır ve Develop'e en çok iki düzeltme döngüsü verilir. Üçüncü inceleme de engelleyici bulgu bulursa akış `blocked` olur. Zorunlu kontroller ve Analyze kapısı geçerse PR otomatik merge edilir. Patron raporu ve sonraki seçenekler yayınlanır.

`Sosyal medya ajansı` gibi bir fikir otomatik olarak yazılım projesi sayılmaz. Research; iş planı, ajans iç aracı, müşteriye satılacak ürün veya bunların birleşimi arasındaki hedefi sorularla netleştirir.

## Kalıcı durum modeli

Tek API ve tek veri kaynağı kullanılacak. Yerel ilk sürümde işlem kayıtları veritabanında tutulacak; eşzamanlı çalışan işçi sayısı artarsa veritabanı ve kuyruk stratejisi genişletilecek.

Temel kayıtlar: `projects`, `workflow_runs`, `tasks`, `agent_runs`, `questions`, `answers`, `events`, `artifacts`, `sources`, `open_source_candidates`, `github_links`, `tool_calls`, `cost_records`.

Her olayda `event_id`, proje/çalışma/görev kimliği, aktör, önceki ve yeni durum, zaman, girdi/çıktı referansı ve hata bilgisi bulunur. Büyük çıktıların kendisi ayrı artefakt olarak saklanır. Ajan durumları `queued`, `running`, `waiting_for_tool`, `waiting_for_owner`, `completed`, `failed`, `cancelled` olarak izlenir. Yeniden denenen işler ayrı `attempt` kaydı alır; GitHub yazma işlemleri tekrar çalıştırıldığında çift PR veya issue açmamalıdır.

## Departman sözleşmeleri

### Research

**Girdi:** Fikir, cevaplar ve varsa proje deposu. **Çıktı:** Araştırma dosyası, kaynak bağlantıları, cevaplanmış sorular, bilinmeyenler ve açık kaynak aday listesi. **Devir koşulu:** İlk sürümün hedefi, sınırları ve kaynak seçimi açık.

### Develop

**Girdi:** Research dosyası ve seçilmiş kaynaklar. **Çıktı:** Çalışan sürüm veya kod gerektirmeyen ilk teslimat, çalışma yönergesi, doğrulama kaydı, commit ve PR. **Devir koşulu:** Gerçek doğrulama çalışmış ve çıktı yeniden incelenebilir.

### Analyze

**Girdi:** Research kapsamı, Develop çıktısı ve doğrulama kaydı. **Çıktı:** Kanıtlı bulgular, issue bağlantıları, kapsam karşılaştırması ve patron raporu. **Devir koşulu:** Engelleyici bulgular düzeltilmiş veya proje kararı açıkça kaydedilmiş.

## GitHub ve kaynak kodu

GitHub App en az gerekli izinlerle kurulacak. Her proje için dal/PR/issue eşlemesi yerel olay günlüğünde tutulacak. Webhook'lar imza doğrulaması ve tekrar teslim toleransı ile işlenecek. Ana dal için zorunlu kontroller: build, ilgili testler, kaynak/lisans envanteri, gizli anahtar taraması ve Analyze engelleyici bulgu kontrolü. Bu kapılar geçmeden otomatik merge yapılmaz.

`implement/archives/` indirilen arşivleri, `implement/extracted/` açılmış kaynakları tutar. Her aday için kaynak URL, commit veya sürüm, arşiv özeti, lisans, kullanılan dosyalar ve aktarım gerekçesi kaydedilir. Lisans bilgisi bulunmayan kod otomatik kopyalanmaz. Kopyalanan parçalar hedef projenin Git geçmişinde görünür.

## Dashboard

- **Genel bakış:** Projeler, gerçek harcama, bekleyen patron soruları, son olaylar.
- **Research:** Ön araştırma, soru formu, kaynaklar ve açık kaynak adayları.
- **Develop:** Kapsam, dosyalar, çalışma sonucu, commitler ve PR.
- **Analyze:** Bulgular, issue listesi, otomatik merge kapısı ve patron raporu.
- **Mobil:** Tek sütun düzen, alt gezinme, kısa karar kartları, uzun loglar için ayrı ekran.

İlk arayüz aşamasında departman ekranları ve mobil düzen hazırlanır. Gerçek iş akışı bağlanana kadar mevcut simülasyon verileri açıkça demo olarak gösterilir.

## Uygulama sırası

1. Mobil dashboard ve üç departman görünümü.
2. Simülasyondan ayrılmış gerçek durum API'si, olay günlüğü ve kalıcı bekleme.
3. Research soru-cevap ve kaynaklı araştırma hattı.
4. `implement/` kaynak havuzu ve GitHub App bağlantısı.
5. Develop işçisi, izole Git çalışma alanı ve gerçek doğrulama.
6. Analyze işçisi, issue üretimi ve otomatik merge kapısı.
7. Telegram ve GPT Remote kanallarının aynı API'ye bağlanması.

İlk uçtan uca kabul senaryosu: `Sosyal medya ajansı kurmak istiyorum` girdisi sorular üretir, patron cevabını bekler, cevap sonrası kaynaklı araştırma yapar, uygun ilk teslimatı oluşturur, bağımsız analiz yapar ve tüm kararları dashboard üzerinden izlenebilir kılar.
