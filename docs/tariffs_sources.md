# 2026 Türkiye Elektrik Tarifeleri — Kaynak Belgesi

> **Veri toplama tarihi**: 2026-05-23
> **Hazırlayan**: GES-Fizibilite Pro tarife araştırma modülü
> **Kaynak öncelik sırası**: EPDK Kurul Kararı → Resmi Gazete → görevli tedarik şirketi duyurusu → çapraz doğrulama (sektör portalı, fatura simülatörü)

---

## 1. Yürürlükteki Karar

| Kalem | Değer | Kaynak |
|---|---|---|
| **EPDK Kurul Kararı No** | **14461** | [GENSED duyurusu](https://gensed.org/4-nisan-2026dan-itibaren-uygulanacak-elektrik-tarifeleri-yayimlandi/) |
| **Karar tarihi** | **02.04.2026** | EPDK Kurul Kararı 14461 |
| **Resmi Gazete yayım** | **04.04.2026** | Resmi Gazete |
| **Yürürlük** | **04.04.2026** | EPDK Kurul Kararı 14461 |
| **Bir önceki dönem** | 01.01.2026 — 03.04.2026 (EPDK 30.10.2025 kararı kapsamında) | [EPDK SKTT sayfası](https://www.epdk.gov.tr/detay/icerik/3-15589/son-kaynak-tedarik-tarifesi) |

---

## 2. Aktif Enerji Bedelleri (TL/kWh, vergi ve fonlar hariç)

> Aşağıdaki değerler tüketicinin "ekran fiyatı" yani aktif enerji + dağıtım toplamıdır (Piagrid kaynağına göre). Saf aktif enerji ve dağıtımı ayrı kalemler bölümünde verdik.

### Mesken (Kademeli)
| Kademe | Eşik | Fiyat (TL/kWh) |
|---|---|---|
| Alt kademe | ≤ 240 kWh/ay (≤ 8 kWh/gün) | **2.92** |
| Üst kademe | > 240 kWh/ay | **4.32** |

- **Kaynak**: [Piagrid - Elektrik Fiyatları 2026](https://www.piagrid.com/indirimli-elektrik/elektrik-fiyati), [Yeşil Ekonomi: Mesken Elektriğinde Kademe 4000 kWh](https://yesilekonomi.com/mesken-elektriginde-kademe-4-000-kwhe-indi/)
- **Not**: Vergi/fonlar (KDV %1, BTV %5, Enerji Fonu %1) ayrıca eklenir.

### Ticarethane AG (Kademeli)
| Kademe | Eşik | Fiyat (TL/kWh) |
|---|---|---|
| Alt | ≤ 30 kWh/gün | **5.35** |
| Üst | > 30 kWh/gün | **5.93** |

### Sanayi AG (Tek terimli)
- **4.81 TL/kWh**

### Tarımsal Sulama
- **4.37 TL/kWh** (sübvansiyonlu)

### Üç Zamanlı Tarife (T1/T2/T3)
| Dönem | Saat Aralığı | Fiyat (TL/kWh) |
|---|---|---|
| T3 — Gece | 23:00 – 08:00 | **2.94** |
| T2 — Gündüz | 08:00 – 17:00 ve 22:00 – 23:00 | **4.38** |
| T1 — Puant | 17:00 – 22:00 | **6.17** |

- **Kaynak**: [Piagrid - 2026 Tarifeleri](https://www.piagrid.com/indirimli-elektrik/elektrik-fiyati)
- **Doğrulama notu**: Tarihsel olarak (2024-2025) T2 06:00-17:00 + 22:00-23:00 aralığıydı. 2026 itibarıyla T2 başlangıcı **08:00** olarak uygulanıyor — yeni karar kapsamında değiştirilmiş. Çelişki kaynaklarla doğrulamak için doğrudan EPDK Excel tablosu ([EPDK Tarife Tabloları](https://www.epdk.gov.tr/detay/icerik/3-100/elektrik-faturalarina-esas-tarife-tablolari)) önerilir.

---

## 3. Dağıtım Bedelleri (TL/kWh)

EPDK Kurul Kararı 14461 ile **dağıtım bedelleri ulusal düzeyde** belirlenmiştir (21 bölge için aynı). TEDAŞ koordinasyonunda her görevli tedarik şirketi aynı tarifeyi uygular; bölgesel farklar yalnızca yatırım planı kaynaklı geri ödeme bileşeninde (örtük) yer alır.

| Abone Grubu | Dağıtım Bedeli (TL/kWh) |
|---|---|
| Mesken AG | **1.84** (≈183.62 kr/kWh) |
| Ticarethane AG | **1.88** (≈187.74 kr/kWh) |
| Sanayi AG | **1.39** (≈138.53 kr/kWh) |
| Sanayi OG | düşük (~0.45–0.55 — tahmini; EPDK Excel'inde doğrulanmalı) ⚠️ |

- **Kaynak**: [Piagrid - Elektrik Dağıtım Bedeli 2026](https://www.piagrid.com/rehber/elektrik-dagitim-bedeli)
- **TEDAŞ kaynak**: [TEDAŞ Elektrik Tarifeleri](https://www.tedas.gov.tr/A/1/elektrik-tarifeleri/)

### Lisanssız Üretim Tesisleri için Dağıtım Bedeli
- 10/05/2019 sonrası çağrı mektubu alanlar: **49.6738 kr/kWh** (Temmuz 2025 verisi, 2026 güncellemesi doğrulanmalı) ⚠️
- **Kaynak**: [Enerji Ajansı - Lisanssız Santral Dağıtım Bedeli](https://enerjiajansi.com.tr/lisanssiz-santrallerde-dagitim-bedeli/)

---

## 4. Vergi ve Fonlar (2026)

| Kalem | Mesken | Ticarethane | Sanayi | Tarımsal | Durum |
|---|---|---|---|---|---|
| **KDV** | %1 | %20 | %20 | %1 | ✓ Devam (mesken için 2022'den beri %1) |
| **Belediye Tüketim Vergisi (BTV)** | %5 | %5 | %1 | %1 | ✓ Devam |
| **TRT Payı** | — | — | — | — | ❌ **Aralık 2021'de KALDIRILDI** |
| **Enerji Fonu** | %1 | %2 | %2 | %1 | ✓ Devam (yenilenebilir + verimlilik) |

- **KDV kaynak**: [Piagrid - Elektrik Tüketim Bedeli ve Vergisi](https://www.piagrid.com/rehber/elekrik-tuketim-bedeli-ve-vergisi)
- **BTV kaynak**: [EÇE Enerji - Elektrik Tüketim Vergisi (BTV/ETV)](https://www.eceenerji.com.tr/blog/elektrik-tuketim-vergisi-btv-etv), [Encazip - BTV](https://www.encazip.com/bilgi/enerji/elektrik-tuketim-vergisi-btv)
- **TRT Payı kaynak**: [Gazelektrik - Bedel ve Vergi](https://gazelektrik.com/enerji-piyasalari/elektrik-bedel-vergi) (Aralık 2021 itibarıyla 3093 sayılı kanun değişikliği ile kaldırıldı)
- **Enerji Fonu kaynak**: [Muhasebetr - Vergi ve Fonlar](https://www.muhasebetr.com/yazarlarimiz/ibrahimdoner/006/)

### Vergi Uygulama Sırası
1. Aktif enerji + dağıtım = **brüt bedel**
2. Brüt bedel × Enerji Fonu = **fon**
3. Brüt bedel × BTV = **belediye vergisi**
4. (Brüt + Fon + BTV) × KDV = **KDV**
5. **Toplam fatura** = Brüt + Fon + BTV + KDV

---

## 5. Son Kaynak Tedarik Tarifesi (SKTT) — 2026

| Kalem | Değer | Kaynak |
|---|---|---|
| **Karar** | EPDK 30.10.2025 | [Enerjisa - SKTT Limit Bilgilendirme](https://m.enerjisa.com.tr/tr/musteri-islemleri/duyurular/son-kaynak-tedarik-tarifesi-limit-degisikligi-hakkinda-bilgilendirme) |
| **Yürürlük** | 01.01.2026 | EPDK kararı |
| **Mesken yıllık limit** | **4.000 kWh** (5.000'den indirildi) | [AA - 12 soruda yeni limit](https://www.aa.com.tr/tr/enerjiterminali/elektrik/12-soruda-elektrik-tarifesinde-yeni-limit/52592) |
| **Ticarethane/Sanayi limit** | **15.000 kWh** | EPDK 30.10.2025 |
| **Tarımsal limit** | **150.000.000 kWh** | EPDK 30.10.2025 |
| **Mesken KBK** | **1.05** | EPDK 30.10.2025 |
| **Diğer KBK** | **1.0938** | [KEPSAŞ - SKTT](https://www.kepsas.com.tr/skt-tuketici/) |
| **Formül** | `SKTT = (PTF + YEKDEM) × KBK` | EPDK 30.10.2025 |

### Önemli Not — KBK Etkisi
Mesken için yıllık tüketim > 4.000 kWh ise (≈ ortalama aylık 333 kWh, fatura ≈ 984 TL), SKTT uygulanır:
- Bu durumda mesken üst kademe değil de doğrudan **(PTF+YEKDEM)×1.05** ile alış yapar.
- 2026 başında EMO bu uygulamayı "gizli zam" olarak eleştirmiştir: [TMMOB-EMO uyarısı](http://www.tmmob.org.tr/icerik/emodan-gizli-zam-uyarisi-son-kaynak-limiti-4000-kwha-dusuruldu)

---

## 6. Lisanssız GES / BESS Süreç Bedelleri (2026)

| Kalem | Değer | Not |
|---|---|---|
| Başvuru bedeli | TBD ⚠️ | TEDAŞ duyurularından doğrulanmalı |
| İşlem bedeli | TBD ⚠️ | |
| Proje onay bedeli (≤50 kW çatı) | TBD ⚠️ | 2026-01-01 itibarıyla güncel |
| Kabul bedeli | TBD ⚠️ | |
| Yıllık işletme bedeli | TBD ⚠️ | |
| Bağlantı bedeli | bölgesel | Dağıtım şirketinden |

- **Kaynak**: [TEDAŞ Lisanssız Elektrik Üretimi](https://www.tedas.gov.tr/A/1/lisanssiz-elektrik-uretimi/), [MyEnerji Solar 2026 Rehberi](https://www.myenerjisolar.com/lisanssiz-ges-nedir-sanayi-ve-ticari-tesisler-icin-2026-kurulum-ve-basvuru-rehberi/)
- **Not**: Bu bedeller sürekli güncellenir; admin paneli üzerinden manuel update edilebilir tutulmuştur.

---

## 7. 21 Dağıtım Bölgesi

Türkiye 2013 özelleştirme süreciyle 21 dağıtım bölgesine ayrılmıştır. **EPDK Kurul Kararı 14461 ulusal tarife belirler**; bölgesel sapmalar yoktur. Yalnızca operasyonel iletişim ve fatura kanalı farklıdır.

| # | Bölge | İşleten | Şehirler |
|---|---|---|---|
| 1 | BOĞAZİÇİ | BEDAŞ (Cengiz/Limak/Kolin) | İstanbul Avrupa |
| 2 | AYEDAŞ | Enerjisa | İstanbul Anadolu |
| 3 | TRAKYA | İş Kaya | Edirne, Kırklareli, Tekirdağ |
| 4 | OSMANGAZİ | Zorlu | Eskişehir, Bilecik, Afyon, Kütahya, Uşak |
| 5 | SAKARYA | Akenerji-Akcez | Sakarya, Bolu, Düzce, Kocaeli |
| 6 | ULUDAĞ | Limak | Bursa, Balıkesir, Çanakkale, Yalova |
| 7 | GEDİZ | Aydem (İBB) | İzmir, Manisa |
| 8 | AYDEM | Aydem | Aydın, Denizli, Muğla |
| 9 | ÇORUH | Aksa | Trabzon, Artvin, Rize, Giresun, Gümüşhane |
| 10 | ARAS | Kiler | Ağrı, Ardahan, Bayburt, Erzurum, Erzincan, Iğdır, Kars |
| 11 | FIRAT | Aksa | Bingöl, Elazığ, Malatya, Tunceli |
| 12 | ÇAMLIBEL | Kolin | Sivas, Tokat, Yozgat |
| 13 | MERAM | Alarko-Cengiz | Aksaray, Karaman, Kırıkkale, Kırşehir, Konya, Nevşehir, Niğde |
| 14 | BAŞKENT | Enerjisa | Ankara, Çankırı, Kastamonu, Bartın, Karabük, Zonguldak |
| 15 | AKDENİZ | CK Akdeniz | Antalya, Burdur, Isparta |
| 16 | TOROSLAR | Enerjisa | Adana, Mersin, Hatay, Osmaniye, K.Maraş |
| 17 | KAYSERİ | KCETAŞ | Kayseri |
| 18 | YEŞİLIRMAK | Çalık | Amasya, Çorum, Ordu, Samsun, Sinop |
| 19 | GÖKSU | CK Boğaziçi | Kilis, Gaziantep |
| 20 | DİCLE | DEDAŞ | Diyarbakır, Şanlıurfa, Mardin, Batman, Şırnak, Siirt |
| 21 | VANGÖLÜ | TEDAŞ Genel | Bitlis, Hakkari, Muş, Van |

- **Kaynak**: [Enerji Atlası - Dağıtım Şirketleri](https://www.enerjiatlasi.com/elektrik-dagitim-sirketleri/)

---

## 8. Şüpheli / Eksik Bulunan Veriler

| # | Kalem | Sebep | Çözüm |
|---|---|---|---|
| 1 | Sanayi OG dağıtım bedeli (TL/kWh) | Kaynaklarda ayrı kalem net değil | EPDK 14461 Excel tablosundan doğrulanmalı |
| 2 | Üç zamanlı tarife saat aralıkları — özellikle T2 başlangıcı (06:00 vs 08:00) | 2025 ve 2026 kaynakları çelişkili | EPDK Excel tablosu öncelikli |
| 3 | Lisanssız GES bedelleri (başvuru/onay/kabul) | TEDAŞ 2026 güncel rakamları bulunamadı | TEDAŞ duyuruları sayfasından çek |
| 4 | Talep güç bedeli (Sanayi OG çift terimli) | Açıkça bulunamadı | EPDK Excel'inden alınacak |
| 5 | Reaktif enerji bedeli oranları | Açıkça bulunamadı | EPDK Mevzuat |
| 6 | Resmi Gazete sayısı (sadece tarih var) | Sadece "04.04.2026" tarihi geçiyor | RG arşivinden çekilebilir |
| 7 | İletim Bedeli (TEİAŞ) ve Piyasa İşletim Bedeli (EPİAŞ) | Ayrı kalem olarak ayrıştırılmadı | [TEİAŞ 2026 Sistem Tarifeleri](https://www.teias.gov.tr/duyurular/2026-yili-sistem-kullanim-ve-sistem-isletim-tarifeleri) |

Şüpheli kalemler kodda `// TODO: doğrula — kaynak bulunamadı` etiketi ile işaretlenmiştir.

---

## 9. Çapraz Doğrulama Kaynakları (sektör portalları)

> Bu kaynaklar EPDK'nın resmi rakamlarını **özetler**, doğrudan kaynak değildir; karar yerine olmaz.

- [Bigpara - Elektrikte 2026 Tarifesi Belli Oldu](https://bigpara.hurriyet.com.tr/haberler/ekonomi-haberleri/elektrikte-2026-tarifesi-belli-oldu_ID1622696/)
- [Hürriyet - EPDK Açıkladı](https://www.hurriyet.com.tr/gundem/epdk-acikladi-elektrik-ve-dogalgazda-yeni-tarife-belli-oldu-43143176)
- [Hakediş - EPDK Vergi/Fon Hariç Tarifeler Endeksi](https://www.hakedis.org/endeksler/epdk-elektrik-farturasi-vergi-ve-tarifeler)
- [Anlatılanın Ötesi - 2026 Hizmet Bedelleri](https://anlatilaninotesi.com.tr/20251230/elektrikte-2026-hizmet-bedelleri-belli-oldu-alcak-gerilim-abonesi-icin-kesme-baglama-106-liradan-1102356601.html)

---

## 10. Otomatik Güncelleme Politikası

1. **Frekans**: haftalık (Pazartesi 03:00), `cron` veya manuel `/api/admin/tariffs/refresh` ile.
2. **Kaynak**: [EPDK Tarife Tabloları](https://www.epdk.gov.tr/detay/icerik/3-100/elektrik-faturalarina-esas-tarife-tablolari) — Excel dosyası link tarama.
3. **Tetik**: Excel dosyasının URL'si veya yayım tarihi değişirse → yeni tarife seti olarak DB'ye eklenir, önceki kayıtların `valid_to` alanı yeni `valid_from - 1 gün` olarak güncellenir.
4. **Failsafe**: Otomatik parsing başarısız olursa admin'e bildirim + manuel `/api/admin/tariffs/manual` endpoint'i.

---

## Sources

- [EPDK Kurul Kararları](https://www.epdk.gov.tr/Detay/Icerik/3-0-39-3/kurul-kararlari-)
- [EPDK Elektrik Tarifeleri](https://www.epdk.gov.tr/Detay/Icerik/3-0-1-3/elektriktarifeler)
- [EPDK Faturalara Esas Tarife Tabloları](https://www.epdk.gov.tr/detay/icerik/3-100/elektrik-faturalarina-esas-tarife-tablolari)
- [EPDK Son Kaynak Tedarik Tarifesi](https://www.epdk.gov.tr/detay/icerik/3-15589/son-kaynak-tedarik-tarifesi)
- [TEİAŞ 2026 Sistem Tarifeleri](https://www.teias.gov.tr/duyurular/2026-yili-sistem-kullanim-ve-sistem-isletim-tarifeleri)
- [TEDAŞ Tarifeler](https://www.tedas.gov.tr/A/1/elektrik-tarifeleri/)
- [GENSED - 4 Nisan 2026 Tarife Duyurusu](https://gensed.org/4-nisan-2026dan-itibaren-uygulanacak-elektrik-tarifeleri-yayimlandi/)
- [Enerjisa - SKTT Bilgilendirme](https://m.enerjisa.com.tr/tr/musteri-islemleri/duyurular/son-kaynak-tedarik-tarifesi-limit-degisikligi-hakkinda-bilgilendirme)
- [MEDAŞ EPDK Kurul Kararları](https://www.meramedas.com.tr/tr/epdk-kurul-kararlari-ulusal-tarifeler.html)
- [Piagrid - 2026 Tarifeleri](https://www.piagrid.com/indirimli-elektrik/elektrik-fiyati)
- [Piagrid - Dağıtım Bedeli](https://www.piagrid.com/rehber/elektrik-dagitim-bedeli)
- [Yeşil Ekonomi - 4000 kWh Kademe](https://yesilekonomi.com/mesken-elektriginde-kademe-4-000-kwhe-indi/)
- [AA - 12 Soruda Yeni Limit](https://www.aa.com.tr/tr/enerjiterminali/elektrik/12-soruda-elektrik-tarifesinde-yeni-limit/52592)
