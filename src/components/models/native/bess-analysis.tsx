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

function ComboSection<K extends string>({
  result, labels, y1Label, y1Fmt, onApply,
}: {
  result: ComboResult; labels: Record<K, string>; y1Label: string; y1Fmt: (v: number) => string;
  onApply: (uses: K[]) => void;
}) {
  const best = result.rows[0];
  const name = (uses: string[]) => uses.map((u) => labels[u as K]).join(' + ');
  const marg = [...result.marginal].sort((a, b) => b.npv - a.npv);
  return (
    <div className="card">
      <h3>Kullanım kombinasyonları <small>· hangi kullanım şekilleri birlikte en iyi sonucu veriyor?</small></h3>
      <Verdict tone={best.npv > 0 ? 'ok' : 'bad'}>
        En iyi kombinasyon: <b>{name(best.uses)}</b> — NPV {usd(best.npv)}, IRR {pct(best.irr * 100)}.{' '}
        <button className="btn-mini" onClick={() => onApply(best.uses as K[])}>Bu kombinasyonu uygula</button>
      </Verdict>
      {marg.length > 0 && (
        <div className="note" style={{ marginBottom: 12 }}>
          <b>Marjinal katkı</b> (hepsi açıkken bir kullanım şekli kapatılırsa NPV ne kadar düşer):{' '}
          {marg.map((m) => `${labels[m.use as K]} ${signed(m.npv)}`).join(' · ')}
        </div>
      )}
      <div className="tablewrap">
        <table>
          <thead><tr><th>#</th><th>Kombinasyon</th><th>{y1Label}</th><th>NPV</th><th>IRR</th><th>Geri ödeme</th><th /></tr></thead>
          <tbody>
            {result.rows.map((r, k) => (
              <tr key={r.uses.join('+')} className={k === 0 ? 'opt-best' : ''}>
                <td>{k + 1}</td><td style={{ whiteSpace: 'normal' }}>{name(r.uses)}</td><td>{y1Fmt(r.y1)}</td><td>{usd(r.npv)}</td><td>{pct(r.irr * 100)}</td><td>{yearsFmt(r.payback, 1)}</td>
                <td><button className="btn-mini" onClick={() => onApply(r.uses as K[])}>Uygula</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
            onApply={(uses) => onApply({ useClip: uses.includes('clip'), useArb: uses.includes('arb'), useAnc: uses.includes('anc'), useImb: uses.includes('imb') })} />
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
        Yan hizmetsiz NPV {usd(none.npv)}. Girilen fiyatla ({nf(inputs.ancPrice)} TL/MW-saat) en iyi ayrım: <b>{nf(bestAtPrice.mw, 1)} MW</b> (güç payı %{nf(bestAtPrice.mwShare * 100)}) — NPV {usd(bestAtPrice.npv)}.
        Fiyat yarıya inerse en iyi ayrım {nf(bestAtHalf.mw, 1)} MW (güç payı %{nf(bestAtHalf.mwShare * 100)}) — NPV {usd(bestAtHalf.npv)}.{' '}
        <button className="btn-mini" onClick={() => onApply(bestAtPrice.mw)}>{nf(bestAtPrice.mw, 1)} MW uygula</button>
      </Verdict>
      <div className="tablewrap">
        <table>
          <thead><tr><th>Fiyat (TL/MW-saat)</th>{shares.map((s) => <th key={s}>%{nf(s * 100)} güç</th>)}</tr></thead>
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
        Bataryasız en iyisi DC&apos;yi <b>%{bestNo.addPct}</b> artırmak ({signed(bestNo.deltaNoBess)}); bataryalı en iyisi <b>%{bestWith.addPct}</b> ({signed(bestWith.deltaWithBess)}, DC/AC {nf(bestWith.ratio, 2)}).
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
        Kırpma oranı: girilen %{nf(inputs.clipPct, 1)} + açık / parçalı bulutlu / kapalı gün tipleriyle öngörülen artış (kaba tahmin; kesin değer için PVsyst). Fark sütunları, mevcut duruma göre bugünkü değer farkıdır ve ek panel yatırımı ({nf(pvCapex)} $/kWp) düşülmüştür; ek panelin bakım gideri dahil değildir.
        Lisanslı santralde DC (mekanik) güç artışı lisans ve ilgili mevzuat sınırlarına tabidir — uygulamadan önce kontrol edin.
      </div>
    </div>
  );
}

// ============================ SAĞLIK ŞARTI STRATEJİSİ ============================

export function SohStrategyPanel({
  run, onApply, sohText, capUnit,
}: {
  run: () => StratRow[];
  onApply: (r: StratRow) => void;
  sohText: string;
  capUnit: string;
}) {
  const r = useRunner<StratRow[]>();
  const rows = r.res;
  const best = rows?.find((x) => x.sohOk);
  const named = rows ? [rows.find((x) => x.augYear === 0), rows.find((x) => x.augYear === 5), rows.find((x) => x.augYear === 10)].filter(Boolean) as StratRow[] : [];
  return (
    <>
      <div className="card">
        <h3>Sağlık şartını en iyi nasıl sağlarım? <small>· {sohText}</small></h3>
        <p className="text-sm" style={{ color: 'var(--ink-soft)', marginBottom: 12 }}>
          Şartı karşılamanın yolları karşılaştırılır: baştan fazla kapasite kurmak ({capUnit} fazlası, hiç ekleme yapmadan) ya da belirli bir yılda kaybolan kapasite kadar modül eklemek. Her ekleme yılı için şartı sağlayan en küçük kapasite fazlası bulunur ve tam modelle hesaplanır.
        </p>
        <button className="btn-pdf" onClick={() => r.go(run)} disabled={r.busy}>{r.busy ? 'Hesaplanıyor…' : 'Stratejileri karşılaştır'}</button>
      </div>

      {rows && best && (
        <>
          <Verdict tone={best.npv > 0 ? 'ok' : 'bad'}>
            Şartı sağlayan en iyi strateji: <b>{best.label}</b> — yatırım {usd(best.capex)}{best.augUsd > 0 ? `, ekleme ${usd(best.augUsd)}` : ''}, NPV {usd(best.npv)}.{' '}
            <button className="btn-mini" onClick={() => onApply(best)}>Bu stratejiyi uygula</button>
          </Verdict>
          {named.length > 0 && (
            <div className="kpis">
              {named.map((n) => (
                <div key={n.augYear} className={`kpi ${n === best ? 'good' : ''}`}>
                  <div className="kl">{n.augYear === 0 ? 'Baştan fazla kapasite' : `${n.augYear}. yılda ekleme`}</div>
                  <div className="kv">{usd(n.npv)}</div>
                  <div className="kh">fazla %{nf(n.oversizePct, 1)} · yatırım {usd(n.capex)}{n.augUsd > 0 ? ` · ekleme ${usd(n.augUsd)}` : ''} · en iyiye göre {signed(n.npv - best.npv)}</div>
                </div>
              ))}
            </div>
          )}
          <div className="card">
            <h3>Tüm stratejiler <small>· NPV&apos;ye göre sıralı</small></h3>
            <div className="tablewrap">
              <table>
                <thead><tr><th>#</th><th>Strateji</th><th>Kapasite fazlası</th><th>Başlangıç yatırımı</th><th>Ekleme harcaması</th><th>NPV</th><th>IRR</th><th>Şart</th><th /></tr></thead>
                <tbody>
                  {rows.map((x, k) => (
                    <tr key={x.augYear} className={x === best ? 'opt-best' : ''}>
                      <td>{k + 1}</td><td style={{ whiteSpace: 'normal' }}>{x.label}</td><td>%{nf(x.oversizePct, 1)}</td><td>{usd(x.capex)}</td><td>{x.augUsd > 0 ? usd(x.augUsd) : '—'}</td>
                      <td>{usd(x.npv)}</td><td>{pct(x.irr * 100)}</td><td>{x.sohOk ? 'Uygun' : 'Değil'}</td>
                      <td><button className="btn-mini" onClick={() => onApply(x)}>Uygula</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="note">Kapasite ekleme: yalnızca o yıla kadar kaybolan kapasite kadar modül eklenir (Kurulum → Adım 4&apos;teki ekleme birim maliyetiyle). Erken ve küçük eklemelerin sabit maliyeti (mobilizasyon, devreye alma) modelde yoktur; çok erken ekleme yılları bu yüzden olduğundan iyi görünebilir.</div>
          </div>
        </>
      )}
    </>
  );
}
