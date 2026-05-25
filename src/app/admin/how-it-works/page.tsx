"use client";

import {
  Sparkles,
  Lightbulb,
  ChevronDown,
  HelpCircle,
  Layers,
  ListChecks,
  Calendar,
  Target,
  MapPin,
  Sun,
  Zap,
  Battery,
  TrendingUp,
  AlertTriangle,
  Share2,
  CheckCircle2,
} from "lucide-react";

interface Step {
  num: string;
  title: string;
  summary: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>;
  details: {
    intro: string;
    bullets: { label: string; value: string }[];
    tip?: string;
  };
}

const STEPS: Step[] = [
  {
    num: "01",
    title: "Proje Kurulumu",
    summary: "Müşteri, lokasyon (lat/lon), proje tipi, kurulu güç ve takvim bilgileri.",
    icon: Sparkles,
    details: {
      intro:
        "Yeni bir fizibilite projesi açtığında temel parametreleri girersin: çatı/arazi/hibrit BESS tipi, kurulu güç (kWp), enlem/boylam, tarife sınıfı (mesken/sanayi/ticarethane), COD (devreye alım) tarihi. Bu bilgiler PVGIS çağrısının, EPDK saatlik mahsuplaşma algoritmasının ve finansal modelin referansını oluşturur.",
      bullets: [
        { label: "Tip", value: "Çatı · Arazi · Hibrit BESS" },
        { label: "Para birimi", value: "TRY · USD (USD/TRY kuru ile)" },
        { label: "Kapsam", value: "COD tarihi + analiz periyodu (25 yıl)" },
      ],
      tip: "Lokasyon doğru girilirse PVGIS-SARAH3 saatlik üretim verisini otomatik çeker — manuel tahmine gerek kalmaz.",
    },
  },
  {
    num: "02",
    title: "PVGIS Saatlik Üretim",
    summary: "Lokasyona göre 25 yıllık saatlik (8760 h) PV üretim verisi.",
    icon: Sun,
    details: {
      intro:
        "Lokasyon koordinatlarıyla PVGIS-SARAH3 API'sine otomatik istek atılır. 8760 saatlik tipik yıl üretimi çekilir, sistem kayıpları (DC/AC, kablo, soiling, tilt mismatch) uygulanır, yıllık degradasyon (%0.5/yıl) eklenerek 25 yıllık seri elde edilir.",
      bullets: [
        { label: "Veri kaynağı", value: "PVGIS-SARAH3 (EU/Türkiye)" },
        { label: "Çözünürlük", value: "Saatlik · 8760 h × 25 yıl" },
        { label: "Kayıplar", value: "DC/AC + soiling + kablo + IAM" },
      ],
      tip: "Aynı lokasyon için ikinci kez çağırırsan PVGIS cache'den döner — sn altında yanıt.",
    },
  },
  {
    num: "03",
    title: "Tüketim Profili",
    summary: "Müşterinin saatlik tüketim profilini CSV yükle veya synthetic üret.",
    icon: Zap,
    details: {
      intro:
        "EPDK saatlik mahsuplaşma için saatlik tüketim profili şart. CSV ile gerçek kayıtları yükleyebilir veya 'Synthetic Builder' ile tarife sınıfı + günlük/aylık dağılım pattern'lerinden otomatik 8760 h profil üretebilirsin. Tatil günleri, vardiya, klima dönemleri parametrik.",
      bullets: [
        { label: "CSV format", value: "Datetime + kWh (UTC+3)" },
        { label: "Synthetic", value: "Tarife tipine göre tipik profil" },
        { label: "Doğrulama", value: "Yıllık toplam + peak/avg kontrol" },
      ],
      tip: "Tüketim profili yoksa Synthetic Builder ilk yaklaşımı verir; sonra gerçek fatura ile kalibre et.",
    },
  },
  {
    num: "04",
    title: "Saatlik Mahsuplaşma",
    summary: "EPDK Karar 14531 algoritması: saatlik üretim ↔ tüketim eşleştirmesi.",
    icon: CheckCircle2,
    details: {
      intro:
        "Her saat için üretim ile tüketim karşılaştırılır. Üretim ≥ tüketim ise fazlası şebekeye verilir (excess), aksi halde şebekeden çekilir (import). Excess enerjinin %5 sistem kullanım bedeli düşülerek bir sonraki ay sonuna kadar kullanılabilir (carry-over). Aylık tüm artıklar Son Kaynak Tedariği fiyatından geri ödenir.",
      bullets: [
        { label: "Algoritma", value: "Karar 14531 (1 Şubat 2026)" },
        { label: "Carry-over", value: "Aynı + bir sonraki ay (max 60 gün)" },
        { label: "Excess satış", value: "Son Kaynak Tedariği fiyatı" },
      ],
      tip: "Saatlik vs aylık karşılaştırma sayfasında aradaki farkı görebilirsin — saatlik genelde %15-30 daha az kazandırır ama yasal zorunluluk.",
    },
  },
  {
    num: "05",
    title: "Tarife & Net Fatura",
    summary: "Aktif EPDK tarifesi (2026 Mart) ile aylık net fatura hesabı.",
    icon: Layers,
    details: {
      intro:
        "Tarife veritabanından müşteri sınıfı (mesken/sanayi/ticarethane) ve gerilim seviyesi (AG/OG) seçilir. EPDK kalemleri (enerji bedeli, dağıtım, iletim, kayıp-kaçak, sayaç okuma, VEDOP, BTV) otomatik uygulanır. Time-of-use (gündüz/puant/gece) profile bağlı çalışır.",
      bullets: [
        { label: "Tarife sürümü", value: "1 Mart 2026 yürürlükte" },
        { label: "Kalemler", value: "12 EPDK + KDV + ÖTV" },
        { label: "ToU", value: "Gündüz 06-17 · Puant 17-22 · Gece 22-06" },
      ],
      tip: "Tarifeler %3-4 ayda bir güncellenir — yeni tarife geldiğinde Admin panelinden tek tıkla aktifleştirilir.",
    },
  },
  {
    num: "06",
    title: "Hibrit BESS (Opsiyonel)",
    summary: "Batarya boyutlama, dispatch stratejisi, döngü ömrü.",
    icon: Battery,
    details: {
      intro:
        "BESS aktifse kapasite (kWh) ve güç (kW) girilir. Dispatch stratejisi: 'Peak shaving' (puant saatlerde deşarj), 'Self-consumption max' (excess'i depolayıp gece kullan), 'Arbitrage' (ucuzdan al pahalıya sat). Yıllık döngü sayısı, DoD limiti, takvim degradasyonu modele dahil.",
      bullets: [
        { label: "Strateji", value: "Peak shaving · Self-use · Arbitrage" },
        { label: "Round-trip", value: "85-92% (Li-ion)" },
        { label: "Ömür", value: "6000 cycle · 80% EoL" },
      ],
      tip: "Sanayi profillerinde puant 17-22 arası BESS deşarjı ile aylık ek %8-12 kazanç sağlanabilir.",
    },
  },
  {
    num: "07",
    title: "Finansal Model & Project Finance",
    summary: "P&L, Cash Flow, Cash Waterfall, DSCR/LLCR/PLCR — banka grade.",
    icon: TrendingUp,
    details: {
      intro:
        "CAPEX (EPC + arazi + bağlantı + yedek), OPEX (O&M + sigorta + arazi kirası), banka kredisi (faiz oranı, swap, vade, grace), equity oranı, vergi (kurumlar %25), enflasyon. IDC (inşaat dönemi faizi), S-curve harcama, FX hedge, master check toplam 6 modülde gösterilir.",
      bullets: [
        { label: "Çıktılar", value: "NPV · IRR · LCOE · Payback" },
        { label: "PF KPI'lar", value: "DSCR · LLCR · PLCR · Equity IRR" },
        { label: "Sertifikalar", value: "EBRD / UKEF / İFC grade" },
      ],
      tip: "DSCR 1.30 altında ise dashboard kırmızı uyarır — banka onay almaz, kredi yapısını revize et.",
    },
  },
  {
    num: "08",
    title: "Monte Carlo & Hassasiyet",
    summary: "9 stokastik değişkenle 10.000 simülasyon — risk dağılımı.",
    icon: AlertTriangle,
    details: {
      intro:
        "PVGIS üretim sapması, USD/TRY, enflasyon, CAPEX overrun, OPEX artışı, tarife artışı, faiz, gecikme, BESS dejenerasyonu gibi 9 değişken üzerinde Monte Carlo çalıştırılır. P5/P50/P95 IRR ve NPV dağılımları çıkartılır. Tornado chart hangi değişkenin sonucu en çok etkilediğini gösterir.",
      bullets: [
        { label: "Simülasyon", value: "10.000 iterasyon" },
        { label: "Çıktı", value: "P5/P50/P95 + PDF/CDF" },
        { label: "Tornado", value: "Top 5 sensitivity" },
      ],
      tip: "USD/TRY ve tarife artışı genelde top 2 sensitivity — bunlara hedge senaryosu kurmak banka tarafından beklenir.",
    },
  },
  {
    num: "09",
    title: "Rapor & Paylaşım",
    summary: "PDF/Excel raporlar + yatırımcıya read-only public link.",
    icon: Share2,
    details: {
      intro:
        "Tek tıkla 40+ sayfalık fizibilite raporu PDF üretilir — Türkçe karakter doğru, marka renklerinde. Excel olarak yıllık nakit akışı, cash waterfall, mahsuplaşma sonuçları indirilebilir. Yatırımcıya public link gönderirsin — sadece seçtiğin modüller görünür, süreli ve iptal edilebilir.",
      bullets: [
        { label: "PDF", value: "Yönetici özeti + ayrıntılı 40+ sayfa" },
        { label: "Excel", value: "Cash flow + waterfall + mahsuplaşma" },
        { label: "Public share", value: "Süre + modül seçim + iptal" },
      ],
      tip: "Public link sende kalır, istediğin zaman Admin → Paylaşım'dan iptal edersin.",
    },
  },
];

