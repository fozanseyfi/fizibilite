'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FormCard, Grid, NumField, TextField, SelField, SwitchField } from '@/components/models/form-kit';
import { computeCi } from '@/lib/models/ci/engine';
import type { CiInputs } from '@/lib/models/ci/engine';
import { defaultCiInputs } from '@/lib/models/ci/defaults';
import { PROFILE_LABELS, shapesForProfile, monthlyForSeason, WE_RATIO } from '@/lib/models/ci/presets';
import type { ProfileKey, SeasonKey } from '@/lib/models/ci/presets';
import { usd, pct, nf } from '@/lib/models/fmt';
import { ArrowLeft, Save } from 'lucide-react';

export function CiBuilder({ editId }: { editId?: string }) {
  const router = useRouter();
  const [inputs, setInputs] = useState<CiInputs>(() => defaultCiInputs());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editId) return;
    fetch(`/api/projects/${editId}`)
      .then((r) => r.json())
      .then((d) => { if (d?.config?.kind === 'ci') setInputs({ ...defaultCiInputs(), ...d.config.inputs }); })
      .catch(() => {});
  }, [editId]);

  const set = <K extends keyof CiInputs>(k: K, v: CiInputs[K]) => setInputs((p) => ({ ...p, [k]: v }));

  const applyProfile = (key: ProfileKey) => {
    const s = shapesForProfile(key);
    setInputs((p) => ({ ...p, profileId: key, wd: s.wd, we: s.we, weRatio: WE_RATIO[key] }));
  };
  const applySeason = (key: SeasonKey) => setInputs((p) => ({ ...p, season: key, monthly: monthlyForSeason(key) }));

  const m = useMemo(() => computeCi(inputs), [inputs]);
  const y1 = m.years[0];
  const selfC = y1.s.prod > 0 ? (y1.s.mah + y1.s.shift) / y1.s.prod : 0;

  async function save() {
    setSaving(true); setError(null);
    try {
      const config = { kind: 'ci' as const, name: inputs.pname || 'C&I Projesi', inputs };
      let id = editId;
      if (editId) {
        const r = await fetch(`/api/projects/${editId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ config }) });
        if (!r.ok) throw new Error('Güncellenemedi');
      } else {
        const r = await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ config }) });
        if (!r.ok) throw new Error('Oluşturulamadı');
        id = (await r.json()).id;
      }
      router.push(`/projects/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e)); setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Button asChild variant="ghost" size="sm">
          <Link href={editId ? `/projects/${editId}` : '/projects/new'}><ArrowLeft className="h-4 w-4 mr-1" /> Geri</Link>
        </Button>
        <div className="text-xs text-muted-foreground">C&I / Mesken (Saatlik Mahsuplaşma) · {editId ? 'düzenleme' : 'yeni proje'}</div>
      </div>

      {/* Canlı KPI şeridi */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border border-border rounded-lg p-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center">
          <MiniK label="NPV" value={usd(m.npv)} tone={m.npv >= 0 ? 'good' : 'bad'} />
          <MiniK label="Proje IRR" value={pct(m.irr * 100, 1)} />
          <MiniK label="Payback" value={`${nf(m.pb, 2)} yıl`} />
          <MiniK label="Equity IRR" value={inputs.lOn ? pct(m.eIRR * 100, 1) : '—'} />
          <MiniK label="1. Yıl Net Fayda" value={usd(y1.cf)} />
          <MiniK label="Öz Tüketim" value={pct(selfC * 100, 1)} />
        </div>
        <div className={`mt-2 text-xs rounded px-3 py-1.5 ${m.npv >= 0 && m.irr > inputs.r / 100 ? 'bg-eco/10 text-eco-dark' : 'bg-destructive/10 text-destructive'}`}>
          {m.npv >= 0 && m.irr > inputs.r / 100
            ? `✔ USD bazında değer yaratıyor — IRR ${pct(m.irr * 100, 1)} > iskonto ${pct(inputs.r, 1)}, geri ödeme ${nf(m.pb, 2)} yıl.`
            : `⚠ Bu varsayımlarla NPV ${usd(m.npv)} — sistem boyutunu tüketim profiline yaklaştır veya BESS ekle.`}
        </div>
      </div>

      <FormCard title="Proje Bilgisi">
        <Grid>
          <TextField label="Proje adı" value={inputs.pname} onChange={(v) => set('pname', v)} />
          <TextField label="Hazırlayan" value={inputs.prep} onChange={(v) => set('prep', v)} />
        </Grid>
      </FormCard>

      <FormCard title="Adım 1 · Tesis ve Tüketim Profili" desc="Mesken seçilirse motor aylık rejime geçer ve bedelli üretim limiti uygulanmaz.">
        <Grid cols={3}>
          <SelField label="Abone grubu" value={inputs.abone} onChange={(v) => set('abone', v)} options={[{ value: 'ci', label: 'Ticarethane / Sanayi (saatlik)' }, { value: 'mesken', label: 'Mesken (aylık, limitsiz)' }]} />
          <NumField label="Yıllık tüketim" unit="kWh" value={inputs.consY} onChange={(v) => set('consY', v)} step={10000} />
          <NumField label="Önceki yıl tüketimi" unit="kWh, limit bazı" value={inputs.consPrev} onChange={(v) => set('consPrev', v)} step={10000} />
          <SelField label="Tüketim profili (hazır)" value={inputs.profileId as ProfileKey} onChange={(v) => applyProfile(v)} options={(Object.keys(PROFILE_LABELS) as ProfileKey[]).map((k) => ({ value: k, label: PROFILE_LABELS[k] }))} />
          <SelField label="Aylık dağılım ön ayarı" value={inputs.season as SeasonKey} onChange={(v) => applySeason(v)} options={[{ value: 'flat', label: 'Düz (yıl boyu eşit)' }, { value: 'yaz', label: 'Yaz pik (klima)' }, { value: 'kis', label: 'Kış pik (ısıtma)' }]} />
          <NumField label="Hafta sonu / hafta içi" unit="%" value={inputs.weRatio} onChange={(v) => set('weRatio', v)} step={5} />
        </Grid>
      </FormCard>

      <FormCard title="Adım 2 · GES ve Üretim">
        <Grid cols={3}>
          <NumField label="Kurulu güç" unit="kWp DC" value={inputs.kwp} onChange={(v) => set('kwp', v)} step={10} />
          <NumField label="Spesifik üretim" unit="kWh/kWp/yıl" value={inputs.spec} onChange={(v) => set('spec', v)} step={10} />
          <SelField label="Panel yerleşimi" value={inputs.orient} onChange={(v) => set('orient', v)} options={[{ value: 's', label: 'Güney (öğle tepeli)' }, { value: 'ew', label: 'Doğu-Batı (yayvan)' }]} />
          <NumField label="Degradasyon" unit="%/yıl" value={inputs.degr} onChange={(v) => set('degr', v)} step={0.1} />
          <NumField label="Analiz süresi" unit="yıl" value={inputs.life} onChange={(v) => set('life', v)} step={1} />
          <NumField label="Limit üstü SKB" unit="TL/kWh, 0=yok" value={inputs.skb} onChange={(v) => set('skb', v)} step={0.05} />
        </Grid>
      </FormCard>

      <FormCard title="Adım 4 · Tarife ve Fiyatlar">
        <Grid cols={3}>
          <NumField label="Alış fiyatı" unit="TL/kWh" value={inputs.pBuy} onChange={(v) => set('pBuy', v)} step={0.01} />
          <NumField label="Satış fiyatı (bedelli fazla)" unit="TL/kWh" value={inputs.pSell} onChange={(v) => set('pSell', v)} step={0.01} />
          <NumField label="Tarife reel artışı" unit="%/yıl" value={inputs.preal} onChange={(v) => set('preal', v)} step={0.5} />
          <NumField label="TL enflasyonu ilk 5 yıl" unit="%/yıl" value={inputs.esc1} onChange={(v) => set('esc1', v)} step={1} />
          <NumField label="TL enflasyonu sonrası" unit="%/yıl" value={inputs.esc2} onChange={(v) => set('esc2', v)} step={1} />
          <NumField label="Başlangıç kuru" unit="TL/USD" value={inputs.fx0} onChange={(v) => set('fx0', v)} step={0.5} />
          <NumField label="USD enflasyonu" unit="%/yıl" value={inputs.piUS} onChange={(v) => set('piUS', v)} step={0.5} />
          <SelField label="Kur artışı" value={inputs.fxMode} onChange={(v) => set('fxMode', v)} options={[{ value: 'ppp', label: 'SAGP (enflasyon farkı)' }, { value: 'man', label: 'Manuel oran' }]} />
          {inputs.fxMode === 'man' && <NumField label="Manuel kur artışı" unit="%/yıl" value={inputs.fxMan} onChange={(v) => set('fxMan', v)} step={1} />}
        </Grid>
      </FormCard>

      <FormCard title="Adım 5 · Batarya (BESS)">
        <SwitchField label="BESS'i modele dahil et" checked={inputs.bessOn} onChange={(v) => set('bessOn', v)} />
        {inputs.bessOn && (
          <Grid cols={3}>
            <NumField label="Kapasite" unit="kWh" value={inputs.bKwh} onChange={(v) => set('bKwh', v)} step={50} />
            <NumField label="Güç" unit="kW" value={inputs.bKw} onChange={(v) => set('bKw', v)} step={10} />
            <NumField label="Round-trip verim" unit="%" value={inputs.bRte} onChange={(v) => set('bRte', v)} step={1} />
            <NumField label="Kapasite degradasyonu" unit="%/yıl" value={inputs.bDegr} onChange={(v) => set('bDegr', v)} step={0.5} />
            <NumField label="BESS CAPEX" unit="$/kWh" value={inputs.bCapex} onChange={(v) => set('bCapex', v)} step={10} />
            <NumField label="BESS OPEX" unit="TL/kWh-yıl" value={inputs.bOpex} onChange={(v) => set('bOpex', v)} step={10} />
          </Grid>
        )}
      </FormCard>

      <FormCard title="Adım 6 · Yatırım ve Finansman">
        <Grid cols={3}>
          <NumField label="GES CAPEX" unit="$/kWp" value={inputs.capexU} onChange={(v) => set('capexU', v)} step={10} />
          <NumField label="GES OPEX" unit="TL/kWp-yıl" value={inputs.opexU} onChange={(v) => set('opexU', v)} step={10} />
          <NumField label="İskonto oranı" unit="%/yıl USD" value={inputs.r} onChange={(v) => set('r', v)} step={0.5} />
        </Grid>
        <SwitchField label="Kredi kullan" checked={inputs.lOn} onChange={(v) => set('lOn', v)} />
        {inputs.lOn && (
          <Grid cols={3}>
            <NumField label="Kredi oranı" unit="% CAPEX" value={inputs.lRatio} onChange={(v) => set('lRatio', v)} step={5} />
            <NumField label="USD faiz" unit="%/yıl" value={inputs.lRate} onChange={(v) => set('lRate', v)} step={0.5} />
            <NumField label="Vade" unit="yıl" value={inputs.lTerm} onChange={(v) => set('lTerm', v)} step={1} />
          </Grid>
        )}
      </FormCard>

      {error && <div className="rounded-lg bg-destructive/10 text-destructive p-3 text-sm">{error}</div>}
      <div className="flex justify-end sticky bottom-4">
        <Button onClick={save} disabled={saving} size="lg" className="shadow-lg">
          <Save className="h-4 w-4 mr-1.5" /> {saving ? 'Kaydediliyor…' : editId ? 'Güncelle & Kaydet' : 'Projeyi Kaydet'}
        </Button>
      </div>
    </div>
  );
}

function MiniK({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' }) {
  const color = tone === 'good' ? 'text-eco-dark' : tone === 'bad' ? 'text-destructive' : 'text-foreground';
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">{label}</div>
      <div className={`text-[13px] font-mono font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
