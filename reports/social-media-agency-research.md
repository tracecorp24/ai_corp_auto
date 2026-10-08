# Sosyal medya ajansı iç aracı · derin araştırma

İlk girdi: “Sosyal medya ajansı kurmak istiyorum.” Patron kapsamı: Türkiye'de yerel işletmelere Instagram ve TikTok hizmeti verecek ajans için Türkçe, üç ay içinde çalışan müşteri yönetim MVP'si.

## Öneri

İlk sürümü yerel çalışan hafif bir CRM olarak kur: müşteri kaydı, iletişim kişileri, Instagram/TikTok profil bağlantıları, hizmet paketi, müşteri aşaması, notlar ve yapılacak işler. Mobil ekranda müşteri ekleme, arama ve güncelleme çalışmalı. Veriler yeniden başlatma sonrası saklanmalı. Takvim görünümü ikinci iterasyona bırakılabilir.

Bu kapsamda doğrudan Instagram/TikTok gönderi yayımlama yok. TikTok doğrudan gönderim için kayıtlı uygulama, `video.publish` izni, kullanıcı yetkilendirmesi ve denetim süreci istiyor. Bu nedenle ilk üç aylık müşteri yönetim hedefini sosyal platform API onayına bağlamak gereksiz gecikme yaratır. Platform kimlikleri ve içerik işlerinin durumları önce manuel kaydedilir.

## Seçenekler

1. **Hafif özel uygulama (önerilen):** React arayüzü + Node HTTP API + SQLite. Tek bilgisayar ve ilk kullanıcı için en kısa doğrulama yolu. Sonradan çok kullanıcılı yapıya geçiş için veri ve API sınırları açık tutulur.
2. **React-admin arayüzünü kullanma:** MIT lisanslı çatı, müşteri CRUD ve liste ekranlarını hızlandırabilir; Material UI ve veri sağlayıcı entegrasyonu ekler.
3. **Tam CRM çatallama:** Çok sayıda hazır özellik getirir ama ajansın küçük ilk kapsamı için kurulum ve bakım maliyeti yüksektir.

## Açık kaynak adayları

| Aday | Sabit commit | Lisans | Kullanım |
| --- | --- | --- | --- |
| [marmelab/react-admin](https://github.com/marmelab/react-admin) | `47890673cae903b9c5a33898c07a12ea94205b5a` | [MIT](https://github.com/marmelab/react-admin/blob/47890673cae903b9c5a33898c07a12ea94205b5a/LICENSE.md) | Müşteri liste/form bileşenleri; yalnızca ihtiyaç varsa. |
| [bigcalendar/react-big-calendar](https://github.com/bigcalendar/react-big-calendar) | `183783ad45c8b845c2f57c46711c1c4c85047843` | [MIT](https://github.com/bigcalendar/react-big-calendar/blob/183783ad45c8b845c2f57c46711c1c4c85047843/LICENSE) | İkinci iterasyonda içerik takvimi. |

Her aday `implement/` içine sabit commit ile indirilip SHA256 ve lisans kaydı tutulmadan kod kopyalanmaz. Bağımlılık olarak kurulum da sürüme sabitlenir.

## İlk sürüm kabul ölçütleri (öneri)

- Müşteri ekle/düzenle/ara, hizmet ve iletişim bilgilerini kaydet.
- Instagram ve TikTok hesap bağlantılarını müşteriye iliştir.
- Müşteri aşaması, not ve sıradaki iş kaydı görünür.
- Uygulama yeniden başladıktan sonra kayıtlar durur.
- Dar mobil ekranda temel işlemler kullanılabilir.
- Gerçek doğrulama komutu ve sonuç kaydı Develop devrinde sunulur.

## Belirsizlikler

İlk kullanıcı sayısı, giriş sistemi, müşteri verilerinin paylaşımı, kesin başarı metriği ve platform API bağlantısı için hesap/uygulama onayı belirlenmedi. İlk sürümde tek operatör, yerel erişim ve manuel platform bağlantısı varsayılır; bunlar patron kararları olarak ayrı kaydedilmelidir.

## Kaynaklar

- [TikTok Content Posting API başlangıç](https://developers.tiktok.com/docs/en/content-posting-api-get-started): kayıtlı uygulama, `video.publish` kapsamı, kullanıcı yetkilendirmesi, denetim.
- [TikTok Direct Post](https://developers.tiktok.com/docs/en/content-posting-api-reference-direct-post): kullanıcı izni ve denetlenmemiş istemcilerin kısıtları.
- [React-admin deposu](https://github.com/marmelab/react-admin) ve [sabit lisans](https://github.com/marmelab/react-admin/blob/47890673cae903b9c5a33898c07a12ea94205b5a/LICENSE.md).
- [React Big Calendar deposu](https://github.com/bigcalendar/react-big-calendar) ve [sabit lisans](https://github.com/bigcalendar/react-big-calendar/blob/183783ad45c8b845c2f57c46711c1c4c85047843/LICENSE).
