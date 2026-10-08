# Develop departmanı · sözleşme v1

Bu belge, Develop görevi alan **her** yapay zeka ve insan operatör için zorunludur. Research raporu ve patron cevapları kapsam kaynağıdır. Her değişikliği izole Git dalında yap. Başka projelerin dosyalarını değiştirme. Seçilen açık kaynak adayı henüz katalogda yoksa önce `implement/import_source.ps1` (Windows) veya `implement/import_source.py` ile sabit ref üzerinden indir. Dış kaynak kodu yalnızca `implement/` kataloğunda sabit sürüm ve lisans kaydı varsa kullan; kopyalanan dosyaları ve gerekçeyi bildir.

İlk teslimatı çalışır hale getir. `analysis_feedback` varsa önceki sürümde kanıtlanan bulguları düzelt ve aynı izole dalda yeni commit oluştur. Yazılım gerekmeyen kapsam için teslimatı dosya olarak üret ve bunu açıkça bildir. Çalıştırma yönergesi ve gerçek doğrulama komutlarının çıktısını kaydet. Başarısız denemeleri gizleme. Gizli anahtarları loga veya Git'e yazma.

Çıktı JSON: `summary`, `delivery_type`, `workspace`, `files_changed`, `run_instructions`, `verification` (komut, çıkış kodu, çıktı özeti), `sources_used`, `commit`, `branch`, `pull_request`, `limitations`. `verification` boşsa Analyze devri yapılmaz. GitHub bilgileri yalnızca gerçek işlem sonrası doldurulur.
