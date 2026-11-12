'use client';
import { numLocale } from '@/lib/i18n';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { computeCi, ciDefaultDayW, ciDayCons, type CiInputs } from '@/lib/models/ci/engine';
import { downloadOsosTemplate, parseOsosFile } from '@/lib/models/ci/osos';
import { defaultCiInputs } from '@/lib/models/ci/defaults';
import {
  MONTHS, PROFILE_LABELS, WE_RATIO, shapesForProfile, monthlyForSeason,
  type ProfileKey, type SeasonKey,
} from '@/lib/models/ci/presets';
import { Tipbox, Tip, NumF, TxtF, SelF, ChkF, Modal, PrintReport } from '@/components/models/native/mdl-kit';
import * as R from '@/components/models/native/ci-render';
import { nf, usd, pct } from '@/lib/models/fmt';
import type { ProjectSummary } from '@/lib/models/types';
import { useProjectSave } from '@/components/models/native/use-project-save';
import { TabActions } from '@/components/models/native/bess-panels';
import { StepRail } from '@/components/models/native/step-rail';
import { NetSankey } from '@/components/models/native/net-sankey';
import { DragBars } from '@/components/models/native/drag-bars';

// ---- % grid yardımcıları (HTML buildPctGrid / rescaleZones portu) ----
function setPctCell(arr: number[], k: number, raw: number): number[] {
  const n = arr.length, next = arr.slice();
  if (k === n - 1) return next;
  let v = Number.isFinite(raw) && raw > 0 ? raw : 0;
  let others = 0;
  for (let j = 0; j < n; j++) if (j !== k && j !== n - 1) others += next[j] || 0;
  if (others + v > 100) v = Math.round((100 - others) * 10) / 10;
  next[k] = v;
  next[n - 1] = Math.round((100 - others - v) * 10) / 10;
  return next;
}
const ZONE_COL = { g: '#E2B33C', p: '#C0392B', n: '#1f4e8c' } as const;
const DOW = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
/** Ay içi gün dağılımı ön ayarları (ayın 1'i pazartesi varsayımıyla). Ağırlıklar % 'ye çevrilir, son gün kalan. */
const DAY_PRESETS: { key: string; label: string; w: (d: number, n: number, weR: number) => number }[] = [
  { key: 'esit', label: 'Her gün eşit', w: () => 1 },
  { key: 'model', label: 'Hafta sonu, hafta sonu oranıyla', w: (d, _n, weR) => (d % 7 >= 5 ? weR / 100 : 1) },
  { key: 'hs50', label: 'Hafta sonu yarı yarıya', w: (d) => (d % 7 >= 5 ? 0.5 : 1) },
  { key: 'hskapali', label: 'Hafta sonu kapalı (%5)', w: (d) => (d % 7 >= 5 ? 0.05 : 1) },
  { key: 'pazar', label: 'Yalnız pazar kapalı (%5)', w: (d) => (d % 7 === 6 ? 0.05 : 1) },
  { key: 'aybasi', label: 'Ay başı yoğun → ay sonu düşük', w: (d, n) => 1.3 - (0.6 * d) / Math.max(1, n - 1) },
  { key: 'aysonu', label: 'Ay başı düşük → ay sonu yoğun', w: (d, n) => 0.7 + (0.6 * d) / Math.max(1, n - 1) },
  { key: 'ayortasi', label: 'Ay ortası yoğun', w: (d, n) => 0.7 + 0.6 * (1 - Math.abs((2 * d) / Math.max(1, n - 1) - 1)) },
];
function dayPreset(key: string, mi: number, weR: number): number[] {
  const p = DAY_PRESETS.find((x) => x.key === key) ?? DAY_PRESETS[0];
  const n = DAYS_IN[mi], w = Array.from({ length: n }, (_, d) => Math.max(0, p.w(d, n, weR)));
  const s = w.reduce((a, b) => a + b, 0) || 1;
  const out: number[] = []; let acc = 0;
  for (let d = 0; d < n - 1; d++) { const v = Math.round((w[d] / s) * 1000) / 10; out.push(v); acc += v; }
  out.push(Math.round((100 - acc) * 10) / 10);
  return out;
}
const DAYS_IN = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MONTHS_LONG = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const zoneOf = (h: number): 'g' | 'p' | 'n' => (h >= 6 && h <= 16 ? 'g' : h >= 17 && h <= 21 ? 'p' : 'n');
function zoneSums(arr: number[]): { g: number; p: number; n: number } {
  const s = { g: 0, p: 0, n: 0 };
  arr.forEach((v, h) => { s[zoneOf(h)] += v; });
  return s;
}
function rescaleZone(arr: number[], g0: number, p0: number): number[] {
  let g = g0 < 0 ? 0 : g0, p = p0 < 0 ? 0 : p0;
  if (g + p > 100) { p = Math.round((100 - g) * 10) / 10; if (p < 0) { p = 0; g = 100; } }
  const nn = Math.round((100 - g - p) * 10) / 10;
  const cur = zoneSums(arr), tgt: Record<string, number> = { g, p, n: nn }, cnt: Record<string, number> = { g: 11, p: 5, n: 8 };
  return arr.map((v, h) => { const z = zoneOf(h); return cur[z] > 1e-9 ? v * tgt[z] / cur[z] : tgt[z] / cnt[z]; });
}
const r1 = (x: number) => Math.round(x * 10) / 10;

// ---- düzenlenebilir yüzde grid bileşeni (hücreler doğrudan .hgrid altında) ----
function PctGrid({ labels, values, onChange, cols }: { labels: string[]; values: number[]; onChange: (a: number[]) => void; cols?: number }) {
  const n = values.length, per = cols ?? (n === 24 ? 12 : n);
  const cells: React.ReactNode[] = [];
  for (let off = 0; off < n; off += per) {
    for (let i = off; i < off + per; i++) cells.push(<div key={'l' + i} className="hlbl">{labels[i]}</div>);
    for (let i = off; i < off + per; i++) {
      const last = i === n - 1;
      cells.push(<input key={'i' + i} type="number" min={0} max={100} step={0.5}
        value={r1(values[i])} readOnly={last} className={last ? 'rem' : undefined}
        title={last ? 'Otomatik kalan: 100 − diğer hücreler' : undefined}
        onChange={last ? undefined : (e) => onChange(setPctCell(values, i, parseFloat(e.target.value)))} />);
    }
  }
  return <div className="hgrid" style={{ gridTemplateColumns: `repeat(${per}, minmax(0, 1fr))` }}>{cells}</div>;
}

const HLBL = Array.from({ length: 24 }, (_, h) => h + ':00');

function Kpis({ list }: { list: R.CiKpi[] }) {
  return (
    <div className="kpis">
      {list.map((k, i) => (
        <div key={i} className={`kpi ${k.cls}`}>
          <div className="kl">{k.label}</div><div className="kv">{k.val}</div><div className="kh">{k.hint}</div>
        </div>
      ))}
    </div>
  );
}
function Card({ title, small, children }: { title?: string; small?: string; children: React.ReactNode }) {
  return <div className="card">{title && <h3>{title} {small && <small>{small}</small>}</h3>}{children}</div>;
}
function Step({ no, title, why, children }: { no: string; title: string; why?: string; children: React.ReactNode }) {
  return (
    <div className="step">
      <div className="step-head"><span className="step-no">{no}</span><h2>{title}</h2>{why && <span className="why">{why}</span>}</div>
      <div className="step-body single">{children}</div>
    </div>
  );
}
function Html({ html, className }: { html: string; className?: string }) { return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />; }

