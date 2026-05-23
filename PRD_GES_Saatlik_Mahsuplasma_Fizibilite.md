# GES Saatlik Mahsuplaşma Fizibilite Uygulaması — Tam Teknik Şartname (PRD)

> **Versiyon**: 1.0  
> **Tarih**: 23 Mayıs 2026  
> **Hedef**: Claude Code ile uçtan uca geliştirme  
> **Yasal dayanak**: EPDK Karar No: 14531 (30.04.2026), Resmi Gazete 02.04.2026 / 33212, "Lisanssız Elektrik Üretimine İlişkin 1 Nolu Açıklama"

---

## 1. ÜRÜN ÖZET VE VİZYON

### 1.1 Ürünün Adı
**GES-Fizibilite Pro** (öneri — değiştirilebilir)

### 1.2 Tek Cümlede
EPDK'nın 01.05.2026'da yürürlüğe giren **saatlik mahsuplaşma** rejimi altında, çatı C&I + arazi (≤5 MW) + GES+BESS hibrit projeler için **yatırım bankası seviyesinde** finansal fizibilite üreten web uygulaması.

### 1.3 Ayırt Edici Özellikler
1. **8760 saatlik tam simülasyon** — PVGIS API'den üretim, profil/upload'tan tüketim.
2. **EPDK yönetmeliğine birebir uyumlu mahsuplaşma motoru** (bedelli üretim limiti, YEKDEM bedelsiz aktarım dahil).
3. **Batarya optimizasyon motoru** — öz tüketim + limit aşımı yönetimi + peak shaving + PTF arbitrajı.
4. **Monte Carlo risk analizi** (1000+ koşum, olasılık dağılımları).
5. **İki modlu arayüz**: Uzman (tüm parametrelere erişim) + Müşteri (basitleştirilmiş, sunum odaklı).
6. **Profesyonel çıktı**: Ekran dashboard + PDF rapor + Excel (tüm 8760 saat + finansal model).

---

## 2. TEKNOLOJİ YIĞINI (TECH STACK)

### 2.1 Backend
- **Dil**: Python 3.11+
- **Framework**: FastAPI (async, otomatik OpenAPI doc)
- **ORM**: SQLAlchemy 2.0 + Alembic (migration)
- **DB**: PostgreSQL 15+ (production), SQLite (dev)
- **Auth**: JWT (FastAPI-Users veya kendi implementasyonu)
- **Background tasks**: Celery + Redis (Monte Carlo gibi uzun işler için)
- **Bilimsel**: numpy, pandas, scipy, numpy-financial (IRR, NPV)
- **Optimizasyon**: scipy.optimize, opsiyonel `pulp` (LP/MILP, batarya dispatch için)
- **PVGIS client**: requests + retry logic (özel modül)
- **PDF**: WeasyPrint veya ReportLab (matplotlib grafikleri gömülü)
- **Excel**: openpyxl (formüllerle birlikte)
- **Test**: pytest + pytest-asyncio + pytest-cov (hedef: ≥%80 coverage backend)

### 2.2 Frontend
- **Framework**: React 18 + TypeScript
- **Build tool**: Vite
- **State**: Zustand (basit) veya Redux Toolkit (büyürse)
- **Routing**: React Router v6
- **UI kit**: shadcn/ui + Tailwind CSS (custom theme)
- **Grafikler**: Recharts (temel) + Plotly.js (interaktif/heatmap/3D duyarlılık)
- **Tablo**: TanStack Table v8
- **Form**: react-hook-form + zod (validation)
- **Map**: Leaflet veya MapLibre GL (lokasyon seçimi)
- **i18n**: react-i18next (TR ana, EN opsiyonel)

### 2.3 DevOps
- **Container**: Docker + docker-compose
- **CI/CD**: GitHub Actions
- **Linting**: ruff + black (Python), eslint + prettier (TS)
- **Pre-commit hooks**: pre-commit framework
- **Monitoring**: Sentry (hata) + structured logging (structlog)

### 2.4 Proje Yapısı (Monorepo)
```
ges-fizibilite/
├── backend/
│   ├── app/
│   │   ├── api/              # FastAPI router'lar
│   │   ├── core/             # config, security, dependencies
│   │   ├── db/               # models, session
│   │   ├── schemas/          # Pydantic
│   │   ├── services/         # iş mantığı
│   │   │   ├── pvgis.py
│   │   │   ├── consumption.py
│   │   │   ├── netting.py    # SAATLİK MAHSUPLAŞMA MOTORU
│   │   │   ├── battery.py    # BESS dispatch
│   │   │   ├── finance.py    # IRR/NPV/LCOE
│   │   │   ├── monte_carlo.py
│   │   │   └── reports/      # PDF + Excel
│   │   └── main.py
│   ├── tests/
│   ├── alembic/
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── stores/
│   │   ├── api/              # axios/fetch wrappers
│   │   ├── i18n/
│   │   └── App.tsx
│   ├── public/
│   └── package.json
├── docs/
│   ├── netting_logic.md      # EPDK yorumu, formüller
│   ├── api.md
│   └── user_guide.md
├── docker-compose.yml
└── README.md
```

---

## 3. EPDK MAHSUPLAŞMA MOTORU — KRİTİK ALGORİTMİK ŞARTNAME

> Bu bölüm uygulamanın **kalbidir**. Yanlış implementasyon = kullanılamaz ürün. EPDK 1 Nolu Açıklama'sındaki kuralları birebir uygula.

### 3.1 Temel Tanımlar (kod sabitleri olarak)
| Kavram | Tanım | Kod |
|---|---|---|
| Saatlik Mahsuplaşma Miktarı | min(üretim_saat_i, tüketim_saat_i) | `netted_kwh[h]` |
| Saatlik Mahsuplaşma Sonrası Tüketim | max(0, tüketim - üretim) | `net_consumption[h]` |
| Saatlik Mahsuplaşma Sonrası Üretim | max(0, üretim - tüketim) | `surplus_generation[h]` |
| Bedelli Üretim Limiti | önceki_yil_tüketim × 2 | `paid_generation_limit_kwh` |
| YEKDEM bedelsiz miktar | limit aşımı sonrası üretim | `yekdem_free_kwh` |

