'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Loader2, Trash2, FileDown } from 'lucide-react';
import { computeUtility, computeUtilityHuawei, type UtilityInputs } from '@/lib/models/utility/engine';
import { defaultUtilityInputs } from '@/lib/models/utility/defaults';
import { Tipbox, NumF, TxtF, SelF, ChkF, SeriesChart, PrintReport } from '@/components/models/native/mdl-kit';
import * as R from '@/components/models/native/utility-render';
import { musd, pct, nf } from '@/lib/models/fmt';

const T = {
  mw: 'Santralin DC kurulu gücü (panellerin toplam gücü). Modeldeki her şey bununla ölçeklenir: CAPEX = MWp×1000×$/kWp, üretim E₁ = MWp×1000×spesifik üretim×…',
  capexUnit: 'Anahtar teslim EPC birim maliyeti — panel, inverter, konstrüksiyon, trafo, geliştirme dahil tek rakam. Utility ölçekte tipik 380–550 $/kWp. IDC, kredi ücretleri ve DSRA bunun üstüne ayrıca eklenir.',
  spec: '1 kWp panelin lokasyonda yılda ürettiği enerji (P50 = beklenen). Türkiye’de bölgeye göre 1.450–1.800 kWh/kWp. Kaynağı PVsyst / bağımsız mühendis raporudur.',
  p90: 'P90 üretimin P50’ye oranı. P90 = 10 yılın 9’unda aşılması beklenen muhafazakâr üretim. Tipik %92–96. Banka kredi testini P90 ile yapar.',
  scen: 'P50: beklenen üretim (yatırım komitesi). P90: muhafazakâr üretim (banka/kredi). Seçim tüm üretim serisini, dolayısıyla gelir/IRR/DSCR’ı değiştirir.',
  avail: 'Santralin üretime hazır olduğu zamanın oranı; arıza ve bakım duruşlarını temsil eder. İyi işletilen santralde %98–99,5. E₁ çarpanı.',
  curt: 'Kısıntı (curtailment): şebeke operatörünün üretimi bilerek kısması. Türkiye’de %0–5. E₁ = … × (1−curtailment); doğrudan gelir kaybı.',
  degr: 'Panellerin yıllık verim kaybı. Modern modüllerde %0,3–0,5/yıl. Eₜ = E₁×(1−d)^(t−1).',
  life: 'Ekonomik analiz süresi. Utility GES’te 25–35 yıl. NPV/IRR/LCOE/PLCR bu süre üzerinden hesaplanır.',
  dcac: 'DC kurulu güç ÷ AC güç. Tipik 1,1–1,3. Bu modelde matematiğe doğrudan girmez; etkisi spesifik üretim ve CAPEX’e gömülü kabul edilir.',
  opexUnit: 'Yıllık işletme gideri: bakım, sigorta, güvenlik, arazi kirası, panel yıkama, izleme. Utility GES’te tipik 5.000–9.000 $/MWp/yıl. Yenileme buraya değil bakım CAPEX’ine girer.',
  opexEsc: 'OPEX’in yıllık artışı (ücret/hizmet enflasyonu). Tipik %2–3.',
  opexShare: 'OPEX’in TL’ye endeksli payı (personel, güvenlik, yıkama, kira, yerel bakım; tipik %60–80). Kalan USD payı yedek parça/uluslararası servis.',
  replYear: 'İnverterlerin toplu revizyon/değişim yılı. Tipik 12–15. yıl. O yıl bakım CAPEX’i olarak CFADS’ten düşülür. 0 = yok.',
  replCost: 'Yenileme birim maliyeti. Tipik 15–25 $/kWp. Yenileme yılında MWp×1000×bu değer.',
  salvage: 'Ömür sonu net uç değer: hurda/ekipman geliri pozitif; söküm yükümlülüğü negatif girilir. Son yıl nakit akışına eklenir.',
  cur: 'TL modu: gelir ve OPEX’in TL kısmı TL enflasyonuyla eskale edilip her yıl kurla USD’ye çevrilir. USD modu: tek para birimli basit yapı.',
  pmode: 'Tek rejim: tüm ömür aynı fiyat. İki dönemli: önce sabit/endeksli PPA/YEKDEM, sözleşme bitince spot (merchant).',
  ppaY: 'PPA/YEKDEM süresi. Bu yıllar boyunca fiyat sözleşme mekanizmasıyla belirlenir; sonrasında merchant fiyata geçilir.',
  ppaCur: 'USD sabit: dolar cinsinden sabit (+eskalasyon) — kur riski yok. TL TÜFE endeksli: TL fiyat her yıl TÜFE ile artar, kurla USD’ye çevrilir.',
  fx0: 'Bugünkü TL/USD kuru — tüm çevrimlerin başlangıç noktası. Kur_t = Kur_0 × yıllık artışların çarpımı.',
  piTLa: 'İlk 5 yıl için beklenen TL enflasyonu (TÜFE). Dezenflasyon patikası varsayımıyla ilk yıllar yüksek girilir.',
  piTLb: '6. yıldan itibaren uzun vadeli TL enflasyonu (TCMB hedefine yakınsama, ör. %10–15).',
  piUS: 'Uzun vadeli USD enflasyonu (~%2–2,5). SAGP’de kur artışının paydası; OPEX’in USD payının eskalasyonu.',
  fxMode: 'SAGP: kur iki ülke enflasyon farkı kadar artar (uzun vade standardı). Manuel: kendi kur patikanı oran olarak verirsin.',
  fxMan: 'Manuel moddayken kurun yıllık artış oranı. Enflasyon farkından düşükse TL reel değerlenir, yüksekse reel değersizleşir.',
  priceTL: 'Elektrik satış fiyatı TL/MWh — EPİAŞ spot ortalaması veya TL PPA. Her yıl TL enflasyonuyla büyür, o yılın kuruna bölünür.',
  priceReal: 'Enflasyonun ÜZERİNDE beklenen fiyat artışı. 0 = fiyat enflasyonla gider. USD bazlı değerin gerçek kaynağı.',
  price: 'Elektrik satış fiyatı ($/MWh): PPA veya spot beklentisi. Modelin en hassas girdisi.',
  priceEsc: 'Fiyatın yıllık artışı. Yüksek eskalasyon IRR’ı suni şişirir; banka muhafazakâr ister (%0–2).',
  tax: 'Kurumlar vergisi (Türkiye %25). Vergiₜ = oran × max(0, EBITDA − amortisman − faiz).',
  holiday: 'Yatırım teşviki kapsamında verginin sıfır alındığı ilk yıllar. IRR’ı belirgin yükseltir.',
  depY: 'Amortisman süresi (doğrusal). Matrah = CAPEX + aktifleştirilen IDC + ücretler. Kısa süre = erken yıllarda az vergi.',
  vat: 'CAPEX üzerindeki KDV. KDV’nin kendisi iade alınır; kalıcı olan iade gelene kadarki taşıma faizidir. 0 = muaf/kapsam dışı.',
  vatM: 'KDV iadesinin gelme süresi (ay). Taşıma maliyeti = KDV×CAPEX×kredi faizi×ay/12.',
  consM: 'Finansal kapanıştan COD’a kadarki inşaat süresi. Bu dönemde kredi çekilir, faiz işler (IDC), gelir yok. Utility’de 8–14 ay.',
  order: 'Önce özkaynak: bankaların standart şartı; kredi geç çekildiği için IDC düşer. Pro-rata: eşzamanlı çekiş; IDC yükselir.',
  debt: 'Gearing/kaldıraç: toplam proje maliyetinin krediyle karşılanan oranı (tipik %65–80). Yüksek gearing → yüksek equity IRR ama düşük DSCR.',
  kd: 'Kredinin yıllık faizi (USD PF’de %6–9). IDC, faiz ödemeleri, LLCR/PLCR iskontosu ve WACC borç bacağında kullanılır.',
  tenor: 'Kredinin toplam süresi (grace dahil). GES’te 12–16 yıl. Uzun vade → küçük taksit → yüksek DSCR.',
  grace: 'Ödemesiz dönem: yalnız faizin ödendiği başlangıç yılları. Tipik inşaat + 6–12 ay.',
  style: 'Sculpted: taksitler nakit akışına göre şekillenir, DSCR hedefte sabit tutulur (PF standardı). Anüite: eşit taksit. Eşit anapara: azalan taksit.',
  target: 'Sculpting’in her yıl korumaya çalıştığı DSCR. Bankalar 1,25–1,40 ister. Anaparaₜ = CFADSₜ/hedef − faizₜ.',
  dsraM: 'DSRA: bloke hesapta tutulan taksit karşılığı (standart 6 ay). Kapanışta fonlanır, kredi kapanınca özkaynağa iade edilir.',
  fee: 'Bankanın kredi kullandırım (arrangement) ücreti. Tipik %1–2 × kredi. Uses tablosuna girer, amortisman matrahına dahil.',
  ke: 'Özkaynak beklenen yıllık getiri (sermayenin fırsat maliyeti). TR güneş yatırımcısında USD bazında %14–18.',
  useWacc: 'İşaretliyse iskonto oranı r = WACC. NPV, LCOE, LCOS ve tüm bugünkü değer hesapları bu oranla iskonto edilir.',
  rManual: 'WACC yerine kendi iskonto oranın (ör. şirket eşik oranı / hurdle rate).',
  h_count: 'Projedeki toplam inverter adedi. Örn. 100 MW AC / 330 kW string → 300 adet. ΔCAPEX = adet × birim fark.',
  h_diff: 'Huawei ile karşılaştırılan markanın adet başına fiyat farkı ($). Karşılaştırmanın gerçek birimi budur.',
  h_prod: 'Huawei’nin yıllık ek üretim avantajı (string MPPT, akıllı arıza teşhisi, yüksek availability). Savunulabilir bant %1,5–3.',
  h_opex: 'Akıllı teşhis ve az saha müdahalesinden gelen PV OPEX tasarrufu. Tipik %5–10.',
};

