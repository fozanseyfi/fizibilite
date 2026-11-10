'use client';

import { useState } from 'react';
import type { SohCheck } from '@/lib/models/bess/common';
import { sizeGrid, type OptRow } from '@/lib/models/bess/optimize';
import { NumF } from '@/components/models/native/mdl-kit';
import { HoverChart, type HoverCol } from '@/components/models/native/chart-hover';
import { nf, pct, usd, yearsFmt } from '@/lib/models/fmt';

const cLabel = (c: number) => `${String(c).replace('.', ',')}C`;

// ============================ BATARYA SAĞLIĞI ============================

/** Yıl sonu sağlık (SOH) tablosu + kapasite şartı kontrolü */
export function SohCard({ soh, degr }: { soh: SohCheck; degr: number }) {
  const checks = soh.rows.filter((r) => r.req !== undefined);
  const fail = checks.filter((r) => !r.ok);
  return (
    <div className="card">
      <h3>Batarya sağlığı (SOH) ve kapasite şartı <small>· yıl sonu, beyan edilen kapasiteye oranla</small></h3>
      <div className={`soh-status ${soh.ok ? 'ok' : 'bad'}`}>
        {checks.length === 0 && 'Kontrol noktası tanımlı değil (Kurulum → Adım 4).'}
        {checks.length > 0 && soh.ok && <>Şart sağlanıyor: {checks.map((r) => `${r.y}. yıl ${pct(r.soh * 100)} ≥ ${pct((r.req ?? 0) * 100, 0)}`).join(' · ')}.</>}
        {checks.length > 0 && !soh.ok && <>Şart sağlanmıyor: {fail.map((r) => `${r.y}. yıl ${pct(r.soh * 100)} < ${pct((r.req ?? 0) * 100, 0)}`).join(' · ')}.</>}
        {checks.length > 0 && <> Kapasite eklemeden sağlamak için yıllık kayıp en fazla <b>{pct(soh.maxDegr * 100, 2)}</b> olmalı (girilen {pct(degr, 1)}).</>}
      </div>
      <div className="tablewrap">
        <table className="soh-table">
          <thead><tr><th>Yıl</th><th>SOH</th><th style={{ width: '45%' }} /><th>Şart</th><th>Durum</th></tr></thead>
          <tbody>
            {soh.rows.map((r) => (
              <tr key={r.y} className={r.req !== undefined ? 'checkpoint' : ''}>
                <td>{r.y}</td>
                <td>{pct(r.soh * 100)}</td>
                <td>
                  <span className="soh-bar">
                    <i style={{ width: `${Math.max(0, Math.min(100, r.soh * 100))}%` }} />
                    {r.req !== undefined && <em style={{ left: `${r.req * 100}%` }} />}
                  </span>
                </td>
                <td>{r.req !== undefined ? `≥ ${pct(r.req * 100, 0)}` : ''}</td>
                <td>{r.req !== undefined && (r.ok ? <span className="pill ok">Uygun</span> : <span className="pill bad">Uygun değil</span>)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="note">SOH = (1 + kapasite fazlası) × (1 − yıllık kayıp)<sup>yaş</sup>; kapasite ekleme yapılan yılda yeniden başlar. Şartı en iyi hangi yolla sağlayacağınızı 5. sekme karşılaştırır. Kontrol noktaları ve eşikler Kurulum → Adım 4&apos;ten değiştirilebilir.</div>
    </div>
  );
}

// ============================ OPTİMİZASYON ============================

const C_COLORS: Record<string, string> = { '1': '#1E3A6E', '0.5': '#3D8B5F', '0.25': '#D9822B' };

function OptChart({ rows, unit, unitPower }: { rows: OptRow[]; unit: string; unitPower: string }) {
  if (rows.length < 2) return null;
  const W = 760, H = 260, padL = 70, padR = 14, padT = 14, padB = 34;
  const caps = rows.map((r) => r.cap), npvs = rows.map((r) => r.npv);
  const xMin = Math.min(...caps), xMax = Math.max(...caps);
  const yMin = Math.min(0, ...npvs), yMax = Math.max(0, ...npvs);
  const x = (v: number) => padL + ((W - padL - padR) * (v - xMin)) / Math.max(1e-9, xMax - xMin);
  const y = (v: number) => padT + ((H - padT - padB) * (yMax - v)) / Math.max(1e-9, yMax - yMin);
  const best = rows[0];
  const series = [...new Set(rows.map((r) => r.c))].sort((a, b) => b - a);
  const ax = (v: number) => (Math.abs(v) >= 1e6 ? `${nf(v / 1e6, 1)}M$` : `${nf(v / 1e3, 0)}k$`);
  // Üzerine gelince: o kapasitedeki her C-oranının sonucu
  const capList = [...new Set(caps)].sort((a, b) => a - b);
  const cols: HoverCol[] = capList.map((cap, k) => {
    const xl = k === 0 ? padL : (x(capList[k - 1]) + x(cap)) / 2;
    const xr = k === capList.length - 1 ? W - padR + 0.01 : (x(cap) + x(capList[k + 1])) / 2;
    return {
      x0: k === 0 ? 0 : xl, x1: k === capList.length - 1 ? W : xr,
      title: `${nf(cap)} ${unit}`,
      rows: series.map((c) => rows.find((r) => r.cap === cap && r.c === c)).filter((r): r is OptRow => !!r).map((r) => ({
        label: `${cLabel(r.c)} · ${nf(r.power, 1)} ${unitPower}${r === best ? ' (en iyi)' : ''}`,
        value: usd(r.npv),
        color: C_COLORS[String(r.c)] ?? '#5A6478',
        strong: r === best,
      })),
    };
  });
  return (
    <HoverChart width={W} height={H} cols={cols} top={padT} bottom={padB}>
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Kapasiteye göre NPV">
      {[0, 0.25, 0.5, 0.75, 1].map((f) => {
        const v = yMin + (yMax - yMin) * f;
        return (
          <g key={f}>
            <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke="#E2E7EF" />
            <text x={padL - 6} y={y(v) + 3} textAnchor="end">{ax(v)}</text>
          </g>
        );
      })}
      <line x1={padL} x2={W - padR} y1={y(0)} y2={y(0)} stroke="#5A6478" strokeDasharray="4 3" />
      {[...new Set(caps)].sort((a, b) => a - b).map((c) => (
        <text key={c} x={x(c)} y={H - 14} textAnchor="middle">{nf(c)}</text>
      ))}
      <text x={W - padR} y={H - 1} textAnchor="end">kapasite ({unit})</text>
      {series.map((c) => {
        const pts = rows.filter((r) => r.c === c).sort((a, b) => a.cap - b.cap);
        const color = C_COLORS[String(c)] ?? '#5A6478';
        return (
          <g key={c}>
            <path d={pts.map((p, k) => `${k ? 'L' : 'M'}${x(p.cap)},${y(p.npv)}`).join(' ')} fill="none" stroke={color} strokeWidth={2.2} />
            {pts.map((p) => <circle key={p.cap} cx={x(p.cap)} cy={y(p.npv)} r={3} fill={color} />)}
          </g>
        );
      })}
      <circle cx={x(best.cap)} cy={y(best.npv)} r={8} fill="none" stroke="#C0392B" strokeWidth={2} />
    </svg>
    </HoverChart>
  );
}

/**
 * Kapasite × C-oranı ızgarasında tam modeli çalıştırıp en yüksek NPV'yi bulur.
 * Kullanım şekilleri, fiyatlar ve diğer varsayımlar sabit kalır.
 */
export function OptPanel({
  unitCap, unitPower, current, run, onApply, y1Label, y1Fmt, costNote, extra, showSoh = true,
}: {
  unitCap: string; unitPower: string; current: number;
  run: (sizes: number[], cRates: number[]) => OptRow[];
  onApply: (cap: number, c: number) => void;
  y1Label: string; y1Fmt: (v: number) => string;
  /** Maliyetin C-oranına etkisini anlatan not */
  costNote?: string;
  /** Modele özel ek girdi (ör. C-oranı fiyat farkı) */
  extra?: React.ReactNode;
  /** Sağlık şartı sütunu (C&I'da şart yok) */
  showSoh?: boolean;
}) {
  const [min, setMin] = useState(() => Math.max(1, Math.round(current * 0.25)));
  const [max, setMax] = useState(() => Math.max(2, Math.round(current * 3)));
  const [steps, setSteps] = useState(8);
  const [cs, setCs] = useState<Record<string, boolean>>({ '1': true, '0.5': true, '0.25': true });
  const [rows, setRows] = useState<OptRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const cRates = Object.entries(cs).filter(([, v]) => v).map(([k]) => Number(k));
  const sizes = sizeGrid(min, max, steps);
  const best = rows?.[0];

  function go() {
    setBusy(true);
    // Önce "hesaplanıyor" durumu çizilsin
    setTimeout(() => {
      try { setRows(run(sizes, cRates)); } finally { setBusy(false); }
    }, 20);
  }

  return (
    <>
      <div className="card">
        <h3>Boyut optimizasyonu <small>· kapasite × C-oranı, aynı kullanım şekilleri ve fiyatlarla</small></h3>
        <div className="grid3">
          <NumF label="En küçük kapasite" unit={unitCap} value={min} onChange={setMin} />
          <NumF label="En büyük kapasite" unit={unitCap} value={max} onChange={setMax} />
          <NumF label="Kapasite adımı" unit="adet, 2–20" value={steps} onChange={setSteps} />
          {extra}
        </div>
        <div className="opt-cs">
          <span>Denenecek C-oranları:</span>
          {['1', '0.5', '0.25'].map((k) => (
            <label key={k} className="check">
              <input type="checkbox" checked={cs[k]} onChange={(e) => setCs((p) => ({ ...p, [k]: e.target.checked }))} />
              {cLabel(Number(k))}
            </label>
          ))}
        </div>
        <div className="opt-run">
          <button className="btn-pdf" onClick={go} disabled={busy || cRates.length === 0 || sizes.length === 0}>
            {busy ? 'Hesaplanıyor…' : `Optimizasyonu çalıştır (${sizes.length * cRates.length} kombinasyon)`}
          </button>
          <span>Kapasiteler: {sizes.map((v) => nf(v)).join(' · ')} {unitCap}</span>
        </div>
      </div>

      {rows && best && (
        <>
          <div className={`soh-status ${best.npv > 0 ? 'ok' : 'bad'}`}>
            {best.npv > 0 ? (
              <>En yüksek NPV: <b>{nf(best.cap)} {unitCap} · {cLabel(best.c)} ({nf(best.power, 1)} {unitPower})</b> — NPV {usd(best.npv)}, IRR {pct(best.irr * 100)}, geri ödeme {yearsFmt(best.payback, 1)}.</>
            ) : (
              <>Denenen hiçbir boyut pozitif NPV vermiyor. En az zararlısı <b>{nf(best.cap)} {unitCap} · {cLabel(best.c)}</b> (NPV {usd(best.npv)}). Kullanım şekillerini, fiyatları veya maliyeti gözden geçirin.</>
            )}
            {showSoh && !best.sohOk && <> Bu boyutta kapasite sağlığı şartı sağlanmıyor.</>}
            {best.overGrid && <> Dikkat: bu boyutun gücü şebeke bağlantı gücünü aşıyor; aşan kısım kullanılamaz.</>}
            {' '}<button className="btn-mini" onClick={() => onApply(best.cap, best.c)}>Bu boyutu uygula</button>
          </div>

          <div className="card bess-chart">
            <h3>Kapasiteye göre NPV <small>· her çizgi bir C-oranı, kırmızı halka en iyisi</small></h3>
            <OptChart rows={rows} unit={unitCap} unitPower={unitPower} />
            <div className="bess-legend">
              {[...new Set(rows.map((r) => r.c))].sort((a, b) => b - a).map((c) => (
                <span key={c} className="inline-flex items-center gap-1.5">
                  <i style={{ display: 'inline-block', width: 14, height: 3, background: C_COLORS[String(c)] }} />{cLabel(c)}
                </span>
              ))}
            </div>
          </div>

          <div className="card">
            <h3>Tüm kombinasyonlar <small>· NPV&apos;ye göre sıralı</small></h3>
            <div className="tablewrap">
              <table>
                <thead>
                  <tr><th>#</th><th>Kapasite ({unitCap})</th><th>C</th><th>Güç ({unitPower})</th><th>Yatırım</th><th>{y1Label}</th><th>NPV</th><th>IRR</th><th>Geri ödeme</th>{showSoh && <th>SOH şartı</th>}<th /></tr>
                </thead>
                <tbody>
                  {rows.map((r, k) => (
                    <tr key={`${r.cap}-${r.c}`} className={k === 0 ? 'opt-best' : ''}>
                      <td>{k + 1}</td><td>{nf(r.cap)}</td><td>{cLabel(r.c)}</td><td>{nf(r.power, 1)}{r.overGrid && <span className="pill bad" title="Batarya gücü şebeke bağlantı gücünü aşıyor; aşan kısım kullanılamaz." style={{ marginLeft: 6 }}>bağlantıyı aşıyor</span>}</td>
                      <td>{usd(r.capex)}</td><td>{y1Fmt(r.y1)}</td><td>{usd(r.npv)}</td><td>{pct(r.irr * 100)}</td><td>{yearsFmt(r.payback, 1)}</td>
                      {showSoh && <td>{r.sohOk ? 'Uygun' : 'Değil'}</td>}
                      <td><button className="btn-mini" onClick={() => onApply(r.cap, r.c)}>Uygula</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="note">Her satır tam modelle (saatlik simülasyon, tüm yıllar) hesaplandı. Yalnızca kapasite ve C-oranı değişir. {costNote ?? 'Güç dönüştürücü maliyeti ($/kW) ayrı olduğu için yüksek C-oranı daha pahalıdır.'}</div>
          </div>
        </>
      )}
    </>
  );
}

// ============================ SEKME SATIRI DÜĞMELERİ ============================

/** Kurulum / Sonuçlar sekmeleriyle aynı hizada, sağda Rapor ve Kaydet */
export function TabActions({ onReport, onSave, saveLabel, onDelete, saving, err }: {
  onReport: () => void; onSave: () => void; saveLabel: string;
  onDelete?: () => void; saving?: boolean; err?: string | null;
}) {
  return (
    <div className="tab-actions no-print">
      {err && <span className="ta-err">{err}</span>}
      {onDelete && <button type="button" className="ta-btn danger" onClick={onDelete} disabled={saving}>Sil</button>}
      <button type="button" className="ta-btn ghost" onClick={onReport} disabled={saving}>Rapor çıktısı al</button>
      <button type="button" className="ta-btn primary" onClick={onSave} disabled={saving}>{saving ? 'Kaydediliyor…' : saveLabel}</button>
    </div>
  );
}
