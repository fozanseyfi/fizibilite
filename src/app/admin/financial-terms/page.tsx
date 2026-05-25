"use client";

import { useState, useMemo } from "react";
import { BookText, Search, X, ChevronDown } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/admin/card";
import { Input } from "@/components/admin/input";
import { FINANCIAL_TERMS, TermDef } from "@/lib/financial-terms";

// ---------- Ek terimler (ratio / KPI / metodoloji) ----------
// CashFlowTable'da satır başlığı olmayan ama her yerde geçen kavramlar.
const ADDITIONAL_TERMS: Record<string, TermDef> = {
  "NPV": {
    title: "NPV (Net Present Value · Net Bugünkü Değer)",
    body: "Bir projenin gelecekteki tüm nakit akışlarının (FCFC) bugünkü değer toplamı. NPV = Σ FCFC_t / (1+WACC)^t − Initial CAPEX. NPV > 0 ⇒ proje sermaye maliyetinin üstünde getiri yaratır, finansal olarak yapılabilir.",
  },
  "IRR": {
    title: "IRR (Internal Rate of Return · İç Verim Oranı)",
    body: "NPV'yi sıfıra eşitleyen iskonto oranı. Projenin sermaye maliyetine bakılmaksızın ürettiği yıllık bileşik getirisi. IRR > WACC ⇒ değer yaratır. Türk GES projeleri için tipik aralık %12-22 (USD bazlı).",
  },
  "MIRR": {
    title: "MIRR (Modified IRR · Modifiye İç Verim Oranı)",
    body: "IRR'nin eksik varsayımını düzelten metrik: ara nakit akışları WACC ile reinvest edilir varsayılır (IRR'de IRR oranıyla reinvest varsayılır, gerçekçi değil). Genelde IRR'den biraz düşüktür; daha güvenilir karşılaştırma metriği.",
  },
  "Equity IRR": {
    title: "Equity IRR (Öz Sermaye İç Verim Oranı)",
    body: "Sadece öz sermaye akışları (FCFE) üzerinden hesaplanan IRR. Sponsorun aldığı net getiriyi gösterir. Kaldıraç olduğunda Project IRR'den (FCFC üzerinden) yüksek çıkar. Bankalar için ikincil, sponsorlar için birincil metrik.",
  },
  "LCOE": {
    title: "LCOE (Levelized Cost of Energy · Seviyelendirilmiş Enerji Maliyeti)",
    body: "1 kWh üretmenin yaşam döngüsü maliyeti. LCOE = Σ(CAPEX+OPEX) iskontolu / Σ Üretim iskontolu. Birim: TL/kWh veya $/MWh. Tarife veya PPA fiyatıyla karşılaştırmak için ana metrik. 2026'da Türkiye GES için tipik 0.50-0.85 TL/kWh.",
  },
  "DSCR": {
    title: "DSCR (Debt Service Coverage Ratio · Borç Servisi Karşılama Oranı)",
    body: "Dönem CFADS / Dönem borç servisi (anapara + faiz). Bankanın asgari koşulu genelde 1.20-1.30. DSCR ortalaması bu eşiğin altına düşerse kredi çekilmez veya cure mechanism (ek sermaye) tetiklenir. Min DSCR krediyle ilgili en kritik metrik.",
  },
  "LLCR": {
    title: "LLCR (Loan Life Coverage Ratio · Kredi Ömrü Karşılama Oranı)",
    body: "Kredinin tüm vadesi boyunca toplam CFADS (iskontolu) / Bakiye kredi. DSCR'in vade boyunca toplam görünümü. Bankalar genelde ≥ 1.40 ister. Project finance'te en sık kullanılan ikincil karşılama metriği.",
  },
  "PLCR": {
    title: "PLCR (Project Life Coverage Ratio · Proje Ömrü Karşılama Oranı)",
    body: "Projenin tüm ömrü (kredi vadesinden uzun) boyunca toplam CFADS (iskontolu) / Bakiye kredi. LLCR'den daha geniş. PLCR > LLCR > DSCR sıralaması beklenir. Tipik banka eşiği ≥ 1.70.",
  },
  "WACC": {
    title: "WACC (Weighted Average Cost of Capital · Ağırlıklı Sermaye Maliyeti)",
    body: "WACC = (E/V) × Re + (D/V) × Rd × (1−t). Öz sermaye ve borç maliyetlerinin sermaye yapısına göre ağırlıklı ortalaması. NPV hesabında iskonto oranı olarak kullanılır. Türkiye GES için tipik %10-14 (USD bazlı).",
  },
  "Cost of Equity (Re)": {
    title: "Cost of Equity (Öz Sermaye Maliyeti)",
    body: "Sponsorların talep ettiği minimum getiri. CAPM: Re = Rf + β × (Rm − Rf) + Country Risk Premium. Türkiye GES için tipik %15-20 USD bazlı (yüksek country risk nedeniyle).",
  },
  "Cost of Debt (Rd)": {
    title: "Cost of Debt (Borç Maliyeti)",
    body: "Banka kredisinin all-in faiz oranı: baz oran (SOFR / Euribor / TLREF) + banka margin + commitment fee anüite. Vergi sonrası: Rd × (1−t). Türkiye GES projeleri için 2026'da USD SOFR + 3.5-5% margin tipik.",
  },
  "FCFC Payback": {
    title: "FCFC Payback Period (Şirket Geri Ödeme Süresi)",
    body: "Kümülatif FCFC'nin sıfırı geçtiği yıl. İlk CAPEX'in proje nakit akışlarıyla geri kazanıldığı süre. İskonto edilmeden hesaplanır (basit payback). Türkiye GES için tipik 5-8 yıl.",
  },
  "FCFE Payback": {
    title: "FCFE Payback Period (Öz Sermaye Geri Ödeme Süresi)",
    body: "Kümülatif FCFE'nin sıfırı geçtiği yıl. Sponsorun yatırdığı öz sermayenin temettülerle geri kazanıldığı süre. Kaldıraç sayesinde FCFC Payback'ten kısadır. Tipik 3-6 yıl.",
  },
  "Discounted Payback": {
    title: "Discounted Payback (İskontolu Geri Ödeme)",
    body: "Kümülatif iskontolu FCFC'nin sıfırı geçtiği yıl. Parasal zaman değerini hesaba katar. Basit payback'ten her zaman uzundur. Daha muhafazakar metrik.",
  },
  "Equity Ratio": {
    title: "Equity Ratio (Öz Sermaye Oranı)",
    body: "Toplam yatırımda öz sermaye payı. Equity / (Equity + Debt). Türkiye GES'te banka tipik %30 alt sınır koyar. Yüksek equity ratio ⇒ düşük kaldıraç, daha düşük risk, daha düşük equity IRR.",
  },
  "Debt-to-Equity (D/E)": {
    title: "Debt-to-Equity Ratio (Borç/Öz Sermaye)",
    body: "Debt / Equity. Kaldıraç ölçüsü. Türkiye GES'te tipik 70/30 = 2.33. Yüksek D/E ⇒ yüksek equity IRR ama yüksek DSCR riski. Banka karar verirken bu ikisini dengeler.",
  },
  "OWC": {
    title: "OWC (Operating Working Capital · İşletme Sermayesi)",
    body: "Operasyon için bağlanmış kısa vadeli sermaye: alacaklar + stok − ticari borçlar. GES'te tipik 30-45 günlük gelir-gider farkı. ΔOWC nakit akışını etkiler.",
  },
  "CFADS": {
    title: "CFADS (Cash Flow Available for Debt Service)",
    body: "Borç servisine ayrılabilen nakit. CFADS = EBITDA − Tax − ΔWC − Maintenance CapEx. DSCR ve LLCR hesabının paydası. Bankaların finansal model çıktısında ana satır.",
  },
  "FCFC": {
    title: "FCFC (Free Cash Flow to Company · Şirkete Serbest Nakit Akışı)",
    body: "Tüm sermaye sağlayıcılarına (öz sermaye + kreditör) giden serbest nakit. FCFC = EBITDA(1−t) + Depreciation×t − ΔWC − CAPEX. Project NPV / IRR hesabında kullanılır.",
  },
  "FCFE": {
    title: "FCFE (Free Cash Flow to Equity · Öz Sermayeye Serbest Nakit Akışı)",
    body: "Sadece öz sermaye sahiplerine giden nakit. FCFE = FCFC − Faiz(1−t) − Anapara + Yeni Borç. Equity NPV / IRR hesabında kullanılır.",
  },
  "P50 / P75 / P90": {
    title: "P50 / P75 / P90 (Olasılıksal Üretim Senaryoları)",
    body: "PVGIS / Meteonorm meteorolojik veriden türetilen üretim olasılık sınırları. P50 = ortalama (banka için baz), P75 = %75 olasılıkla aşılan üretim (muhafazakar), P90 = %90 olasılıkla aşılan (banka koşulu — DSCR P90 senaryoda da ≥1.20 olmalı).",
  },
  "PR": {
    title: "PR (Performance Ratio · Performans Oranı)",
    body: "Gerçek elektrik üretimi / Teorik üretim (kayıp ve degradation hesaba katılmadan). PR = Gerçek kWh / (Modül kWp × Saha radyasyonu). Türkiye GES için tipik 0.78-0.85. Düşük PR ⇒ kayıp veya arıza işareti.",
  },
  "Specific Yield": {
    title: "Specific Yield (Özgül Üretim)",
    body: "Kurulu kW başına yıllık üretim. Specific Yield = Yıllık kWh / Kurulu kWp. Birim: kWh/kWp/yıl. Türkiye için tipik 1400-1700. Lokasyonun güneşlenme potansiyelini özetler.",
  },
  "CAPEX": {
    title: "CAPEX (Capital Expenditure · Sermaye Harcaması)",
    body: "Yatırım maliyetleri toplamı: modül + invertör + montaj + kablo + trafo + bağlantı bedeli + EPC marjı + arazi + IDC (interest during construction). Yıl 0'da nakit çıkışı; muhasebede amortismanla yazılır.",
  },
  "OPEX": {
    title: "OPEX (Operating Expenditure · İşletme Gideri)",
    body: "Yıllık operasyon giderleri: O&M + sigorta + personel + kira + lisans bedelleri. Tipik 1.0-1.5 TL/Wp/yıl GES için. Eskalasyon CPI ile yapılır.",
  },
  "EBITDA Margin": {
    title: "EBITDA Margin (EBITDA Marjı)",
    body: "EBITDA / Revenue. Operasyonel verimlilik göstergesi. GES için tipik %70-85 (capital-intensive, OPEX düşük). PPA projelerinde daha tahmin edilebilir.",
  },
  "IDC": {
    title: "IDC (Interest During Construction · İnşaat Dönemi Faizi)",
    body: "Tesis devreye alınana kadar (commercial operation date öncesi) işleyen kredi faizi. CAPEX'e eklenir ve aktifleştirilir. Türkiye GES'te tipik 6-12 aylık inşaat süresince %2-4 ek maliyet.",
  },
  "COD": {
    title: "COD (Commercial Operation Date · Ticari İşletme Tarihi)",
    body: "Tesisin yetkililerden geçici kabul aldığı, EPDK'ya bildirildiği ve gelir üretmeye başladığı tarih. P&L ve cash flow modellemesinin başlangıç noktası. EPDK Karar 14531 mahsuplaşma rejimi bu tarihten itibaren işler.",
  },
  "PPA": {
    title: "PPA (Power Purchase Agreement · Elektrik Satın Alma Anlaşması)",
    body: "Üretici ile alıcı (corporate, tedarikçi) arasındaki uzun vadeli sabit fiyatlı satış anlaşması. Türkiye'de YEKDEM dışında bilateral pazarda yapılır. Bankalar PPA olan projelere düşük margin uygular.",
  },
  "Augmentation": {
    title: "Augmentation (Batarya Kapasite Yenileme)",
    body: "BESS'lerde yıllar içinde gerçekleşen kapasite degradation'ını telafi etmek için ek modül eklenmesi. Tipik 5-7 yıl aralıklarla, başlangıç CAPEX'inin %15-25'i kadar. Modelde planlı CAPEX kalemleri olarak görünür.",
  },
};

