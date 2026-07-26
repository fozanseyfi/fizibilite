'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Loader2, Trash2, FileDown } from 'lucide-react';
import { computeCi, type CiInputs } from '@/lib/models/ci/engine';
import { defaultCiInputs } from '@/lib/models/ci/defaults';
import {
  MONTHS, PROFILE_LABELS, WE_RATIO, shapesForProfile, monthlyForSeason,
  type ProfileKey, type SeasonKey,
} from '@/lib/models/ci/presets';
import { Tipbox, Tip, NumF, TxtF, SelF, ChkF, Modal, PrintReport } from '@/components/models/native/mdl-kit';
import * as R from '@/components/models/native/ci-render';

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
function PctGrid({ labels, values, onChange }: { labels: string[]; values: number[]; onChange: (a: number[]) => void }) {
  const n = values.length, per = n === 24 ? 12 : n;
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
  return <div className="hgrid">{cells}</div>;
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
  const router = useRouter();
  const [inputs, setInputs] = useState<CiInputs>(() => ({ ...defaultCiInputs(), ...(initialInputs ?? {}) }));
  const [tab, setTab] = useState<'fiz' | 'hours' | 'bill' | 'cmp'>('fiz');
  const [adv, setAdv] = useState(false);
  const [cg, setCg] = useState<R.ConsChartState>({ level: 'y', mi: 5, dt: 'wd' });
  const [nv, setNv] = useState<R.NetChartState>({ mi: 5, view: 'd', wd: true, we: true });
  const [hv, setHv] = useState<{ mi: number | 'y'; dt: 'wd' | 'we' }>({ mi: 5, dt: 'wd' });
  const [modal, setModal] = useState<{ title: string; body: string } | null>(null);
  const [printing, setPrinting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const set = <K extends keyof CiInputs>(k: K, v: CiInputs[K]) => setInputs((p) => ({ ...p, [k]: v }));
  const m = useMemo(() => computeCi(inputs), [inputs]);
  const mesken = inputs.abone === 'mesken';

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

  const cons = useMemo(() => R.consChart(inputs, cg), [inputs, cg]);
  const net = useMemo(() => R.netChart(inputs, nv), [inputs, nv]);

  function downloadCsv() {
    const blob = new Blob(['﻿' + R.csvAllYear(inputs)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'saatlik-mahsuplasma-' + (inputs.pname || 'proje').replace(/[^\wğüşöçıİĞÜŞÖÇ-]+/g, '-') + '.csv';
    a.click(); URL.revokeObjectURL(a.href);
  }

  async function save() {
    setSaving(true); setErr(null);
    try {
      const y1 = m.years[0];
      const selfC = y1.s.prod > 0 ? (y1.s.mah + y1.s.shift) / y1.s.prod : 0;
      const summary = { kind: 'ci' as const, capexUsd: m.capex, npvUsd: m.npv, irrPct: m.irr, paybackYears: m.pb, selfConsumption: selfC, capacityLabel: inputs.bessOn ? `${inputs.kwp} kWp + ${inputs.bKwh} kWh` : `${inputs.kwp} kWp` };
      const config = { kind: 'ci' as const, name: inputs.pname || 'C&I Projesi', inputs };
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

  const chip = (active: boolean, label: string, onClick: () => void, key?: string | number) => (
    <button key={key} className={active ? 'active' : ''} onClick={onClick}>{label}</button>
  );

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
            <div className="eyebrow">C&I Solar · EPDK Karar 14531 · Saatlik Mahsuplaşma</div>
            <h1>C&I Saatlik Mahsuplaşma Fizibilite Kokpiti</h1>
            <p className="sub">Saatlik min(üretim, tüketim) eşleşmesi, bedelli üretim limiti, BESS kaydırma ve USD bazlı yatırım analizi (TL tarife → kur projeksiyonu) — her işletme yılı, 12 ay × hafta içi/sonu temsili günlerle saatlik simüle edilir. Her formül, girilen değerlerle dolu halde gösterilir.</p>
            <nav role="tablist">
              {chip(tab === 'fiz', '1 · Fizibilite Modeli', () => setTab('fiz'))}
              {chip(tab === 'hours', '2 · Saatlik Veri', () => setTab('hours'))}
              {chip(tab === 'bill', '3 · Fatura Analizi', () => setTab('bill'))}
              {chip(tab === 'cmp', '4 · Saatlik vs Aylık', () => setTab('cmp'))}
            </nav>
          </div>
        </div>

        <div className="m-main">
          {/* ==================== TAB 1: FIZIBILITE ==================== */}
          <div className={`tab ${tab === 'fiz' ? 'active' : ''}`}>
            <div className="toolbar">
              <TxtF label="Proje adı" unit="(raporda görünür)" value={inputs.pname} onChange={(v) => set('pname', v)} />
              <TxtF label="Hazırlayan" value={inputs.prep} onChange={(v) => set('prep', v)} />
            </div>

            <Step no="ADIM 1" title="Tesis ve Tüketim Profili" why="Saatlik rejimde fizibilitenin kalbi tüketim profilidir: aynı üretimle net fayda %30+ değişir.">
              <Card>
                <div className="grid3">
                  <SelF label="Abone grubu" tip={R.CI_TIPS.i_abone} value={inputs.abone} onChange={(v) => set('abone', v)} options={[{ value: 'ci', label: 'Ticarethane / Sanayi (C&I — saatlik rejim)' }, { value: 'mesken', label: 'Mesken (aylık rejim, limitsiz)' }]} />
                  <NumF label="Yıllık tüketim" unit="kWh" tip={R.CI_TIPS.i_cons} value={inputs.consY} onChange={(v) => set('consY', v)} step={10000} />
                  <NumF label="Önceki yıl tüketimi" unit="kWh, limit bazı" tip={R.CI_TIPS.i_consPrev} value={inputs.consPrev} onChange={(v) => set('consPrev', v)} step={10000} />
                  <SelF label="Tüketim profili (hazır)" tip={R.CI_TIPS.i_profile} value={inputs.profileId} onChange={onProfile}
                    options={(Object.keys(PROFILE_LABELS) as ProfileKey[]).map((k) => ({ value: k, label: PROFILE_LABELS[k] }))} />
                  <NumF label="Hafta sonu günlük tüketim" unit="hafta içinin %'si" value={inputs.weRatio} onChange={(v) => set('weRatio', v)} step={5} />
                  <SelF label="Aylık dağılım ön ayarı" tip={R.CI_TIPS.i_season} value={inputs.season} onChange={onSeason} options={[{ value: 'flat', label: 'Düz (yıl boyu eşit)' }, { value: 'yaz', label: 'Yaz pik (klima/soğutma)' }, { value: 'kis', label: 'Kış pik (ısıtma)' }]} />
                </div>
                <div className="note">Tüm dağılımlar <b>yüzdedir</b> ve her grid tam <b>%100</b>&apos;e kapanır: son hücre otomatik &quot;kalan&quot; olarak hesaplanır. Hazır profil seçmek gridleri doldurur; sonra her hücreyi elle inceltebilirsin.</div>
              </Card>

              <Card title="Aylık tüketim dağılımı" small="· yılın %'si · Aralık otomatik kalan">
                <PctGrid labels={MONTHS} values={inputs.monthly} onChange={(a) => set('monthly', a)} />
              </Card>

              {mesken ? (
                <div className="note" style={{ borderLeftColor: 'var(--green)', background: 'var(--green-soft)' }}>
                  <b>Mesken abonesi = aylık mahsuplaşma.</b> EPDK Karar 14531 mesken abonelerini saatlik rejimin dışında bıraktı; bu modda üretim ile tüketim <b>ay toplamı</b> üzerinden nettleşir ve saat uyumu aranmaz. Bu yüzden gün içi dağılım sonucu etkilemez ve gizlendi — yalnızca <b>aylık dağılım</b> yüzdeleri anlamlıdır. Bedelli üretim limiti de mesken için uygulanmaz.
                </div>
              ) : (
                <>
                  <Card title="Gün içi dağılım — puant dilimleri" small="· günün %'si · Gece otomatik kalan">
                    <div className="grid3" style={{ alignItems: 'end' }}>
                      <NumF label="Hafta içi · Gündüz" unit="06–17 (%)" value={r1(zone.wd.g)} onChange={(v) => editZone('wd', 'g', v)} />
                      <NumF label="Hafta içi · Puant" unit="17–22 (%)" value={r1(zone.wd.p)} onChange={(v) => editZone('wd', 'p', v)} />
                      <NumF label="Hafta içi · Gece" unit="22–06 (otomatik)" value={r1(zone.wd.n)} onChange={() => { }} disabled />
                      <NumF label="Hafta sonu · Gündüz" unit="06–17 (%)" value={r1(zone.we.g)} onChange={(v) => editZone('we', 'g', v)} />
                      <NumF label="Hafta sonu · Puant" unit="17–22 (%)" value={r1(zone.we.p)} onChange={(v) => editZone('we', 'p', v)} />
                      <NumF label="Hafta sonu · Gece" unit="22–06 (otomatik)" value={r1(zone.we.n)} onChange={() => { }} disabled />
                    </div>
                    <p className="tsub">Dilim yüzdesi değişince, seçili profilin dilim içi saat şekli korunarak yeniden ölçeklenir. Gündüz + Puant toplamı 100&apos;ü aşamaz; Gece kalanı otomatik alır.</p>
                    <button type="button" className="btn-mini" onClick={() => setAdv((a) => !a)}>{adv ? '▲ Saatlik detayı gizle (dilimlerle devam et)' : '🕐 Gün içi saatlik ayarla (detay — 24 hücre)'}</button>
                  </Card>
                  {adv && (
                    <>
                      <Card title="Hafta içi saatlik dağılım" small="· günün %'si · 23:00 otomatik kalan"><PctGrid labels={HLBL} values={inputs.wd} onChange={(a) => set('wd', a)} /></Card>
                      <Card title="Hafta sonu saatlik dağılım" small="· günün %'si · 23:00 otomatik kalan"><PctGrid labels={HLBL} values={inputs.we} onChange={(a) => set('we', a)} /></Card>
                    </>
                  )}
                </>
              )}

              <div className="formula">
                <div className="fl">Formül · saatlik tüketimin kuruluşu</div>
                <span className="ml"><span className="lbl">Ay:</span>Ay tüketimi = Yıllık tüketim × Ay yüzdesi</span>
                <span className="ml"><span className="lbl">Gün:</span>Hafta içi günlük = Ay tüketimi ÷ ( Hİ gün + HS gün × HS oranı ) · Hafta sonu günlük = Hİ günlük × HS oranı</span>
                <span className="ml"><span className="lbl">Saat:</span>Saat tüketimi = Günlük toplam × Saat yüzdesi</span>
              </div>

              <Card title="Tüketim Grafiği" small="· çubuklara tıklayarak in: yıl → ay → gün">
                <div className="chips">
                  {chip(cg.level === 'y', 'Yıllık', () => setCg((c) => ({ ...c, level: 'y' })))}
                  {cg.level !== 'y' && chip(cg.level === 'm', `› ${MONTHS[cg.mi]}`, () => setCg((c) => ({ ...c, level: 'm' })))}
                  {cg.level === 'd' && chip(true, `› Günlük (${cg.dt === 'wd' ? 'Hİ' : 'HS'})`, () => { })}
                </div>
                <svg viewBox="0 0 900 260" width="100%" style={{ cursor: 'default' }}
                  onClick={(e) => {
                    const rect = (e.target as HTMLElement).closest('rect');
                    if (!rect) return;
                    const b = cons.bars[+(rect.getAttribute('data-i') || -1)];
                    if (b?.click) setCg((c) => ({ ...c, level: b.click!.level as 'y' | 'm' | 'd', mi: b.click!.mi ?? c.mi, dt: b.click!.dt ?? c.dt }));
                  }}
                  dangerouslySetInnerHTML={{ __html: cons.svg }} />
                <p className="tsub">{cons.hint}</p>
              </Card>
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

            <Step no="ADIM 3" title="Saatlik Mahsuplaşma Motoru" why="Her saat: mahsup = min(üretim, tüketim). Yıllık fazla, bedelli limitle sınanır.">
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
                <div className="chips" style={{ marginTop: -4 }}>
                  {chip(nv.wd, 'Hafta içi', () => setNv((s) => (s.wd && !s.we ? s : { ...s, wd: !s.wd })))}
                  {chip(nv.we, 'Hafta sonu', () => setNv((s) => (s.we && !s.wd ? s : { ...s, we: !s.we })))}
                </div>
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
                <button type="button" className="btn-mini" onClick={() => setModal(R.hourlyModal(inputs, nv))}>🕐 Saat saat mahsuplaşma tablosu</button>
                <button type="button" className="btn-mini" style={{ marginLeft: 8 }} onClick={downloadCsv}>⤓ CSV indir — tüm yıl (8.760 saat)</button>
                <div className="grid3" style={{ marginTop: 12 }}>
                  <NumF label="Limit üstü SKB" unit="TL/kWh, ops. maliyet" tip={R.CI_TIPS.i_skb} value={inputs.skb} onChange={(v) => set('skb', v)} step={0.05} />
                </div>
                <div className="note">Usul ve Esaslar MADDE 7(5): limit üstü ihtiyaç fazlası &quot;sistem kullanım bedeli ödemeli&quot; miktardır — gelir yaratmaz, üstelik SKB doğabilir. Mesken abonelerinde limit uygulanmaz.</div>
              </Card>
            </Step>

            <Step no="ADIM 4" title="Tarife ve Fiyatlar" why="Mahsup ve çekiş alış fiyatından; bedelli fazla satış fiyatından; limit üstü 0 TL.">
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

            <Step no="ADIM 5" title="Batarya (BESS)" why="Gündüz fazlası akşama kayar: satış fiyatı alış fiyatına terfi eder.">
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

            <Step no="ADIM 6" title="Yatırım ve Finansman" why="CAPEX ve sonuçlar USD; TL gelirler kur projeksiyonuyla çevrilir. OPEX TL girilir, TL enflasyonuyla büyür.">
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

            <Step no="SONUÇ" title="Fizibilite Özeti" why="Motor: her işletme yılı için 12 ay × hafta içi/sonu saatlik simülasyon. Tüm sonuçlar TL, nominal.">
              <Kpis list={R.ciKpis(inputs, m)} />
              <div className={`verdict ${R.ciVerdict(inputs, m).cls}`} dangerouslySetInnerHTML={{ __html: R.ciVerdict(inputs, m).text }} />
              <Card title="Yıl-1 Enerji Dengesi" small="· saatlik motor çıktısı">
                <div className="tablewrap"><table dangerouslySetInnerHTML={{ __html: R.balHtml(inputs, m) }} /></div>
              </Card>
              <Card title="Aylık Dağılım — Mahsup / Bedelli Satış / Şebekeden Çekiş" small="(MWh, yıl-1)">
                <svg viewBox="0 0 900 250" width="100%" dangerouslySetInnerHTML={{ __html: R.monthlyChart(m) }} />
                <div className="legend">
                  <span><i style={{ background: '#1E7F4F' }} />Mahsuplaşan</span>
                  <span><i style={{ background: '#E8A020' }} />Fazla üretim (bedelli)</span>
                  <span><i style={{ background: '#C9D3E4' }} />Şebekeden çekiş</span>
                  <span><i style={{ background: '#C7000B' }} />Bedelsiz (limit üstü)</span>
                </div>
              </Card>
              <Card title="Kümülatif İskontolu Nakit Akışı" small="(USD) · sıfırı geçtiği an = iskontolu geri ödeme">
                <svg viewBox="0 0 900 240" width="100%" dangerouslySetInnerHTML={{ __html: R.cumChart(inputs, m) }} />
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
              {hv.mi !== 'y' && (
                <div className="chips">
                  {chip(hv.dt === 'wd', 'Hafta içi', () => setHv((s) => ({ ...s, dt: 'wd' })))}
                  {chip(hv.dt === 'we', 'Hafta sonu', () => setHv((s) => ({ ...s, dt: 'we' })))}
                </div>
              )}
              <Card title={R.hourViewTitle(hv.mi, hv.dt)}>
                <div className="tablewrap"><table dangerouslySetInnerHTML={{ __html: R.hourViewTable(inputs, m, hv.mi, hv.dt) }} /></div>
              </Card>
              {hv.mi !== 'y' && (
                <Card title="Toplamlar" small="· seçili gün × gün sayısı → ay → yıl">
                  <div className="tablewrap"><table dangerouslySetInnerHTML={{ __html: R.hourViewTotals(inputs, m, hv.mi as number, hv.dt) }} /></div>
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
        </div>
      </div>

      {modal && <Modal title={modal.title} onClose={() => setModal(null)}><Html html={modal.body} /></Modal>}
      <PrintReport open={printing} onClose={() => setPrinting(false)}>
        <div dangerouslySetInnerHTML={{ __html: R.reportCi(inputs, m, { title: inputs.pname || 'C&I Projesi', prep: inputs.prep, date: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }), profileLabel: PROFILE_LABELS[inputs.profileId as ProfileKey] || inputs.profileId }) }} />
      </PrintReport>
    </>
  );
}
