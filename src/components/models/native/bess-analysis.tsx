'use client';

import { useState } from 'react';
import { NumF } from '@/components/models/native/mdl-kit';
import { nf, pct, usd, yearsFmt } from '@/lib/models/fmt';
import type { BessCiInputs } from '@/lib/models/bess/ci';
import type { BessUtilityInputs } from '@/lib/models/bess/utility';
import {
  ancSweep, arbSweep, breakevenSpread, ciUseCombos, dcSweep, utUseCombos, yekdemSweep,
  type AncCell, type ArbRow, type ComboResult, type DcRow, type YekdemRow,
} from '@/lib/models/bess/usage';
import type { StratRow } from '@/lib/models/bess/soh-strategy';
import { CI_USE_LABELS, UT_USE_LABELS } from '@/components/models/native/bess-report';
import { HoverChart, type HoverCol } from '@/components/models/native/chart-hover';

const signed = (v: number) => `${v >= 0 ? '+' : '−'}${usd(Math.abs(v))}`;

/** Ağır hesap: önce "hesaplanıyor" çizilsin, sonra çalışsın */
function useRunner<T>() {
  const [res, setRes] = useState<T | null>(null);
  const [busy, setBusy] = useState(false);
  const go = (fn: () => T) => { setBusy(true); setTimeout(() => { try { setRes(fn()); } finally { setBusy(false); } }, 20); };
  return { res, busy, go };
}

function Verdict({ tone = 'ok', children }: { tone?: 'ok' | 'bad'; children: React.ReactNode }) {
  return <div className={`soh-status ${tone}`}>{children}</div>;
}

// ============================ KULLANIM KOMBİNASYONLARI ============================

/** Tablo başlıkları için kısa adlar */
const SHORT: Record<string, string> = {
  self: 'Akşama kaydırma', arb: 'Arbitraj', peak: 'Zirve tıraşlama', backup: 'Yedekleme',
  clip: 'Kırpma kurtarma', anc: 'Yan hizmet', imb: 'Dengesizlik',
};

