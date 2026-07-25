'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FormCard, Grid, NumField, TextField, SelField, SwitchField } from '@/components/models/form-kit';
import { computeUtility } from '@/lib/models/utility/engine';
import type { UtilityInputs } from '@/lib/models/utility/engine';
import { defaultUtilityInputs } from '@/lib/models/utility/defaults';
import { musd, pct, nf, usd } from '@/lib/models/fmt';
import { ArrowLeft, Save } from 'lucide-react';

export function UtilityBuilder({ editId }: { editId?: string }) {
  const router = useRouter();
  const [inputs, setInputs] = useState<UtilityInputs>(() => defaultUtilityInputs());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editId) return;
    fetch(`/api/projects/${editId}`)
      .then((r) => r.json())
      .then((d) => { if (d?.config?.kind === 'utility') setInputs({ ...defaultUtilityInputs(), ...d.config.inputs }); })
      .catch(() => {});
  }, [editId]);

  const set = <K extends keyof UtilityInputs>(k: K, v: UtilityInputs[K]) => setInputs((p) => ({ ...p, [k]: v }));
  const setHw = <K extends keyof UtilityInputs['huawei']>(k: K, v: UtilityInputs['huawei'][K]) =>
    setInputs((p) => ({ ...p, huawei: { ...p.huawei, [k]: v } }));

  const m = useMemo(() => computeUtility(inputs), [inputs]);
  const tlMode = inputs.cur === 'tl';
  const bankOk = Number.isFinite(m.minDSCR) ? m.minDSCR >= 1.2 && m.llcr >= 1.2 && m.residual <= 1 : true;

  async function save() {
    setSaving(true); setError(null);
    try {
      const config = { kind: 'utility' as const, name: inputs.pname || 'Utility Projesi', inputs };
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
        <div className="text-xs text-muted-foreground">Utility (GES + BESS Proje Finansmanı) · {editId ? 'düzenleme' : 'yeni proje'}</div>
      </div>

      {/* Canlı KPI şeridi */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border border-border rounded-lg p-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center">
          <MiniK label="NPV" value={musd(m.npv)} tone={m.npv >= 0 ? 'good' : 'bad'} />
          <MiniK label="Proje IRR" value={pct(m.irr * 100, 1)} />
          <MiniK label="Equity IRR" value={pct(m.eIRR * 100, 1)} />
          <MiniK label="LCOE" value={`${nf(m.lcoe, 1)} $/MWh`} />
          <MiniK label="Min/Ort DSCR" value={Number.isFinite(m.minDSCR) ? `${nf(m.minDSCR, 2)}/${nf(m.avgDSCR, 2)}` : '—'} />
          <MiniK label="LLCR" value={nf(m.llcr, 2)} />
          <MiniK label="Toplam Yatırım" value={musd(m.totalUses)} />
        </div>
        <div className={`mt-2 text-xs rounded px-3 py-1.5 ${m.npv >= 0 && bankOk ? 'bg-eco/10 text-eco-dark' : 'bg-destructive/10 text-destructive'}`}>
          {m.npv >= 0 && bankOk
            ? `✔ Finanse edilebilir görünüyor — IRR ${pct(m.irr * 100, 1)} > r ${pct(m.r * 100, 1)}, min DSCR ${nf(m.minDSCR, 2)}, LLCR ${nf(m.llcr, 2)}.`
            : m.residual > 1 ? `⚠ Vade sonunda ${usd(m.residual)} bakiye kalıyor — gearing düşür veya vadeyi uzat.`
            : `⚠ Borç tarafı zayıf veya NPV negatif — varsayımları gözden geçir.`}
        </div>
      </div>

      <FormCard title="Proje Bilgisi">
        <Grid>
          <TextField label="Proje adı" value={inputs.pname} onChange={(v) => set('pname', v)} />
          <TextField label="Hazırlayan" value={inputs.prep} onChange={(v) => set('prep', v)} />
        </Grid>
      </FormCard>

      <FormCard title="Adım 1-2 · Kurulu Güç, CAPEX ve Üretim">
        <Grid cols={3}>
          <NumField label="Kurulu güç" unit="MWp DC" value={inputs.mw} onChange={(v) => set('mw', v)} step={1} />
          <NumField label="EPC CAPEX" unit="$/kWp" value={inputs.capexUnit} onChange={(v) => set('capexUnit', v)} step={5} />
          <NumField label="Spesifik üretim P50" unit="kWh/kWp" value={inputs.spec} onChange={(v) => set('spec', v)} step={10} />
          <NumField label="P90/P50" unit="%" value={inputs.p90} onChange={(v) => set('p90', v)} step={0.5} />
          <SelField label="Üretim senaryosu" value={inputs.scen} onChange={(v) => set('scen', v)} options={[{ value: 'p50', label: 'P50 (beklenen)' }, { value: 'p90', label: 'P90 (muhafazakâr)' }]} />
          <NumField label="Availability" unit="%" value={inputs.avail} onChange={(v) => set('avail', v)} step={0.1} />
          <NumField label="Kısıntı / curtailment" unit="%" value={inputs.curt} onChange={(v) => set('curt', v)} step={0.5} />
          <NumField label="Degradasyon" unit="%/yıl" value={inputs.degr} onChange={(v) => set('degr', v)} step={0.05} />
          <NumField label="Santral ömrü" unit="yıl" value={inputs.life} onChange={(v) => set('life', v)} step={1} />
        </Grid>
      </FormCard>

      <FormCard title="Adım 3 · İşletme Gideri, Yenileme, Uç Değer">
        <Grid cols={3}>
          <NumField label="OPEX" unit="$/MWp/yıl" value={inputs.opexUnit} onChange={(v) => set('opexUnit', v)} step={250} />
          <NumField label="OPEX'in TL payı" unit="%" value={inputs.opexShare} onChange={(v) => set('opexShare', v)} step={5} />
          <NumField label="OPEX eskalasyonu (USD modu)" unit="%/yıl" value={inputs.opexEsc} onChange={(v) => set('opexEsc', v)} step={0.5} />
          <NumField label="İnverter yenileme yılı" unit="0=yok" value={inputs.replYear} onChange={(v) => set('replYear', v)} step={1} />
          <NumField label="Yenileme maliyeti" unit="$/kWp" value={inputs.replCost} onChange={(v) => set('replCost', v)} step={1} />
          <NumField label="Uç değer / söküm (net)" unit="$" value={inputs.salvage} onChange={(v) => set('salvage', v)} step={100000} />
        </Grid>
      </FormCard>

      <FormCard title="Adım 4 · Gelir ve Kur-Enflasyon">
        <Grid>
          <SelField label="Para birimi / gelir modu" value={inputs.cur} onChange={(v) => set('cur', v)} options={[{ value: 'tl', label: 'TL gelir + kur projeksiyonu' }, { value: 'usd', label: 'USD (basit / yurt dışı)' }]} />
          <SelField label="Gelir rejimi" value={inputs.pmode} onChange={(v) => set('pmode', v)} options={[{ value: 'single', label: 'Tek rejim' }, { value: 'two', label: 'İki dönemli (PPA → merchant)' }]} />
        </Grid>
        {inputs.pmode === 'two' && (
          <Grid cols={3}>
            <NumField label="PPA süresi" unit="yıl" value={inputs.ppaY} onChange={(v) => set('ppaY', v)} step={1} />
            {tlMode && <SelField label="PPA fiyat tipi" value={inputs.ppaCur} onChange={(v) => set('ppaCur', v)} options={[{ value: 'usd', label: 'USD sabit' }, { value: 'tl', label: 'TL, TÜFE endeksli' }]} />}
            {inputs.ppaCur === 'usd' ? (
              <>
                <NumField label="PPA fiyatı" unit="$/MWh" value={inputs.ppaUSD} onChange={(v) => set('ppaUSD', v)} step={1} />
                <NumField label="PPA eskalasyonu" unit="%/yıl" value={inputs.ppaEsc} onChange={(v) => set('ppaEsc', v)} step={0.5} />
              </>
            ) : (
              <NumField label="PPA fiyatı" unit="TL/MWh" value={inputs.ppaTL} onChange={(v) => set('ppaTL', v)} step={50} />
            )}
          </Grid>
        )}
        {tlMode ? (
          <Grid cols={3}>
            <NumField label="Başlangıç kuru" unit="TL/USD" value={inputs.fx0} onChange={(v) => set('fx0', v)} step={0.5} />
            <NumField label="TL enflasyonu ilk 5 yıl" unit="%/yıl" value={inputs.piTLa} onChange={(v) => set('piTLa', v)} step={1} />
            <NumField label="TL enflasyonu sonrası" unit="%/yıl" value={inputs.piTLb} onChange={(v) => set('piTLb', v)} step={1} />
            <NumField label="USD enflasyonu" unit="%/yıl" value={inputs.piUS} onChange={(v) => set('piUS', v)} step={0.5} />
            <SelField label="Kur artışı" value={inputs.fxMode} onChange={(v) => set('fxMode', v)} options={[{ value: 'ppp', label: 'SAGP (enflasyon farkı)' }, { value: 'man', label: 'Manuel oran' }]} />
            {inputs.fxMode === 'man' && <NumField label="Manuel kur artışı" unit="%/yıl" value={inputs.fxMan} onChange={(v) => set('fxMan', v)} step={1} />}
            <NumField label="Elektrik satış fiyatı" unit="TL/MWh" value={inputs.priceTL} onChange={(v) => set('priceTL', v)} step={50} />
            <NumField label="Reel fiyat artışı" unit="%/yıl" value={inputs.priceReal} onChange={(v) => set('priceReal', v)} step={0.5} />
          </Grid>
        ) : (
          <Grid>
            <NumField label="Elektrik satış fiyatı" unit="$/MWh" value={inputs.price} onChange={(v) => set('price', v)} step={1} />
            <NumField label="Fiyat eskalasyonu" unit="%/yıl" value={inputs.priceEsc} onChange={(v) => set('priceEsc', v)} step={0.5} />
          </Grid>
        )}
      </FormCard>

      <FormCard title="Adım 5 · Batarya (BESS) — Opsiyonel">
        <SwitchField label="BESS'i modele dahil et" checked={inputs.bessOn} onChange={(v) => set('bessOn', v)} />
        {inputs.bessOn && (
          <Grid cols={3}>
            <NumField label="Güç" unit="MW" value={inputs.bMW} onChange={(v) => set('bMW', v)} step={1} />
            <NumField label="Kapasite" unit="MWh" value={inputs.bMWh} onChange={(v) => set('bMWh', v)} step={1} />
            <NumField label="CAPEX" unit="$/kWh" value={inputs.bCapexU} onChange={(v) => set('bCapexU', v)} step={5} />
            <NumField label="OPEX" unit="$/kWh/yıl" value={inputs.bOpexU} onChange={(v) => set('bOpexU', v)} step={0.5} />
            <NumField label="Round-trip verim" unit="%" value={inputs.bRTE} onChange={(v) => set('bRTE', v)} step={0.5} />
            <NumField label="Günlük cycle" value={inputs.bCyc} onChange={(v) => set('bCyc', v)} step={0.1} />
            <NumField label="Kapasite degradasyonu" unit="%/yıl" value={inputs.bDegr} onChange={(v) => set('bDegr', v)} step={0.25} />
            <NumField label="Availability" unit="%" value={inputs.bAvail} onChange={(v) => set('bAvail', v)} step={0.5} />
            {tlMode ? (
              <>
                <NumField label="Şarj fiyatı" unit="TL/MWh" value={inputs.bPcTL} onChange={(v) => set('bPcTL', v)} step={50} />
                <NumField label="Deşarj fiyatı" unit="TL/MWh" value={inputs.bPdTL} onChange={(v) => set('bPdTL', v)} step={50} />
              </>
            ) : (
              <>
                <NumField label="Şarj fiyatı" unit="$/MWh" value={inputs.bPc} onChange={(v) => set('bPc', v)} step={1} />
                <NumField label="Deşarj fiyatı" unit="$/MWh" value={inputs.bPd} onChange={(v) => set('bPd', v)} step={1} />
              </>
            )}
            <NumField label="Güçlendirme yılı" unit="0=yok" value={inputs.bAugY} onChange={(v) => set('bAugY', v)} step={1} />
            <NumField label="Güçlendirme maliyeti" unit="$/kWh" value={inputs.bAugC} onChange={(v) => set('bAugC', v)} step={5} />
          </Grid>
        )}
      </FormCard>

      <FormCard title="Adım 6 · Vergi, Amortisman, KDV">
        <Grid cols={3}>
          <NumField label="Kurumlar vergisi" unit="%" value={inputs.tax} onChange={(v) => set('tax', v)} step={1} />
          <NumField label="Vergi tatili" unit="yıl" value={inputs.holiday} onChange={(v) => set('holiday', v)} step={1} />
          <NumField label="Amortisman süresi" unit="yıl" value={inputs.depY} onChange={(v) => set('depY', v)} step={1} />
          <NumField label="KDV oranı" unit="%, 0=muaf" value={inputs.vat} onChange={(v) => set('vat', v)} step={1} />
          <NumField label="KDV iade süresi" unit="ay" value={inputs.vatM} onChange={(v) => set('vatM', v)} step={1} />
        </Grid>
      </FormCard>

      <FormCard title="Adım 7 · İnşaat Dönemi">
        <Grid>
          <NumField label="İnşaat süresi" unit="ay" value={inputs.consM} onChange={(v) => set('consM', v)} step={1} />
          <SelField label="Harcama / çekiliş sırası" value={inputs.order} onChange={(v) => set('order', v)} options={[{ value: 'eq', label: 'Önce özkaynak' }, { value: 'pro', label: 'Eşzamanlı (pro-rata)' }]} />
        </Grid>
      </FormCard>

      <FormCard title="Adım 8 · Borç Yapısı">
        <Grid cols={3}>
          <NumField label="Kaldıraç / gearing" unit="%" value={inputs.debt} onChange={(v) => set('debt', v)} step={5} />
          <NumField label="Kredi faizi" unit="%/yıl" value={inputs.kd} onChange={(v) => set('kd', v)} step={0.25} />
          <NumField label="Toplam vade / tenor" unit="yıl" value={inputs.tenor} onChange={(v) => set('tenor', v)} step={1} />
          <NumField label="Grace period" unit="yıl" value={inputs.grace} onChange={(v) => set('grace', v)} step={1} />
          <SelField label="Geri ödeme yöntemi" value={inputs.style} onChange={(v) => set('style', v)} options={[{ value: 'sculpt', label: 'DSCR-sculpted' }, { value: 'ann', label: 'Anüite' }, { value: 'eqp', label: 'Eşit anapara' }]} />
          <NumField label="Hedef DSCR" value={inputs.target} onChange={(v) => set('target', v)} step={0.05} />
          <NumField label="DSRA" unit="ay" value={inputs.dsraM} onChange={(v) => set('dsraM', v)} step={1} />
          <NumField label="Düzenleme ücreti" unit="%" value={inputs.fee} onChange={(v) => set('fee', v)} step={0.25} />
          <NumField label="Özkaynak beklentisi" unit="%/yıl" value={inputs.ke} onChange={(v) => set('ke', v)} step={0.5} />
        </Grid>
        <SwitchField label="WACC'ı iskonto oranı olarak kullan" checked={inputs.useWacc} onChange={(v) => set('useWacc', v)} />
        {!inputs.useWacc && (
          <Grid>
            <NumField label="Manuel iskonto oranı" unit="%/yıl" value={inputs.rManual} onChange={(v) => set('rManual', v)} step={0.25} />
          </Grid>
        )}
      </FormCard>

      <FormCard title="Huawei Değer Analizi (opsiyonel girdiler)">
        <Grid cols={2}>
          <NumField label="İnverter adedi" value={inputs.huawei.count} onChange={(v) => setHw('count', v)} step={1} />
          <NumField label="İnverter başına fiyat farkı" unit="$/adet" value={inputs.huawei.diff} onChange={(v) => setHw('diff', v)} step={50} />
          <NumField label="Üretim avantajı" unit="%/yıl" value={inputs.huawei.prodPct} onChange={(v) => setHw('prodPct', v)} step={0.25} />
          <NumField label="OPEX tasarrufu" unit="%" value={inputs.huawei.opexPct} onChange={(v) => setHw('opexPct', v)} step={1} />
        </Grid>
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
