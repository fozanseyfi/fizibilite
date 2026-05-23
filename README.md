# GES-Fizibilite Pro

EPDK Karar No: 14531 (30.04.2026) **saatlik mahsuplaşma** rejimi altında, çatı C&I + arazi (≤5 MW) + GES+BESS hibrit projeler için **yatırım bankası seviyesinde** finansal fizibilite üreten Next.js uygulaması.

## Hızlı başlangıç

```powershell
npm install
npm run dev     # localhost:4000
```

İlk açılışta sağ üst köşeden "Demo projeleri ekle" tıkla → 3 hazır proje yüklenir:
- Antalya 500 kWp Otel Çatı GES (TICARETHANE)
- Konya 4.9 MW Arazi GES (SANAYI_MV, banka kredisi)
- İzmir 1 MWp + 2 MWh BESS Hibrit Fabrika (peak shaving)

Bir projeye tıkla → **Simülasyonu Başlat** → PVGIS'ten 8760 saatlik üretim çekilir, EPDK motoru çalışır, ~2-3 saniyede tam dashboard hazır.

## Teknik özellikler

| Modül | Açıklama |
|---|---|
| **EPDK saatlik mahsuplaşma motoru** | [src/lib/netting.ts](src/lib/netting.ts) — Tablo 1/2/3 birim test doğrulamalı |
| **PVGIS-SARAH3 entegrasyonu** | [src/lib/pvgis.ts](src/lib/pvgis.ts) — JSON cache (90 gün TTL) + offline fallback |
| **14 sektörel tüketim profili** | [src/lib/consumption.ts](src/lib/consumption.ts) — ofis, perakende, otel, fabrika 1-2-3 vardiya, AVM, soğuk hava, veri merkezi, okul, hastane, tarımsal sulama |
| **BESS dispatch** | [src/lib/battery.ts](src/lib/battery.ts) — kural-tabanlı 4 öncelikli (öz tüketim, limit koruma, peak shaving, PTF arbitrajı) + dejenerasyon + augmentation |
| **Finansal model** | [src/lib/finance.ts](src/lib/finance.ts) — NPV, IRR, MIRR, LCOE, ROI, ROE, DSCR + 3 finansman seçeneği + vergi modeli |
| **Monte Carlo** | [src/lib/monte-carlo.ts](src/lib/monte-carlo.ts) — 9 stokastik değişken, 1000 iterasyon < 5s, tornado + P10/50/90 + VaR |
| **Excel raporu** | [src/lib/reports/excel.ts](src/lib/reports/excel.ts) — 11 sheet, 8760 saatlik veri dahil |
| **PDF raporu** | Print-friendly HTML route [src/app/projects/[id]/report/page.tsx](src/app/projects/[id]/report/page.tsx) — Ctrl+P → PDF |

## Doğrulama

```powershell
npm test    # vitest — EPDK Tablo 1/2/3 birim testleri
```

11/11 test geçer. Üretim:
- **Tablo 1**: 75.000 kWh tüketim, 60.000 kWh üretim, ~47.400 kWh mahsup ✓
- **Tablo 2**: 200 MWh üretim, limit altı → 130 MWh bedelli satış, 0 YEKDEM ✓
- **Tablo 3**: 220 MWh üretim, limit aşımı → 130 MWh bedelli + 20 MWh YEKDEM ✓

## Mimari

Tek port (4000) Next.js 14 App Router. Tüm hesaplamalar TypeScript (no native deps). Veri JSON dosyalarında (`data/projects.json`, `data/pvgis_cache.json`, `data/tariffs.json`).

```
src/
├── lib/                    # Tüm hesaplama motorları (test edilebilir)
├── components/             # UI primitive + dashboard bileşenleri
└── app/                    # Next.js App Router
    ├── page.tsx            # Proje listesi
    ├── about/              # EPDK yorumu
    ├── projects/new/       # 8 adımlı wizard
    ├── projects/[id]/      # Sonuç dashboard'u (7 sekme)
    └── api/                # Projects CRUD, simulate, pvgis, seed, reports/excel
```

## Yasal disclaimer

Bu uygulama mevcut EPDK tarife ve yönetmelik koşullarına göre hesaplama yapar. Yatırım kararı vermeden önce yetkili enerji uzmanlarına danışılması önerilir.

EPDK Karar No: 14531 (30.04.2026), R.G. 02.04.2026 / 33212, "Lisanssız Elektrik Üretimine İlişkin 1 Nolu Açıklama".