function ComboSection<K extends string>({
  result, labels, y1Label, y1Fmt, onApply, context, period,
}: {
  result: ComboResult; labels: Record<K, string>; y1Label: string; y1Fmt: (v: number) => string;
  onApply: (uses: K[]) => void;
  /** 1. tablonun üstünde gösterilecek bağlam notu (ör. YEKDEM etkisi) */
  context?: React.ReactNode;
  /** Ek sütun: belirli bir dönemde (ör. YEKDEM yılları) her kullanım şeklinin durumu */
  period?: { label: string; values: Partial<Record<K, string>> };
}) {
  const [showAll, setShowAll] = useState(false);
  const best = result.rows[0];
  const all = [...new Set(result.rows.flatMap((r) => r.uses))] as K[];
  const name = (uses: string[]) => uses.map((u) => labels[u as K]).join(' + ');
  const alone = (u: K) => result.rows.find((r) => r.uses.length === 1 && r.uses[0] === u);
  const margOf = (u: K) => result.marginal.find((m) => m.use === u)?.npv;
  const left = all.filter((u) => !best.uses.includes(u));
  const maxAbs = Math.max(1, ...all.map((u) => Math.abs(alone(u)?.npv ?? 0)));
  const shown = showAll ? result.rows : result.rows.slice(0, 5);

  return (
    <div className="card">
      <h3>Bataryayı hangi işlerde kullanmalıyım? <small>· aynı batarya, farklı kullanım şekilleri</small></h3>
      <Verdict tone={best.npv > 0 ? 'ok' : 'bad'}>
        En iyi sonuç: <b>{name(best.uses)}</b> — NPV {usd(best.npv)}.
        {left.length > 0 && <> {left.map((u) => labels[u]).join(', ')} eklemek sonucu iyileştirmiyor.</>}{' '}
        <button className="btn-mini" onClick={() => onApply(best.uses as K[])}>Bunu uygula</button>
      </Verdict>

      <h4 className="combo-h">1 · Her kullanım şekli ne getiriyor?</h4>
      {context && <div className="ctx-note">{context}</div>}
      <div className="tablewrap">
        <table className="combo-uses">
          <thead>
            <tr><th>Kullanım şekli</th>{period && <th>{period.label}</th>}<th>Tek başına NPV</th><th style={{ width: '28%' }} />{result.marginal.length > 0 && <th>Diğerlerinin yanına eklenince</th>}</tr>
          </thead>
          <tbody>
            {all.map((u) => {
              const a = alone(u), mg = margOf(u);
              return (
                <tr key={u}>
                  <td>{labels[u]}</td>
                  {period && <td className="txt">{period.values[u] ?? '—'}</td>}
                  <td className={a && a.npv < 0 ? 'neg' : 'pos'}>{a ? usd(a.npv) : '—'}</td>
                  <td>{a && <span className={`bb-bar ${a.npv < 0 ? 'neg' : ''}`} style={{ width: `${(Math.abs(a.npv) / maxAbs) * 100}%` }} />}</td>
                  {result.marginal.length > 0 && (
                    <td className={mg !== undefined && mg > 0 ? 'pos' : 'neg'}>
                      {mg === undefined ? '—' : Math.abs(mg) < 1 ? 'Katkısı yok' : mg > 0 ? `NPV'yi ${usd(mg)} artırıyor` : `NPV'yi ${usd(-mg)} düşürüyor`}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="note" style={{ marginBottom: 14 }}>
        <b>Tek başına:</b> batarya yalnızca bu işte kullanılırsa. <b>Eklenince:</b> diğer tüm kullanım şekilleri zaten açıkken bunu da açmanın etkisi.
        Aynı batarya paylaşıldığı için katkılar toplanmaz — bir iş bataryayı kullanırken diğeri o enerjiyi kullanamaz.
      </div>

      <h4 className="combo-h">2 · Kombinasyonlar <small>· en iyiden kötüye</small></h4>
      <div className="tablewrap">
        <table className="combo-matrix">
          <thead>
            <tr>
              <th>#</th>
              {all.map((u) => <th key={u} title={labels[u]}>{SHORT[u] ?? labels[u]}</th>)}
              <th>{y1Label}</th><th>NPV</th><th>Geri ödeme</th><th />
            </tr>
          </thead>
          <tbody>
            {shown.map((r, k) => (
              <tr key={r.uses.join('+')} className={k === 0 ? 'opt-best' : ''}>
                <td>{k + 1}</td>
                {all.map((u) => <td key={u} className="cm-cell">{r.uses.includes(u) ? <span className="cm-on">✓</span> : <span className="cm-off">–</span>}</td>)}
                <td>{y1Fmt(r.y1)}</td>
                <td className={r.npv < 0 ? 'neg' : 'pos'}>{usd(r.npv)}</td>
                <td>{yearsFmt(r.payback, 1)}</td>
                <td><button className="btn-mini" onClick={() => onApply(r.uses as K[])}>Uygula</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {result.rows.length > 5 && (
        <button className="btn-link" onClick={() => setShowAll((v) => !v)}>
          {showAll ? 'Yalnızca ilk 5 kombinasyonu göster' : `Tüm ${result.rows.length} kombinasyonu göster`}
        </button>
      )}
    </div>
  );
}

// ============================ C&I ============================

export function CiUsagePanel({ inputs, onApplyUses }: { inputs: BessCiInputs; onApplyUses: (uses: string[]) => void }) {
  const r = useRunner<ComboResult>();
  return (
    <>
      <div className="card">
        <h3>Kullanım analizi <small>· aynı batarya, farklı kullanım şekilleri</small></h3>
        <p className="text-sm" style={{ color: 'var(--ink-soft)', marginBottom: 12 }}>
          Abone ve tarifenize göre anlamlı kullanım şekillerinin tüm kombinasyonları tam modelle hesaplanır. Tarife arbitrajı yalnızca üç zamanlı tarifede, zirve tıraşlama yalnızca C&amp;I abonede denenir.
        </p>
        <button className="btn-pdf" onClick={() => r.go(() => ciUseCombos(inputs))} disabled={r.busy}>{r.busy ? 'Hesaplanıyor…' : 'Analizi çalıştır'}</button>
      </div>
      {r.res && <ComboSection result={r.res} labels={CI_USE_LABELS} y1Label="1. yıl kazanç (TL)" y1Fmt={(v) => `${nf(v)} ₺`} onApply={onApplyUses} />}
    </>
  );
}

// ============================ UTILITY ============================

interface UtRes { combos: ComboResult; yekdem: YekdemRow[]; anc: AncCell[]; arb: ArbRow[]; dc: DcRow[]; growth: number }

export function UtilityUsagePanel({
  inputs, bMw, onApply,
}: {
  inputs: BessUtilityInputs; bMw: number; onApply: (patch: Partial<BessUtilityInputs>) => void;
}) {
  const [pvCapex, setPvCapex] = useState(300);
  const r = useRunner<UtRes>();
  const ykYears = inputs.regime === 'yekdem' ? Math.max(0, Math.round(inputs.yekdemYears)) : 0;
  const disc = inputs.disc / 100;
  const run = () => r.go(() => ({
    combos: utUseCombos(inputs),
    yekdem: yekdemSweep(inputs, disc),
    anc: ancSweep(inputs, bMw),
    arb: arbSweep(inputs, disc),
    dc: dcSweep(inputs, disc, pvCapex),
    growth: (1 + inputs.tlEsc / 100) / (1 + inputs.fxEsc / 100) - 1,
  }));

  return (
    <>
      <div className="card">
        <h3>Kullanım analizi <small>· kombinasyonlar, YEKDEM süresi, yan hizmet, arbitraj, DC artırma</small></h3>
        <p className="text-sm" style={{ color: 'var(--ink-soft)', marginBottom: 12 }}>
          Her senaryo tam modelle hesaplanır; yalnızca ilgili varsayım değişir, diğer tüm girdiler Kurulum sekmesindeki gibi kalır.
        </p>
        <div className="grid3">
          <NumF label="Ek panel maliyeti (DC artırma)" unit="$/kWp, panel + konstrüksiyon + DC kablo" value={pvCapex} onChange={setPvCapex} step={10} />
        </div>
        <div className="opt-run" style={{ marginTop: 12 }}>
          <button className="btn-pdf" onClick={run} disabled={r.busy}>{r.busy ? 'Hesaplanıyor…' : 'Analizi çalıştır'}</button>
        </div>
      </div>

      {r.res && (
        <>
          <ComboSection result={r.res.combos} labels={UT_USE_LABELS} y1Label="1. yıl gelir" y1Fmt={(v) => usd(v)}
            onApply={(uses) => onApply({ useClip: uses.includes('clip'), useArb: uses.includes('arb'), useAnc: uses.includes('anc'), useImb: uses.includes('imb') })}
            context={ykYears === 0
              ? <>Santral serbest piyasada: arbitraj ilk yıldan itibaren gelir getirir.</>
              : ykYears >= inputs.life
                ? <><b>YEKDEM etkisi:</b> santral tüm analiz süresince ({inputs.life} yıl) YEKDEM&apos;de. Fiyat her saat aynı ({nf(inputs.yekdemPrice)} $/MWh) olduğundan <b>arbitraj hiç gelir getirmez</b>. Kırpma kurtarma, yan hizmet ve dengesizlik YEKDEM&apos;de de çalışır.</>
                : <><b>YEKDEM etkisi:</b> ilk {ykYears} yıl santral YEKDEM&apos;de. Fiyat her saat aynı ({nf(inputs.yekdemPrice)} $/MWh) olduğundan bu yıllarda <b>arbitraj gelir getirmez</b>; arbitraj geliri {ykYears + 1}. yıldan itibaren başlar. Kırpma kurtarma, yan hizmet ve dengesizlik YEKDEM döneminde de çalışır. YEKDEM süresinin etkisi için aşağıdaki 2. bölüme bakın.</>}
            period={ykYears > 0 ? {
              label: ykYears >= inputs.life ? 'YEKDEM döneminde' : `YEKDEM yıllarında (1–${ykYears})`,
              values: { clip: 'Çalışır (YEKDEM fiyatıyla)', arb: 'Gelir yok', anc: 'Çalışır', imb: 'Çalışır' },
            } : undefined} />
          <YekdemSection rows={r.res.yekdem} inputs={inputs} growth={r.res.growth} onApply={(yy) => onApply({ regime: 'yekdem', yekdemYears: yy })} />
          <AncSection cells={r.res.anc} inputs={inputs} onApply={(mw) => onApply({ useAnc: mw > 0, ancMw: mw })} />
          <ArbSection rows={r.res.arb} inputs={inputs} />
          <DcSection rows={r.res.dc} inputs={inputs} pvCapex={pvCapex} onApply={(row) => onApply({ dcMwp: Math.round(row.dcMwp * 100) / 100, clipPct: Math.round(row.clipPct * 10) / 10 })} />
        </>
      )}
    </>
  );
}

function YekdemSection({ rows, inputs, growth, onApply }: { rows: YekdemRow[]; inputs: BessUtilityInputs; growth: number; onApply: (yy: number) => void }) {
  const bestPlant = rows.reduce((a, b) => (b.plantNpv > a.plantNpv ? b : a));
  const bestTotal = rows.reduce((a, b) => (b.totalNpv > a.totalNpv ? b : a));
  const ptfUsd = ((inputs.ptfNoon * 5 + inputs.ptfDay * 6 + inputs.ptfPeak * 5 + inputs.ptfNight * 8) / 24) / inputs.fx0;
  return (
    <div className="card">
      <h3>YEKDEM&apos;de kaç yıl kalmalı? <small>· santralin tüm geliri + batarya, bugünkü değer (USD)</small></h3>
      <Verdict>
        Santral geliri açısından en iyisi <b>{bestPlant.years === 0 ? 'hemen serbest piyasa' : `${bestPlant.years} yıl YEKDEM`}</b>; batarya dahil en iyisi <b>{bestTotal.years === 0 ? 'hemen serbest piyasa' : `${bestTotal.years} yıl YEKDEM`}</b>
        {bestTotal.years !== bestPlant.years ? ' — batarya, serbest piyasaya geçişin zamanlamasını değiştiriyor.' : ' — batarya bu kararı değiştirmiyor.'}{' '}
        <button className="btn-mini" onClick={() => onApply(bestTotal.years)}>{bestTotal.years === 0 ? 'Serbest piyasayı uygula' : `${bestTotal.years} yıl YEKDEM uygula`}</button>
      </Verdict>
      <div className="note" style={{ marginBottom: 12 }}>
        Karşılaştırma: YEKDEM {nf(inputs.yekdemPrice)} $/MWh (her saat aynı) — PTF&apos;nin bugünkü ortalaması ≈ {nf(ptfUsd)} $/MWh; TL fiyat artışı ve kur varsayımınızla PTF&apos;nin USD karşılığı yılda ≈ {pct(growth * 100)} değişiyor.
        YEKDEM&apos;den çıkmak bataryanın arbitrajını açar ama santralin tüm üretimi PTF ile satılır; karar bu yüzden tüm santral bazında verilir. Santral işletme gideri her senaryoda aynıdır.
      </div>
      <div className="tablewrap">
        <table>
          <thead><tr><th>YEKDEM süresi</th><th>Santral geliri (bataryasız)</th><th>Batarya NPV</th><th>Toplam</th><th>En iyiye göre fark</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.years} className={r.years === bestTotal.years ? 'opt-best' : ''}>
                <td>{r.years === 0 ? 'Yok (hemen PTF)' : `${r.years} yıl`}</td>
                <td>{usd(r.plantNpv)}</td><td>{usd(r.bessNpv)}</td><td>{usd(r.totalNpv)}</td><td>{signed(r.totalNpv - bestTotal.totalNpv)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AncSection({ cells, inputs, onApply }: { cells: AncCell[]; inputs: BessUtilityInputs; onApply: (mw: number) => void }) {
  const shares = [...new Set(cells.map((c) => c.mwShare))];
  const factors = [...new Set(cells.map((c) => c.priceFactor))];
  const at = (s: number, f: number) => cells.find((c) => c.mwShare === s && c.priceFactor === f)!;
  const none = at(0, 1);
  const bestAtPrice = cells.filter((c) => c.priceFactor === 1).reduce((a, b) => (b.npv > a.npv ? b : a));
  const bestAtHalf = cells.filter((c) => c.priceFactor === 0.5).reduce((a, b) => (b.npv > a.npv ? b : a));
  return (
    <div className="card">
      <h3>Yan hizmet olursa ne çıkar? <small>· ayrılan güç × kapasite bedeli, NPV (USD)</small></h3>
      <Verdict tone={bestAtPrice.npv > 0 ? 'ok' : 'bad'}>
        Yan hizmetsiz NPV {usd(none.npv)}. Girilen fiyatla ({nf(inputs.ancPrice)} TL/MW-saat) en iyi ayrım: <b>{nf(bestAtPrice.mw, 1)} MW</b> (güç payı {pct(bestAtPrice.mwShare * 100, 0)}) — NPV {usd(bestAtPrice.npv)}.
        Fiyat yarıya inerse en iyi ayrım {nf(bestAtHalf.mw, 1)} MW (güç payı {pct(bestAtHalf.mwShare * 100, 0)}) — NPV {usd(bestAtHalf.npv)}.{' '}
        <button className="btn-mini" onClick={() => onApply(bestAtPrice.mw)}>{nf(bestAtPrice.mw, 1)} MW uygula</button>
      </Verdict>
      <div className="tablewrap">
        <table>
          <thead><tr><th>Fiyat (TL/MW-saat)</th>{shares.map((s) => <th key={s}>{pct(s * 100, 0)} güç</th>)}</tr></thead>
          <tbody>
            {factors.map((f) => (
              <tr key={f}>
                <td>{nf(inputs.ancPrice * f)} <span style={{ color: 'var(--ink-soft)' }}>(×{String(f).replace('.', ',')})</span></td>
                {shares.map((s) => { const c = at(s, f); return <td key={s} className={c.npv > 0 ? 'pos' : 'neg'}>{usd(c.npv)}</td>; })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="note">Yan hizmete ayrılan güç arbitraj ve kırpma kurtarmada kullanılamaz; bu yüzden %100 her zaman en iyisi değildir. Fiyatın sürmesi belirsizdir: depolama tesisleri pazara girdikçe düşmesi beklenir.</div>
    </div>
  );
}

function ArbSection({ rows, inputs }: { rows: ArbRow[]; inputs: BessUtilityInputs }) {
  const be = breakevenSpread(rows);
  const base = rows.find((r) => r.factor === 1)!;
  const yekdemAll = inputs.regime === 'yekdem' && inputs.yekdemYears >= inputs.life;
  return (
    <div className="card">
      <h3>Arbitrajdan ne çıkar? <small>· puant–öğle PTF farkına duyarlılık</small></h3>
      <Verdict tone={be !== null && be <= base.spread ? 'ok' : 'bad'}>
        {yekdemAll
          ? 'YEKDEM süresi tüm ömrü kapsadığı için arbitraj kazancı yok; YEKDEM süresini kısaltınca sonuç değişir.'
          : be === null
            ? <>Denenen en büyük farkta bile ({nf(rows[rows.length - 1].spread)} TL/MWh, bugünkünün ×3&apos;ü) proje NPV&apos;si pozitife dönmüyor; arbitraj tek başına bu bataryayı taşımıyor.</>
            : <>Proje NPV&apos;si puant–öğle farkı ≈ <b>{nf(be)} TL/MWh</b> olduğunda sıfırı geçiyor (bugün {nf(base.spread)} TL/MWh, ×{nf(be / Math.max(1, base.spread), 2)}).</>}
      </Verdict>
      <div className="tablewrap">
        <table>
          <thead><tr><th>Fark çarpanı</th><th>Puant–öğle farkı (TL/MWh)</th><th>Puant PTF</th><th>İlk serbest piyasa yılı arbitraj</th><th>Arbitraj geliri (bugünkü değer)</th><th>Proje NPV</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.factor} className={r.factor === 1 ? 'checkpoint' : ''}>
                <td>×{String(r.factor).replace('.', ',')}</td><td>{nf(r.spread)}</td><td>{nf(r.ptfPeak)}</td><td>{usd(r.firstMerchantArb)}</td><td>{usd(r.arbNpvUsd)}</td><td>{usd(r.npv)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="note">Model bir günün fiyatlarını önceden biliyormuş gibi şarj/deşarj eder; gerçek işletmede tahmin hataları arbitraj gelirini bir miktar düşürür.</div>
    </div>
  );
}

function DcSection({ rows, inputs, pvCapex, onApply }: { rows: DcRow[]; inputs: BessUtilityInputs; pvCapex: number; onApply: (r: DcRow) => void }) {
  const bestWith = rows.reduce((a, b) => (b.deltaWithBess > a.deltaWithBess ? b : a));
  const bestNo = rows.reduce((a, b) => (b.deltaNoBess > a.deltaNoBess ? b : a));
  return (
    <div className="card">
      <h3>DC kapasiteyi artırırsam? <small>· AC / lisans gücü sabit, kırpma artar</small></h3>
      <Verdict tone={bestWith.deltaWithBess > 0 ? 'ok' : 'bad'}>
        Bataryasız en iyisi DC&apos;yi <b>{pct(bestNo.addPct, 0)}</b> artırmak ({signed(bestNo.deltaNoBess)}); bataryalı en iyisi <b>{pct(bestWith.addPct, 0)}</b> ({signed(bestWith.deltaWithBess)}, DC/AC {nf(bestWith.ratio, 2)}).
        {bestWith.addPct > bestNo.addPct ? ' Batarya kırpılan enerjiyi kurtardığı için daha fazla DC eklemeyi kârlı kılıyor.' : ''}
        {bestWith === rows[rows.length - 1] ? ' Bu, denenen en büyük artış; daha fazlası da kârlı görünebilir — ancak mevzuattaki mekanik güç sınırını, inverter DC giriş sınırlarını ve kırpma tahmininin kabalığını göz önünde bulundurun.' : ''}{' '}
        {bestWith.addPct > 0 && <button className="btn-mini" onClick={() => onApply(bestWith)}>DC {nf(bestWith.dcMwp, 1)} MWp uygula</button>}
      </Verdict>
      <div className="tablewrap">
        <table>
          <thead><tr><th>DC artışı</th><th>DC (MWp)</th><th>DC/AC</th><th>Kırpma</th><th>Ek panel yatırımı</th><th>Batarya NPV</th><th>Fark — bataryasız</th><th>Fark — bataryalı</th><th /></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.addPct} className={r === bestWith ? 'opt-best' : r.addPct === 0 ? 'checkpoint' : ''}>
                <td>{r.addPct === 0 ? 'Mevcut' : `+%${r.addPct}`}</td><td>{nf(r.dcMwp, 1)}</td><td>{nf(r.ratio, 2)}</td><td>{pct(r.clipPct)}</td>
                <td>{usd(r.addCapex)}</td><td>{usd(r.bessNpv)}</td><td>{signed(r.deltaNoBess)}</td><td>{signed(r.deltaWithBess)}</td>
                <td>{r.addPct > 0 && <button className="btn-mini" onClick={() => onApply(r)}>Uygula</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="note">
        Kırpma oranı: girilen {pct(inputs.clipPct, 1)} + açık / parçalı bulutlu / kapalı gün tipleriyle öngörülen artış (kaba tahmin; kesin değer için PVsyst). Fark sütunları, mevcut duruma göre bugünkü değer farkıdır ve ek panel yatırımı ({nf(pvCapex)} $/kWp) düşülmüştür; ek panelin bakım gideri dahil değildir.
        Lisanslı santralde DC (mekanik) güç artışı lisans ve ilgili mevzuat sınırlarına tabidir — uygulamadan önce kontrol edin.
      </div>
    </div>
  );
}

// ============================ SAĞLIK ŞARTI STRATEJİSİ ============================

const stratName = (x: StratRow) =>
  x.augYear === 0 ? (x.oversizePct > 0 ? 'Baştan fazla kur, ekleme yapma' : 'Hiç ekleme yapma') : `${x.augYear}. yılda modül ekle`;

/** Ekleme yılına göre en iyiye göre NPV farkı — hangi yıl en iyi ve ne kadar, bir bakışta */
function StratChart({ rows, best, capText }: { rows: StratRow[]; best: StratRow; capText: (x: StratRow) => string }) {
  const sorted = [...rows].sort((a, b) => a.augYear - b.augYear);
  const W = 760, H = 220, padL = 64, padR = 10, padT = 12, padB = 34;
  // Mutlak NPV'ler birbirine çok yakın olabildiği için en iyiye göre fark çizilir (en iyi = 0)
  const vals = sorted.map((r) => r.npv - best.npv);
  const mn = Math.min(-1, ...vals), mx = 0;
  const y = (v: number) => padT + ((H - padT - padB) * (mx - v)) / Math.max(1e-9, mx - mn);
  const bw = (W - padL - padR) / sorted.length;
  const ax = (v: number) => (Math.abs(v) >= 1e6 ? `${nf(v / 1e6, 1)}M$` : Math.abs(v) >= 1e4 ? `${nf(v / 1e3, 0)}k$` : `${nf(v / 1e3, 1)}k$`);
  const cols: HoverCol[] = sorted.map((r, k) => ({
    x0: padL + k * bw, x1: padL + (k + 1) * bw,
    title: stratName(r) + (r === best ? ' · en iyi' : ''),
    rows: [
      { label: 'Bugün kurulacak', value: capText(r) },
      { label: 'Ekleme harcaması', value: r.augUsd > 0 ? usd(r.augUsd) : '—' },
      { label: 'NPV', value: usd(r.npv), strong: true },
      { label: 'En iyiye göre', value: r === best ? '—' : signed(r.npv - best.npv) },
    ],
  }));
  return (
    <HoverChart width={W} height={H} cols={cols} top={padT} bottom={padB}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Ekleme yılına göre NPV">
        {[0, 0.5, 1].map((f) => {
          const v = mn + (mx - mn) * f;
          return (
            <g key={f}>
              <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke="#E2E7EF" />
              <text x={padL - 6} y={y(v) + 3} textAnchor="end">{ax(v)}</text>
            </g>
          );
        })}
        <line x1={padL} x2={W - padR} y1={y(0)} y2={y(0)} stroke="#5A6478" />
        {sorted.map((r, k) => {
          const x = padL + k * bw;
          const d = r.npv - best.npv;
          return (
            <g key={r.augYear}>
              {r === best
                ? <><circle cx={x + bw / 2} cy={y(0) + 9} r={5} fill="#3D8B5F" /><text x={x + bw / 2} y={y(0) + 26} textAnchor="middle" style={{ fill: '#3D8B5F', fontWeight: 700 }}>en iyi</text></>
                : <rect x={x + bw * 0.18} width={bw * 0.64} y={y(0)} height={Math.max(1, y(d) - y(0))} fill="#C9D3E4" rx="2" />}
              <text x={x + bw / 2} y={H - 18} textAnchor="middle">{r.augYear === 0 ? 'Yok' : r.augYear}</text>
            </g>
          );
        })}
        <text x={padL + (W - padL - padR) / 2} y={H - 3} textAnchor="middle">modül ekleme yılı</text>
      </svg>
    </HoverChart>
  );
}

export function SohStrategyPanel({
  run, onApply, sohText, capUnit, baseCap,
}: {
  run: () => StratRow[];
  onApply: (r: StratRow) => void;
  sohText: string;
  capUnit: string;
  /** Beyan edilen kapasite (kapasite fazlası buna eklenir) */
  baseCap: number;
}) {
  const r = useRunner<StratRow[]>();
  const [showAll, setShowAll] = useState(false);
  const rows = r.res;
  const ok = rows?.filter((x) => x.sohOk) ?? [];
  const best = ok[0];
  const capText = (x: StratRow) =>
    `${nf(baseCap * (1 + x.oversizePct / 100), baseCap < 100 ? 2 : 0)} ${capUnit}${x.oversizePct > 0 ? ` (%${nf(x.oversizePct, 1)} fazla)` : ''}`;
  const pick = (y: number) => ok.find((x) => x.augYear === y);
  const named = [pick(0), pick(5), pick(10)].filter((x): x is StratRow => !!x);
  const zero = pick(0);
  const spread = best ? best.npv - Math.min(...ok.map((x) => x.npv)) : 0;
  const tiny = best ? 0.005 * best.capex : 0;
  // Tablo: öne çıkan seçenekler + en iyi birkaç yıl; istenirse tümü (yıl sırasıyla)
  const table = showAll
    ? [...ok].sort((a, b) => a.augYear - b.augYear)
    : [...new Set([...(best ? [best] : []), ...named, ...ok.slice(0, 3)])].sort((a, b) => a.augYear - b.augYear);

  return (
    <>
      <div className="card">
        <h3>Sağlık şartını en ucuza nasıl sağlarım? <small>· {sohText}</small></h3>
        <p className="text-sm" style={{ color: 'var(--ink-soft)', marginBottom: 8 }}>
          Batarya her yıl biraz kapasite kaybeder. Şartı sağlamanın iki yolu var:
        </p>
        <ul className="strat-ways">
          <li><b>Baştan fazla kurmak:</b> bugün beyan edilenden biraz büyük batarya kurulur; kayıptan sonra bile şart sağlanır. Ekleme gerekmez ama fazla kapasitenin parası bugün ödenir.</li>
          <li><b>Sonradan modül eklemek:</b> belirli bir yılda o güne kadar kaybolan kapasite kadar modül eklenir. Para ileride ödenir (bugünkü değeri düşüktür); ekleme yılından önceki şartı sağlamak için yine küçük bir fazla gerekebilir.</li>
        </ul>
        <p className="text-sm" style={{ color: 'var(--ink-soft)', margin: '8px 0 12px' }}>
          Her seçenek için şartı tam sağlayan en küçük kurulum bulunur; seçenekler arasındaki tek fark, paranın ne kadar ve ne zaman ödendiğidir.
        </p>
        <button className="btn-pdf" onClick={() => r.go(run)} disabled={r.busy}>{r.busy ? 'Hesaplanıyor…' : 'Seçenekleri karşılaştır'}</button>
      </div>

      {rows && !best && <Verdict tone="bad">Hiçbir seçenek şartı sağlayamadı — yıllık kapasite kaybını ve şart değerlerini kontrol edin.</Verdict>}

      {rows && best && (
        <>
          <Verdict tone={best.npv > 0 ? 'ok' : 'bad'}>
            {zero && zero.oversizePct === 0 && <>Bu kayıp oranıyla şart, ekleme ve fazla kapasite olmadan zaten sağlanıyor; aşağıdaki eklemeler şart için değil, kaybolan kapasiteyi geri kazanıp gelir artırmak içindir. </>}
            En iyi yol: <b>{stratName(best)}</b> — bugün <b>{capText(best)}</b> kurulur{best.augYear > 0 ? <>, {best.augYear}. yılda {usd(best.augUsd)} harcanıp modül eklenir</> : ''}. NPV {usd(best.npv)}.{' '}
            {spread < tiny && <> Seçenekler arasındaki fark çok küçük (en fazla {usd(spread)}, yatırımın {pct((spread / Math.max(1, best.capex)) * 100, 2)}&apos;si) — bu karar projenin sonucunu belirlemiyor.</>}{' '}
            <button className="btn-mini" onClick={() => onApply(best)}>Bunu uygula</button>
          </Verdict>

          {named.length > 0 && (
            <div className="kpis">
              {named.map((n) => (
                <div key={n.augYear} className={`kpi ${n === best ? 'good' : ''}`}>
                  <div className="kl">{stratName(n)}</div>
                  <div className="kv">{n === best ? 'En iyi' : signed(n.npv - best.npv)}</div>
                  <div className="kh">bugün {capText(n)}{n.augUsd > 0 ? ` · ekleme ${usd(n.augUsd)}` : ''} · NPV {usd(n.npv)}</div>
                </div>
              ))}
            </div>
          )}

          <div className="card bess-chart">
            <h3>Her seçenek en iyiden ne kadar geride? <small>· NPV farkı, çubuk uzadıkça kötü; üzerine gelince ayrıntı</small></h3>
            <StratChart rows={ok} best={best} capText={capText} />
          </div>

          <div className="card">
            <h3>Seçeneklerin karşılaştırması</h3>
            <div className="tablewrap">
              <table>
                <thead><tr><th>Seçenek</th><th>Bugün kurulacak kapasite</th><th>Bugünkü yatırım</th><th>İleride ekleme</th><th>NPV</th><th>En iyiye göre</th><th /></tr></thead>
                <tbody>
                  {table.map((x) => (
                    <tr key={x.augYear} className={x === best ? 'opt-best' : ''}>
                      <td style={{ whiteSpace: 'normal' }}>{stratName(x)}</td>
                      <td>{capText(x)}</td>
                      <td>{usd(x.capex)}</td>
                      <td>{x.augUsd > 0 ? `${x.augYear}. yıl · ${usd(x.augUsd)}` : '—'}</td>
                      <td>{usd(x.npv)}</td>
                      <td>{x === best ? 'En iyi' : signed(x.npv - best.npv)}</td>
                      <td><button className="btn-mini" onClick={() => onApply(x)}>Uygula</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(showAll || ok.length > table.length) && (
              <button className="btn-link" onClick={() => setShowAll((v) => !v)}>
                {showAll ? 'Yalnızca öne çıkanları göster' : `Tüm ${ok.length} seçeneği göster`}
              </button>
            )}
            <div className="note">
              Ekleme harcaması o yılın parasıyla yazılmıştır; NPV ise her şeyi bugünkü değere çevirerek karşılaştırır — bu yüzden geç yapılan ekleme NPV&apos;yi daha az etkiler.
              Eklemenin sabit maliyeti (mobilizasyon, devreye alma) modelde yoktur; çok erken (2.–3. yıl) eklemeler bu yüzden olduğundan iyi görünebilir.
            </div>
          </div>
        </>
      )}
    </>
  );
}
