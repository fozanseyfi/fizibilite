'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileDown, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tipbox, NumF, TxtF, SelF, PrintReport, SeriesChart } from '@/components/models/native/mdl-kit';
import { BreakdownTable, DayLegend, UseCard, daySvg } from '@/components/models/native/bess-kit';
import { UT_USE_LABELS, reportBessUtility } from '@/components/models/native/bess-report';
import { useProjectSave } from '@/components/models/native/use-project-save';
import { computeBessUtility, type BessUtilityInputs } from '@/lib/models/bess/utility';
import { defaultBessUtilityInputs } from '@/lib/models/bess/defaults';
import type { ProjectSummary } from '@/lib/models/types';
import { nf, pct, usd, yearsFmt } from '@/lib/models/fmt';

const T = {
  acMw: 'Lisanstaki elektriksel kurulu güç (şebekeye veriş sınırı). Batarya eklense de santralin saatlik verişi bu değeri aşamaz.',
  clipPct: 'DC gücün AC sınırını aştığı açık günlerde inverterin kırptığı enerji, yıllık DC üretimin yüzdesi. PVsyst raporunda "inverter loss over nominal power" kalemi; DC/AC 1,2–1,3\'te tipik %1–4.',
  curtPct: 'TEİAŞ / dağıtım şirketi talimatıyla öğle saatlerinde kısılan üretimin oranı (10–16 saatleri).',
  yekdemPrice: 'YEKDEM kapsamındaki birim fiyat ($/MWh). YEKDEM süresince fiyat her saat aynıdır.',
  yekdemYears: 'YEKDEM\'den yararlanılacak kalan yıl. Sonrasında santral PTF ile serbest piyasaya satar ve arbitraj devreye girer.',
  ptf: 'Gün öncesi piyasası takas fiyatı (TL/MWh). EPİAŞ şeffaflık platformundaki son 12 ayın saatlik ortalamalarından girin.',
  ancPrice: 'Yan hizmet kapasite bedeli (TL/MW-saat). Rezerv kullanılmasa da ödenir. Ç1 2026 ortalamaları: PFK ≈ 1.879, SFK ≈ 2.686 (ikincil kaynak, doğrulayın).',
  ancAvail: 'Yılın kaç saatinde rezerv sağlanabileceği (bakım, test, teklif kazanma oranı).',
  ancEsc: 'Kapasite bedelinin TL olarak yıllık değişimi. Varsayılan %0 (TL bazında sabit → USD karşılığı kur artışıyla düşer). Depolama tesisleri pazara girdikçe fiyatın düşmesi beklenir; enflasyonla artış varsaymak iyimserdir.',
  ancHours: 'Rezerv için ayrılan enerji süresi. PFK en az 15 dakika (0,25 saat) kesintisiz çalışmayı gerektirir; SFK için daha uzun tutun.',
  devPct: 'Üretim tahmininin gerçekleşenden ortalama sapması (yıllık üretimin %\'si).',
  imbCost: 'Sapan 1 MWh için ödenen ortalama dengesizlik maliyeti (TL/MWh).',
  imbReduce: 'Sapmanın bataryayla kapatılabilen kısmı.',
  capexKwh: 'Kurulu batarya sistemi maliyeti (hücre + PCS + trafo + EPC). Utility ölçekte 2026 için tipik 180–260 $/kWh.',
};