function Kpis({ list }: { list: R.Kpi[] }) {
  return (
    <div className="kpis">
      {list.map((k, i) => (
        <div key={i} className={`kpi ${k.cls}`}>
          <div className="klabel">{k.label}</div>
          <div className="kval">{k.val}</div>
          <div className="khint">{k.hint}</div>
        </div>
      ))}
    </div>
  );
}
function Sub({ html }: { html: string }) { return <div className="subst" dangerouslySetInnerHTML={{ __html: html }} />; }
function Card({ label, html }: { label: string; html: string }) {
  return (
    <div className="formula-card">
      <div className="flabel">{label}</div>
      <Sub html={html} />
    </div>
  );
}
function Note({ children }: { children: React.ReactNode }) { return <div className="note">{children}</div>; }

export function UtilityModel({ projectId, initialInputs }: { projectId?: string; initialInputs?: UtilityInputs }) {
  const router = useRouter();
  const [inputs, setInputs] = useState<UtilityInputs>(() => ({ ...defaultUtilityInputs(), ...(initialInputs ?? {}) }));
  const [tab, setTab] = useState<'fiz' | 'hw' | 'sum'>('fiz');
  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const set = <K extends keyof UtilityInputs>(k: K, v: UtilityInputs[K]) => setInputs((p) => ({ ...p, [k]: v }));
  const setHw = <K extends keyof UtilityInputs['huawei']>(k: K, v: UtilityInputs['huawei'][K]) => setInputs((p) => ({ ...p, huawei: { ...p.huawei, [k]: v } }));

  const p = useMemo(() => R.paramsOf(inputs), [inputs]);
  const m = useMemo(() => computeUtility(inputs), [inputs]);
  const hw = useMemo(() => computeUtilityHuawei(inputs, m), [inputs, m]);
  const tl = inputs.cur === 'tl';
  const vd = R.verdict(p, m);

  async function save() {
    setSaving(true); setErr(null);
    try {
      const summary = { kind: 'utility' as const, capexUsd: m.totalUses, npvUsd: m.npv, irrPct: m.irr, paybackYears: m.pbS, lcoe: m.lcoe, minDscr: m.minDSCR, capacityLabel: inputs.bessOn ? `${inputs.mw} MWp + ${inputs.bMWh} MWh` : `${inputs.mw} MWp` };
      const config = { kind: 'utility' as const, name: inputs.pname || 'Utility Projesi', inputs };
      let id = projectId;
      if (projectId) { const r = await fetch(`/api/projects/${projectId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ config, summary }) }); if (!r.ok) throw new Error('Güncellenemedi'); }
      else { const r = await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ config, summary }) }); if (!r.ok) throw new Error('Oluşturulamadı'); id = (await r.json()).id; }
      router.push(`/projects/${id}`); router.refresh();
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setSaving(false); }
  }
  async function del() {
    if (!projectId || !confirm('Bu proje silinsin mi?')) return;
    setSaving(true);
    try { await fetch(`/api/projects/${projectId}`, { method: 'DELETE' }); router.push('/projects'); router.refresh(); } finally { setSaving(false); }
  }

  return (
    <>
      <Tipbox />
      <div className="flex items-center justify-between gap-3 flex-wrap no-print mb-3">
        <Button asChild variant="ghost" size="sm"><Link href={projectId ? '/projects' : '/projects/new'}><ArrowLeft className="h-4 w-4 mr-1" /> {projectId ? 'Projeler' : 'Model seçimi'}</Link></Button>
        <div className="flex items-center gap-2">
          {err && <span className="text-xs text-destructive">{err}</span>}
          {projectId && <Button variant="outline" size="sm" onClick={del} disabled={saving} className="text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5 mr-1" /> Sil</Button>}
          <Button onClick={() => setPrinting(true)} disabled={saving} size="sm"><FileDown className="h-4 w-4 mr-1.5" /> Rapor çıktısı al</Button>
          <Button onClick={save} disabled={saving} size="sm">{saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}{projectId ? 'Güncelle & Kaydet' : 'Projeyi Kaydet'}</Button>
        </div>
      </div>

      <div className="mdl">
        <div className="m-header">
          <div className="hwrap">
            <div className="eyebrow">Solar + Storage · Proje Finansmanı Analiz Aracı</div>
            <h1>GES + BESS Proje Finansmanı Fizibilite Modeli</h1>
            <p className="sub">İnşaat dönemi ve IDC, kaynak–kullanım, grace period, DSCR-sculpted borç takvimi, DSRA, LLCR/PLCR, vergi tatili ve batarya modülü dahil tam proje finansmanı mekaniği. Her formül, girilen değerlerle dolu halde gösterilir.</p>
          </div>
        </div>
        <div className="m-tabs">
          <div className="hwrap">
            <nav role="tablist">
              <button className={tab === 'fiz' ? 'active' : ''} onClick={() => setTab('fiz')}>1 · Fizibilite Modeli</button>
              <button className={tab === 'hw' ? 'active' : ''} onClick={() => setTab('hw')}>2 · Huawei Değer Analizi</button>
              <button className={tab === 'sum' ? 'active' : ''} onClick={() => setTab('sum')}>3 · Sonuçlar</button>
            </nav>
          </div>
        </div>

        <div className="m-main">
          {/* ==================== TAB 1 ==================== */}
          <div className={`tab ${tab === 'fiz' ? 'active' : ''}`}>
            <div className="toolbar">
              <TxtF label="Proje adı" unit="(raporda görünür)" value={inputs.pname} onChange={(v) => set('pname', v)} />
              <TxtF label="Hazırlayan" value={inputs.prep} onChange={(v) => set('prep', v)} />
            </div>

            <Step no="ADIM 1" title="PV Yatırım Maliyeti (EPC CAPEX)" why="Finansman maliyetleri (IDC, ücretler, DSRA) ayrıca hesaplanıp üstüne eklenir.">
              <div className="inputs">
                <NumF label="Kurulu güç" unit="MWp, DC" tip={T.mw} value={inputs.mw} onChange={(v) => set('mw', v)} />
                <NumF label="Toplam EPC CAPEX" unit="$/kWp" tip={T.capexUnit} value={inputs.capexUnit} onChange={(v) => set('capexUnit', v)} step={5} />
              </div>
              <div className="explain"><Card label="Formül" html={R.sCapex(p, m)} /><Note>Bu model CAPEX ile çalışır; detaylı BoQ ve CAPEX-OPEX için <a href="https://teklif.fozanseyfi.com/" target="_blank" rel="noopener">teklif platformu</a>. Toplam proje maliyeti, IDC + ücretler + DSRA + KDV taşıma eklenerek Adım 9’da oluşur.</Note></div>
            </Step>

            <Step no="ADIM 2" title="Enerji Üretimi — P50/P90, Availability, Curtailment" why="Banka P90 + curtailment ile test eder; yatırım komitesi P50’ye bakar.">
              <div className="inputs">
                <NumF label="Spesifik üretim, P50" unit="kWh/kWp/yıl" tip={T.spec} value={inputs.spec} onChange={(v) => set('spec', v)} step={10} />
                <div className="row2">
                  <NumF label="P90 / P50 oranı" unit="%" tip={T.p90} value={inputs.p90} onChange={(v) => set('p90', v)} step={0.5} />
                  <SelF label="Üretim senaryosu" tip={T.scen} value={inputs.scen} onChange={(v) => set('scen', v)} options={[{ value: 'p50', label: 'P50 (beklenen)' }, { value: 'p90', label: 'P90 (muhafazakâr)' }]} />
                  <NumF label="Availability" unit="%" tip={T.avail} value={inputs.avail} onChange={(v) => set('avail', v)} step={0.1} />
                  <NumF label="Kısıntı / curtailment" unit="%" tip={T.curt} value={inputs.curt} onChange={(v) => set('curt', v)} step={0.5} />
                  <NumF label="Degradasyon" unit="%/yıl" tip={T.degr} value={inputs.degr} onChange={(v) => set('degr', v)} step={0.05} />
                  <NumF label="Santral ömrü" unit="yıl" tip={T.life} value={inputs.life} onChange={(v) => set('life', v)} />
                  <NumF label="DC/AC oranı" tip={T.dcac} value={inputs.dcac} onChange={(v) => set('dcac', v)} step={0.05} />
                </div>
              </div>
              <div className="explain"><Card label="Formül" html={R.sEnergy(p, m)} /><Note>Bankable süreçte bu rakamlar bağımsız mühendisin (lender’s engineer) PVsyst tabanlı üretim raporundan gelir.</Note></div>
            </Step>

            <Step no="ADIM 3" title="İşletme Gideri (OPEX), Yenileme ve Uç Değer" why="Yenileme OPEX değil, bakım CAPEX’idir — CFADS’ten düşülür.">
              <div className="inputs">
                <div className="row2">
                  <NumF label="OPEX" unit="$/MWp/yıl" tip={T.opexUnit} value={inputs.opexUnit} onChange={(v) => set('opexUnit', v)} step={250} />
                  {tl ? <NumF label="OPEX’in TL payı" unit="%" tip={T.opexShare} value={inputs.opexShare} onChange={(v) => set('opexShare', v)} step={5} />
                    : <NumF label="OPEX eskalasyonu" unit="%/yıl" tip={T.opexEsc} value={inputs.opexEsc} onChange={(v) => set('opexEsc', v)} step={0.5} />}
                  <NumF label="İnverter yenileme yılı" unit="0=yok" tip={T.replYear} value={inputs.replYear} onChange={(v) => set('replYear', v)} />
                  <NumF label="Yenileme maliyeti" unit="$/kWp" tip={T.replCost} value={inputs.replCost} onChange={(v) => set('replCost', v)} />
                  <NumF label="Uç değer / söküm, net" unit="$" tip={T.salvage} value={inputs.salvage} onChange={(v) => set('salvage', v)} step={100000} />
                </div>
              </div>
              <div className="explain"><Card label="Formül · OPEX eskalasyonu" html={R.sOpex(p, m)} /><Note>TL payı TÜFE ile artar; USD payı yedek parça/uluslararası servis. Uç değer son yıl nakit akışına eklenir.</Note></div>
            </Step>

            <Step no="ADIM 4" title="Gelir ve Kur–Enflasyon" why="TL gelir + USD kredi uyumsuzluğu, Türkiye modellerinin kalbidir.">
              <div className="inputs">
                <SelF label="Para birimi / gelir modu" tip={T.cur} value={inputs.cur} onChange={(v) => set('cur', v)} options={[{ value: 'tl', label: 'TL gelir + kur projeksiyonu (Türkiye)' }, { value: 'usd', label: 'USD (basit / yurt dışı)' }]} />
                <SelF label="Gelir rejimi" tip={T.pmode} value={inputs.pmode} onChange={(v) => set('pmode', v)} options={[{ value: 'single', label: 'Tek rejim — tüm ömür aynı fiyat' }, { value: 'two', label: 'İki dönemli — önce PPA/YEKDEM, sonra merchant' }]} />
                {inputs.pmode === 'two' && (
                  <div className="row2">
                    <NumF label="PPA süresi" unit="yıl" tip={T.ppaY} value={inputs.ppaY} onChange={(v) => set('ppaY', v)} />
                    {tl && <SelF label="PPA fiyat tipi" tip={T.ppaCur} value={inputs.ppaCur} onChange={(v) => set('ppaCur', v)} options={[{ value: 'usd', label: 'USD sabit + eskalasyon' }, { value: 'tl', label: 'TL, TÜFE endeksli' }]} />}
                    {inputs.ppaCur === 'usd' ? <>
                      <NumF label="PPA fiyatı" unit="$/MWh" value={inputs.ppaUSD} onChange={(v) => set('ppaUSD', v)} />
                      <NumF label="PPA eskalasyonu" unit="%/yıl" value={inputs.ppaEsc} onChange={(v) => set('ppaEsc', v)} step={0.5} />
                    </> : <NumF label="PPA fiyatı" unit="TL/MWh" value={inputs.ppaTL} onChange={(v) => set('ppaTL', v)} step={50} />}
                  </div>
                )}
                {tl ? (
                  <div className="row2">
                    <NumF label="Başlangıç kuru" unit="TL/USD" tip={T.fx0} value={inputs.fx0} onChange={(v) => set('fx0', v)} step={0.5} />
                    <NumF label="TL enflasyonu, ilk 5 yıl" unit="%/yıl" tip={T.piTLa} value={inputs.piTLa} onChange={(v) => set('piTLa', v)} />
                    <NumF label="TL enflasyonu, sonrası" unit="%/yıl" tip={T.piTLb} value={inputs.piTLb} onChange={(v) => set('piTLb', v)} />
                    <NumF label="USD enflasyonu" unit="%/yıl" tip={T.piUS} value={inputs.piUS} onChange={(v) => set('piUS', v)} step={0.5} />
                    <SelF label="Kur artışı" tip={T.fxMode} value={inputs.fxMode} onChange={(v) => set('fxMode', v)} options={[{ value: 'ppp', label: 'SAGP: enflasyon farkı kadar' }, { value: 'man', label: 'Manuel oran' }]} />
                    {inputs.fxMode === 'man' && <NumF label="Manuel kur artışı" unit="%/yıl" tip={T.fxMan} value={inputs.fxMan} onChange={(v) => set('fxMan', v)} />}
                    <NumF label="Elektrik satış fiyatı" unit="TL/MWh" tip={T.priceTL} value={inputs.priceTL} onChange={(v) => set('priceTL', v)} step={50} />
                    <NumF label="Reel fiyat artışı" unit="%/yıl" tip={T.priceReal} value={inputs.priceReal} onChange={(v) => set('priceReal', v)} step={0.5} />
                  </div>
                ) : (
                  <div className="row2">
                    <NumF label="Elektrik satış fiyatı" unit="$/MWh" tip={T.price} value={inputs.price} onChange={(v) => set('price', v)} />
                    <NumF label="Fiyat eskalasyonu" unit="%/yıl" tip={T.priceEsc} value={inputs.priceEsc} onChange={(v) => set('priceEsc', v)} step={0.5} />
                  </div>
                )}
              </div>
              <div className="explain"><Card label="Formül · Fiyatın USD’ye çevrimi ve EBITDA" html={R.sCash(p, m)} /><Note>Kritik: SAGP altında TL fiyatın enflasyonla artması USD değer yaratmaz — USD fiyat yalnız USD enflasyonu kadar büyür.</Note></div>
            </Step>

            <Step no="ADIM 5" title="Batarya Modülü (BESS) — Opsiyonel" why="Arbitraj marjı modeli: deşarj fiyatı − şarj maliyeti / RTE.">
              <div className="inputs">
                <ChkF label="BESS’i modele dahil et" checked={inputs.bessOn} onChange={(v) => set('bessOn', v)} />
                {inputs.bessOn && (
                  <div className="row2">
                    <NumF label="Güç" unit="MW" value={inputs.bMW} onChange={(v) => set('bMW', v)} />
                    <NumF label="Kapasite" unit="MWh" value={inputs.bMWh} onChange={(v) => set('bMWh', v)} />
                    <NumF label="CAPEX" unit="$/kWh" value={inputs.bCapexU} onChange={(v) => set('bCapexU', v)} step={5} />
                    <NumF label="OPEX" unit="$/kWh/yıl" value={inputs.bOpexU} onChange={(v) => set('bOpexU', v)} step={0.5} />
                    <NumF label="Round-trip verim" unit="%" value={inputs.bRTE} onChange={(v) => set('bRTE', v)} step={0.5} />
                    <NumF label="Günlük cycle" value={inputs.bCyc} onChange={(v) => set('bCyc', v)} step={0.1} />
                    <NumF label="Kapasite degradasyonu" unit="%/yıl" value={inputs.bDegr} onChange={(v) => set('bDegr', v)} step={0.25} />
                    <NumF label="Availability" unit="%" value={inputs.bAvail} onChange={(v) => set('bAvail', v)} step={0.5} />
                    {tl ? <>
                      <NumF label="Şarj fiyatı" unit="TL/MWh" value={inputs.bPcTL} onChange={(v) => set('bPcTL', v)} step={50} />
                      <NumF label="Deşarj fiyatı" unit="TL/MWh" value={inputs.bPdTL} onChange={(v) => set('bPdTL', v)} step={50} />
                    </> : <>
                      <NumF label="Şarj fiyatı" unit="$/MWh" value={inputs.bPc} onChange={(v) => set('bPc', v)} />
                      <NumF label="Deşarj fiyatı" unit="$/MWh" value={inputs.bPd} onChange={(v) => set('bPd', v)} />
                    </>}
                    <NumF label="Güçlendirme yılı" unit="0=yok" value={inputs.bAugY} onChange={(v) => set('bAugY', v)} />
                    <NumF label="Güçlendirme maliyeti" unit="$/kWh" value={inputs.bAugC} onChange={(v) => set('bAugC', v)} step={5} />
                  </div>
                )}
              </div>
              <div className="explain"><Card label="Formül · Arbitraj marjı ve LCOS" html={R.sBess(p, m)} /><Note>Şarj maliyeti RTE’ye bölünür çünkü 1 MWh deşarj için 1/RTE MWh şarj gerekir. Güçlendirme, kapasite kaybını orta ömürde telafi eder.</Note></div>
            </Step>

            <Step no="ADIM 6" title="Vergi, Amortisman, KDV">
              <div className="inputs"><div className="row2">
                <NumF label="Kurumlar vergisi" unit="%" tip={T.tax} value={inputs.tax} onChange={(v) => set('tax', v)} />
                <NumF label="Vergi tatili" unit="yıl, teşvik" tip={T.holiday} value={inputs.holiday} onChange={(v) => set('holiday', v)} />
                <NumF label="Amortisman süresi" unit="yıl" tip={T.depY} value={inputs.depY} onChange={(v) => set('depY', v)} />
                <NumF label="KDV oranı" unit="%, 0=muaf" tip={T.vat} value={inputs.vat} onChange={(v) => set('vat', v)} />
                <NumF label="KDV iade süresi" unit="ay" tip={T.vatM} value={inputs.vatM} onChange={(v) => set('vatM', v)} />
              </div></div>
              <div className="explain"><Card label="Formül · Vergi zinciri, adım adım" html={R.sTax(p, m)} /><Note>KDV’nin kendisi iade alınır; kalıcı olan iade gelene kadarki taşıma faizidir. Amortisman matrahı IDC ve ücretleri içerir.</Note></div>
            </Step>

            <Step no="ADIM 7" title="İnşaat Dönemi" why="Gelir yok ama kredi faizi işliyor — IDC buradan doğar.">
              <div className="inputs"><div className="row2">
                <NumF label="İnşaat süresi" unit="ay" tip={T.consM} value={inputs.consM} onChange={(v) => set('consM', v)} />
                <SelF label="Harcama / çekiliş sırası" tip={T.order} value={inputs.order} onChange={(v) => set('order', v)} options={[{ value: 'eq', label: 'Önce özkaynak' }, { value: 'pro', label: 'Eşzamanlı (pro-rata)' }]} />
              </div></div>
              <div className="explain"><Card label="Formül · IDC — İnşaat Dönemi Faizi" html={R.sCons(p, m)} /><Note>“Önce özkaynak” bankaların standart şartıdır: kredi geç çekilir → IDC düşer. IDC krediyle aktifleştirilir ve amortismana girer.</Note></div>
            </Step>

            <Step no="ADIM 8" title="Borç Yapısı — Kredi Nasıl Boyutlanır, Nasıl Ödenir" why="Kredi tutarı döngüsel çözülür: kredi → IDC → toplam maliyet → kredi.">
              <div className="inputs">
                <div className="row2">
                  <NumF label="Kaldıraç / gearing" unit="% of total uses" tip={T.debt} value={inputs.debt} onChange={(v) => set('debt', v)} step={5} />
                  <NumF label="Kredi faizi" unit="%/yıl" tip={T.kd} value={inputs.kd} onChange={(v) => set('kd', v)} step={0.25} />
                  <NumF label="Toplam vade / tenor" unit="yıl" tip={T.tenor} value={inputs.tenor} onChange={(v) => set('tenor', v)} />
                  <NumF label="Grace period" unit="yıl, sadece faiz" tip={T.grace} value={inputs.grace} onChange={(v) => set('grace', v)} />
                  <SelF label="Geri ödeme yöntemi" tip={T.style} value={inputs.style} onChange={(v) => set('style', v)} options={[{ value: 'sculpt', label: 'DSCR-sculpted' }, { value: 'ann', label: 'Anüite' }, { value: 'eqp', label: 'Eşit anapara' }]} />
                  <NumF label="Hedef DSCR" unit="sculpting" tip={T.target} value={inputs.target} onChange={(v) => set('target', v)} step={0.05} />
                  <NumF label="DSRA" unit="ay taksit karşılığı" tip={T.dsraM} value={inputs.dsraM} onChange={(v) => set('dsraM', v)} />
                  <NumF label="Düzenleme ücreti" unit="% of debt" tip={T.fee} value={inputs.fee} onChange={(v) => set('fee', v)} step={0.25} />
                  <NumF label="Özkaynak beklentisi" unit="%/yıl" tip={T.ke} value={inputs.ke} onChange={(v) => set('ke', v)} step={0.5} />
                </div>
                <ChkF label="WACC’ı iskonto oranı olarak kullan" tip={T.useWacc} checked={inputs.useWacc} onChange={(v) => set('useWacc', v)} />
                {!inputs.useWacc && <div className="field"><NumF label="Manuel iskonto oranı" unit="%/yıl" tip={T.rManual} value={inputs.rManual} onChange={(v) => set('rManual', v)} step={0.25} /></div>}
              </div>
              <div className="explain"><Card label="Formül · Kredi tutarına adım adım nasıl ulaşılır" html={R.sFin(p, m)} /><Note>Vade = grace (yalnız faiz) + itfa yılları. Sculpted’de vade sonunda bakiye kalırsa model uyarır — çözüm gearing’i düşürmek veya vadeyi uzatmaktır.</Note></div>
            </Step>

            {/* ADIM 9 sonuçlar */}
            <div className="step">
              <div className="step-head"><span className="step-no">ADIM 9</span><h2>Kaynak–Kullanım ve Sonuçlar</h2></div>
              <div className="step-body single">
                <div className="su">
                  <div className="sucard"><h4>Kullanımlar (Uses)</h4><table><tbody>
                    {R.usesRows(p, m).map(([k, v], i) => <tr key={i}><td>{k}</td><td>{v}</td></tr>)}
                    <tr className="total"><td>Toplam kullanım</td><td>{musd(m.totalUses)}</td></tr>
                  </tbody></table></div>
                  <div className="sucard"><h4>Kaynaklar (Sources)</h4><table><tbody>
                    {R.sourcesRows(p, m).map(([k, v], i) => <tr key={i}><td>{k}</td><td>{v}</td></tr>)}
                    <tr className="total"><td>Toplam kaynak</td><td>{musd(m.totalUses)}</td></tr>
                  </tbody></table></div>
                </div>
                <Kpis list={R.kpis(p, m)} />
                <div className={`verdict ${vd.cls}`} dangerouslySetInnerHTML={{ __html: vd.text }} />
                <Note>NPV, IRR ve LCOE <b>kaldıraçsız</b> ve <b>EPC CAPEX</b> bazlıdır (finansmandan bağımsız varlık değeri); iskonto oranı <b>vergi-sonrası WACC</b>’tir. IDC, kredi ücreti, DSRA ve KDV taşıma dahil <b>toplam finanse edilen tutar</b> yukarıdaki Kaynak–Kullanım tablosundadır.</Note>
                <Card label="Ana denklemler · girilen değerlerle" html={R.sRes(p, m)} />
              </div>
            </div>

            {/* Duyarlılık */}
            <div className="step">
              <div className="step-head"><span className="step-no">ANALİZ</span><h2>Duyarlılık — Proje IRR ve Min. DSCR</h2><span className="why">Banka, downside senaryolarında oranların dayanıp dayanmadığına bakar.</span></div>
              <div className="step-body single"><div className="senswrap" dangerouslySetInnerHTML={{ __html: R.sensHtml(inputs, p) }} /></div>
            </div>

            {/* Breakeven */}
            <div className="step">
              <div className="step-head"><span className="step-no">ANALİZ</span><h2>Kırılma Noktası (Breakeven) Analizi</h2><span className="why">Bankanın klasik sorusu: hangi seviyede bozulur?</span></div>
              <div className="step-body single"><div className="senswrap" dangerouslySetInnerHTML={{ __html: R.beHtml(inputs, p, m) }} /></div>
            </div>

            {/* Senaryo matrisi */}
            <div className="step">
              <div className="step-head"><span className="step-no">ANALİZ</span><h2>Senaryo Matrisi — Kötümser / Baz / İyimser</h2><span className="why">Üç kaldıraç (fiyat, üretim, CAPEX) aynı anda hareket eder — yatırım komitesinin ilk baktığı tablo.</span></div>
              <div className="step-body single"><div className="senswrap" dangerouslySetInnerHTML={{ __html: R.scenMatrix(inputs, p) }} /></div>
            </div>

            {/* Kümülatif grafik */}
            <div className="chartcard">
              <h3>Kümülatif iskontolu serbest nakit akışı (kaldıraçsız) — sıfırı geçtiği yıl iskontolu geri ödemedir</h3>
              <SeriesChart points={R.cumPoints(m)} color="#18428F" />
            </div>

            <h3 className="sect">İşletme Dönemi Nakit Akışı</h3>
            <div className="tablewrap"><table dangerouslySetInnerHTML={{ __html: R.cfTableHtml(p, m) }} /></div>
            <p className="tsub">Sarı satır: basit geri ödeme yılı. Ekranda ilk 12 yıl + son yıl.</p>

            <h3 className="sect">Borç Takvimi</h3>
            <div className="tablewrap"><table dangerouslySetInnerHTML={{ __html: R.debtTableHtml(p, m) }} /></div>
            <p className="tsub">Grace döneminde yalnız faiz ödenir. Sculpted yöntemde anapara, DSCR’ı hedefte tutacak şekilde yıllara dağıtılır.</p>
          </div>

          {/* ==================== TAB 2 HUAWEI ==================== */}
          <div className={`tab ${tab === 'hw' ? 'active' : ''}`}>
            <div className="pitch">
              <div className="plabel">Özet değerlendirme · otomatik oluşturulur</div>
              <p dangerouslySetInnerHTML={{ __html: R.pitchText(p, m, hw) }} />
            </div>
            <div className="step hw">
              <div className="step-head"><span className="step-no">GİRDİ</span><h2>Huawei Farkları — İnverter Bazında</h2><span className="why">Baz senaryo, Fizibilite sekmesindeki tam modeldir; vergi etkisi dahildir.</span></div>
              <div className="step-body">
                <div className="inputs"><div className="row2">
                  <NumF label="İnverter adedi" tip={T.h_count} value={inputs.huawei.count} onChange={(v) => setHw('count', v)} />
                  <NumF label="İnverter başına fiyat farkı" unit="$/adet" tip={T.h_diff} value={inputs.huawei.diff} onChange={(v) => setHw('diff', v)} step={50} />
                  <NumF label="Üretim avantajı" unit="%/yıl" tip={T.h_prod} value={inputs.huawei.prodPct} onChange={(v) => setHw('prodPct', v)} step={0.25} />
                  <NumF label="OPEX tasarrufu" unit="%, PV OPEX’i" tip={T.h_opex} value={inputs.huawei.opexPct} onChange={(v) => setHw('opexPct', v)} />
                </div></div>
                <div className="explain"><Card label="Mantık · Artımlı analiz, vergi dahil" html={R.sHw(p, m, hw)} /><Note>Fark hesabı vergi etkisini içerir: ek gelirin vergisi düşülür, ek amortisman kalkanı eklenir. Borç tarafı etkisi (DSCR/LLCR) de raporlanır.</Note></div>
              </div>
            </div>
            <Kpis list={R.hwKpis(m, hw, inputs.style)} />
            <div className="chartcard">
              <h3>Huawei farkının kümülatif net değeri (iskontolu, vergi sonrası)</h3>
              <SeriesChart points={R.hwPoints(hw, p.r)} color="#C7000B" />
            </div>
          </div>

          {/* ==================== TAB 3 SONUÇLAR ==================== */}
          <div className={`tab ${tab === 'sum' ? 'active' : ''}`}>
            <div className="exec-hero">
              <div className="eh-top">
                <div>
                  <div className="eh-eyebrow">Yönetici Özeti · Otomatik Oluşturulur</div>
                  <h2>{inputs.pname || 'Utility GES Projesi'}</h2>
                  <div className="eh-sub">{nf(inputs.mw)} MWp{inputs.bessOn ? ` + ${nf(inputs.bMWh)} MWh BESS` : ''} · {inputs.life} yıl işletme · kaldıraç %{nf(inputs.debt)} · iskonto {pct(p.r * 100, 2)}{inputs.useWacc ? ' (vergi-sonrası WACC)' : ''}</div>
                </div>
                <span className={`exec-badge ${vd.cls}`}>{vd.cls === 'good' ? '✓ Finanse edilebilir' : '⚠ Varsayımları gözden geçir'}</span>
              </div>
              <div className="exec-stats">
                <div className="exec-stat"><div className="l">NPV</div><div className="v gold">{musd(m.npv)}</div><div className="h">kaldıraçsız, vergi sonrası</div></div>
                <div className="exec-stat"><div className="l">Proje IRR</div><div className="v">{pct(m.irr * 100, 1)}</div><div className="h">kaldıraçsız</div></div>
                <div className="exec-stat"><div className="l">Equity IRR</div><div className="v">{pct(m.eIRR * 100, 1)}</div><div className="h">DSRA iadesi dahil</div></div>
                <div className="exec-stat"><div className="l">Geri Ödeme</div><div className="v">{Number.isFinite(m.pbS) ? `${nf(m.pbS, 1)} yıl` : '—'}</div><div className="h">basit · iskontolu {Number.isFinite(m.pbD) ? nf(m.pbD, 1) : '—'} yıl</div></div>
                <div className="exec-stat"><div className="l">Toplam Yatırım</div><div className="v">{musd(m.totalUses)}</div><div className="h">IDC + ücret + DSRA dahil</div></div>
              </div>
            </div>

            <div className="exec-sect">Temel Göstergeler</div>
            <Kpis list={R.kpis(p, m)} />
            <div className={`verdict ${vd.cls}`} dangerouslySetInnerHTML={{ __html: vd.text }} />

            <div className="exec-sect">Kaynak–Kullanım</div>
            <div className="su">
              <div className="sucard"><h4>Kullanımlar (Uses)</h4><table><tbody>
                {R.usesRows(p, m).map(([k, v], i) => <tr key={i}><td>{k}</td><td>{v}</td></tr>)}
                <tr className="total"><td>Toplam kullanım</td><td>{musd(m.totalUses)}</td></tr>
              </tbody></table></div>
              <div className="sucard"><h4>Kaynaklar (Sources)</h4><table><tbody>
                {R.sourcesRows(p, m).map(([k, v], i) => <tr key={i}><td>{k}</td><td>{v}</td></tr>)}
                <tr className="total"><td>Toplam kaynak</td><td>{musd(m.totalUses)}</td></tr>
              </tbody></table></div>
            </div>

            <div className="exec-sect">Kümülatif İskontolu Nakit Akışı</div>
            <div className="chartcard">
              <h3>Kaldıraçsız serbest nakit akışı — sıfırı geçtiği yıl iskontolu geri ödemedir</h3>
              <SeriesChart points={R.cumPoints(m)} color="#18428F" />
            </div>

            {hw.dCapex > 0 && (
              <>
                <div className="exec-sect">Huawei Değer Analizi</div>
                <div className="chartcard">
                  <h3>Fark yatırımının kümülatif net değeri (iskontolu, vergi sonrası) — ΔNPV {R.hwKpis(m, hw, inputs.style)[2].val}</h3>
                  <SeriesChart points={R.hwPoints(hw, p.r)} color="#C7000B" />
                </div>
              </>
            )}

            <div className="exec-sect">Senaryo Matrisi — Kötümser / Baz / İyimser</div>
            <div className="senswrap" dangerouslySetInnerHTML={{ __html: R.scenMatrix(inputs, p) }} />
          </div>
        </div>
      </div>

      <PrintReport open={printing} onClose={() => setPrinting(false)}>
        <div dangerouslySetInnerHTML={{ __html: R.reportUtility(inputs, p, m, hw, { title: inputs.pname || 'Utility Projesi', prep: inputs.prep, date: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) }) }} />
      </PrintReport>
    </>
  );
}

function Step({ no, title, why, hw, children }: { no: string; title: string; why?: string; hw?: boolean; children: React.ReactNode }) {
  return (
    <div className={`step${hw ? ' hw' : ''}`}>
      <div className="step-head"><span className="step-no">{no}</span><h2>{title}</h2>{why && <span className="why">{why}</span>}</div>
      <div className="step-body">{children}</div>
    </div>
  );
}
