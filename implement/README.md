# Kaynak uygulama havuzu

Research ekibinin seçtiği açık kaynak projelerin indirilmiş arşivleri `archives/`, açılmış kaynakları `extracted/` altında tutulur. Bu iki alan yerel çalışma dosyasıdır ve Git deposuna eklenmez. Seçilen parçalar, kaynak kaydıyla birlikte hedef projenin ayrı dalına kopyalanır.

Her aday için `catalog.json` kaydında kaynak adresi, indirme zamanı, sürüm veya commit, arşiv özeti, lisans, seçilme gerekçesi ve kullanılan dosyalar tutulmalıdır. Bir projeyi kopyalamadan önce lisans ve gerekli atıf koşulları kontrol edilir. Lisansı belirtilmeyen kod otomatik kopyalanmaz.

Lisansı tanımlı bir GitHub adayını sabit commit ile indirmek için Windows'ta:

```powershell
./implement/import_source.ps1 -Repository owner/repo -Ref main
```

Betik commit SHA, SPDX lisansı, arşiv SHA256 ve açılmış dizini kataloğa yazar. Python bulunan başka sistemlerde `import_source.py` aynı işi yapar. Kopyalanacak dosyaların seçimi Develop görevi sırasında yapılır; `copied_files` kaydı ve hedef Git diff'i birlikte incelenir.