const STATS = [
  { icon: Layers, value: "9", label: "Demo Şablon Projesi" },
  { icon: ListChecks, value: "15+", label: "Modül" },
  { icon: Calendar, value: "9 adım", label: "Fizibilite Akışı" },
  { icon: Target, value: "10+", label: "Finansal KPI" },
];

export default function HowItWorksPage() {
  return (
    <>
      {/* HERO KART */}
      <div className="rounded-2xl border border-border bg-gradient-to-br from-accent/8 via-white to-white p-5 sm:p-6 mb-4 animate-slide-up">
        <div className="flex items-start gap-4">
          <span className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-accent text-white shadow-soft shrink-0">
            <HelpCircle size={26} />
          </span>
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-accent/10 text-accent text-[10px] font-bold uppercase tracking-[1.5px]">
              <Sparkles size={11} /> NASIL ÇALIŞIR
            </span>
            <h1 className="font-display text-2xl sm:text-[28px] font-extrabold text-text leading-tight tracking-tight mt-2">
              GES Fizibilitesini Adım Adım Tanıyın
            </h1>
            <p className="text-sm text-text2 mt-2 max-w-3xl leading-relaxed">
              Proje kurulumundan yatırımcıya raporlamaya kadar EPDK Karar 14531 uyumlu tüm fizibilite akışı
              {" "}{STEPS.length} adımda anlatıldı. Her adımda hangi verinin nereden çekildiğini, hangi metriğin
              otomatik hesaplandığını ve hangi pratik özelliklerin işini hızlandırdığını detayda görebilirsin.
            </p>
          </div>
        </div>
      </div>

      {/* KPI ŞERİDİ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4 animate-slide-up">
        {STATS.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="rounded-xl border border-border bg-white px-4 py-3 flex items-center gap-3 hover:-translate-y-0.5 hover:shadow-soft transition-all"
            >
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-accent/10 text-accent shrink-0">
                <Icon size={18} />
              </span>
              <div className="min-w-0">
                <div className="font-mono text-lg font-extrabold text-text leading-none tabular-nums">
                  {s.value}
                </div>
                <div className="text-[11px] text-text3 mt-0.5">{s.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* İPUCU */}
      <div className="rounded-xl border border-blue/25 bg-blue/5 px-4 py-3 mb-5 flex items-start gap-3 animate-slide-up">
        <Lightbulb size={18} className="text-blue shrink-0 mt-0.5" />
        <div className="text-[13px] text-text2 leading-relaxed">
          <strong className="text-blue font-bold">İpucu:</strong> Bir kez PVGIS + tüketim + tarife seçimini
          tamamladığında, parametreleri tek tek değiştirip 10 saniyede yeniden simüle edebilirsin —
          bütün cash flow, mahsuplaşma ve PF KPI&apos;ları anında güncellenir.
        </div>
      </div>

      {/* ADIM KARTLARI */}
      <div className="space-y-2.5">
        {STEPS.map((step, i) => (
          <StepCard key={step.num} step={step} defaultOpen={i === 0} />
        ))}
      </div>

      <div className="mt-8 mb-2 text-center">
        <div className="text-[11px] text-text3 font-mono">
          {STEPS.length} adımda EPDK uyumlu fizibilite · ges-fizibilite-pro
        </div>
      </div>
    </>
  );
}

