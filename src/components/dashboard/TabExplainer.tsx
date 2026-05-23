'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, BookOpen, GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Her finansal sekmenin başına eklenen "Bu nedir + Neden var + Nereden gelir?" panel.
 * Açılır-kapanır, varsayılan kapalı (dikey alan israfı olmasın).
 */
export function TabExplainer({
  title,
  shortDef,
  children,
  defaultOpen = false,
}: {
  title: string;
  shortDef: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={cn('rounded-lg border bg-card', open ? 'border-primary/30' : 'border-border/40')}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-secondary/40 transition-colors text-left"
      >
        <div className="flex items-center gap-2 text-sm">
          <BookOpen className="h-4 w-4 text-primary" />
          <span className="font-semibold">{title}</span>
          <span className="text-muted-foreground hidden sm:inline">— {shortDef}</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-4 py-4 border-t border-border/40 text-sm space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}

// ---------- Hazır içerikler ----------

export function PnlExplainer() {
  return (
    <TabExplainer
      title="P&L (Kar/Zarar Tablosu) Nedir?"
      shortDef="Şirketin dönem karını gelir-gider zinciriyle gösterir"
    >
      <p className="text-foreground/90">
        <strong>P&L (Profit & Loss / Gelir Tablosu)</strong> belirli bir dönemde şirketin kar yaratıp yaratmadığını gösterir.
        Tüm tahakkuk eden gelir ve giderler (nakit hareketi olmasa bile) yer alır. Bankalar ve vergi dairesi bu tabloyla
        şirketin kar pozisyonunu değerlendirir.
      </p>

      <div className="bg-secondary/40 rounded-md p-3 space-y-2">
        <div className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">P&L Zinciri (yukarıdan aşağıya)</div>
        <FlowStep idx="1" label="Sales Revenue" desc="Satış geliri — mahsuplaşma tasarrufu + fazla üretim satışı + (varsa) PPA + karbon kredisi" />
        <FlowStep idx="+" label="Scrapped Equipment" desc="Hurda değer (sadece son yıl)" />
        <FlowStep idx="=" label="Net Sales" highlight />
        <FlowStep idx="−" label="Transmission + Other Fees" desc="TEİAŞ iletim, EPİAŞ piyasa işletim, vs." negative />
        <FlowStep idx="=" label="Gross Profit (Brüt Kar)" highlight />
        <FlowStep idx="−" label="Sigorta + Bakım + Personel" desc="Tüm operasyonel giderler" negative />
        <FlowStep idx="=" label="EBITDA" desc="Faiz/Vergi/Amortisman öncesi kar — bankalar bu metriği çok izler" highlight />
        <FlowStep idx="−" label="Amortisman (Depreciation)" desc="CAPEX'in muhasebe ömrü boyunca yazılması (nakit çıkışı yok)" negative />
        <FlowStep idx="=" label="EBIT" highlight />
        <FlowStep idx="±" label="FX Gain/Loss − Interest" desc="Kur farkı + kredi faizi" negative />
        <FlowStep idx="=" label="Earnings Before Tax" highlight />
        <FlowStep idx="−" label="Tax Expense" desc="Kurumlar vergisi (KVK %25)" negative />
        <FlowStep idx="=" label="Net Income (Net Kar)" highlight strong />
      </div>

      <div className="text-xs text-muted-foreground italic">
        <strong>Önemli:</strong> P&L tahakkuk esaslıdır — örneğin amortisman gerçek nakit çıkışı değildir ama matematiksel
        olarak P&L'i azaltır. Bu yüzden P&L net karı ≠ nakitte kalan para. Cash Flow tablosu nakdi takip eder.
      </div>
    </TabExplainer>
  );
}

export function CashFlowExplainer() {
  return (
    <TabExplainer
      title="Cash Flow Statement Nedir?"
      shortDef="Gerçek nakit hareketlerini takip eder — operasyon / yatırım / finansman"
    >
      <p className="text-foreground/90">
        <strong>Cash Flow Statement</strong> dönem içinde nakit kasada gerçekte ne kadar para girdi-çıktığını gösterir.
        P&L'in muhasebe rakamlarından farklı olarak, gerçek banka hareketlerine bakar. Üç kategoriye ayrılır:
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
        <div className="rounded-md border border-eco/40 bg-eco/5 p-3 space-y-1">
          <div className="font-bold text-eco-dark">1. Operating CF</div>
          <div className="text-muted-foreground">İşletme faaliyetlerinden gelen nakit. P&L revenue başlangıç noktası, sonra: − OPEX, − Δ İşletme Sermayesi, − Vergi.</div>
          <div className="font-mono text-[10px]">Revenue − Costs − ΔWC − Tax = NetOpCF</div>
        </div>
        <div className="rounded-md border border-amber-400 bg-amber-50 p-3 space-y-1">
          <div className="font-bold text-amber-800">2. Investing CF</div>
          <div className="text-muted-foreground">Sermaye harcamaları (CAPEX). İlk yıl büyük negatif, sonra batarya augmentation yıllarında negatif.</div>
          <div className="font-mono text-[10px]">− CAPEX = NetInvCF</div>
        </div>
        <div className="rounded-md border border-primary/40 bg-primary/5 p-3 space-y-1">
          <div className="font-bold text-primary">3. Financing CF</div>
          <div className="text-muted-foreground">Kredi çekiş + öz sermaye girişi − anapara ödeme − faiz ödeme − ücretler.</div>
          <div className="font-mono text-[10px]">Drawdown + Equity − Repayment − Interest − Fees = NetFinCF</div>
        </div>
      </div>

      <div className="bg-secondary/40 rounded-md p-3">
        <div className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-2">Kasa Bakiyesi Akışı</div>
        <div className="font-mono text-xs space-y-1">
          <div>Cash<sub>opening</sub> + NetOpCF + NetInvCF + NetFinCF = Cash<sub>closing</sub></div>
          <div className="text-muted-foreground">↓ bir sonraki dönemin opening'i</div>
        </div>
      </div>

      <div className="text-xs text-muted-foreground italic">
        <strong>P&L ile fark:</strong> Amortisman P&L'i düşürür ama CF'ye etki etmez (nakit çıkışı yok). Bir yatırım yılında
        P&L kar gösterirken CF kötü olabilir (büyük CAPEX) veya tersi.
      </div>
    </TabExplainer>
  );
}

export function WaterfallExplainer() {
  return (
    <TabExplainer
      title="Cash Waterfall Nedir? (Bankacı Bakış Açısı)"
      shortDef="Nakit akışının kreditör ve sermayedar arasında 'şelale' gibi paylaşımı"
    >
      <p className="text-foreground/90">
        <strong>Cash Waterfall</strong> proje finansmanında bankaların kullandığı standart. Gelen nakdin "şelale gibi"
        aşağıya akarken nasıl paylaşıldığını gösterir. Vergi → Borç → Sermayedar zinciri.
      </p>

      <div className="bg-secondary/40 rounded-md p-3 space-y-2">
        <div className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Şelale Akışı</div>
        <FlowStep idx="1" label="Revenues" desc="Toplam satış geliri (P&L Sales Revenue ile aynı taban)" />
        <FlowStep idx="−" label="Operating Costs" desc="İşletme giderleri" negative />
        <FlowStep idx="±" label="Δ Working Capital" desc="İşletme sermayesi değişimi" />
        <FlowStep idx="−" label="Net VAT" desc="KDV nakit etkisi" negative />
        <FlowStep idx="−" label="CAPEX" desc="O dönemin yatırım harcaması" negative />
        <FlowStep idx="=" label="Operating CF Before Tax" highlight />
        <FlowStep idx="−" label="Corporate Income Tax" desc="Ödenen kurumlar vergisi" negative />
        <FlowStep idx="=" label="CFADS" desc="Cash Flow Available for Debt Service — borca ayrılan nakit" highlight strong />
        <div className="ml-6 border-l-2 border-primary/40 pl-3 space-y-2 mt-2">
          <FlowStep idx="↳" label="Net FCFC" desc="Free Cash Flow to Company (finansman öncesi proje getirisi)" />
          <FlowStep idx="↳" label="− Debt Service (anapara + faiz)" negative />
          <FlowStep idx="=" label="Net FCFE" desc="Free Cash Flow to Equity (sermayedara kalan)" highlight strong />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-md border border-border/40 p-3">
          <div className="font-bold mb-1">FCFC (Free Cash Flow to Company)</div>
          <div className="text-muted-foreground">Finansman öncesi. Hem kreditör hem sermayedara giden toplam. <strong>Proje NPV/IRR</strong> bunu kullanır.</div>
        </div>
        <div className="rounded-md border border-border/40 p-3">
          <div className="font-bold mb-1">FCFE (Free Cash Flow to Equity)</div>
          <div className="text-muted-foreground">Borç servisi sonrası sadece sermayedara kalan. <strong>Equity IRR</strong> bunu kullanır.</div>
        </div>
      </div>
    </TabExplainer>
  );
}

export function CoverageExplainer() {
  return (
    <TabExplainer
      title="Borç Karşılama Oranları Nedir? (DSCR / LLCR / PLCR)"
      shortDef="Bankanın krediyi onaylamak için bakacağı üç kritik oran"
    >
      <p className="text-foreground/90">
        Banka kredisi başvurusunda bu üç oran <strong>onay kriteridir</strong>. Eşik altı = ya kredi yok ya kovenant breach
        (sözleşme ihlali). Tipik olarak EBRD, IFC, Türk yatırım bankaları bu sınırları uygular.
      </p>

      <div className="space-y-3">
        <RatioBox
          name="DSCR (Debt Service Coverage Ratio)"
          formula="CFADS / (Anapara + Faiz)"
          period="Her ÇEYREK ayrı hesaplanır"
          target="Min ≥ 1.20 (kırmızı eşik) · Avg ≥ 1.40"
          desc="Her çeyrekte üretilen nakdin o çeyreğin borç ödemesini ne kadar karşıladığı. 1.20 altı = banka kovenant breach diye değerlendirir, kredi sözleşmesi default."
        />
        <RatioBox
          name="LLCR (Loan Life Coverage Ratio)"
          formula="NPV(CFADS, kredi vadesi) / Kalan Borç"
          period="Kredi vadesi boyunca toplam"
          target="≥ 1.30"
          desc="Kredinin geri kalan vadesi boyunca beklenen tüm CFADS'ın bugünkü değeri, mevcut borç bakiyesinin kaç katı. 1.30 = kredi en az 1.3 kat geri ödenebilir."
        />
        <RatioBox
          name="PLCR (Project Life Coverage Ratio)"
          formula="NPV(CFADS, proje ömrü) / Kalan Borç"
          period="Proje ömrü boyunca (genelde 25y)"
          target="≥ 1.50"
          desc="Tüm proje ömrü boyunca CFADS bugünkü değeri / borç. Krediden uzun olduğu için PLCR ≥ LLCR her zaman."
        />
      </div>

      <div className="rounded-md border border-amber-400 bg-amber-50 p-3 text-xs">
        <strong>Bankanın değerlendirme mantığı:</strong>
        <ul className="mt-2 space-y-1 list-disc list-inside">
          <li><strong>Min DSCR &lt; 1.20</strong>: kredi onaylanmaz. Yapısal değişiklik gerekli (daha az kredi, daha uzun vade, PPA, vs.)</li>
          <li><strong>Min DSCR 1.20-1.30</strong>: borderline. "Equity to cure" sözleşmesi gerekebilir (sermayedar açığı kapatmayı taahhüt eder).</li>
          <li><strong>Tüm eşikler ≥ hedef</strong>: standart koşullarla onay.</li>
        </ul>
      </div>
    </TabExplainer>
  );
}

// ---------- Yardımcı bileşenler ----------

function FlowStep({ idx, label, desc, highlight = false, negative = false, strong = false }: {
  idx: string;
  label: string;
  desc?: string;
  highlight?: boolean;
  negative?: boolean;
  strong?: boolean;
}) {
  return (
    <div className={cn(
      'flex items-baseline gap-3 px-2 py-1 rounded text-xs',
      highlight && 'bg-background border-l-2',
      highlight && !strong && 'border-l-primary/50',
      strong && 'border-l-primary border-l-4 bg-primary/5 font-bold',
      negative && 'text-destructive',
    )}>
      <span className={cn('font-mono w-4 text-center', negative && 'text-destructive')}>{idx}</span>
      <span className={cn('min-w-[160px]', highlight && 'font-semibold')}>{label}</span>
      {desc && <span className="text-muted-foreground text-[11px]">— {desc}</span>}
    </div>
  );
}

function RatioBox({ name, formula, period, target, desc }: { name: string; formula: string; period: string; target: string; desc: string }) {
  return (
    <div className="rounded-md border border-border/40 p-3 space-y-1.5">
      <div className="font-bold text-sm flex items-center gap-2"><GitBranch className="h-4 w-4 text-primary" /> {name}</div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div><span className="text-muted-foreground">Formül:</span> <code className="bg-secondary px-1 rounded">{formula}</code></div>
        <div><span className="text-muted-foreground">Dönem:</span> {period}</div>
        <div><span className="text-muted-foreground">Banka eşik:</span> <strong>{target}</strong></div>
      </div>
      <div className="text-xs text-muted-foreground italic">{desc}</div>
    </div>
  );
}
