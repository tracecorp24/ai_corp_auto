# Sürüm ve issue düzeni

Ana yazılım ve her üretilen proje ayrı Git deposu, issue listesi ve `vMAJOR.MINOR.PATCH` sürüm dizisi kullanır. Kod değişiklikleri dal/PR üzerinden `main`e gelir. Başarılı `main` kalite kapısından sonra release iş akışı yeni commit varsa PATCH sürümünü artırır ve GitHub release notlarını oluşturur. Büyük uyumsuz değişiklikler için MAJOR/MINOR kararı ve etiket geçişi ayrıca kaydedilir. Başarısız CI veya değişiklik yoksa sürüm üretilmez.

Hatalar ve iyileştirmeler issue olarak açılır. Her issue önem, yeniden üretme/kanıt veya kabul ölçütü, ilgili commit/PR ve kapanış gerekçesi taşır. Haftalık triage iş akışı önem etiketi bulunmayan açık issue'ları `needs-triage` ile işaretler; issue'ları kendiliğinden kapatmaz. Analyze ajanı proje deposunda bulguları idempotent issue olarak açar. `blocker` ve `high` açıkken otomatik merge yapılmaz.

Kaynak kod ve sürümler GitHub'da izlenir; SQLite görev veritabanı, ajan izleri, indirilmiş kaynak arşivleri ve gerçek müşteri verileri yerel kalır. Bunların Git yedeği olduğu varsayılmaz.