### 3.2 Saatlik Mahsuplaşma Algoritması (Pseudo-code)
```python
def hourly_netting(
    generation: np.ndarray,           # shape (8760,) — kWh
    consumption: np.ndarray,          # shape (8760,) — kWh
    prev_year_consumption_kwh: float,  # bedelli üretim limiti için
    same_metering_point: bool = False,
    same_point_data: SamePointData | None = None,  # T = A + (B - C)
) -> NettingResult:
    """
    EPDK 1 Nolu Açıklama Tablo 1'i birebir uygular.
    
    Aynı ölçüm noktasında ise tüketim, formülle hesaplanır:
        T = A + (B - C)
        T: Mahsuplaşma öncesi tüketim
        A: Çift yönlü sayaç çekiş miktarı
        B: Tek yönlü üretim sayacı veriş miktarı
        C: Çift yönlü sayaç veriş miktarı
    """
    
    # 1. Aynı ölçüm noktası düzeltmesi
    if same_metering_point and same_point_data:
        consumption = same_point_data.A + (same_point_data.B - same_point_data.C)
    
    # 2. Saatlik mahsup
    netted = np.minimum(generation, consumption)
    net_consumption = np.maximum(0, consumption - generation)
    surplus = np.maximum(0, generation - consumption)
    
    # 3. Bedelli üretim limiti (yıllık kümülatif)
    paid_limit = prev_year_consumption_kwh * 2
    
    # 4. Üretim, mahsuplaşılan + satılabilir = paid_limit'i aştığında
    #    aşan kısım YEKDEM'e bedelsiz aktarılır
    # NOT: limit YILLIK kümülatiftir. Aylık değil.
    cumulative_generation = np.cumsum(generation)
    yekdem_free = np.zeros_like(generation)
    paid_surplus = surplus.copy()
    
    # Limit aşıldığı andan itibaren, sonraki saatlerin ÜRETİM FAZLASI
    # YEKDEM'e gider; ama hala TÜKETİMLE MAHSUPLAŞABİLİR.
    # (EPDK Tablo 3 dipnotu: "limit aşıldıktan sonra tüketim
    #  olması durumunda 20 MWh'lik kısım ile mahsuplaşmaya devam edilecektir")
    
    over_limit_start_idx = None
    for h in range(8760):
        if cumulative_generation[h] > paid_limit:
            over_limit_start_idx = h
            break
    
    if over_limit_start_idx is not None:
        # O saatte sınırı aşan miktar
        excess_at_start = cumulative_generation[over_limit_start_idx] - paid_limit
        # O saatten itibaren tüm ihtiyaç fazlası YEKDEM
        yekdem_free[over_limit_start_idx] = min(excess_at_start, surplus[over_limit_start_idx])
        paid_surplus[over_limit_start_idx] -= yekdem_free[over_limit_start_idx]
        
        yekdem_free[over_limit_start_idx+1:] = surplus[over_limit_start_idx+1:]
        paid_surplus[over_limit_start_idx+1:] = 0
        # Mahsuplaşma devam eder (netted değişmez)
    
    return NettingResult(
        netted=netted,
        net_consumption=net_consumption,
        paid_surplus=paid_surplus,
        yekdem_free=yekdem_free,
        annual_totals=...
    )
```

### 3.3 Test Vakası (EPDK Tablo 1'i birebir kontrol et)
Birim test olarak EPDK'nın Tablo 1, Tablo 2, Tablo 3 örneklerini hardcode et ve algoritmanın çıktısı **aynı** olsun:

**Tablo 1 günlük örnek**: Toplam tüketim 75.000 kWh, üretim 60.000, mahsuplaşılan 47.400, net tüketim 27.600, fazla üretim 12.600. ← Bu sayılar test assertion'ı.

**Tablo 2**: Önceki yıl 100 MWh tüketim, 70 MWh mahsuplaşılan → Bedelli limit 200 MWh, satışa konu 130 MWh.

**Tablo 3**: Önceki yıl 100 MWh, cari yıl 220 MWh üretim, 70 MWh mahsuplaşılan → 130 MWh satışa, 20 MWh YEKDEM.

### 3.4 Fiyat Uygulaması (Saatlik)
EPDK 1 Nolu Açıklama'dan:
- **Mahsuplaşılan kısım**: EPİAŞ tarafından görevli tedarik şirketine, tarife fiyatı üzerinden.
- **Net tüketim (üretim < tüketim)**: 
  - İkili anlaşma fiyatı (tedarikçiyle), VEYA
  - Son kaynak tedarik tarifesi (yıllık tüketim > 4.000 kWh mesken / >15.000 kWh ticarethane-sanayi ise), VEYA
  - Kendi abone grubu tarifesi (görevli tedarik şirketinden alanlar için).
- **İhtiyaç fazlası (üretim > tüketim, limit altında)**: Kendi abone grubu tarife fiyatı üzerinden SATIŞ.
- **YEKDEM bedelsiz**: 0 gelir.

Kod yapısı:
```python
@dataclass
class TariffStructure:
    consumer_group: ConsumerGroup  # COMMERCIAL_LV, INDUSTRIAL_LV, INDUSTRIAL_MV, ...
    purchase_price_tl_kwh: float        # tüketim için (TL/kWh)
    sale_price_tl_kwh: float            # mahsup + ihtiyaç fazlası satış için
    has_bilateral_contract: bool
    bilateral_price_tl_kwh: float | None
    is_last_resort_supply: bool
    last_resort_kbk_multiplier: float   # ticari/sanayi: 1.0938
    distribution_fee_tl_kwh: float
    consumption_tax_pct: float           # belediye tüketim vergisi (sanayi %1, diğer %5)
    vat_pct: float                       # %20 (genel), mesken %1
```