const ALL_TERMS = { ...ADDITIONAL_TERMS, ...FINANCIAL_TERMS };

// ---------- Kategorize ----------
interface Category {
  id: string;
  label: string;
  description: string;
  keys: string[];
}

const CATEGORIES: Category[] = [
  {
    id: "kpi",
    label: "Performans Göstergeleri (KPI)",
    description: "Karar verme metrikleri — banka, sponsor ve yatırımcı için ana çıktılar",
    keys: ["NPV", "IRR", "MIRR", "Equity IRR", "LCOE", "FCFC Payback", "FCFE Payback", "Discounted Payback"],
  },
  {
    id: "coverage",
    label: "Borç Karşılama Oranları",
    description: "Project finance bankacılığında kredi onayı için kritik oranlar",
    keys: ["DSCR", "LLCR", "PLCR", "CFADS"],
  },
  {
    id: "capital",
    label: "Sermaye Maliyeti & Yapı",
    description: "WACC ve sermaye yapısı bileşenleri",
    keys: ["WACC", "Cost of Equity (Re)", "Cost of Debt (Rd)", "Equity Ratio", "Debt-to-Equity (D/E)"],
  },
  {
    id: "income",
    label: "Gelir Tablosu (P&L)",
    description: "Income Statement satır kalemleri",
    keys: [
      "Sales Revenue", "Scrapped Equipment", "Net Sales", "Transmission and Operational Fees", "Other Fees",
      "Gross Profit", "Insurance Cost", "Corrective Maintenance", "Preventive Maintenance", "Total Payroll",
      "EBITDA", "EBITDA Margin", "Depreciation", "EBIT", "FX Gain/Loss", "Interest Expenses",
      "Earnings Before Tax", "FX Gain Loss Addback", "Tax Expense", "Net Income",
    ],
  },
  {
    id: "cashflow",
    label: "Nakit Akış Tablosu",
    description: "Cash Flow Statement satır kalemleri",
    keys: [
      "Revenue", "All in Cost of Sales", "OWC", "OWC Requirement", "Change in OWC", "Corporate Income Tax", "VAT",
      "Net Operating Cash Flow", "Capex", "Net Investing Cash Flow", "Drawdown", "Repayment", "Interest Expense",
      "Commitment Fee", "Arrangement Fee", "Equity", "Additional Equity to cure DSCR",
      "Net Working Capital Loan Drawdown", "Net Working Capital Loan Repayment", "Net Financing Cash Flow",
      "Opening", "Addition/(Disposal)", "Closing",
    ],
  },
  {
    id: "waterfall",
    label: "Cash Waterfall",
    description: "Şelale modeli satır kalemleri",
    keys: [
      "Revenues", "Operating costs", "Change in working capital", "Net VAT Cash Flow",
      "Operating Cash Flow Before Tax", "Corporate income tax paid", "FCFC", "FCFE",
      "Net FCFC", "Discounted Net FCFC", "Cumulative Net FCFC",
      "Net FCFE", "Discounted Net FCFE", "Cumulative Net FCFE",
    ],
  },
  {
    id: "technical",
    label: "Teknik Terimler",
    description: "PV/BESS teknik ve operasyonel terimler",
    keys: ["P50 / P75 / P90", "PR", "Specific Yield", "CAPEX", "OPEX", "IDC", "COD", "PPA", "Augmentation"],
  },
];