export function CiModel({ projectId, initialInputs }: { projectId?: string; initialInputs?: CiInputs }) {
  // Eski kayıtlarda weSplit yok: o projeler hafta içi/sonu ayrımıyla kaydedildi, aynen korunur
  const [inputs, setInputs] = useState<CiInputs>(() => ({ ...defaultCiInputs(), ...(initialInputs ?? {}), ...(initialInputs && initialInputs.weSplit === undefined ? { weSplit: true } : {}) }));
  const [tab, setTab] = useState<'fiz' | 'net' | 'hours' | 'bill' | 'cmp' | 'sum'>('fiz');
  const [nv, setNv] = useState<R.NetChartState>({ mi: 5, view: 'd', wd: true, we: true });
  // Enerji akışı (Sankey) kendi filtresiyle çalışır — mahsuplaşma grafiğinden bağımsız
  const [fv, setFv] = useState<R.NetChartState>({ mi: 'y', view: 'm', wd: true, we: true });
  const [hv, setHv] = useState<{ mi: number | 'y'; dt: 'wd' | 'we' }>({ mi: 5, dt: 'wd' });
  const [modal, setModal] = useState<{ title: string; body: string } | null>(null);
  const [printing, setPrinting] = useState(false);

  const set = <K extends keyof CiInputs>(k: K, v: CiInputs[K]) => setInputs((p) => ({ ...p, [k]: v }));
  const m = useMemo(() => computeCi(inputs), [inputs]);
  const mesken = inputs.abone === 'mesken';
  /** Hafta içi / hafta sonu ayrı profil mi? Değilse hafta sonu filtreleri gizlenir, her gün aynı profil. */
  const split = inputs.weSplit !== false;
  // Ayrım yoksa: gün görünümünde tek temsili gün (hafta içi profili = her gün), ay/yıl toplamında tüm günler
  const eff = (v: R.NetChartState): R.NetChartState => (split ? v : { ...v, wd: true, we: !(v.mi !== 'y' && v.view === 'd') });
  const nvE = eff(nv), fvE = eff(fv);
  const hvDt: 'wd' | 'we' = split ? hv.dt : 'wd';

  const onProfile = (key: string) => {
    const sh = shapesForProfile(key as ProfileKey);
    setInputs((p) => ({ ...p, profileId: key, wd: sh.wd, we: sh.we, weRatio: WE_RATIO[key as ProfileKey] }));
  };
  const onSeason = (key: string) => setInputs((p) => ({ ...p, season: key, monthly: monthlyForSeason(key as SeasonKey) }));
  const onTarpre = (key: string) => { if (key === 'tic') setInputs((p) => ({ ...p, pBuy: 4.28, pSell: 3.95 })); else setInputs((p) => ({ ...p, pBuy: 3.10, pSell: 2.85 })); };
  const zone = { wd: zoneSums(inputs.wd), we: zoneSums(inputs.we) };
  const editZone = (dt: 'wd' | 'we', which: 'g' | 'p', val: number) => {
    const cur = zoneSums(inputs[dt]);
    const g = which === 'g' ? val : r1(cur.g), p = which === 'p' ? val : r1(cur.p);
    set(dt, rescaleZone(inputs[dt], g, p));
  };

  // Ay içi gün dağılımı: seçili ay (dm) — elle girilmişse dayW[dm], değilse varsayılan
  const [dm, setDm] = useState(5);
  const customDay = !!inputs.dayW?.[dm];
  const dayVals = useMemo(() => inputs.dayW?.[dm] ?? ciDefaultDayW(inputs, dm), [inputs, dm]);
  const setDay = (d: number, v: number) => setInputs((p) => {
    const cur = p.dayW?.[dm] ?? ciDefaultDayW(p, dm);
    const all = Array.from({ length: 12 }, (_, k) => p.dayW?.[k] ?? null);
    all[dm] = setPctCell(cur, d, v);
    return { ...p, dayW: all };
  });
  const resetDays = () => setInputs((p) => {
    const all = Array.from({ length: 12 }, (_, k) => p.dayW?.[k] ?? null);
    all[dm] = null;
    return { ...p, dayW: all.some(Boolean) ? all : undefined };
  });
  // Gün içi saatler: hangi gün tipi düzenleniyor (ayrım yoksa her zaman hafta içi = her gün)
  const [hd, setHd] = useState<'wd' | 'we'>('wd');
  const hdE: 'wd' | 'we' = split ? hd : 'wd';
  // Saat grafiği kWh: seçili ayın (dm) temsili günü
  const hourKwh = useMemo(() => ciDayCons(inputs, dm, hdE), [inputs, dm, hdE]);

  const chip = (active: boolean, label: string, onClick: () => void, key?: string | number) => (
    <button key={key} className={active ? 'active' : ''} onClick={onClick}>{label}</button>
  );
  // Grafik değer etiketleri (tüm dağılım grafikleri için ortak)
  const [lbl, setLbl] = useState({ pct: false, kwh: false });
  const kwh = (v: number) => `${nf(v, v < 100 ? 1 : 0)} kWh`;
  const lblToggles = (
    <div className="chips mini lbl-toggles">
      <span className="lbl-t">Çubuklarda göster:</span>
      {chip(lbl.pct, '% değer', () => setLbl((s) => ({ ...s, pct: !s.pct })))}
      {chip(lbl.kwh, 'kWh', () => setLbl((s) => ({ ...s, kwh: !s.kwh })))}
    </div>
  );

  // Ay içi gün dağılımı ön ayarları — seçilen aylara uygulanır
  const [dp, setDp] = useState<{ key: string; target: 'this' | 'all' | 'pick'; months: number[] }>({ key: 'esit', target: 'this', months: [] });
  const applyDayPreset = () => {
    const months = dp.target === 'this' ? [dm] : dp.target === 'all' ? [...Array(12).keys()] : dp.months;
    setInputs((p) => {
      const all = Array.from({ length: 12 }, (_, k) => p.dayW?.[k] ?? null);
      months.forEach((mi) => { all[mi] = dayPreset(dp.key, mi, p.weSplit === false ? 100 : p.weRatio); });
      return { ...p, dayW: all.some(Boolean) ? all : undefined };
    });
  };

  // Bu ayın gün dağılımını seçilen aylara kopyala (gün sırasıyla; farklı gün sayısında %100'e ölçeklenir)
  const [copy, setCopy] = useState<number[] | null>(null);
  useEffect(() => { setCopy(null); }, [dm]);
  const applyCopy = () => {
    if (!copy?.length) return;
    const src = dayVals;
    setInputs((p) => {
      const all = Array.from({ length: 12 }, (_, k) => p.dayW?.[k] ?? null);
      copy.forEach((mi) => {
        const n = DAYS_IN[mi];
        const w = Array.from({ length: n }, (_, d) => (d < src.length ? src[d] : src[src.length - 1]));
        const s = w.reduce((a, b) => a + b, 0) || 1;
        const out: number[] = []; let acc = 0;
        for (let d = 0; d < n - 1; d++) { const v = Math.round((w[d] / s) * 1000) / 10; out.push(v); acc += v; }
        out.push(Math.round((100 - acc) * 10) / 10);
        all[mi] = out;
      });
      return { ...p, dayW: all };
    });
    setCopy(null);
  };

  // OSOS Excel yükleme
  const [ososMsg, setOsosMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const onOsos = async (f: File) => {
    setOsosMsg({ ok: true, text: 'Okunuyor…' });
    try {
      const r = await parseOsosFile(f);
      setInputs((p) => ({ ...p, ...r.patch, ...(r.level !== 'saatlik' && r.patch.monthly ? { dayW: undefined } : {}) }));
      setOsosMsg({ ok: true, text: `✓ ${f.name}: ${r.summary}` });
    } catch (e) {
      setOsosMsg({ ok: false, text: e instanceof Error ? e.message : 'Dosya okunamadı.' });
    }
  };
  const net = useMemo(() => R.netChart(inputs, nvE), [inputs, nv, split]);
  const flows = useMemo(() => R.netFlows(inputs, fvE, split), [inputs, fv, split]);

  function downloadCsv() {
    const blob = new Blob(['﻿' + R.csvAllYear(inputs)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'saatlik-mahsuplasma-' + (inputs.pname || 'proje').replace(/[^\wğüşöçıİĞÜŞÖÇ-]+/g, '-') + '.csv';
    a.click(); URL.revokeObjectURL(a.href);
  }

  const buildSummary = useCallback((): ProjectSummary => {
    const y1 = m.years[0];
    const selfC = y1.s.prod > 0 ? (y1.s.mah + y1.s.shift) / y1.s.prod : 0;
    return { kind: 'ci', capexUsd: m.capex, npvUsd: m.npv, irrPct: m.irr, paybackYears: m.pb, selfConsumption: selfC, capacityLabel: inputs.bessOn ? `${inputs.kwp} kWp + ${inputs.bKwh} kWh` : `${inputs.kwp} kWp` };
  }, [m, inputs]);
  const { save, del, err } = useProjectSave({ projectId, kind: 'ci', inputs, name: inputs.pname || 'C&I Projesi', buildSummary });
  const saving = false;


  return (
    <>
      <Tipbox />
      <div className="mdl classic">
        <StepRail />
        <div className="m-header">
          <div className="hwrap">
            <div className="eyebrow">C&I Solar · EPDK Karar 14531 · Saatlik Mahsuplaşma</div>
            <h1>C&I Saatlik Mahsuplaşma Fizibilite Kokpiti</h1>
            <p className="sub">Saatlik min(üretim, tüketim) eşleşmesi, bedelli üretim limiti, BESS kaydırma ve USD bazlı yatırım analizi (TL tarife → kur projeksiyonu) — her işletme yılı, 12 ay × hafta içi/sonu temsili günlerle saatlik simüle edilir. Her formül, girilen değerlerle dolu halde gösterilir.</p>
          </div>
        </div>
        <div className="m-tabs">
          <div className="hwrap tabs-row">
            <nav role="tablist">
              {chip(tab === 'fiz', '1 · Fizibilite Modeli', () => setTab('fiz'))}
              {chip(tab === 'net', '2 · Mahsuplaşma', () => setTab('net'))}
              {chip(tab === 'hours', '3 · Saatlik Veri', () => setTab('hours'))}
              {chip(tab === 'bill', '4 · Fatura Analizi', () => setTab('bill'))}
              {chip(tab === 'cmp', '5 · Saatlik vs Aylık', () => setTab('cmp'))}
              {chip(tab === 'sum', '6 · Sonuçlar', () => setTab('sum'))}
            </nav>
            <TabActions onReport={() => setPrinting(true)} onSave={save} saveLabel={projectId ? 'Güncelle & Kaydet' : 'Projeyi Kaydet'} onDelete={projectId ? del : undefined} err={err} saving={saving} />
          </div>
        </div>

        <div className="m-main">
          {/* ==================== TAB 1: FIZIBILITE ==================== */}
          <div className={`tab ${tab === 'fiz' ? 'active' : ''}`}>
            <div className="toolbar">
              <TxtF label="Proje adı" unit="(raporda görünür)" value={inputs.pname} onChange={(v) => set('pname', v)} />
              <TxtF label="Firma" unit="(raporda görünür)" value={inputs.firm ?? ''} onChange={(v) => set('firm', v)} placeholder="ör. ABC" />
              <TxtF label="Lokasyon" unit="(il / tesis)" value={inputs.loc ?? ''} onChange={(v) => set('loc', v)} placeholder="ör. Ankara, Çankaya" />
              <TxtF label="Hazırlayan" value={inputs.prep} onChange={(v) => set('prep', v)} />
            </div>

            <Step no="ADIM 1" title="Tesis ve Tüketim Profili" why="Saatlik rejimde fizibilitenin kalbi tüketim profilidir: aynı üretimle net fayda %30+ değişir.">
              {/* ---------- 1) YIL ---------- */}
              <Card title="Abone ve yıllık tüketim">
                <div className="top-grid3">
                  <SelF label="Abone grubu" tip={R.CI_TIPS.i_abone} value={inputs.abone} onChange={(v) => set('abone', v)} options={[{ value: 'ci', label: 'Ticarethane / Sanayi (C&I — saatlik rejim)' }, { value: 'mesken', label: 'Mesken (aylık rejim, limitsiz)' }]} />
                  <NumF label="Yıllık tüketim" unit="kWh" tip={R.CI_TIPS.i_cons} value={inputs.consY} onChange={(v) => set('consY', v)} step={10000} />
                  <NumF label="Önceki yıl tüketimi" unit="kWh" tip={R.CI_TIPS.i_consPrev} value={inputs.consPrev} onChange={(v) => set('consPrev', v)} step={10000} />
                </div>
                <div className="top-grid2">
                  {!mesken ? (
                    <div className="top-box">
                      <div className="top-box-h">Hafta içi / hafta sonu</div>
                      <ChkF label="Hafta içi ve hafta sonu tüketimim farklı" checked={split} onChange={(v) => set('weSplit', v)} />
                      <p className="tsub">{split
                        ? 'Hafta sonu için ayrı günlük tüketim oranı ve ayrı saatlik dağılım girilir; grafik ve tablolarda ayrı gösterilir.'
                        : 'İşaretli değilken her gün (hafta sonu dahil) aynı profille hesaplanır. Hafta sonu belirgin farklıysa (ör. fabrika kapalı) işaretleyin.'}</p>
                      {split && <div className="top-inline"><NumF label="Hafta sonu günlük tüketim" unit="% hafta içine göre" value={inputs.weRatio} onChange={(v) => set('weRatio', v)} step={5} /></div>}
                    </div>
                  ) : (
                    <div className="top-box">
                      <div className="top-box-h">Mesken · aylık mahsuplaşma</div>
                      <p className="tsub">Mesken abonelerinde üretim ve tüketim ay toplamı üzerinden nettleşir; gün ve saat dağılımı sonucu etkilemez.</p>
                    </div>
                  )}
                  <div className="top-box osos-box">
                    <div className="top-box-h">OSOS / sayaç verisi (Excel)</div>
                    <p className="tsub">Şablonu indirip doldurun ve yükleyin: <b>Saatlik (OSOS)</b> sayfası (8.760 saat) en ayrıntılısıdır; yoksa <b>Aylık</b> ya da <b>Yıllık</b> sayfası yeterli. Değerler aşağıdaki bölümlere otomatik dolar.</p>
                    <div className="osos-btns">
                      <button type="button" className="btn-mini" onClick={() => { downloadOsosTemplate().catch(() => setOsosMsg({ ok: false, text: 'Şablon oluşturulamadı.' })); }}>⤓ Şablonu indir (.xlsx)</button>
                      <label className="btn-mini primary osos-up">
                        ⤒ Excel yükle
                        <input type="file" accept=".xlsx" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onOsos(f); }} />
                      </label>
                    </div>
                    {ososMsg && <div className={`soh-status ${ososMsg.ok ? 'ok' : 'bad'}`}>{ososMsg.text}</div>}
                  </div>
                </div>
              </Card>

              {/* ---------- 2) AYLAR ---------- */}
              <Card title="Aylık tüketim dağılımı" small="· yılın %'si · Aralık otomatik kalan">
                <div className="prof-row">
                  <div className="prof-left">
                    <SelF label="Aylık dağılım ön ayarı" tip={R.CI_TIPS.i_season} value={inputs.season} onChange={onSeason} options={[{ value: 'flat', label: 'Düz (yıl boyu eşit)' }, { value: 'yaz', label: 'Yaz pik (klima/soğutma)' }, { value: 'kis', label: 'Kış pik (ısıtma)' }]} />
                    <PctGrid labels={MONTHS} values={inputs.monthly} onChange={(a) => set('monthly', a)} cols={4} />
                    <p className="tsub">Kutulara yazabilir ya da sağdaki grafikte bir ayın çubuğunu tutup yukarı/aşağı çekebilirsiniz. Aralık, toplamı 100&apos;e tamamlayan kalan değerdir.</p>
                  </div>
                  <div className="prof-right">
                    {lblToggles}
                    <DragBars values={inputs.monthly} labels={MONTHS} fullLabel={(i) => MONTHS_LONG[i]}
                      onSet={(i, v) => set('monthly', setPctCell(inputs.monthly, i, v))}
                      abs={(i, v) => kwh((inputs.consY * v) / 100)} showPct={lbl.pct} showAbs={lbl.kwh}
                      color={() => '#1f4e8c'} ariaLabel="Aylık tüketim dağılımı (%)" />
                  </div>
                </div>
              </Card>

              {mesken ? (
                <div className="note" style={{ borderLeftColor: 'var(--green)', background: 'var(--green-soft)' }}>
                  <b>Mesken abonesi = aylık mahsuplaşma.</b> EPDK Karar 14531 mesken abonelerini saatlik rejimin dışında bıraktı; bu modda üretim ile tüketim <b>ay toplamı</b> üzerinden nettleşir ve saat uyumu aranmaz. Bu yüzden ay içi ve gün içi dağılım sonucu etkilemez ve gizlendi — yalnızca <b>aylık dağılım</b> yüzdeleri anlamlıdır. Bedelli üretim limiti de mesken için uygulanmaz.
                </div>
              ) : (
                <>
                  {/* ---------- 3) AY İÇİ GÜNLER ---------- */}
                  <Card title="Ay içi günlük dağılım" small={`· ${MONTHS_LONG[dm]} ayının %'si · son gün otomatik kalan`}>
                    <div className="chips">
                      {MONTHS.map((mo, k) => chip(dm === k, mo, () => setDm(k), 'dm' + k))}
                    </div>
                    <div className="prof-row">
                      <div className="prof-left">
                        <div className="preset-box">
                          <div className="row2">
                            <SelF label="Gün dağılımı ön ayarı" value={dp.key} onChange={(v) => setDp((s) => ({ ...s, key: v }))}
                              options={DAY_PRESETS.map((p) => ({ value: p.key, label: p.label }))} />
                            <SelF label="Uygulanacak aylar" value={dp.target} onChange={(v) => setDp((s) => ({ ...s, target: v as 'this' | 'all' | 'pick' }))}
                              options={[{ value: 'this', label: `Yalnız ${MONTHS_LONG[dm]}` }, { value: 'all', label: 'Tüm aylar' }, { value: 'pick', label: 'Seçtiğim aylar' }]} />
                          </div>
                          {dp.target === 'pick' && (
                            <div className="chips mini">
                              {MONTHS.map((mo, k) => chip(dp.months.includes(k), mo, () => setDp((s) => ({ ...s, months: s.months.includes(k) ? s.months.filter((x) => x !== k) : [...s.months, k].sort((a, b) => a - b) })), 'pm' + k))}
                            </div>
                          )}
                          <button type="button" className="btn-mini" onClick={applyDayPreset} disabled={dp.target === 'pick' && !dp.months.length}>Ön ayarı uygula</button>
                        </div>
                        <div className="cal-grid">
                          {DOW.map((w, k) => <div key={'w' + k} className={`cal-dow${k >= 5 && split ? ' we' : ''}`}>{w}</div>)}
                          {dayVals.map((v, d) => {
                            const last = d === dayVals.length - 1;
                            return (
                              <label key={d} className={`cal-cell${d % 7 >= 5 && split ? ' we' : ''}`}>
                                <span>{d + 1}</span>
                                <input type="number" min={0} max={100} step={0.1} value={r1(v)} readOnly={last} className={last ? 'rem' : undefined}
                                  title={last ? 'Otomatik kalan: 100 − diğer günler' : undefined}
                                  onChange={last ? undefined : (e) => setDay(d, parseFloat(e.target.value))} />
                              </label>
                            );
                          })}
                        </div>
                        <p className="tsub">Ayın 1&apos;i pazartesi varsayılır{split ? '; hafta sonu günleri altın renkli' : ''}. {customDay ? 'Bu ay elle düzenlendi.' : 'Varsayılan: her gün eşit' + (split ? ' (hafta sonu, hafta sonu oranıyla)' : '') + '.'}</p>
                        <div className="copy-row">
                          <button type="button" className="btn-mini" onClick={() => setCopy((c) => (c ? null : MONTHS.map((_, k) => k).filter((k) => k !== dm)))}>
                            {copy ? '▲ Kapat' : `⇉ ${MONTHS_LONG[dm]} dağılımını diğer aylara uygula`}
                          </button>
                          {customDay && <button type="button" className="btn-mini" onClick={resetDays}>↺ Bu ayı varsayılana döndür</button>}
                        </div>
                        {copy && (
                          <div className="copy-box">
                            <div className="copy-h">{MONTHS_LONG[dm]} ayının gün dağılımı hangi aylara kopyalansın? <small>İstemediğiniz ayların işaretini kaldırın.</small></div>
                            <div className="copy-months">
                              {MONTHS.map((mo, k) => (
                                <label key={k} className={k === dm ? 'src' : undefined}>
                                  <input type="checkbox" disabled={k === dm} checked={k === dm || copy.includes(k)}
                                    onChange={(e) => setCopy((c) => (c ? (e.target.checked ? [...c, k].sort((a, b) => a - b) : c.filter((x) => x !== k)) : c))} />
                                  {mo}{k === dm ? ' (kaynak)' : ''}
                                </label>
                              ))}
                            </div>
                            <div className="copy-actions">
                              <button type="button" className="btn-mini" onClick={() => setCopy(MONTHS.map((_, k) => k).filter((k) => k !== dm))}>Tümünü seç</button>
                              <button type="button" className="btn-mini" onClick={() => setCopy([])}>Hiçbirini seçme</button>
                              <button type="button" className="btn-mini primary" disabled={!copy.length} onClick={applyCopy}>Seçili {copy.length} aya uygula</button>
                            </div>
                            <p className="tsub">Gün sayısı farklı aylarda dağılım gün sırasıyla aktarılır ve ay toplamı %100 olacak şekilde ölçeklenir.</p>
                          </div>
                        )}
                      </div>
                      <div className="prof-right">
                        {lblToggles}
                        <DragBars values={dayVals} labels={dayVals.map((_, d) => String(d + 1))} labelEvery={dayVals.length > 20 ? 2 : 1}
                          fullLabel={(d) => `${d + 1} ${MONTHS_LONG[dm]} (${DOW[d % 7]})`}
                          onSet={(d, v) => setDay(d, v)} step={0.1}
                          abs={(d, v) => kwh(((inputs.consY * inputs.monthly[dm]) / 100) * v / 100)} showPct={lbl.pct} showAbs={lbl.kwh}
                          color={(d) => (d % 7 >= 5 && split ? '#C9922A' : '#2F6B4F')} ariaLabel="Ay içi günlük dağılım (%)" />
                      </div>
                    </div>
                  </Card>

                  {/* ---------- 4) GÜN İÇİ SAATLER ---------- */}
                  <Card title="Gün içi saatlik dağılım" small={`· günün %'si · 23:00 otomatik kalan · kWh: ${MONTHS_LONG[dm]} ortalama ${split ? (hdE === 'wd' ? 'hafta içi' : 'hafta sonu') + ' günü' : 'günü'}`}>
                    {split && (
                      <div className="chips">
                        {chip(hd === 'wd', 'Hafta içi günü', () => setHd('wd'))}
                        {chip(hd === 'we', 'Hafta sonu günü', () => setHd('we'))}
                      </div>
                    )}
                    <div className="prof-row">
                      <div className="prof-left">
                        <SelF label="Tüketim profili (hazır)" tip={R.CI_TIPS.i_profile} value={inputs.profileId} onChange={onProfile}
                          options={(Object.keys(PROFILE_LABELS) as ProfileKey[]).map((k) => ({ value: k, label: PROFILE_LABELS[k] }))} />
                        <div className="row3">
                          <NumF label="Gündüz" unit="06–17 (%)" value={r1(zone[hdE].g)} onChange={(v) => editZone(hdE, 'g', v)} />
                          <NumF label="Puant" unit="17–22 (%)" value={r1(zone[hdE].p)} onChange={(v) => editZone(hdE, 'p', v)} />
                          <NumF label="Gece" unit="22–06 (oto)" value={r1(zone[hdE].n)} onChange={() => { }} disabled />
                        </div>
                        <PctGrid labels={HLBL} values={inputs[hdE]} onChange={(a) => set(hdE, a)} cols={6} />
                        <p className="tsub">Dilim kutuları, o dilimdeki saatleri şekli koruyarak birlikte ölçekler. Saat kutuları ya da sağdaki grafik tek tek saat değiştirir.</p>
                      </div>
                      <div className="prof-right">
                        {lblToggles}
                        <DragBars values={inputs[hdE]} labels={HLBL} labelEvery={3} fullLabel={(h) => `${HLBL[h]}–${HLBL[(h + 1) % 24]}`}
                          onSet={(h, v) => set(hdE, setPctCell(inputs[hdE], h, v))}
                          abs={(h) => kwh(hourKwh[h] ?? 0)} showPct={lbl.pct} showAbs={lbl.kwh}
                          color={(h) => ZONE_COL[zoneOf(h)]} ariaLabel="Gün içi saatlik dağılım (%)" />
                        <div className="legend">
                          <span><i style={{ background: ZONE_COL.g }} />Gündüz 06–17</span>
                          <span><i style={{ background: ZONE_COL.p }} />Puant 17–22</span>
                          <span><i style={{ background: ZONE_COL.n }} />Gece 22–06</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </>
              )}

              <div className="formula">
                <div className="fl">Formül · saatlik tüketimin kuruluşu</div>
                <span className="ml"><span className="lbl">Ay:</span>Ay tüketimi = Yıllık tüketim × Ay yüzdesi</span>
                <span className="ml"><span className="lbl">Gün:</span>Gün tüketimi = Ay tüketimi × Gün yüzdesi (ay içi dağılım)</span>
                <span className="ml"><span className="lbl">Saat:</span>Saat tüketimi = Gün tüketimi × Saat yüzdesi{split ? ' (hafta içi / hafta sonu profili)' : ''}</span>
              </div>
            </Step>

            <Step no="ADIM 2" title="GES ve Üretim" why="Üretim, aylık güneş dağılımı × gün eğrisiyle saatlere yayılır; doğu-batı yerleşim eğriyi yayar.">
              <Card>
                <div className="grid3">
                  <NumF label="Kurulu güç" unit="kWp, DC" tip={R.CI_TIPS.i_kwp} value={inputs.kwp} onChange={(v) => set('kwp', v)} step={10} />
                  <NumF label="Spesifik üretim" unit="kWh/kWp/yıl" tip={R.CI_TIPS.i_spec} value={inputs.spec} onChange={(v) => set('spec', v)} step={10} />
                  <SelF label="Panel yerleşimi" tip={R.CI_TIPS.i_orient} value={inputs.orient} onChange={(v) => set('orient', v)} options={[{ value: 's', label: 'Güney (öğle tepeli)' }, { value: 'ew', label: 'Doğu-Batı (yayvan)' }]} />
                  <NumF label="Degradasyon" unit="%/yıl" tip={R.CI_TIPS.i_degr} value={inputs.degr} onChange={(v) => set('degr', v)} step={0.1} />
                  <NumF label="Analiz süresi" unit="yıl" tip={R.CI_TIPS.i_life} value={inputs.life} onChange={(v) => set('life', v)} />
                </div>
                <div className="formula">
                  <div className="fl">Formül · üretimin saate dağılımı</div>
                  <span className="ml"><span className="lbl">Aylık:</span>Üretim<sub>ay</sub> = kWp × spesifik üretim × ay payı (%)</span>
                  <span className="ml"><span className="lbl">Saatlik:</span>Üretim<sub>ay,saat</sub> = Üretim<sub>ay,gün</sub> × gün şekli[saat]</span>
                  <Html className="subst" html={R.sProd(inputs)} />
                </div>
              </Card>
            </Step>

            <Step no="ADIM 3" title="Tarife ve Fiyatlar" why="Mahsup ve çekiş alış fiyatından; bedelli fazla satış fiyatından; limit üstü 0 TL.">
              <Card>
                <div className="grid3">
                  <div className="field"><label><Tip tip={R.CI_TIPS.i_tarpre}>Tarife ön ayarı</Tip></label>
                    <select value="" onChange={(e) => onTarpre(e.target.value)}><option value="" disabled>Seç…</option><option value="tic">Ticarethane AG (4,28 / 3,95)</option><option value="mesken">Mesken AG (3,10 / 2,85 — temsilî)</option></select></div>
                  <NumF label="Alış fiyatı" unit="TL/kWh, aktif enerji" tip={R.CI_TIPS.i_pBuy} value={inputs.pBuy} onChange={(v) => set('pBuy', v)} step={0.01} />
                  <NumF label="Satış fiyatı" unit="TL/kWh, bedelli fazla" tip={R.CI_TIPS.i_pSell} value={inputs.pSell} onChange={(v) => set('pSell', v)} step={0.01} />
                  <NumF label="TL enflasyonu, ilk 5 yıl" unit="%/yıl → tarife & OPEX zammı" tip={R.CI_TIPS.i_esc1} value={inputs.esc1} onChange={(v) => set('esc1', v)} />
                  <NumF label="TL enflasyonu, sonrası" unit="%/yıl" tip={R.CI_TIPS.i_esc2} value={inputs.esc2} onChange={(v) => set('esc2', v)} />
                  <NumF label="Tarife reel artışı" unit="%/yıl, enflasyon üstü" value={inputs.preal} onChange={(v) => set('preal', v)} step={0.5} />
                  <NumF label="Başlangıç kuru" unit="TL/USD" value={inputs.fx0} onChange={(v) => set('fx0', v)} step={0.5} />
                  <NumF label="USD enflasyonu" unit="%/yıl" value={inputs.piUS} onChange={(v) => set('piUS', v)} step={0.5} />
                  <SelF label="Kur artışı" value={inputs.fxMode} onChange={(v) => set('fxMode', v)} options={[{ value: 'ppp', label: 'SAGP: enflasyon farkı kadar' }, { value: 'man', label: 'Manuel oran' }]} />
                  {inputs.fxMode === 'man' && <NumF label="Manuel kur artışı" unit="%/yıl" value={inputs.fxMan} onChange={(v) => set('fxMan', v)} />}
                  <NumF label="Limit üstü SKB" unit="TL/kWh, ops. maliyet" tip={R.CI_TIPS.i_skb} value={inputs.skb} onChange={(v) => set('skb', v)} step={0.05} />
                </div>
                <div className="formula">
                  <div className="fl">Formül · yıllık fayda</div>
                  <span className="ml"><span className="lbl">Tasarruf:</span>Mahsup (+BESS kaydırma) × Alış fiyatı<sub>yıl</sub></span>
                  <span className="ml"><span className="lbl">Gelir:</span>Bedelli satış × Satış fiyatı<sub>yıl</sub></span>
                  <span className="ml"><span className="lbl">Kur:</span>Kur<sub>t</sub> = Kur<sub>0</sub> × Π (1+π<sub>TL</sub>) ÷ (1+π<sub>USD</sub>) <span className="lbl">(SAGP) veya manuel oran</span></span>
                  <Html className="subst" html={R.sTar(inputs, m)} />
                </div>
                <div className="note">Alış &gt; satış olduğundan öz tüketilen her kWh, satılandan daha değerlidir. SAGP altında kritik sonuç: tarifenin enflasyonla zamlanması USD getiriyi büyütmez — USD fayda yalnız USD enflasyonu (+reel artış) kadar büyür.</div>
              </Card>
            </Step>

            <Step no="ADIM 4" title="Batarya (BESS)" why="Gündüz fazlası akşama kayar: satış fiyatı alış fiyatına terfi eder.">
              <Card>
                <ChkF label="BESS'i modele dahil et" tip={R.CI_TIPS.b_on} checked={inputs.bessOn} onChange={(v) => set('bessOn', v)} />
                <div className="grid3" style={{ marginTop: 12 }}>
                  <NumF label="Kapasite" unit="kWh" tip={R.CI_TIPS.b_kwh} value={inputs.bKwh} onChange={(v) => set('bKwh', v)} step={50} disabled={!inputs.bessOn} />
                  <NumF label="Güç" unit="kW" tip={R.CI_TIPS.b_kw} value={inputs.bKw} onChange={(v) => set('bKw', v)} step={10} disabled={!inputs.bessOn} />
                  <NumF label="Round-trip verim" unit="%" tip={R.CI_TIPS.b_rte} value={inputs.bRte} onChange={(v) => set('bRte', v)} disabled={!inputs.bessOn} />
                  <NumF label="Kapasite degradasyonu" unit="%/yıl" tip={R.CI_TIPS.b_degr} value={inputs.bDegr} onChange={(v) => set('bDegr', v)} step={0.5} disabled={!inputs.bessOn} />
                  <NumF label="BESS CAPEX" unit="$/kWh" tip={R.CI_TIPS.b_capex} value={inputs.bCapex} onChange={(v) => set('bCapex', v)} step={10} disabled={!inputs.bessOn} />
                  <NumF label="BESS OPEX" unit="TL/kWh-yıl" tip={R.CI_TIPS.b_opex} value={inputs.bOpex} onChange={(v) => set('bOpex', v)} step={10} disabled={!inputs.bessOn} />
                </div>
                <div className="formula">
                  <div className="fl">Formül · günlük döngü (greedy)</div>
                  <span className="ml"><span className="lbl">Şarj:</span>Saatlik fazla üretimden → min(fazla, güç, boş kapasite)</span>
                  <span className="ml"><span className="lbl">Deşarj:</span>Akşam çekişine → depolanan × RTE, min(çekiş, güç) sınırıyla</span>
                  <span className="ml"><span className="lbl">Değer:</span>Kaydırılan her kWh: satış fiyatı yerine alış fiyatından değerlenir</span>
                  <Html className="subst" html={R.sBess(inputs, m)} />
                </div>
              </Card>
            </Step>

            <Step no="ADIM 5" title="Yatırım ve Finansman" why="CAPEX ve sonuçlar USD; TL gelirler kur projeksiyonuyla çevrilir. OPEX TL girilir, TL enflasyonuyla büyür.">
              <Card>
                <div className="grid3">
                  <NumF label="GES CAPEX" unit="$/kWp, anahtar teslim" tip={R.CI_TIPS.i_capex} value={inputs.capexU} onChange={(v) => set('capexU', v)} step={10} />
                  <NumF label="GES OPEX" unit="TL/kWp-yıl" tip={R.CI_TIPS.i_opex} value={inputs.opexU} onChange={(v) => set('opexU', v)} step={10} />
                  <NumF label="İskonto oranı" unit="%/yıl, USD" tip={R.CI_TIPS.i_r} value={inputs.r} onChange={(v) => set('r', v)} step={0.5} />
                </div>
                <div style={{ margin: '14px 0 10px' }}><ChkF label="Kredi kullan" tip={R.CI_TIPS.l_on} checked={inputs.lOn} onChange={(v) => set('lOn', v)} /></div>
                <div className="grid3">
                  <NumF label="Kredi oranı" unit="% CAPEX" tip={R.CI_TIPS.l_ratio} value={inputs.lRatio} onChange={(v) => set('lRatio', v)} step={5} disabled={!inputs.lOn} />
                  <NumF label="USD faiz" unit="%/yıl" tip={R.CI_TIPS.l_rate} value={inputs.lRate} onChange={(v) => set('lRate', v)} step={0.5} disabled={!inputs.lOn} />
                  <NumF label="Vade" unit="yıl, anüite" tip={R.CI_TIPS.l_term} value={inputs.lTerm} onChange={(v) => set('lTerm', v)} disabled={!inputs.lOn} />
                </div>
                <div className="formula">
                  <div className="fl">Formül · nakit akışı ve karar</div>
                  <span className="ml"><span className="lbl">CAPEX:</span>Toplam ($) = kWp × $/kWp + BESS kWh × $/kWh</span>
                  <span className="ml"><span className="lbl">CF<sub>yıl</sub>:</span>( Tasarruf + Bedelli gelir − OPEX − SKB )<sub>TL</sub> ÷ Kur<sub>yıl</sub> → USD</span>
                  <span className="ml"><span className="lbl">NPV:</span>−CAPEX + Σ CF<sub>t</sub> ÷ (1+r)<sup>t</sup> · IRR: NPV=0</span>
                  <Html className="subst" html={R.sFin(inputs, m)} />
                </div>
                <div className="note">Vergi etkisi bu sürümde modellenmez: mahsuplaşma &quot;tasarrufu&quot; muhasebede gider azaltımıdır ve KV etkisi işletmenin kârlılığına bağlıdır — mali müşavirle netleştirilmelidir. Detaylı BoQ, CAPEX-OPEX hesabı için <a href="https://teklif.fozanseyfi.com/" target="_blank" rel="noopener" style={{ color: 'var(--navy)', fontWeight: 600 }}>buraya tıklayın</a>.</div>
              </Card>
            </Step>

            <div className="flex justify-end no-print" style={{ marginTop: 4 }}>
              <button type="button" className="btn-pdf" onClick={() => { setTab('sum'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Sonuçları gör →</button>
            </div>
          </div>

          {/* ==================== TAB 2: MAHSUPLAŞMA ==================== */}
          <div className={`tab ${tab === 'net' ? 'active' : ''}`}>
            <Step no="MOTOR" title="Saatlik Mahsuplaşma Motoru" why="Her saat: mahsup = min(üretim, tüketim). Grafik ve enerji akışı seçilen dönem ve gün tipini izler.">
              <Card title="Mahsuplaşma görünümü" small="· dönem ve gün tipini tıkla">
                <div className="chips">
                  {chip(nv.mi === 'y', 'Yıllık', () => setNv((s) => ({ ...s, mi: 'y' })))}
                  {MONTHS.map((mo, k) => chip(nv.mi === k, mo, () => setNv((s) => ({ ...s, mi: k })), k))}
                </div>
                {nv.mi !== 'y' && (
                  <div className="chips" style={{ marginTop: -4 }}>
                    {chip(nv.view === 'm', 'Ay görünümü (günler)', () => setNv((s) => ({ ...s, view: 'm' })))}
                    {chip(nv.view === 'd', 'Gün görünümü (saatler)', () => setNv((s) => ({ ...s, view: 'd' })))}
                  </div>
                )}
                {split && (
                  <div className="chips" style={{ marginTop: -4 }}>
                    {chip(nv.wd, 'Hafta içi', () => setNv((s) => (s.wd && !s.we ? s : { ...s, wd: !s.wd })))}
                    {chip(nv.we, 'Hafta sonu', () => setNv((s) => (s.we && !s.wd ? s : { ...s, we: !s.we })))}
                  </div>
                  )}
                <svg viewBox="0 0 900 300" width="100%" dangerouslySetInnerHTML={{ __html: net.svg }} />
                <div className="legend">
                  <span><i style={{ background: '#2F6B4F' }} />Mahsuplaşan</span>
                  <span><i style={{ background: '#C9922A' }} />Fazla üretim</span>
                  <span><i style={{ background: '#9E3A3F' }} />Şebekeden çekiş</span>
                  <span><i style={{ background: '#5D7FA3' }} />BESS kaydırma</span>
                  <span style={{ color: '#00A651', fontWeight: 700 }}>— Üretim</span><span style={{ color: '#0E2A5E', fontWeight: 700 }}>— Tüketim</span>
                </div>
                <p className="tsub">{net.hint}</p>
              </Card>

              <Card title="Enerji akışı" small="· enerji nereden geliyor, nereye gidiyor · dönem ve gün tipini seç">
                <div className="chips">
                  {chip(fv.mi === 'y', 'Yıllık', () => setFv((s) => ({ ...s, mi: 'y' })))}
                  {MONTHS.map((mo, k) => chip(fv.mi === k, mo, () => setFv((s) => ({ ...s, mi: k })), 'f' + k))}
                </div>
                {fv.mi !== 'y' && (
                  <div className="chips" style={{ marginTop: -4 }}>
                    {chip(fv.view === 'm', 'Ay toplamı', () => setFv((s) => ({ ...s, view: 'm' })))}
                    {chip(fv.view === 'd', 'Temsili gün', () => setFv((s) => ({ ...s, view: 'd' })))}
                  </div>
                )}
                {split && (
                  <div className="chips" style={{ marginTop: -4 }}>
                    {chip(fv.wd, 'Hafta içi', () => setFv((s) => (s.wd && !s.we ? s : { ...s, wd: !s.wd })))}
                    {chip(fv.we, 'Hafta sonu', () => setFv((s) => (s.we && !s.wd ? s : { ...s, we: !s.we })))}
                  </div>
                  )}
                <NetSankey f={flows} />
              </Card>

              {inputs.bessOn && (
                <Card title="Batarya (BESS) mahsuplaşmada nasıl çalışıyor?" small="· self-consumption kaydırma · arbitraj yok">
                  <div className="formula">
                    <div className="fl">Motorun günlük döngüsü · her temsili gün</div>
                    <span className="ml"><span className="lbl">1)</span>Deşarj kapasitesi = Σ min(açık<sub>saat</sub>, güç) · Şarj kapasitesi = Σ min(fazla<sub>saat</sub>, güç)</span>
                    <span className="ml"><span className="lbl">2)</span>Şarj hedefi = min( kapasite , Şarj kapasitesi , Deşarj kapasitesi ÷ RTE )</span>
                    <span className="ml"><span className="lbl">3)</span>Değer: kaydırılan × (alış − satış)</span>
                    <Html className="subst" html={R.sBess2(inputs, m)} />
                  </div>
                </Card>
              )}


              <Card title="Bedelli üretim limiti">
                <div className="formula">
                  <div className="fl">Formül · EPDK yıllık limit zinciri</div>
                  <span className="ml"><span className="lbl">1)</span>Bedelli limit = Önceki yıl tüketimi × 2</span>
                  <span className="ml"><span className="lbl">2)</span>Saatlik mahsup toplamı = Σ min(üretim<sub>saat</sub>, tüketim<sub>saat</sub>)</span>
                  <span className="ml"><span className="lbl">3)</span>Bedelli satış = min( Yıllık fazla , max(0, Limit − Mahsup) )</span>
                  <span className="ml"><span className="lbl">4)</span>Bedelsiz (YEKDEM) = Yıllık fazla − Bedelli satış <span className="lbl">→ 0 TL gelir</span></span>
                  <Html className="subst" html={R.sLimit(inputs, m)} />
                </div>
                <button type="button" className="btn-mini" onClick={() => setModal(R.hourlyModal(inputs, nvE))}>🕐 Saat saat mahsuplaşma tablosu</button>
                <button type="button" className="btn-mini" style={{ marginLeft: 8 }} onClick={downloadCsv}>⤓ CSV indir — tüm yıl (8.760 saat)</button>
                <div className="note">Usul ve Esaslar MADDE 7(5): limit üstü ihtiyaç fazlası &quot;sistem kullanım bedeli ödemeli&quot; miktardır — gelir yaratmaz, üstelik SKB doğabilir. Mesken abonelerinde limit uygulanmaz.</div>
              </Card>
            </Step>
          </div>

          {/* ==================== TAB 2: SAATLIK VERI ==================== */}
          <div className={`tab ${tab === 'hours' ? 'active' : ''}`}>
            <Step no="VERİ" title="Üretim–Tüketim Saatlik Karşılaştırma" why="Filtrele: ay + gün tipi → 24 saat; altında gün / ay / yıl toplamları.">
              <div className="chips">
                {chip(hv.mi === 'y', 'Yıllık', () => setHv((s) => ({ ...s, mi: 'y' })))}
                {MONTHS.map((mo, k) => chip(hv.mi === k, mo, () => setHv((s) => ({ ...s, mi: k })), k))}
              </div>
              {split && hv.mi !== 'y' && (
                <div className="chips">
                  {chip(hv.dt === 'wd', 'Hafta içi', () => setHv((s) => ({ ...s, dt: 'wd' })))}
                  {chip(hv.dt === 'we', 'Hafta sonu', () => setHv((s) => ({ ...s, dt: 'we' })))}
                </div>
              )}
              <Card title={R.hourViewTitle(hv.mi, hvDt, split)}>
                <div className="tablewrap"><table dangerouslySetInnerHTML={{ __html: R.hourViewTable(inputs, m, hv.mi, hvDt) }} /></div>
              </Card>
              {hv.mi !== 'y' && (
                <Card title="Toplamlar" small="· seçili gün × gün sayısı → ay → yıl">
                  <div className="tablewrap"><table dangerouslySetInnerHTML={{ __html: R.hourViewTotals(inputs, m, hv.mi as number, hvDt) }} /></div>
                  <p className="tsub">Ay toplamı = hafta içi günü × Hİ gün sayısı + hafta sonu günü × HS gün sayısı. Yıl toplamı, 12 ayın aynı yöntemle toplamıdır.</p>
                </Card>
              )}
              <button type="button" className="btn-mini" onClick={downloadCsv}>⤓ CSV indir — tüm yıl (8.760 saat)</button>
            </Step>
          </div>

          {/* ==================== TAB 3: FATURA ==================== */}
          <div className={`tab ${tab === 'bill' ? 'active' : ''}`}>
            <Step no="FATURA" title="Mevcut Operasyon vs GES Operasyonu" why="GES kurulmadan önce fatura ne gelecekti, kurulunca ne gelecek?">
              <Card title="Yıl-1 Özet — Aktif Enerji Faturası" small="· saatlik rejim, girdiğin tarifeyle">
                <div className="tablewrap"><table dangerouslySetInnerHTML={{ __html: R.billSumHtml(inputs, m) }} /></div>
                <p className="tsub">Tablo aktif enerji kalemini karşılaştırır. GES&apos;li satırda fazla satış geliri fatura mahsubu değil, görevli tedarik şirketinden alacaktır. GES işletme gideri (OPEX) bir fatura kalemi olmadığından buraya dahil edilmez.</p>
              </Card>
              <Card title="Aylık Kırılım" small="· 12 ay, yıl-1">
                <div className="tablewrap"><table dangerouslySetInnerHTML={{ __html: R.billMonthlyHtml(inputs, m) }} /></div>
              </Card>
              <div className="formula">
                <div className="fl">Formül · fatura karşılaştırması</div>
                <span className="ml"><span className="lbl">GES&apos;siz:</span>Fatura = Tüketim × Alış fiyatı</span>
                <span className="ml"><span className="lbl">GES&apos;li:</span>Fatura = Şebekeden çekiş × Alış fiyatı</span>
                <span className="ml"><span className="lbl">Net fatura:</span>GES&apos;li fatura − Bedelli satış geliri + SKB <span className="lbl">(OPEX hariç)</span></span>
                <Html className="subst" html={R.sBill(inputs, m)} />
              </div>
            </Step>
          </div>

          {/* ==================== TAB 4: SAATLIK vs AYLIK ==================== */}
          <div className={`tab ${tab === 'cmp' ? 'active' : ''}`}>
            <Step no="REJİM" title="Saatlik vs Aylık Mahsuplaşma — Ne Değişti?" why="EPDK Karar 14531 (01.05.2026): rejim aylıktan saatliğe döndü.">
              <p style={{ fontSize: '14.5px', color: 'var(--ink-soft)' }}>EPDK Karar 14531 (01.05.2026 yürürlük) ile mahsuplaşma rejimi <b>aylıktan saatliğe</b> değişti. Bu değişiklik C&I (ticari/sanayi) yatırımcıları için ciddi gelir azalmasına yol açtı.</p>
              <div className="note"><b>Tek cümleyle özet:</b> Aylık rejimde ay sonu net mahsup yapıldığı için tüm üretim ay içinde &quot;kullanılmış&quot; sayılırdı. Saatlik rejimde sadece o saatin tüketimi kadarı mahsup edilir → öğle saatinde üretim çoksa ama tüketim azsa, fazla üretim ucuz satış fiyatından satılır. C&I yatırımcısı için yıllık gelir %20–35 azalır.</div>
              <Card title="İki Rejimin Matematiksel Farkı">
                <div className="duo">
                  <div className="dcard g"><h4>📅 Aylık Mahsuplaşma (eski rejim; mesken hâlâ böyle)</h4>Her ay sonu:<span className="codechip">netted_ay = min(üretim_ay, tüketim_ay)</span>Aydaki tüm üretim toplam tüketimle karşılaştırılır; saat fark etmez.<br /><b style={{ color: 'var(--green)' }}>Avantaj:</b> sabah çok üretip akşam çok tüketsen bile dengelenir.</div>
                  <div className="dcard r"><h4>⏰ Saatlik Mahsuplaşma (yeni rejim, EPDK 14531)</h4>Her saat için:<span className="codechip">netted_saat = min(üretim_saat, tüketim_saat)</span>Saat 13&apos;te 50 kWh üretip 5 kWh tüketirsen yalnız 5 kWh mahsup edilir; kalan 45 kWh fazla üretim olarak ucuz fiyattan satılır.<br /><b style={{ color: 'var(--red)' }}>Dezavantaj:</b> saatlik eşleşme zorunlu — batarya olmadan gündüz fazlası kaybedilir.</div>
                </div>
              </Card>
              <Card title="C&I Yatırımcı İçin Strateji">
                <ol className="slist">
                  <li><b>Tüketim profilini önce analiz et:</b> saatlik fatura veya akıllı sayaç verisini incele — pik saatler ne zaman?</li>
                  <li><b>Sistem boyutunu pik tüketime göre küçült:</b> aşırı boyutlandırma yapma; saatlik öz tüketim oranını maksimize et.</li>
                  <li><b>Batarya değerlendirmesi yap:</b> 2–4 saatlik LFP, gündüz fazlasını akşama kaydırır.</li>
                  <li><b>Doğu-batı panel yerleşimi:</b> güney tepesi yerine üretimi 10–18 arası uzun saatlere yay.</li>
                </ol>
              </Card>
            </Step>
            <Step no="CANLI" title="Senin Projen: Saatlik vs Aylık" why="Girdiğin profil ve tarifeyle iki rejimin farkı — motor çıktısı.">
              <Card>
                <div className="tablewrap"><table dangerouslySetInnerHTML={{ __html: R.compareHtml(inputs) }} /></div>
                <p className="tsub">{R.compareNote(inputs)}</p>
              </Card>
            </Step>
          </div>

          {/* ==================== TAB 5: SONUÇLAR ==================== */}
          <div className={`tab ${tab === 'sum' ? 'active' : ''}`}>
            {(() => {
              const y1 = m.years[0];
              const vd = R.ciVerdict(inputs, m);
              const selfC = y1.s.prod > 0 ? (y1.s.mah + y1.s.shift) / y1.s.prod * 100 : 0;
              return (
                <>
                  <div className="exec-hero">
                    <div className="eh-top">
                      <div>
                        <div className="eh-eyebrow">Yönetici Özeti · Otomatik Oluşturulur</div>
                        <h2>{inputs.pname || 'C&I GES Projesi'}</h2>
                        <div className="eh-sub">{inputs.firm ? `${inputs.firm} · ` : ''}{inputs.loc ? `${inputs.loc} · ` : ''}{nf(inputs.kwp)} kWp{inputs.bessOn ? ` + ${nf(inputs.bKwh)} kWh BESS` : ''} · {nf(inputs.consY / 1000)} MWh/yıl tüketim · {mesken ? 'aylık rejim (mesken)' : 'saatlik rejim (EPDK 14531)'} · {inputs.life} yıl · iskonto {pct(inputs.r, 1)} USD</div>
                      </div>
                      <span className={`exec-badge ${vd.cls}`}>{vd.cls === 'good' ? '✓ Değer yaratıyor' : '✗ NPV negatif'}</span>
                    </div>
                    <div className="exec-stats">
                      <div className="exec-stat"><div className="l">NPV</div><div className="v gold">{usd(m.npv)}</div><div className="h">USD, {inputs.life} yıl</div></div>
                      <div className="exec-stat"><div className="l">Proje IRR</div><div className="v">{pct(m.irr * 100, 1)}</div><div className="h">USD bazlı</div></div>
                      <div className="exec-stat"><div className="l">Geri Ödeme</div><div className="v">{Number.isFinite(m.pb) ? `${nf(m.pb, 1)} yıl` : '—'}</div><div className="h">basit · iskontolu {Number.isFinite(m.pbD) ? nf(m.pbD, 1) : '—'} yıl</div></div>
                      <div className="exec-stat"><div className="l">1. Yıl Net Fayda</div><div className="v">{usd(y1.cf)}</div><div className="h">tasarruf + satış − OPEX</div></div>
                      <div className="exec-stat"><div className="l">CAPEX</div><div className="v">{usd(m.capex)}</div><div className="h">öz tüketim {pct(selfC, 0)}</div></div>
                    </div>
                  </div>

                  <div className="exec-sect">Temel Göstergeler</div>
                  <Kpis list={R.ciKpis(inputs, m)} />
                  <div className={`verdict ${vd.cls}`} dangerouslySetInnerHTML={{ __html: vd.text }} />

                  <div className="exec-sect">Grafikler</div>
                  <div className="exec-grid2">
                    <Card title="Aylık Dağılım" small="mahsup / bedelli / çekiş (MWh, yıl-1)">
                      <svg viewBox="0 0 900 250" width="100%" dangerouslySetInnerHTML={{ __html: R.monthlyChart(m) }} />
                      <div className="legend">
                        <span><i style={{ background: '#1E7F4F' }} />Mahsuplaşan</span>
                        <span><i style={{ background: '#E8A020' }} />Fazla (bedelli)</span>
                        <span><i style={{ background: '#C9D3E4' }} />Çekiş</span>
                        <span><i style={{ background: '#C7000B' }} />Bedelsiz</span>
                      </div>
                    </Card>
                    <Card title="Kümülatif İskontolu Nakit Akışı" small="(USD) · sıfır geçişi = iskontolu geri ödeme">
                      <svg viewBox="0 0 900 240" width="100%" dangerouslySetInnerHTML={{ __html: R.cumChart(inputs, m) }} />
                    </Card>
                  </div>

                  <div className="exec-sect">Yıl-1 Enerji Dengesi</div>
                  <Card>
                    <div className="tablewrap"><table dangerouslySetInnerHTML={{ __html: R.balHtml(inputs, m) }} /></div>
                  </Card>

                  <div className="exec-sect">Senaryo Matrisi — Kötümser / Baz / İyimser</div>
                  <div className="senswrap" dangerouslySetInnerHTML={{ __html: R.scenMatrixCi(inputs) }} />
                </>
              );
            })()}
          </div>
        </div>
      </div>

      {modal && <Modal title={modal.title} onClose={() => setModal(null)}><Html html={modal.body} /></Modal>}
      <PrintReport open={printing} onClose={() => setPrinting(false)}>
        <div dangerouslySetInnerHTML={{ __html: R.reportCi(inputs, m, { title: inputs.pname || 'C&I Projesi', prep: inputs.prep, firm: inputs.firm, loc: inputs.loc, date: new Date().toLocaleDateString(numLocale(), { day: 'numeric', month: 'long', year: 'numeric' }), profileLabel: PROFILE_LABELS[inputs.profileId as ProfileKey] || inputs.profileId }) }} />
      </PrintReport>
    </>
  );
}