function StepCard({ step, defaultOpen = false }: { step: Step; defaultOpen?: boolean }) {
  const Icon = step.icon;
  return (
    <details
      open={defaultOpen}
      className="group rounded-xl border border-border bg-white overflow-hidden transition-all open:border-l-4 open:border-l-accent open:shadow-soft"
    >
      <summary className="cursor-pointer list-none px-4 py-3.5 flex items-center gap-3.5 hover:bg-bg2/40 transition-colors">
        <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-accent text-white shrink-0 shadow-sm">
          <Icon size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[9px] uppercase tracking-[1.5px] font-bold text-accent">
            ADIM {step.num}
          </div>
          <div className="font-display font-extrabold text-[15px] sm:text-base text-text tracking-tight leading-tight mt-0.5">
            {step.title}
          </div>
          <div className="text-[12.5px] text-text2 mt-0.5 truncate sm:whitespace-normal">
            {step.summary}
          </div>
        </div>
        <span className="flex items-center gap-1 text-[11px] text-text3 font-medium shrink-0 group-open:hidden">
          Detaylar
          <ChevronDown size={14} />
        </span>
        <span className="hidden group-open:flex items-center gap-1 text-[11px] text-accent font-bold shrink-0">
          Kapat
          <ChevronDown size={14} className="rotate-180" />
        </span>
      </summary>

      <div className="px-4 pb-4 pt-1 border-t border-border bg-bg2/20">
        <p className="text-[13px] text-text leading-relaxed mt-3">
          {step.details.intro}
        </p>

        {step.details.bullets.length > 0 && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
            {step.details.bullets.map((b) => (
              <div
                key={b.label}
                className="rounded-lg border border-border bg-white px-3 py-2"
              >
                <div className="text-[9px] uppercase tracking-wider font-bold text-text3">
                  {b.label}
                </div>
                <div className="text-xs font-semibold text-text mt-0.5">{b.value}</div>
              </div>
            ))}
          </div>
        )}

        {step.details.tip && (
          <div className="mt-3 rounded-lg bg-yellow/8 border border-yellow/30 px-3 py-2 flex items-start gap-2">
            <Lightbulb size={13} className="text-yellow shrink-0 mt-0.5" />
            <span className="text-[12px] text-text2">
              <strong className="text-yellow font-bold">İpucu:</strong> {step.details.tip}
            </span>
          </div>
        )}
      </div>
    </details>
  );
}