### 3.5 Mesken İstisnası
> Yönetmelik gereği mesken aboneleri kurulu güç ne olursa olsun **aylık mahsuplaşma**ya tabi ve **limit yok**. UI'da mesken seçilirse algoritma `monthly_netting` fonksiyonuna düşmeli. Yine de proje scope'ta C&I + arazi öncelik, mesken opsiyonel modül.

---

## 4. PVGIS ÜRETİM HESAPLAMA SERVİSİ

### 4.1 API Detayı
- **Endpoint**: `https://re.jrc.ec.europa.eu/api/v5_3/seriescalc`
- **Yöntem**: GET, JSON response
- **Veritabanı**: `database=PVGIS-SARAH3` (en güncel, Türkiye için iyi)
- **Yıl aralığı**: Default 2005-2020 (TMY benzeri ortalama için multi-year)
- **Format**: `outputformat=json`

### 4.2 Parametre Eşleştirmesi
| Kullanıcı Inputu | PVGIS Param |
|---|---|
| Lat/Lon | `lat`, `lon` |
| Kurulu güç (kWp) | `peakpower` |
| Sistem kayıpları (%) | `loss` (default 14%) |
| Eğim (°) | `angle` |
| Azimut (°) | `aspect` (-180 ile 180, Güney=0, Doğu=-90, Batı=90) |
| Modül tipi | `pvtechchoice`: "crystSi" / "CIS" / "CdTe" |
| Montaj | `mountingplace`: "free" (arazi) / "building" (çatı) |
| İzleme | `trackingtype`: 0=sabit, 1-5=tracker varyasyonları |

### 4.3 Cache Stratejisi
- Aynı lat/lon/parametre kombinasyonu için PVGIS sonucu PostgreSQL'de cache'le.
- Hash key: `sha256(f"{lat:.4f}_{lon:.4f}_{peakpower}_{loss}_{angle}_{aspect}_{tech}_{mounting}")`.
- TTL: 90 gün.

### 4.4 Hata Yönetimi
- PVGIS down ise → kullanıcıya "manuel CSV yükle" seçeneği sun.
- Retry: 3 deneme, exponential backoff (1s, 3s, 9s).
- Timeout: 30s.

### 4.5 Üretim Verisi İşleme
- PVGIS saatlik kWh döner → 8760 satırlık numpy array.
- **Panel degradasyonu**: Yıl başına %0.5 default (kullanıcı override edebilir, monokristalin için %0.4, polikristalin %0.7).
- **İlk yıl LID** (Light Induced Degradation): %2 (mono), %2.5 (poli).
- Yıl N için üretim: `gen_year_N = gen_year_1 * (1 - LID) * (1 - degradation_rate)^(N-1)`.

