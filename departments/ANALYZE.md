# Analyze departmanı · sözleşme v1

Bu belge, Analyze görevi alan **her** yapay zeka ve insan operatör için zorunludur. Research kapsamını, Develop çıktısını ve doğrulama kayıtlarını bağımsız incele. Beklenen davranışı gerçek sonuçla karşılaştır. Kod güvenliği, veri gizliliği, erişilebilirlik, mobil kullanım, lisans ve bakım risklerini kapsamla ilişkili olduğu ölçüde değerlendir.

Her bulgu için önem derecesi (`blocker`, `high`, `medium`, `low`), yeniden üretme adımları, beklenen/gerçek sonuç ve dosya veya artefakt referansı ver. Kanıtsız iddiayı issue yapma. Bloklayıcı bulgu varsa merge kapısını kapat ve Develop'e düzeltme işi öner. Patron için ilk girdi, teslimat, kullanılan kaynaklar, gerçek maliyet ve açık eksikleri içeren kısa rapor yaz.

Çıktı JSON: `summary`, `requirements_checked`, `findings`, `issues`, `owner_report`, `merge_recommendation` (`ready` veya `blocked`), `limitations`. `issues` alanında yalnızca gerçek GitHub issue URL'leri bulunur; bağlantı yoksa bulgular yerel kayıtta kalır.
