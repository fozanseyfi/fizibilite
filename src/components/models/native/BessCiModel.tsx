'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tipbox, NumF, TxtF, SelF, PrintReport, SeriesChart } from '@/components/models/native/mdl-kit';
import { BreakdownTable, DayLegend, UseCard, DayChart } from '@/components/models/native/bess-kit';
import { OptPanel, TabActions } from '@/components/models/native/bess-panels';
import { CiUsagePanel } from '@/components/models/native/bess-analysis';
import { CI_USE_LABELS, reportBessCi } from '@/components/models/native/bess-report';
import { useProjectSave } from '@/components/models/native/use-project-save';
import { computeBessCi, type BessCiInputs } from '@/lib/models/bess/ci';
import { bessCiFromSaved } from '@/lib/models/bess/defaults';
import { optimizeBessCi } from '@/lib/models/bess/optimize';
import { C_RATES } from '@/lib/models/bess/common';
import { PROFILE_LABELS, type ProfileKey } from '@/lib/models/ci/presets';
import type { ProjectSummary } from '@/lib/models/types';
import { nf, pct, tl, usd, yearsFmt } from '@/lib/models/fmt';

const T = {
  pSell: 'İhtiyaç fazlası enerjinin satış fiyatı. Lisanssız üretimde genellikle abone grubunun aktif enerji bedelinden (dağıtım bedeli hariç) ödenir — faturanızdan kontrol edin.',
  rte: 'Gidiş-dönüş verimi: bataryaya giren 100 kWh\'ın kaçı geri alınır. Lityum-demir-fosfat (LFP) sistemlerde tipik %88–92.',
  dod: 'Kapasitenin kullanılabilir kısmı (ömrü korumak için tam boşaltılmaz). Tipik %90.',
  bDegr: 'Yıllık kapasite kaybı. LFP\'de günde bir döngüde tipik %2–3/yıl.',
  capexKwh: 'Anahtar teslim batarya kurulum maliyeti, kWh başına: hücre, raf/kabin, BMS, güç dönüştürücü (PCS / batarya inverteri), bağlantı ve montaj dahil. Seçtiğiniz C-oranı için teklif edilen fiyatı girin — yüksek C-oranlı sistemlerin kWh fiyatı daha yüksektir.',
  cPrem: 'Yüksek C-oranlı bataryada aynı kWh için daha büyük güç dönüştürücü gerekir. Optimizasyon, Kurulum sekmesindeki fiyatı mevcut C-oranı için kabul eder ve diğer C-oranlarını bu farkla fiyatlar. 0 girerseniz C-oranı maliyeti değiştirmez.',
  cRate: 'Batarya gücünün kapasitesine oranı. 1C: tam kapasiteyi 1 saatte verir (kısa, güçlü zirveler). 0,5C: 2 saat. 0,25C: 4 saat (uzun akşam puantı). Güç = kapasite × C.',
  aug: 'Bu yılda, o güne kadar kaybolan kapasite kadar modül eklenir; kapasite yeniden %100 olur. Maliyet = kaybolan kWh × ekleme birim maliyeti.',
  demandFee: 'Çift terimli tarifede aylık güç bedeli (TL/kW-ay). Faturanızdaki "güç bedeli" kalemi.',
  peakCutKw: 'Bataryayla düşürmek istediğiniz aylık zirve çekiş (kW). Batarya gücünü aşamaz.',
  peakHours: 'Zirvenin tipik süresi. Batarya bu süre boyunca hedef gücü verebilmek için enerji ayırır.',
  outageCost: 'Bir saatlik kesintinin işletmeye maliyeti (üretim kaybı, bozulan ürün, hizmet kaybı).',
  backupReserve: 'Kesintiye hazır tutulan kapasite payı. Bu pay günlük kullanımda harcanmaz.',
  tlEsc: 'Elektrik birim fiyatının yıllık TL artışı.',
  fxEsc: 'TL/USD kurunun yıllık artışı. Yatırım USD, tasarruf TL olduğundan kazanç her yıl bu kurla USD\'ye çevrilir.',
};