export function BessUtilityModel({ projectId, initialInputs }: { projectId?: string; initialInputs?: BessUtilityInputs }) {
  const [inputs, setInputs] = useState<BessUtilityInputs>(() => ({ ...defaultBessUtilityInputs(), ...(initialInputs ?? {}) }));
  const [tab, setTab] = useState<'setup' | 'results'>('setup');
  const [printing, setPrinting] = useState(false);
  const set = <K extends keyof BessUtilityInputs>(k: K, v: BessUtilityInputs[K]) => setInputs((p) => ({ ...p, [k]: v }));
  const m = useMemo(() => computeBessUtility(inputs), [inputs]);
  const yekdem = inputs.regime === 'yekdem';

  const buildSummary = useCallback(
    (): ProjectSummary => ({ kind: 'bess-utility', capexUsd: m.capex, npvUsd: m.npv, irrPct: m.irr, paybackYears: m.payback, capacityLabel: `${nf(inputs.bMw)} MW / ${nf(inputs.bMwh)} MWh` }),
    [m, inputs.bMw, inputs.bMwh]
  );
  const { save, del, err } = useProjectSave({ projectId, kind: 'bess-utility', inputs, name: inputs.pname || 'Batarya Projesi', buildSummary });

  const y1 = m.years[0];
  const merchantYear = m.years.find((y) => !y.yekdem);
  const noUse = !inputs.useClip && !inputs.useArb && !inputs.useAnc && !inputs.useImb;
  const svgOpts = { unit: 'MWh', lineLabel: 'Veriş sınırı (AC)', chargeLabel2: 'Arbitraj şarjı' };
  const sum = (k: 'clipUsd' | 'arbUsd' | 'ancUsd' | 'imbUsd') => m.years.reduce((s, y) => s + y[k], 0);

  return (
    <>
      <Tipbox />
      <div className="flex items-center justify-between gap-3 flex-wrap no-print mb-3">
        <Button asChild variant="ghost" size="sm"><Link href={projectId ? '/projects' : '/projects/new'}><ArrowLeft className="h-4 w-4 mr-1" /> {projectId ? 'Projeler' : 'Model seçimi'}</Link></Button>
        <div className="flex items-center gap-2 flex-wrap">
          {err && <span className="text-xs text-destructive">{err}</span>}
          {projectId && <Button variant="outline" size="sm" onClick={del} className="text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5 mr-1" /> Sil</Button>}
          <Button variant="outline" onClick={() => setPrinting(true)} size="sm"><FileDown className="h-4 w-4 mr-1.5" /> Rapor çıktısı al</Button>
          <Button onClick={save} size="sm"><Save className="h-4 w-4 mr-1.5" />{projectId ? 'Güncelle & Kaydet' : 'Projeyi Kaydet'}</Button>
        </div>
      </div>

      <div className="mdl">
        <div className="m-header">
          <div className="hwrap">
            <div className="eyebrow">Sadece Batarya · Utility · Lisanslı GES&apos;e ekleme</div>
            <h1>Batarya Ekleme Fizibilitesi — Utility</h1>
            <p className="sub">İşletmedeki lisanslı GES santralinize batarya ekliyorsunuz (üretim tesisine bütünleşik depolama). Santralin verişi lisanstaki kurulu güçle sınırlı kalır; batarya kaybolan enerjiyi kurtarır, piyasada fiyat farkından ve yan hizmetlerden gelir sağlar.</p>
          </div>
        </div>
        <div className="m-tabs">
          <div className="hwrap">
            <nav role="tablist">
              <button className={tab === 'setup' ? 'active' : ''} onClick={() => setTab('setup')}>1 · Kurulum</button>
              <button className={tab === 'results' ? 'active' : ''} onClick={() => setTab('results')}>2 · Sonuçlar</button>
            </nav>
          </div>
        </div>

        <div className="m-main">
          <div className="kpis">
            <div className="kpi navy"><div className="kl">Yatırım</div><div className="kv">{usd(m.capex)}</div><div className="kh">{nf(inputs.bMwh)} MWh × {usd(inputs.capexKwh)}/kWh</div></div>
            <div className={`kpi ${y1.revUsd > y1.opexUsd ? 'good' : 'bad'}`}><div className="kl">1. yıl gelir</div><div className="kv">{usd(y1.revUsd)}</div><div className="kh">{y1.yekdem ? 'YEKDEM dönemi' : 'serbest piyasa'}</div></div>
            <div className={`kpi ${m.npv > 0 ? 'good' : 'bad'}`}><div className="kl">NPV</div><div className="kv">{usd(m.npv)}</div><div className="kh">iskonto {pct(inputs.disc)}</div></div>
            <div className="kpi"><div className="kl">IRR</div><div className="kv">{pct(m.irr * 100)}</div><div className="kh">USD bazında</div></div>
            <div className="kpi"><div className="kl">Geri ödeme</div><div className="kv">{yearsFmt(m.payback, 1)}</div><div className="kh">{inputs.life} yıl ömür</div></div>
          </div>

          {/* ==================== KURULUM ==================== */}
          <div className={`tab ${tab === 'setup' ? 'active' : ''}`}>
            <div className="toolbar">
              <TxtF label="Proje adı" unit="(raporda görünür)" value={inputs.pname} onChange={(v) => set('pname', v)} />
              <TxtF label="Firma" value={inputs.firm ?? ''} onChange={(v) => set('firm', v)} placeholder="ör. ABC" />
              <TxtF label="Lokasyon" value={inputs.loc ?? ''} onChange={(v) => set('loc', v)} placeholder="ör. Konya, Karapınar" />
              <TxtF label="Hazırlayan" value={inputs.prep} onChange={(v) => set('prep', v)} />
            </div>

            <Step no="ADIM 1" title="Bataryayı nasıl kullanacaksınız?" why="Birden fazla seçebilirsiniz. Yan hizmete ayrılan MW, diğer kullanımlardan düşülür.">
              <div className="grid2" style={{ marginBottom: 14 }}>
                <SelF label="Gelir rejimi" value={inputs.regime} onChange={(v) => set('regime', v)} options={[{ value: 'yekdem', label: 'YEKDEM (sabit fiyat) → süre bitince serbest piyasa' }, { value: 'merchant', label: 'Serbest piyasa (PTF)' }]} />
                {yekdem && <NumF label="Kalan YEKDEM süresi" unit="yıl" tip={T.yekdemYears} value={inputs.yekdemYears} onChange={(v) => set('yekdemYears', v)} step={1} />}
              </div>
              <div className="usegrid">
                <UseCard checked={inputs.useClip} onChange={(v) => set('useClip', v)} title={UT_USE_LABELS.clip}
                  how="Açık günlerde DC üretim inverter sınırını aşınca fazlası kırpılır; kısıntı talimatında üretim kısılır. Batarya bu bedava enerjiyi depolar, veriş sınırında yer açılınca (akşam) satar."
                  when="DC/AC oranı yüksek (1,2+) santral veya öğle kısıntısı yaşayan bölge. YEKDEM'li santralde bataryanın ana gerekçesi budur." />
                <UseCard checked={inputs.useArb} onChange={(v) => set('useArb', v)} title={UT_USE_LABELS.arb}
                  how="Öğlen PTF düşükken üretimin bir kısmı satılmaz, bataryaya alınır; akşam puantında (17–22) yüksek fiyattan satılır."
                  when="Serbest piyasadaki (YEKDEM'siz ya da YEKDEM'i biten) santral; öğle–akşam fiyat farkı, verim kaybını (≈%12) aşıyorsa."
                  note={yekdem ? `YEKDEM süresince fiyat her saat aynı olduğu için arbitraj kazancı yok; ${inputs.yekdemYears + 1}. yıldan itibaren devreye girer.` : undefined} />
                <UseCard checked={inputs.useAnc} onChange={(v) => set('useAnc', v)} title={UT_USE_LABELS.anc}
                  how="Bataryanın bir kısmı (MW) TEİAŞ için frekans rezervi olarak hazır tutulur. Rezerv kullanılmasa da saatlik kapasite bedeli ödenir. Batarya milisaniyede tepki verdiği için bu iş için çok uygundur."
                  when="TEİAŞ performans testlerini geçip yan hizmet anlaşması imzalanabiliyorsa."
                  note="İyimser senaryo: santral içi bataryanın katılımı TEİAŞ onayına bağlı; saatlik teklif usulü 1 Ocak 2027'de başlıyor." />
                <UseCard checked={inputs.useImb} onChange={(v) => set('useImb', v)} title={UT_USE_LABELS.imb}
                  how="Bulut vb. nedenlerle üretim günlük programdan saparsa dengesizlik bedeli ödenir. Batarya sapmanın bir kısmını kapatarak bu maliyeti düşürür."
                  when="Tahmin sapması ve dengesizlik maliyeti yüksek santral (dengeden sorumlu grup dışı ya da yüksek ceza)." />
              </div>
            </Step>

            <Step no="ADIM 2" title="Mevcut santral" why="Kırpma ve kısıntı, bataryanın bedava şarj kaynağıdır.">
              <div className="grid3">
                <NumF label="DC kurulu güç" unit="MWp" value={inputs.dcMwp} onChange={(v) => set('dcMwp', v)} step={0.5} />
                <NumF label="AC / lisans gücü" unit="MW" tip={T.acMw} value={inputs.acMw} onChange={(v) => set('acMw', v)} step={0.5} />
                <NumF label="Spesifik üretim" unit="kWh/kWp/yıl" value={inputs.spec} onChange={(v) => set('spec', v)} step={10} />
                <NumF label="Inverter kırpma kaybı" unit="% yıllık DC" tip={T.clipPct} value={inputs.clipPct} onChange={(v) => set('clipPct', v)} step={0.5} />
                <NumF label="Öğle kısıntısı" unit="% (10–16)" tip={T.curtPct} value={inputs.curtPct} onChange={(v) => set('curtPct', v)} step={0.5} />
                <NumF label="Panel yıllık kaybı" unit="%" value={inputs.pvDegr} onChange={(v) => set('pvDegr', v)} step={0.1} />
              </div>
            </Step>

            <Step no="ADIM 3" title="Fiyatlar" why="Varsayılanlar örnektir — EPİAŞ verisinden ve kendi anlaşmalarınızdan girin.">
              <div className="grid3">
                {yekdem && <NumF label="YEKDEM fiyatı" unit="$/MWh" tip={T.yekdemPrice} value={inputs.yekdemPrice} onChange={(v) => set('yekdemPrice', v)} step={1} />}
                <NumF label="PTF öğle (11–16)" unit="TL/MWh" tip={T.ptf} value={inputs.ptfNoon} onChange={(v) => set('ptfNoon', v)} step={50} />
                <NumF label="PTF gündüz (06–11, 16)" unit="TL/MWh" value={inputs.ptfDay} onChange={(v) => set('ptfDay', v)} step={50} />
                <NumF label="PTF puant (17–22)" unit="TL/MWh" value={inputs.ptfPeak} onChange={(v) => set('ptfPeak', v)} step={50} />
                <NumF label="PTF gece (22–06)" unit="TL/MWh" value={inputs.ptfNight} onChange={(v) => set('ptfNight', v)} step={50} />
              </div>
              {inputs.useAnc && (
                <div className="grid3" style={{ marginTop: 12 }}>
                  <SelF label="Hizmet" value={inputs.ancType} onChange={(v) => { set('ancType', v); set('ancPrice', v === 'pfk' ? 1900 : 2700); set('ancHours', v === 'pfk' ? 0.5 : 1); }}
                    options={[{ value: 'pfk', label: 'Primer frekans kontrol (PFK)' }, { value: 'sfk', label: 'Sekonder frekans kontrol (SFK)' }]} />
                  <NumF label="Rezerve ayrılan güç" unit="MW" value={inputs.ancMw} onChange={(v) => set('ancMw', v)} step={0.5} />
                  <NumF label="Kapasite bedeli" unit="TL/MW-saat" tip={T.ancPrice} value={inputs.ancPrice} onChange={(v) => set('ancPrice', v)} step={50} />
                  <NumF label="Katılım oranı" unit="% saat" tip={T.ancAvail} value={inputs.ancAvail} onChange={(v) => set('ancAvail', v)} step={5} />
                  <NumF label="Ayrılan enerji süresi" unit="saat" tip={T.ancHours} value={inputs.ancHours} onChange={(v) => set('ancHours', v)} step={0.25} />
                  <NumF label="Fiyatın yıllık değişimi" unit="% (TL)" tip={T.ancEsc} value={inputs.ancEsc ?? 0} onChange={(v) => set('ancEsc', v)} step={1} />
                </div>
              )}
              {inputs.useImb && (
                <div className="grid3" style={{ marginTop: 12 }}>
                  <NumF label="Tahmin sapması" unit="% üretim" tip={T.devPct} value={inputs.devPct} onChange={(v) => set('devPct', v)} step={1} />
                  <NumF label="Dengesizlik maliyeti" unit="TL/MWh" tip={T.imbCost} value={inputs.imbCost} onChange={(v) => set('imbCost', v)} step={25} />
                  <NumF label="Bataryayla kapatılan pay" unit="%" tip={T.imbReduce} value={inputs.imbReduce} onChange={(v) => set('imbReduce', v)} step={5} />
                </div>
              )}
            </Step>

            <Step no="ADIM 4" title="Batarya" why="Arbitraj için 2–4 saatlik (MWh ÷ MW) batarya tipiktir.">
              <div className="grid3">
                <NumF label="Güç" unit="MW" value={inputs.bMw} onChange={(v) => set('bMw', v)} step={0.5} />
                <NumF label="Kapasite" unit="MWh" value={inputs.bMwh} onChange={(v) => set('bMwh', v)} step={0.5} />
                <NumF label="Gidiş-dönüş verimi" unit="%" value={inputs.rte} onChange={(v) => set('rte', v)} step={1} />
                <NumF label="Kullanılabilir kapasite" unit="%" value={inputs.dod} onChange={(v) => set('dod', v)} step={1} />
                <NumF label="Yıllık kapasite kaybı" unit="%" value={inputs.bDegr} onChange={(v) => set('bDegr', v)} step={0.5} />
                <NumF label="Ekonomik ömür" unit="yıl" value={inputs.life} onChange={(v) => set('life', v)} step={1} />
                <NumF label="Kurulum maliyeti" unit="$/kWh" tip={T.capexKwh} value={inputs.capexKwh} onChange={(v) => set('capexKwh', v)} step={5} />
                <NumF label="Yıllık bakım" unit="% CAPEX" value={inputs.opexPct} onChange={(v) => set('opexPct', v)} step={0.5} />
                <NumF label="Hücre yenileme yılı" unit="0 = yok" value={inputs.augYear} onChange={(v) => set('augYear', v)} step={1} />
                {inputs.augYear > 0 && <NumF label="Yenileme maliyeti" unit="$/kWh" value={inputs.augCost} onChange={(v) => set('augCost', v)} step={5} />}
              </div>
            </Step>

            <Step no="ADIM 5" title="Finansal varsayımlar" why="PTF ve yan hizmet gelirleri TL; yatırım USD.">
              <div className="grid3">
                <NumF label="Başlangıç kuru" unit="TL/$" value={inputs.fx0} onChange={(v) => set('fx0', v)} step={0.5} />
                <NumF label="TL fiyat artışı" unit="%/yıl" value={inputs.tlEsc} onChange={(v) => set('tlEsc', v)} step={1} />
                <NumF label="Kur artışı" unit="%/yıl" value={inputs.fxEsc} onChange={(v) => set('fxEsc', v)} step={1} />
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
              <h3>Gelir kırılımı <small>· 1. yıl, USD{merchantYear && merchantYear.y > 1 ? ` — serbest piyasaya geçilen ${merchantYear.y}. yıl aşağıdaki tabloda` : ''}</small></h3>
              <BreakdownTable unit={(v) => usd(v)} rows={[
                ...(inputs.useClip ? [{ label: UT_USE_LABELS.clip, value: y1.clipUsd, hint: `${nf(m.y1Stats.recoveredMwh)} MWh kurtarıldı (kırpma ${nf(m.y1Stats.clipMwh)} + kısıntı ${nf(m.y1Stats.curtMwh)} MWh)` }] : []),
                ...(inputs.useArb ? [{ label: UT_USE_LABELS.arb, value: y1.arbUsd, hint: y1.yekdem ? 'YEKDEM döneminde sıfır' : `${nf(m.y1Stats.arbMwh)} MWh öğle üretimi akşama kaydırıldı` }] : []),
                ...(inputs.useAnc ? [{ label: UT_USE_LABELS.anc, value: y1.ancUsd, hint: `${nf(m.y1Stats.ancMw)} MW rezerv · arbitraja kalan ${nf(m.y1Stats.arbMw)} MW` }] : []),
                ...(inputs.useImb ? [{ label: UT_USE_LABELS.imb, value: y1.imbUsd }] : []),
              ]} />
              <div className="note">Yıllık deşarj {nf(m.y1Stats.disMwh)} MWh · eşdeğer tam döngü {nf(m.y1Stats.cycles)} · yıllık bakım {usd(y1.opexUsd)} · depolama maliyeti (LCOS, şarj enerjisi hariç) {nf(m.lcos, 0)} $/MWh.</div>
            </div>

            <div className="card">
              <h3>Ömür boyu gelir <small>· {inputs.life} yıl toplam, USD</small></h3>
              <div className="kpis">
                {inputs.useClip && <div className="kpi"><div className="kl">Kurtarma</div><div className="kv">{usd(sum('clipUsd'))}</div></div>}
                {inputs.useArb && <div className="kpi"><div className="kl">Arbitraj</div><div className="kv">{usd(sum('arbUsd'))}</div></div>}
                {inputs.useAnc && <div className="kpi"><div className="kl">Yan hizmet</div><div className="kv">{usd(sum('ancUsd'))}</div></div>}
                {inputs.useImb && <div className="kpi"><div className="kl">Dengesizlik</div><div className="kv">{usd(sum('imbUsd'))}</div></div>}
              </div>
            </div>

            <div className="grid2">
              <div className="card bess-chart"><h3>Tipik gün — Temmuz <small>· MWh</small></h3><div dangerouslySetInnerHTML={{ __html: daySvg(m.summer, svgOpts) }} /><DayLegend lineLabel="Veriş sınırı (AC)" chargeLabel2="Arbitraj şarjı" /></div>
              <div className="card bess-chart"><h3>Tipik gün — Ocak <small>· MWh</small></h3><div dangerouslySetInnerHTML={{ __html: daySvg(m.winter, svgOpts) }} /><DayLegend lineLabel="Veriş sınırı (AC)" chargeLabel2="Arbitraj şarjı" /></div>
            </div>

            <div className="card bess-chart">
              <h3>Kümülatif nakit akışı <small>· USD, 0. yıl yatırım dahil</small></h3>
              <SeriesChart points={[-m.capex, ...m.years.map((y) => y.cumUsd)]} />
            </div>

            <div className="card">
              <h3>Yıllık nakit akışı <small>· USD</small></h3>
              <div className="tablewrap">
                <table>
                  <thead><tr><th>Yıl</th><th>Rejim</th><th>Kapasite (MWh)</th><th>Kurtarma</th><th>Arbitraj</th><th>Yan hizmet</th><th>Dengesizlik</th><th>Bakım</th><th>Yenileme</th><th>Net</th><th>Kümülatif</th></tr></thead>
                  <tbody>
                    {m.years.map((y) => (
                      <tr key={y.y}><td>{y.y}</td><td>{y.yekdem ? 'YEKDEM' : 'PTF'}</td><td>{nf(y.capMwh, 1)}</td><td>{nf(y.clipUsd)}</td><td>{nf(y.arbUsd)}</td><td>{nf(y.ancUsd)}</td><td>{nf(y.imbUsd)}</td><td>{nf(-y.opexUsd)}</td><td>{y.augUsd ? nf(-y.augUsd) : '—'}</td><td>{nf(y.cfUsd)}</td><td>{nf(y.cumUsd)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <PrintReport open={printing} onClose={() => setPrinting(false)}>
        <div dangerouslySetInnerHTML={{ __html: reportBessUtility(inputs, m, { title: inputs.pname || 'Batarya Projesi', prep: inputs.prep, firm: inputs.firm, loc: inputs.loc, date: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) }) }} />
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