### 4.6 Manuel Override
Kullanıcı isterse CSV upload edebilsin:
- Beklenen format: `timestamp,generation_kwh` (8760 satır, ISO datetime).
- Validation: tam 8760 satır, negatif olamaz, mantıklı maksimum kontrol (kurulu güç × 1.2'den fazla = uyarı).

---

## 5. TÜKETİM PROFİLİ MOTORU

### 5.1 Profil Kütüphanesi (Hardcoded TMY profilleri)
Aşağıdaki sektörel profiller, 8760 saatlik **normalize edilmiş** (toplamı 1.0) ağırlık vektörleri olarak gömülü:

| Profil ID | Açıklama | Pik Saatler |
|---|---|---|
| `office_5x8` | Ofis, hafta içi 09-18 | 10-12, 14-17 |
| `office_5x10` | Ofis genişletilmiş | 09-19 |
| `retail_7x12` | Perakende/mağaza | 11-21 |
| `mall` | AVM | 12-22 |
| `hotel` | Otel (24/7 baz + akşam pik) | gece + akşam |
| `restaurant` | Restoran | 12-14, 19-22 |
| `factory_1shift` | Fabrika 1 vardiya | 08-18 |
| `factory_2shift` | Fabrika 2 vardiya | 06-22 |
| `factory_3shift` | Fabrika 24/7 | sabit yüksek |
| `cold_storage` | Soğuk hava deposu | gece daha yüksek |
| `data_center` | Veri merkezi | sabit |
| `school` | Okul | 08-16, hafta sonu/yaz düşük |
| `hospital` | Hastane | sabit yüksek |
| `agriculture_irrigation` | Tarımsal sulama | yaz mevsimsel |

Her profil için ayrıca **mevsimsellik vektörü** (12 aylık ağırlık) gömülü.

### 5.2 Kullanım Modu
**Mod A — Profil + yıllık toplam**:
- Kullanıcı yıllık tüketimi girer (örn. 1.200.000 kWh).
- Profil seçer.
- Sistem 8760 saate dağıtır: `consumption[h] = annual_kwh × normalized_profile[h]`.

**Mod B — CSV upload**:
- Saatlik veri (tercih: tam 1 yıl, 8760 satır).
- Aylık veriyi de kabul et → profile göre 8760'a interpolation.

**Mod C — Manuel saatlik düzenleme**:
- Tablonun üzerinde düzenleme (UI'da grid).
- Tek bir gün için tipik profil çiz, sonra 365 güne projeksiyon (hafta içi/hafta sonu/tatil ayrımıyla).

### 5.3 Tüketim Büyüme Projeksiyonu
Yıl 2..25 için yıllık % büyüme parametresi (default %0, kullanıcı 0-10% arası gir).

---

## 6. BATARYA (BESS) MODELİ

### 6.1 Parametreler
```python
@dataclass
class BatteryConfig:
    # Boyutlandırma
    nominal_capacity_kwh: float       # nominal enerji kapasitesi
    nominal_power_kw: float            # nominal güç (charge/discharge)
    
    # Verim
    round_trip_efficiency: float = 0.92  # LFP default %92
    
    # Çalışma sınırları
    min_soc_pct: float = 0.10            # DoD %90 (min %10)
    max_soc_pct: float = 0.95
    initial_soc_pct: float = 0.50
    
    # Dejenerasyon (cycle + calendar)
    cycle_life_at_80_dod: int = 6000     # LFP tipik
    calendar_life_years: int = 15
    eol_capacity_pct: float = 0.70       # %70'e düşünce EoL kabul
    
    # Maliyet
    capex_tl_per_kwh: float
    capex_tl_per_kw: float               # PCS/inverter
    bos_tl: float                        # balance of system sabit
    
    # Augmentation (kapasite tazeleme)
    augmentation_enabled: bool = True
    augmentation_years: list[int] = field(default_factory=lambda: [8, 16])
    augmentation_kwh_per_event: float    # eklenecek kapasite
    augmentation_capex_decline_pct: float = 0.5  # gelecek yıl bataryası daha ucuz
```

### 6.2 Dispatch Stratejisi (4 seviyeli, "tümü + arbitraj")

**Karar ağacı (her saat için)**:
```
ÖNCELİK 1 — ÖZ TÜKETİM:
  Eğer GES_üretimi > tüketim AND batarya not full:
    Fazla üretimi bataryaya yükle (charge)
  Eğer GES_üretimi < tüketim AND batarya not empty:
    Bataryadan boşalt (discharge), tüketimi karşıla

ÖNCELİK 2 — BEDELLİ ÜRETİM LİMİTİ KORUMASI:
  Eğer kümülatif_üretim yakın paid_limit AND fazla üretim varsa:
    Bedelsiz YEKDEM'e gitmesin diye bataryaya zorla yükle
    (geri kazanım gece tüketiminde olur, mahsup fiyatından)

ÖNCELİK 3 — PEAK SHAVING (varsa talep güç tarifesi):
  Eğer talep > peak_threshold:
    Bataryadan boşalt, tepe düşür

ÖNCELİK 4 — PTF ARBİTRAJ:
  Eğer batarya yer var AND PTF[saat] < arbitraj_alt_eşik:
    Şebekeden yükle (ikili anlaşma fiyatından)
  Eğer batarya dolu AND PTF[saat] > arbitraj_üst_eşik AND limit altında:
    Boşalt, satış yap
```

> **NOT — Yasal kısıt**: Lisanssız tesislerde **şebekeden yüklenen** enerjinin sonradan satışı kısıtlıdır. Sadece **GES'ten yüklenen** enerji satışa konu olabilir. Bu yüzden ayrı sayaçla "GES-only charge" / "grid charge" ayrımı yap. Excel'de bu iki kaynak ayrı kolon olarak görünmeli. EPDK uygulamayı denetlemediği sürece UI'da uyarı gösterilmeli.

**İmplementasyon yaklaşımı**:
- **Basit**: Kural tabanlı (rule-based), saatlik forward sweep. Hızlı (8760 saat < 100ms).
- **Gelişmiş**: Linear Programming (PuLP/CVXPY) ile günlük 24-saatlik optimal dispatch, perfect foresight varsayımıyla. Üst sınır referans değer.
- Default: kural tabanlı. Opsiyonel "Optimal dispatch (LP)" toggle'ı uzman modda.

### 6.3 Dejenerasyon Modeli
**Yıllık efektif kapasite**:
```
capacity_year_N = nominal × (1 - calendar_loss_year_N) × (1 - cycle_loss_year_N)

calendar_loss_year_N = (year_N / calendar_life_years) × (1 - eol_capacity)
cycle_loss_year_N = (cumulative_cycles / cycle_life_at_80_dod) × (1 - eol_capacity)
```

**Augmentation**:
- Yıl 8 ve 16'da (default) batarya tazelenir (parametre).
- Eklenen kapasite × o yılki güncel TL/kWh fiyatı CAPEX olarak nakit akışa girer.
- Eklenen kapasite ile toplam kapasite EoL'in altına düşmez.

---

## 7. FİNANSAL MODEL

### 7.1 CAPEX Kalemleri
| Kalem | Birim | Default (kullanıcı override) |
|---|---|---|
| PV modül | USD/Wp | 0.18 USD/Wp (2026 ortalama) |
| İnvertör | USD/Wp | 0.06 |
| Montaj/yapı | USD/Wp | 0.08 (çatı), 0.12 (arazi) |
| Kablo + DC/AC pano | USD/Wp | 0.04 |
| İşçilik | USD/Wp | 0.05 |
| Mühendislik + tasarım | USD/Wp | 0.03 |
| Bağlantı bedeli | TL | bölgesel, kullanıcı girer |
| TEDAŞ + ZBÖF | TL | kullanıcı girer |
| İmar/zemin (arazi) | TL | kullanıcı girer |
| Sigorta (CAR) | % CAPEX | %1 (inşaat dönemi) |
| Beklenmeyen | % CAPEX | %3-5 |
| **Batarya (varsa)** | TL/kWh + TL/kW | 8.500 TL/kWh enerji, 3.500 TL/kW güç (2026 LFP) |

### 7.2 OPEX Kalemleri
| Kalem | Birim | Default |
|---|---|---|
| O&M (bakım) | TL/kWp/yıl | 80-150 TL (saha tipine göre) |
| Sigorta (işletme) | % CAPEX/yıl | %0.5 |
| İnvertör değişimi | TL, yıl 12 | CAPEX'in %8'i |
| Yedek parça | TL/yıl | %0.3 CAPEX |
| Güvenlik (arazi) | TL/yıl | sabit, kullanıcı |
| Sistem kullanım bedeli | TL/kWh | tarife |
| Vergi (emlak vb, arazi) | TL/yıl | kullanıcı |
| Yönetim/muhasebe | TL/yıl | kullanıcı |

### 7.3 Gelir Kalemleri (Saatlik mahsup motorundan)
1. **Mahsuplaşılan enerjinin tasarrufu**: `Σ netted[h] × tariff_purchase_price[h]`
   - Bu "olmasa ödeyeceğin" fatura → tasarruf.
2. **İhtiyaç fazlası satışı (limit altı)**: `Σ paid_surplus[h] × tariff_sale_price[h]`
3. **Batarya arbitraj net**: `Σ discharge[h] × sale_price[h] - Σ grid_charge[h] × purchase_price[h]`
4. **Peak shaving tasarrufu** (varsa talep güç tarifesi).
5. **YEKDEM bedelsiz**: 0 TL (raporlanır ama gelir değil).

### 7.4 Finansman Modelleri (3 seçenek)

**Seçenek A — %100 Öz Sermaye**:
- Tüm CAPEX yıl 0'da.
- Faiz yok.
- Vergi sonrası nakit akış doğrudan yatırımcıya.

**Seçenek B — Banka Kredisi**:
- Kullanıcı parametreleri: öz sermaye %, kredi vadesi (yıl), faiz oranı (TL/USD ayrı), grace period.
- **Geri ödeme**: Eşit taksit (annüite) veya eşit anapara seçeneği.
- Aylık taksit tablosu (anapara + faiz) hesapla.
- Faiz gider olarak P&L'e gelir → vergi kalkanı.

**Seçenek C — Leasing**:
- Operasyonel veya finansal leasing.
- Aylık leasing bedeli (parametre).
- Süre sonunda satın alma opsiyonu (kalan değer).
- Tam tutar OPEX'te gider olarak yer alır (operasyonelse).

### 7.5 Vergi Modeli
- **KDV**: %20 (2026), yatırım indirimi (KDV iadesi) opsiyonu (5746 sayılı kanun).
- **Kurumlar vergisi**: %25 (2026), kullanıcı override.
- **Amortisman**: Doğrusal, 10 yıl (GES için yaygın), kullanıcı override (5-25).
- **Yatırım teşvik belgesi** seçeneği: KDV istisnası, gümrük istisnası, vergi indirimi (% kullanıcı). Bölgesel teşvikler için lookup tablosu (1-6 bölge).
- **YEKDEM'e bedelsiz aktarım**: vergi yok, gelir yok.

### 7.6 Anahtar Finansal Çıktılar
| Metrik | Formül | Gösterim |
|---|---|---|
| **NPV** | `Σ CF_t / (1+r)^t - CAPEX` | TL ve USD ayrı |
| **IRR** | NPV=0'a getiren r | % |
| **MIRR** | Modified IRR (yeniden yatırım varsayımı) | % |
| **Pay-back (basit)** | CAPEX / ortalama yıllık CF | yıl |
| **Pay-back (iskontolu)** | Discounted CF kümülatif | yıl |
| **LCOE** | `Σ(CAPEX+OPEX)/(1+r)^t ÷ Σ generation/(1+r)^t` | TL/kWh ve USD/kWh |
| **ROI** | `(Toplam getiri - CAPEX) / CAPEX` | % |
| **ROE** | Yıllık net kar / öz sermaye | % |
| **DSCR** | `Operating CF / Debt service` | yıllık ratio |
| **EBITDA** | Gelir - OPEX (amortisman ve faiz hariç) | TL, yıllık |
| **EBITDA margin** | EBITDA / gelir | % |
| **Carbon offset** | Σ üretim × 0.45 kgCO2/kWh (TR şebeke) | ton CO2 |

### 7.7 İndirgeme Oranı (WACC)
- Default: kullanıcı girer.
- Öneri: 
  - %100 öz sermaye → opportunity cost (kullanıcı, örn %18 TL, %10 USD)
  - Kredili → WACC = E/V × Re + D/V × Rd × (1-T)

### 7.8 Enflasyon ve Kur
- **TL enflasyon**: yıllık % (kullanıcı, default 2026: %30, asimptotik düşüş varsayımı).
- **USD enflasyon**: yıllık % (default %2.5).
- **Elektrik fiyat artışı**: TL elektrik fiyatı = base × (1 + electricity_inflation)^t. USD'ye çevrilirse kur dalgalanması ayrıca.
- **Kur projeksiyonu**: 
  - Sabit kur (statik analiz),
  - Veya: `USD/TL_t = USD/TL_0 × (1+TR_infl)/(1+US_infl)^t` (satın alma gücü paritesi).
- Tüm gelir/gider hem TL hem USD görünür.

---

## 8. MONTE CARLO RİSK ANALİZİ

### 8.1 Stokastik Değişkenler ve Dağılımları
| Değişken | Dağılım | Default Parametre |
|---|---|---|
| Yıllık üretim (GES) | Normal | μ=PVGIS, σ=%5 |
| Yıllık tüketim büyümesi | Normal trunc | μ=user, σ=%2, [-5%, +15%] |
| Elektrik fiyat artışı (TL) | Triangular | (min: TÜFE-5%, mode: TÜFE, max: TÜFE+10%) |
| TL enflasyon | Triangular | bölgesel projeksiyon, kullanıcı |
| USD/TL kur | GBM (Geometric Brownian Motion) | σ=%18 yıllık |
| Panel degradasyon | Normal trunc | μ=0.5%, σ=0.1%, [0.3%, 1%] |
| Batarya çevrim ömrü | Lognormal | μ=6000, σ=600 |
| O&M maliyet | Normal | μ=user, σ=%10 |
| CAPEX aşımı | Triangular | (mode=0, max=+20%) |

### 8.2 Çalıştırma
- **Koşum sayısı**: kullanıcı (default 1000, max 10.000).
- **Parallelization**: numpy vectorized + multiprocessing (CPU sayısına göre).
- **Backend**: Celery task, progress WebSocket ile frontend'e push.
- **Süre tahmini**: 1000 koşum × tam fizibilite ≈ 30-60 saniye (vektörize edilmişse).

### 8.3 Çıktılar
- IRR dağılımı (histogram + KDE)
- NPV dağılımı
- Pay-back dağılımı
- P10 / P50 / P90 değerleri
- VaR (Value at Risk) %5 ve %95
- Tornado diyagram (değişkenlerin etkisi sıralaması)
- Sensitivity scatter plot (her değişkene karşı IRR)
- Probability of NPV > 0
- "Risk-adjusted return" özet kartı

---

## 9. KULLANICI ARAYÜZÜ — UX/UI

### 9.1 İki Mod
**Uzman Modu** (admin/profesyonel):
- Tüm parametreler görünür ve override edilebilir.
- Yan panelde "advanced settings" açılır.
- Tüm grafikler, tablolar, ham veri export.
- Monte Carlo, LP optimizasyonu açık.

**Müşteri Modu** (sunum):
- Sadece "lokasyon, kurulu güç, yıllık tüketim, sektör, batarya var/yok" gibi 5-7 input.
- Diğer her şey makul defaultlardan.
- Çıktı: Tek sayfa görsel rapor (executive summary).
- "İndir PDF" butonu öne çıkarılmış.
- Logo, şirket adı, sunum kişisi rebranding alanları.

### 9.2 Sayfa Akışı
1. **Dashboard** (proje listesi, kullanıcının projeleri).
2. **Yeni Proje** → Wizard akışı:
   - Step 1: Lokasyon (harita seçimi + lat/lon manuel).
   - Step 2: Sistem konfigürasyonu (kurulu güç, eğim, azimut, modül, montaj, izleme).
   - Step 3: Tüketim (profil seç / CSV yükle / manuel).
   - Step 4: Tarife & abone grubu.
   - Step 5: Batarya (var/yok, kapasite, güç, dispatch stratejisi).
   - Step 6: Finansman (3 seçenek).
   - Step 7: Senaryo ve Monte Carlo ayarları (uzman).
   - Step 8: Çalıştır → loading + sonuç.
3. **Sonuç Dashboard** (sekmeli):
   - **Genel Bakış**: KPI kartlar (IRR, NPV, LCOE, payback, EBITDA), nakit akış grafiği, executive summary.
   - **Enerji**: 8760 heatmap (saat×gün), aylık üretim/tüketim/mahsup, Sankey enerji akış.
   - **Mahsuplaşma**: Saatlik tablo + filtre, bedelli limit takibi, YEKDEM bedelsiz aktarım.
   - **Batarya**: SOC eğrisi, charge/discharge profili, dejenerasyon, augmentation noktaları.
   - **Finansal**: P&L tablosu, nakit akış, kredi geri ödeme tablosu, vergi.
   - **Risk (Monte Carlo)**: Dağılımlar, tornado, P10/50/90, VaR.
   - **Duyarlılık**: Tornado diyagram, tek değişken analizi.
   - **Karşılaştırma**: Birden fazla senaryo yan yana.
4. **Raporlar**: PDF/Excel indir butonları.

### 9.3 Görsel Tema
- Renk: enerji teması (sarı/turuncu güneş + yeşil çevre + lacivert profesyonel).
- Karanlık/aydınlık mod.
- Türkçe ana dil, EN toggle.
- Mobil uyumlu (responsive — özellikle müşteri modu).

### 9.4 Anlık Doğrulama
- Form inputlarında inline validation (zod schema).
- Mantıksız girdilerde uyarı (örn. çatı GES için 5 MW kurulu güç).
- Tüketim profili ile yıllık tüketim uyumsuzluğunda uyarı.

---

## 10. VERİTABANI ŞEMASI

### 10.1 Ana Tablolar
```sql
-- users
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user', -- 'admin', 'expert', 'client'
    company VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- projects
CREATE TABLE projects (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    project_type VARCHAR(50), -- 'rooftop_ci', 'ground_mount', 'hybrid_bess'
    status VARCHAR(50), -- 'draft', 'completed', 'archived'
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    -- Konfigürasyon JSON
    config JSONB NOT NULL,
    -- Sonuçlar JSON (cached)
    results JSONB
);

-- pvgis_cache
CREATE TABLE pvgis_cache (
    cache_key VARCHAR(128) PRIMARY KEY,
    lat NUMERIC(8,4),
    lon NUMERIC(8,4),
    params JSONB,
    hourly_data BYTEA, -- numpy array, compressed
    annual_total_kwh NUMERIC,
    created_at TIMESTAMP,
    expires_at TIMESTAMP
);

-- tariff_table (EPDK güncel tarifeleri)
CREATE TABLE tariffs (
    id SERIAL PRIMARY KEY,
    consumer_group VARCHAR(50),
    voltage_level VARCHAR(20), -- 'LV', 'MV'
    tariff_type VARCHAR(50), -- 'single_term', 'time_of_use'
    period VARCHAR(20), -- 'all_day', 'day', 'peak', 'night'
    energy_price_tl_kwh NUMERIC(8,4),
    distribution_fee_tl_kwh NUMERIC(8,4),
    valid_from DATE,
    valid_to DATE,
    source VARCHAR(255) -- EPDK referans
);

-- monte_carlo_runs (uzun analizler için)
CREATE TABLE mc_runs (
    id UUID PRIMARY KEY,
    project_id UUID REFERENCES projects(id),
    status VARCHAR(50), -- 'queued', 'running', 'completed', 'failed'
    progress_pct INT DEFAULT 0,
    num_iterations INT,
    results JSONB,
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);
```

### 10.2 Tarife Tablosu Seed
EPDK'nın en güncel tarifesini scrape et veya manuel besle. Yapı:
- Mesken (tek terimli, tek zamanlı; tek terimli, çok zamanlı)
- Ticarethane (tek terimli, tek zamanlı; çok zamanlı)
- Sanayi (tek terimli; çok terimli — talep güç dahil)
- Tarımsal sulama
- Aydınlatma
- Son kaynak tedarik tarifesi

---

## 11. RAPORLAMA

### 11.1 PDF Rapor Yapısı
1. **Kapak**: Proje adı, lokasyon, tarih, hazırlayan firma + logo.
2. **Yönetici Özeti** (1 sayfa): Anahtar metrikler kart formatında, "yatırıma değer mi" kısa yorum.
3. **Proje Tanımı**: Lokasyon (mini harita), sistem konfigürasyonu, abone grubu.
4. **Üretim Analizi**: Yıllık üretim, mevsimsel dağılım, heatmap, degradasyon eğrisi.
5. **Tüketim Analizi**: Profil, aylık/saatlik, büyüme projeksiyonu.
6. **Mahsuplaşma Analizi**: 
   - Saatlik mahsup işleyişi (anlatım + EPDK referansı).
   - Yıllık net tüketim, fazla üretim, YEKDEM aktarım.
   - 25 yıllık kümülatif görünüm.
7. **Batarya** (varsa): Boyutlandırma rasyoneli, dispatch profili, dejenerasyon, augmentation planı.
8. **Finansal Analiz**:
   - CAPEX dökümü (pasta grafik + tablo).
   - 25 yıllık nakit akış tablosu.
   - IRR, NPV, LCOE, payback grafikleri.
   - Finansman seçeneklerinin karşılaştırması (3 kolon).
9. **Risk Analizi**: Monte Carlo dağılımları, tornado, P10/50/90.
10. **Duyarlılık Analizi**.
11. **Karbon Etkisi**: Önlenen CO2, eşdeğer ağaç sayısı.
12. **Varsayımlar ve Disclaimer**: Tüm parametreler, EPDK referansı, sorumluluk reddi.

### 11.2 Excel Export
- **Sheet 1 — Özet**: KPI'lar, executive summary.
- **Sheet 2 — Saatlik Veri** (8760 satır): timestamp, üretim, tüketim, mahsup, fazla, batarya SOC, PTF, cash flow per hour.
- **Sheet 3 — Aylık Özet**: 300 satır (25 yıl × 12 ay).
- **Sheet 4 — Yıllık Özet**: 25 satır.
- **Sheet 5 — CAPEX Dökümü**: Tüm kalemler.
- **Sheet 6 — OPEX 25 yıl**.
- **Sheet 7 — Cash Flow (gelir-gider) 25 yıl**: P&L formatı.
- **Sheet 8 — Kredi Geri Ödeme** (varsa): Aylık taksit tablosu.
- **Sheet 9 — Vergi Hesaplaması**.
- **Sheet 10 — Monte Carlo Sonuçları**: Tüm koşumların IRR/NPV/payback değerleri.
- **Sheet 11 — Varsayımlar**: Tüm parametreler dökümlü.

> **Önemli**: Excel'de bazı kritik hücrelerde formüller olmalı (sabit değer değil). Örn. IRR(), NPV() formülleri kullanılsın ki kullanıcı parametreyle oynayabilsin.

---

## 12. API ENDPOINT'LERİ (Backend)

```
POST   /auth/register
POST   /auth/login
GET    /auth/me

GET    /projects                 # listele
POST   /projects                 # yeni
GET    /projects/{id}
PUT    /projects/{id}
DELETE /projects/{id}

POST   /pvgis/fetch              # lokasyon + parametre → 8760 saat üretim
POST   /consumption/profile      # profil seç, dağıt
POST   /consumption/upload       # CSV upload
GET    /tariffs                  # güncel tarifeler

POST   /simulate/full            # tek koşum tam fizibilite (synchronous, <5s)
POST   /simulate/monte-carlo     # asenkron, MC run başlat (Celery task)
GET    /simulate/mc-status/{id}  # progress
GET    /simulate/mc-result/{id}

POST   /reports/pdf/{project_id}    # PDF generate, dosya stream
POST   /reports/excel/{project_id}  # Excel generate

WS     /ws/mc-progress/{run_id}     # Monte Carlo progress WebSocket
```

---

## 13. KABUL KRİTERLERİ (Definition of Done)

### 13.1 Fonksiyonel
- [ ] EPDK Tablo 1, 2, 3 örnekleri birebir doğrulanır (unit test).
- [ ] PVGIS API entegrasyonu çalışır, cache aktif.
- [ ] 13 tüketim profili yüklü, profil + upload + manuel düzenleme çalışır.
- [ ] Saatlik mahsup motoru bedelli limit dahil tam çalışır.
- [ ] Batarya dispatch 4 stratejide (öz tüketim, limit koruma, peak shaving, arbitraj) çalışır.
- [ ] Cycle + calendar degradation + augmentation modeli çalışır.
- [ ] 3 finansman seçeneği (öz sermaye, kredi, leasing) tam.
- [ ] Monte Carlo 1000 koşum < 60 saniyede tamamlanır.
- [ ] PDF rapor + Excel export çalışır.
- [ ] Login, çoklu proje, proje kaydet/yükle çalışır.
- [ ] İki modlu UI (uzman/müşteri) çalışır.

### 13.2 Kalite
- [ ] Backend test coverage ≥ %80.
- [ ] Frontend critical path test (Playwright/Cypress) yazılı.
- [ ] Lint geçer (ruff + eslint).
- [ ] Docker ile tek komutla ayağa kalkar (`docker-compose up`).
- [ ] OpenAPI dokümantasyon otomatik üretilir (`/docs`).
- [ ] README + user_guide.md + netting_logic.md yazılı.

### 13.3 Performans
- [ ] 8760 saatlik tek simülasyon < 500ms (backend).
- [ ] PVGIS cache hit < 50ms.
- [ ] Monte Carlo 1000 koşum < 60s (8 CPU core varsayımıyla).
- [ ] Frontend ilk yükleme < 3s.

---

## 14. GELİŞTİRME SIRASI (FASES)

> Claude Code'a verirken bu sırayla MR/PR aç:

**FAZ 1 — Çekirdek matematik (2-3 gün)**:
- Mahsuplaşma motoru + birim testler (EPDK örnekleri).
- PVGIS client + cache.
- Tüketim profili kütüphanesi.
- Temel finansal hesaplamalar (IRR, NPV, LCOE).

**FAZ 2 — Batarya modeli (2 gün)**:
- BatteryConfig + dispatch (kural tabanlı).
- Dejenerasyon + augmentation.
- Birim testler.

**FAZ 3 — Backend API + DB (2 gün)**:
- FastAPI + SQLAlchemy.
- Auth (JWT).
- Project CRUD.
- Tariff seed.

**FAZ 4 — Monte Carlo (1-2 gün)**:
- Vektörize MC engine.
- Celery + Redis entegrasyonu.
- WebSocket progress.

**FAZ 5 — Frontend temel (3-4 gün)**:
- Vite + React + Tailwind setup.
- Login, Dashboard, Project wizard.
- API hooks.

**FAZ 6 — Frontend sonuç dashboard (3-4 gün)**:
- 7 sekme (genel bakış, enerji, mahsup, batarya, finansal, risk, duyarlılık).
- Plotly/Recharts entegrasyonu.
- Heatmap, Sankey, tornado.

**FAZ 7 — Raporlama (2-3 gün)**:
- PDF (WeasyPrint + matplotlib).
- Excel (openpyxl, formüllerle).

**FAZ 8 — Polish (2-3 gün)**:
- Müşteri modu UI.
- i18n.
- Karanlık tema.
- Mobil responsive.
- Hata mesajları, loading states.

**FAZ 9 — Deploy + dokümantasyon (1-2 gün)**:
- Docker, CI/CD.
- README + user guide.
- Demo verisi.

**Toplam**: ~18-25 gün (sıkı çalışma).

---

## 15. KRİTİK NOTLAR VE UYARILAR

### 15.1 EPDK Yorumlamasında Belirsiz Noktalar
- **Bedelli limit aşımı saati**: Yıl içinde sınır aşıldıktan sonra "tüketim olduğu durumlarda 20 MWh ile mahsuplaşmaya devam edileceği" belirtilmiş. Yani limit aşıldıktan sonra bile NETED amount artmaya devam eder, sadece SURPLUS bedelsiz YEKDEM'e gider. Algoritma buna göre.
- **Aynı ölçüm noktası formülü**: `T = A + (B - C)`. Bunun ne zaman uygulanacağı (kullanıcının "aynı sayaçta mıyım" sorusu UI'da olmalı).
- **Tedarikçi seçimi**: Görevli tedarik şirketi vs serbest tedarikçi. Fiyat farklı. UI'da sor.

### 15.2 Yasal Disclaimer
PDF raporun sonuna eklenecek metin:
> "Bu rapor, EPDK Karar No: 14531 (30.04.2026) ve ilgili yönetmelik kapsamında hazırlanmıştır. Yapılan hesaplamalar mevcut tarife, fiyat ve yönetmelik koşullarına dayanmaktadır. Yatırım kararı vermeden önce yetkili enerji uzmanlarına danışılması önerilir. [Şirket adı] sonuçların doğruluğu konusunda yasal sorumluluk kabul etmez."

### 15.3 Veri Güncellemesi
- EPDK tarifelerini güncelleyen admin sayfası olsun.
- USD/TL kur otomatik çekilebilir (TCMB API veya benzeri).
- PTF verileri (EPİAŞ Şeffaflık Platformu) opsiyonel entegrasyon.

### 15.4 Veri Hassasiyeti
- Kullanıcı tüketim verisi şirket sırrı olabilir → encryption at rest.
- HTTPS zorunlu (production).
- GDPR/KVKK uyumlu kullanıcı verisi yönetimi.

### 15.5 Test Verileri
Demo proje olarak en az 3 proje seed edilsin:
1. Antalya, 500 kWp çatı GES, ticarethane (otel).
2. Konya, 4.9 MW arazi GES, lisanssız tüzel kişi.
3. İzmir, 1 MWp + 2 MWh BESS hibrit, sanayi fabrikası.

---

## 16. CLAUDE CODE'A VERİLECEK İLK PROMPT (Örnek)

```
Bu dosyayı (PRD_GES_Saatlik_Mahsuplasma_Fizibilite.md) okudun.

İlk görev: FAZ 1 — Çekirdek matematik.

Adımlar:
1. Proje yapısını oluştur (backend/ klasörü, pyproject.toml, FastAPI iskeleti).
2. backend/app/services/netting.py içine saatlik mahsuplaşma motorunu yaz.
3. backend/tests/test_netting.py içine EPDK Tablo 1, Tablo 2, Tablo 3 testlerini yaz.
4. Pytest çalıştır, hepsi GEÇSİN.

Sonra durağı bana bildir, ben FAZ 2'ye geçeceğim.

Kurallar:
- Python 3.11+, type hints zorunlu.
- ruff + black lint geçecek.
- Test coverage en az %80.
- Tüm fonksiyonlar docstring'li (Google style).
- numpy vektörize, döngüden kaçın.
- Hata mesajları Türkçe, kod İngilizce.
```

---

**Bu PRD ile Claude Code üzerinde çalışmaya hazırsın.** İlk faza başla, problem çıkarsa bana sor — özellikle EPDK yorumlamasında belirsizlik olursa.