export function BessCiModel({ projectId, initialInputs }: { projectId?: string; initialInputs?: BessCiInputs }) {
  const [inputs, setInputs] = useState<BessCiInputs>(() => bessCiFromSaved(initialInputs));
  const [tab, setTab] = useState<'setup' | 'results' | 'opt' | 'usage'>('setup');
  const [printing, setPrinting] = useState(false);
  const set = <K extends keyof BessCiInputs>(k: K, v: BessCiInputs[K]) => setInputs((p) => ({ ...p, [k]: v }));
  const m = useMemo(() => computeBessCi(inputs), [inputs]);
  const mesken = inputs.abone === 'mesken';
  const uc = inputs.tariff === 'uc';

  const buildSummary = useCallback(
    (): ProjectSummary => ({ kind: 'bess-ci', capexUsd: m.capex, npvUsd: m.npv, irrPct: m.irr, paybackYears: m.payback, capacityLabel: `${nf(inputs.bKwh)} kWh / ${nf(m.bKw)} kW` }),
    [m, inputs.bKwh]
  );
  // Optimizasyonda C-oranları arası fiyat farkı ($/kW güç) — kurulum maliyeti tek kalem olduğu için yalnız burada
  const [cPrem, setCPrem] = useState(120);
  const runOpt = useCallback((sizes: number[], cRates: number[]) => optimizeBessCi(inputs, sizes, cRates, cPrem), [inputs, cPrem]);
  const applySize = (cap: number, c: number) => { setInputs((p) => ({ ...p, bKwh: cap, cRate: c })); setTab('results'); };
  const { save, del, err } = useProjectSave({ projectId, kind: 'bess-ci', inputs, name: inputs.pname || 'Batarya Projesi', buildSummary });

  const total = m.y1.self + m.y1.arb + m.y1.peak + m.y1.backup;
  const noUse = !inputs.useSelf && !inputs.useArb && !inputs.usePeak && !inputs.useBackup;
  const svgOpts = { unit: 'kWh', lineLabel: 'Tüketim', chargeLabel2: 'Şebekeden şarj (gece)' };

  return (
    <>
      <Tipbox />
      <div className="flex items-center justify-between gap-3 flex-wrap no-print mb-3">
        <Button asChild variant="ghost" size="sm"><Link href={projectId ? '/projects' : '/projects/new'}><ArrowLeft className="h-4 w-4 mr-1" /> {projectId ? 'Projeler' : 'Model seçimi'}</Link></Button>
        <div className="flex items-center gap-2 flex-wrap">
          {err && <span className="text-xs text-destructive">{err}</span>}
          {projectId && <Button variant="outline" size="sm" onClick={del} className="text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5 mr-1" /> Sil</Button>}
        </div>
      </div>

      <div className="mdl">
        <div className="m-header">
          <div className="hwrap">
            <div className="eyebrow">Sadece Batarya · C&I / Mesken · Mevcut GES&apos;e ekleme</div>
            <h1>Batarya Ekleme Fizibilitesi — C&I / Mesken</h1>
            <p className="sub">Tesisinizde GES var, yalnızca batarya ekliyorsunuz. Mevzuat gereği tüketim tesisindeki batarya şebekeye satış yapamaz; kazanç faturanızın düşmesinden gelir. Model aynı yılı bataryasız ve bataryalı olarak saatlik simüle edip farkı alır.</p>
          </div>
        </div>
        <div className="m-tabs">
          <div className="hwrap tabs-row">
            <nav role="tablist">
              <button className={tab === 'setup' ? 'active' : ''} onClick={() => setTab('setup')}>1 · Kurulum</button>
              <button className={tab === 'results' ? 'active' : ''} onClick={() => setTab('results')}>2 · Sonuçlar</button>
              <button className={tab === 'opt' ? 'active' : ''} onClick={() => setTab('opt')}>3 · Optimizasyon</button>
              <button className={tab === 'usage' ? 'active' : ''} onClick={() => setTab('usage')}>4 · Kullanım analizi</button>
            </nav>
            <TabActions onReport={() => setPrinting(true)} onSave={save} saveLabel={projectId ? 'Güncelle & Kaydet' : 'Projeyi Kaydet'} />
          </div>
        </div>

        <div className="m-main">
          <div className="kpis">
            <div className="kpi navy"><div className="kl">Yatırım</div><div className="kv">{usd(m.capex)}</div><div className="kh">{nf(inputs.bKwh)} kWh / {nf(m.bKw)} kW{inputs.cRate > 0 ? ` · ${String(inputs.cRate).replace('.', ',')}C` : ''}</div></div>
            <div className={`kpi ${total > 0 ? 'good' : 'bad'}`}><div className="kl">1. yıl kazanç</div><div className="kv">{tl(total)}</div><div className="kh">bugünkü fiyatlarla</div></div>
            <div className={`kpi ${m.npv > 0 ? 'good' : 'bad'}`}><div className="kl">NPV</div><div className="kv">{usd(m.npv)}</div><div className="kh">iskonto {pct(inputs.disc)}</div></div>
            <div className="kpi"><div className="kl">IRR</div><div className="kv">{pct(m.irr * 100)}</div><div className="kh">USD bazında</div></div>
            <div className="kpi"><div className="kl">Geri ödeme</div><div className="kv">{yearsFmt(m.payback, 1)}</div><div className="kh">{inputs.life} yıl ömür</div></div>
          </div>

          {/* ==================== KURULUM ==================== */}
          <div className={`tab ${tab === 'setup' ? 'active' : ''}`}>
            <div className="toolbar">
              <TxtF label="Proje adı" unit="(raporda görünür)" value={inputs.pname} onChange={(v) => set('pname', v)} />
              <TxtF label="Firma" value={inputs.firm ?? ''} onChange={(v) => set('firm', v)} placeholder="ör. ABC" />
              <TxtF label="Lokasyon" value={inputs.loc ?? ''} onChange={(v) => set('loc', v)} placeholder="ör. Antalya" />
              <TxtF label="Hazırlayan" value={inputs.prep} onChange={(v) => set('prep', v)} />
            </div>

            <Step no="ADIM 1" title="Bataryayı nasıl kullanacaksınız?" why="Birden fazla seçebilirsiniz; model hepsini aynı bataryayla, öncelik sırasıyla çalıştırır.">
              <div className="grid2" style={{ marginBottom: 14 }}>
                <SelF label="Abone grubu" value={inputs.abone} onChange={(v) => set('abone', v)} options={[{ value: 'ci', label: 'Ticarethane / Sanayi (saatlik mahsup)' }, { value: 'mesken', label: 'Mesken (aylık mahsup)' }]} />
                <SelF label="Tarife" value={inputs.tariff} onChange={(v) => set('tariff', v)} options={[{ value: 'tek', label: 'Tek zamanlı' }, { value: 'uc', label: 'Üç zamanlı (gündüz / puant / gece)' }]} />
              </div>
              <div className="usegrid">
                <UseCard checked={inputs.useSelf} onChange={(v) => set('useSelf', v)} title={CI_USE_LABELS.self}
                  how="Öğlen GES tüketimden fazla üretince fazlası düşük fiyattan satılır. Batarya bu fazlayı depolar, akşam kendi tüketiminize verir; şebekeden pahalı almazsınız."
                  when="Saatlik mahsuplaşmadaki C&I tesis; öğlen fazla üretim, akşam tüketim (otel, AVM, akşam vardiyası)."
                  note={mesken ? 'Meskende aylık mahsup sürdüğü için bu seçenek faturayı neredeyse değiştirmez.' : undefined} />
                <UseCard checked={inputs.useArb} onChange={(v) => set('useArb', v)} title={CI_USE_LABELS.arb} disabled={!uc}
                  how="Gece (22–06) ucuz tarifeden şebekeden şarj, puantta (17–22) deşarj. Güneş fazlası yetmediği günlerde aradaki farkı şebekeden tamamlar."
                  when="Üç zamanlı tarifede puant / gece farkı, verim kaybını (≈%10) aşacak kadar büyükse."
                  note={!uc ? 'Yalnızca üç zamanlı tarifede çalışır — yukarıdan tarifeyi değiştirin.' : undefined} />
                <UseCard checked={inputs.usePeak} onChange={(v) => set('usePeak', v)} title={CI_USE_LABELS.peak} disabled={mesken}
                  how="Batarya ayın en yüksek çekiş anlarını keser; aylık güç bedeli düşer. Bu iş için kapasitenin bir kısmı her gün ayrılır."
                  when="Çift terimli (güç bedelli) tarifedeki sanayi abonesi; kısa süreli yüksek yük zirveleri (pres, kompresör, fırın)."
                  note={mesken ? 'Meskende güç bedeli yoktur.' : undefined} />
                <UseCard checked={inputs.useBackup} onChange={(v) => set('useBackup', v)} title={CI_USE_LABELS.backup}
                  how="Elektrik kesildiğinde kritik yükleri (sunucu, soğutma, güvenlik, üretim hattı) besler. Kapasitenin bir payı her zaman dolu tutulur."
                  when="Sık kesinti yaşayan bölge veya kesintinin pahalıya patladığı işletme (soğuk zincir, veri, sürekli üretim)." />
              </div>
            </Step>

            <Step no="ADIM 2" title="Mevcut GES ve tüketim" why="Bataryanın değeri, üretimle tüketimin saat saat ne kadar örtüşmediğine bağlıdır.">
              <div className="grid3">
                <NumF label="Mevcut GES gücü" unit="kWp" value={inputs.kwp} onChange={(v) => set('kwp', v)} step={10} />
                <NumF label="Spesifik üretim" unit="kWh/kWp/yıl" value={inputs.spec} onChange={(v) => set('spec', v)} step={10} />
                <SelF label="Panel yönü" value={inputs.orient} onChange={(v) => set('orient', v)} options={[{ value: 's', label: 'Güney (öğle tepeli)' }, { value: 'ew', label: 'Doğu-batı (yayvan)' }]} />
                <NumF label="Yıllık tüketim" unit="kWh" value={inputs.consY} onChange={(v) => set('consY', v)} step={10000} />
                <SelF label="Tüketim profili" value={inputs.profileId} onChange={(v) => set('profileId', v)}
                  options={(Object.keys(PROFILE_LABELS) as ProfileKey[]).map((k) => ({ value: k, label: PROFILE_LABELS[k] }))} />
                <SelF label="Mevsimsel dağılım" value={inputs.season} onChange={(v) => set('season', v)} options={[{ value: 'flat', label: 'Düz' }, { value: 'yaz', label: 'Yaz pik (klima)' }, { value: 'kis', label: 'Kış pik (ısıtma)' }]} />
              </div>
            </Step>

            <Step no="ADIM 3" title="Tarife ve fiyatlar" why="Varsayılanlar örnektir — kendi faturanızdaki birim fiyatları girin.">
              <div className="grid3">
                {uc ? (
                  <>
                    <NumF label="Gündüz (06–17)" unit="TL/kWh" value={inputs.pGunduz} onChange={(v) => set('pGunduz', v)} step={0.05} />
                    <NumF label="Puant (17–22)" unit="TL/kWh" value={inputs.pPuant} onChange={(v) => set('pPuant', v)} step={0.05} />
                    <NumF label="Gece (22–06)" unit="TL/kWh" value={inputs.pGece} onChange={(v) => set('pGece', v)} step={0.05} />
                  </>
                ) : (
                  <NumF label="Alış fiyatı" unit="TL/kWh, vergiler dahil" value={inputs.pTek} onChange={(v) => set('pTek', v)} step={0.05} />
                )}
                <NumF label="Fazla enerji satış fiyatı" unit="TL/kWh" tip={T.pSell} value={inputs.pSell} onChange={(v) => set('pSell', v)} step={0.05} />
              </div>
              {inputs.usePeak && !mesken && (
                <div className="grid3" style={{ marginTop: 12 }}>
                  <NumF label="Güç bedeli" unit="TL/kW-ay" tip={T.demandFee} value={inputs.demandFee} onChange={(v) => set('demandFee', v)} step={5} />
                  <NumF label="Hedef zirve düşüşü" unit="kW" tip={T.peakCutKw} value={inputs.peakCutKw} onChange={(v) => set('peakCutKw', v)} step={10} />
                  <NumF label="Zirve süresi" unit="saat" tip={T.peakHours} value={inputs.peakHours} onChange={(v) => set('peakHours', v)} step={0.5} />
                </div>
              )}
              {inputs.useBackup && (
                <div className="grid3" style={{ marginTop: 12 }}>
                  <NumF label="Yıllık kesinti" unit="saat" value={inputs.outageH} onChange={(v) => set('outageH', v)} step={1} />
                  <NumF label="Kesinti maliyeti" unit="TL/saat" tip={T.outageCost} value={inputs.outageCost} onChange={(v) => set('outageCost', v)} step={1000} />
                  <NumF label="Kritik yük" unit="kW" value={inputs.criticalKw} onChange={(v) => set('criticalKw', v)} step={10} />
                  <NumF label="Tipik kesinti süresi" unit="saat" value={inputs.eventH} onChange={(v) => set('eventH', v)} step={0.5} />
                  <NumF label="Yedeğe ayrılan pay" unit="% kapasite" tip={T.backupReserve} value={inputs.backupReserve} onChange={(v) => set('backupReserve', v)} step={5} />
                </div>
              )}
            </Step>

            <Step no="ADIM 4" title="Batarya" why="Süre (kWh ÷ kW) akşam puantına göre seçilir: 2–4 saat tipiktir. En iyi boyut için Optimizasyon sekmesine bakın.">
              <div className="grid3">
                <NumF label="Kapasite" unit="kWh" value={inputs.bKwh} onChange={(v) => set('bKwh', v)} step={10} />
                <SelF label="C-oranı" tip={T.cRate} value={String(inputs.cRate)} onChange={(v) => setInputs((p) => ({ ...p, cRate: Number(v), bKw: Number(v) > 0 ? p.bKwh * Number(v) : m.bKw }))}
                  options={C_RATES.map((o) => ({ value: String(o.value), label: o.label }))} />
                <NumF label="Güç" unit={inputs.cRate > 0 ? 'kW, C-oranından' : 'kW'} value={inputs.cRate > 0 ? m.bKw : inputs.bKw} onChange={(v) => set('bKw', v)} step={10} disabled={inputs.cRate > 0} />
                <NumF label="Gidiş-dönüş verimi" unit="%" tip={T.rte} value={inputs.rte} onChange={(v) => set('rte', v)} step={1} />
                <NumF label="Kullanılabilir kapasite" unit="%" tip={T.dod} value={inputs.dod} onChange={(v) => set('dod', v)} step={1} />
                <NumF label="Yıllık kapasite kaybı" unit="%" tip={T.bDegr} value={inputs.bDegr} onChange={(v) => set('bDegr', v)} step={0.5} />
                <NumF label="Ekonomik ömür" unit="yıl" value={inputs.life} onChange={(v) => set('life', v)} step={1} />
                <NumF label="Batarya kurulum maliyeti" unit="$/kWh, anahtar teslim" tip={T.capexKwh} value={inputs.capexKwh} onChange={(v) => set('capexKwh', v)} step={10} />
                <NumF label="Yıllık bakım" unit="% CAPEX" value={inputs.opexPct} onChange={(v) => set('opexPct', v)} step={0.5} />
                <NumF label="Kapasite ekleme yılı" unit="0 = yok" tip={T.aug} value={inputs.augYear} onChange={(v) => set('augYear', v)} step={1} />
                {inputs.augYear > 0 && <NumF label="Ekleme maliyeti" unit="$/kWh eklenen" value={inputs.augCost} onChange={(v) => set('augCost', v)} step={10} />}
              </div>
              <div className="note">Toplam yatırım {usd(m.capex)} = {nf(inputs.bKwh)} kWh × {usd(inputs.capexKwh)}/kWh.</div>
            </Step>

            <Step no="ADIM 5" title="Finansal varsayımlar" why="Yatırım USD, tasarruf TL: kur ve TL fiyat artışı sonucu doğrudan etkiler.">
              <div className="grid3">
                <NumF label="Başlangıç kuru" unit="TL/$" value={inputs.fx0} onChange={(v) => set('fx0', v)} step={0.5} />
                <NumF label="TL fiyat artışı" unit="%/yıl" tip={T.tlEsc} value={inputs.tlEsc} onChange={(v) => set('tlEsc', v)} step={1} />
                <NumF label="Kur artışı" unit="%/yıl" tip={T.fxEsc} value={inputs.fxEsc} onChange={(v) => set('fxEsc', v)} step={1} />
                <NumF label="İskonto oranı" unit="% (USD)" value={inputs.disc} onChange={(v) => set('disc', v)} step={0.5} />
              </div>
            </Step>
            <div className="flex justify-end"><button className="btn-pdf" onClick={() => setTab('results')}>Sonuçları gör →</button></div>
          </div>

          {/* ==================== SONUÇLAR ==================== */}
          <div className={`tab ${tab === 'results' ? 'active' : ''}`}>
            {(m.warnings.length > 0 || noUse) && (
              <div className="warnbox"><ul>{noUse && <li>Henüz bir kullanım şekli seçmediniz (Adım 1).</li>}{m.warnings.map((w) => <li key={w}>{w}</li>)}</ul></div>
            )}
            <div className="card">
              <h3>Kazanç kırılımı <small>· 1. yıl, bugünkü fiyatlarla (TL)</small></h3>
              <BreakdownTable unit={(v) => tl(v)} rows={[
                ...(inputs.useSelf ? [{ label: CI_USE_LABELS.self, value: m.y1.self, hint: `${nf(m.y1Stats.chSolar)} kWh güneş fazlası depolandı` }] : []),
                ...(inputs.useArb && uc ? [{ label: CI_USE_LABELS.arb, value: m.y1.arb, hint: `${nf(m.y1Stats.chGrid)} kWh gece şarjı` }] : []),
                ...(inputs.usePeak && !mesken ? [{ label: CI_USE_LABELS.peak, value: m.y1.peak, hint: `${nf(m.y1Stats.peakCutKw)} kW düşüş × ${nf(inputs.demandFee)} TL × 12 ay` }] : []),
                ...(inputs.useBackup ? [{ label: CI_USE_LABELS.backup, value: m.y1.backup, hint: `kesintilerin ${pct(m.y1Stats.backupCoverage * 100, 0)}'i karşılanıyor` }] : []),
              ]} />
              <div className="note">Bataryasız yıllık fatura <b>{tl(m.y1Stats.baseBillTL)}</b>, bataryalı <b>{tl(m.y1Stats.bessBillTL)}</b>. Yıllık deşarj {nf(m.y1Stats.disKwh)} kWh · eşdeğer tam döngü {nf(m.y1Stats.cycles)} · depolama maliyeti (LCOS, şarj enerjisi hariç) {nf(m.lcos, 3)} $/kWh.</div>
            </div>

            <div className="grid2">
              <div className="card bess-chart"><h3>Tipik gün — Temmuz <small>· hafta içi, kWh</small></h3><DayChart t={m.summer} opts={svgOpts} /><DayLegend lineLabel="Tüketim" chargeLabel2="Şebekeden şarj (gece)" /></div>
              <div className="card bess-chart"><h3>Tipik gün — Ocak <small>· hafta içi, kWh</small></h3><DayChart t={m.winter} opts={svgOpts} /><DayLegend lineLabel="Tüketim" chargeLabel2="Şebekeden şarj (gece)" /></div>
            </div>

            <div className="card bess-chart">
              <h3>Kümülatif nakit akışı <small>· USD, 0. yıl yatırım dahil</small></h3>
              <SeriesChart points={[-m.capex, ...m.years.map((y) => y.cumUsd)]} />
            </div>

            <div className="card">
              <h3>Yıllık nakit akışı <small>· USD</small></h3>
              <div className="tablewrap">
                <table>
                  <thead><tr><th>Yıl</th><th>Kapasite (kWh)</th><th>Enerji (TL)</th><th>Güç bedeli (TL)</th><th>Yedek (TL)</th><th>Kazanç ($)</th><th>Bakım ($)</th><th>Yenileme ($)</th><th>Net ($)</th><th>Kümülatif ($)</th></tr></thead>
                  <tbody>
                    {m.years.map((y) => (
                      <tr key={y.y}><td>{y.y}</td><td>{nf(y.capKwh)}</td><td>{nf(y.energyTL)}</td><td>{nf(y.peakTL)}</td><td>{nf(y.backupTL)}</td><td>{nf(y.savingUsd)}</td><td>{nf(-y.opexUsd)}</td><td>{y.augUsd ? nf(-y.augUsd) : '—'}</td><td>{nf(y.cfUsd)}</td><td>{nf(y.cumUsd)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="note">TL tutarlar 1. yıl fiyatlarıyladır; kazanç ($) sütunu her yılın TL fiyat artışı ve kuruyla USD&apos;ye çevrilmiştir.</div>
            </div>
          </div>

          {/* ==================== OPTİMİZASYON ==================== */}
          <div className={`tab ${tab === 'opt' ? 'active' : ''}`}>
            <OptPanel unitCap="kWh" unitPower="kW" current={inputs.bKwh} run={runOpt} onApply={applySize}
              y1Label="1. yıl kazanç" y1Fmt={(v) => tl(v)} showSoh={false}
              extra={<NumF label="C-oranı fiyat farkı" unit="$/kW güç (PCS)" tip={T.cPrem} value={cPrem} onChange={setCPrem} step={10} />}
              costNote={`Kurulum maliyeti (${usd(inputs.capexKwh)}/kWh) mevcut C-oranı içindir; diğer C-oranlarının kWh fiyatı güç farkı × ${usd(cPrem)}/kW kadar artar veya azalır (ör. 0,5C'den 1C'ye +${usd(cPrem * 0.5)}/kWh).`} />
          </div>

          {/* ==================== KULLANIM ANALİZİ ==================== */}
          <div className={`tab ${tab === 'usage' ? 'active' : ''}`}>
            <CiUsagePanel inputs={inputs} onApplyUses={(u) => { setInputs((p) => ({ ...p, useSelf: u.includes('self'), useArb: u.includes('arb'), usePeak: u.includes('peak'), useBackup: u.includes('backup') })); setTab('results'); }} />
          </div>

        </div>
      </div>

      <PrintReport open={printing} onClose={() => setPrinting(false)}>
        <div dangerouslySetInnerHTML={{ __html: reportBessCi(inputs, m, { title: inputs.pname || 'Batarya Projesi', prep: inputs.prep, firm: inputs.firm, loc: inputs.loc, date: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) }) }} />
      </PrintReport>
    </>
  );
}

function Step({ no, title, why, children }: { no: string; title: string; why?: string; children: React.ReactNode }) {
  return (
    <div className="step">
      <div className="step-head"><span className="step-no">{no}</span><h2>{title}</h2>{why && <span className="why">{why}</span>}</div>
      <div className="step-body single">{children}</div>
    </div>
  );
}