export default function FinancialTermsPage() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const q = query.trim().toLowerCase();

  const filteredCategories = useMemo(() => {
    return CATEGORIES.filter((c) => activeCategory === "all" || c.id === activeCategory)
      .map((c) => {
        const items = c.keys
          .map((k) => ({ key: k, def: ALL_TERMS[k] }))
          .filter((x): x is { key: string; def: TermDef } => !!x.def)
          .filter((x) => {
            if (!q) return true;
            return (
              x.key.toLowerCase().includes(q) ||
              x.def.title.toLowerCase().includes(q) ||
              x.def.body.toLowerCase().includes(q)
            );
          });
        return { ...c, items };
      })
      .filter((c) => c.items.length > 0);
  }, [q, activeCategory]);

  const totalCount = Object.values(ALL_TERMS).length;
  const visibleCount = filteredCategories.reduce((sum, c) => sum + c.items.length, 0);

  return (
    <>
      <PageHeader
        title="Finansal Terimler Sözlüğü"
        description={`Bu projede geçen ${totalCount} finansal & teknik kavramın açıklaması — IRR, NPV, DSCR, LCOE ve cash flow satırları dahil`}
        icon={BookText}
      />

      {/* Arama + Kategori filtre */}
      <Card className="!p-4 mb-4">
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Terim ara — örn. DSCR, NPV, EBITDA, kur farkı..."
            className="pl-9 pr-9"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text3 hover:text-text"
              aria-label="Aramayı temizle"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <CategoryChip
            active={activeCategory === "all"}
            onClick={() => setActiveCategory("all")}
            label="Tümü"
            count={totalCount}
          />
          {CATEGORIES.map((c) => (
            <CategoryChip
              key={c.id}
              active={activeCategory === c.id}
              onClick={() => setActiveCategory(c.id)}
              label={c.label}
              count={c.keys.filter((k) => ALL_TERMS[k]).length}
            />
          ))}
        </div>
        {q && (
          <div className="text-[11px] text-text3 mt-3">
            <strong className="text-text">{visibleCount}</strong> sonuç bulundu
            {visibleCount === 0 && " — farklı bir terim deneyin"}
          </div>
        )}
      </Card>

      {/* İçerik */}
      {filteredCategories.length === 0 ? (
        <Card className="text-center py-12">
          <BookText className="h-10 w-10 mx-auto text-text3 mb-3" />
          <p className="text-sm text-text2">
            &quot;<strong className="text-text">{query}</strong>&quot; için sonuç bulunamadı.
          </p>
        </Card>
      ) : (
        <div className="space-y-5">
          {filteredCategories.map((c) => (
            <section key={c.id}>
              <div className="flex items-end justify-between border-b border-border2 pb-1.5 mb-3">
                <div>
                  <h2 className="text-[11px] uppercase tracking-[1.5px] font-bold text-text">{c.label}</h2>
                  <p className="text-[11px] text-text3 mt-0.5">{c.description}</p>
                </div>
                <span className="text-[10px] uppercase tracking-[1.2px] text-text3 font-mono">
                  {c.items.length} terim
                </span>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {c.items.map((x) => (
                  <TermCard key={x.key} title={x.def.title} body={x.def.body} highlight={q} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

function CategoryChip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
        active
          ? "bg-accent text-white"
          : "bg-bg2 text-text2 hover:bg-bg3 hover:text-text"
      }`}
    >
      {label}
      <span className={`text-[10px] tabular-nums ${active ? "text-white/80" : "text-text3"}`}>
        {count}
      </span>
    </button>
  );
}

function TermCard({ title, body, highlight }: { title: string; body: string; highlight?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <details
      open={open || !!highlight}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      className="group rounded-md border border-border2 bg-bg overflow-hidden transition-colors hover:border-accent/40 open:border-accent/40 open:bg-white"
    >
      <summary className="cursor-pointer list-none px-3.5 py-2.5 flex items-start gap-2 hover:bg-bg2/50 transition-colors">
        <ChevronDown
          className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 transition-transform text-text3 group-open:rotate-0 -rotate-90`}
        />
        <span className="font-semibold text-[13px] text-text leading-snug">{title}</span>
      </summary>
      <div className="px-3.5 pb-3.5 pt-1 text-[12.5px] text-text2 leading-relaxed border-t border-border2/50">
        {body}
      </div>
    </details>
  );
}
