'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { InfoTooltip, TOOLTIPS } from '@/components/ui/info-tooltip';
import { PanelOrientation } from '@/components/wizard/PanelOrientation';
import { ConsumptionBuilder } from '@/components/wizard/ConsumptionBuilder';
import { TariffPicker } from '@/components/wizard/TariffPicker';
import { CapexOpexCockpit } from '@/components/wizard/CapexOpexCockpit';
import { InflationFxCockpit } from '@/components/wizard/InflationFxCockpit';
import { OptimalAngleFinder } from '@/components/wizard/OptimalAngleFinder';
import { ModuleInverterSizer } from '@/components/wizard/ModuleInverterSizer';
import { PtfLoader } from '@/components/wizard/PtfLoader';
import { buildDefaultConfig, buildDefaultCapex } from '@/lib/defaults';
import { DEFAULT_DAILY_OFFICE, DEFAULT_MONTHLY_EQUAL } from '@/lib/consumption-builder';
import type { ProjectConfig, ProjectType, ModuleTech, Mounting, FinancingType } from '@/lib/types';
import { formatTl, formatKwh } from '@/lib/utils';
import { ArrowLeft, ArrowRight, MapPin, Sun, Activity, Receipt, Battery, Banknote, FlaskConical, Play, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';

const STEPS = [
  { id: 1, title: 'Proje & Lokasyon', icon: MapPin },
  { id: 2, title: 'PV Sistem', icon: Sun },
  { id: 3, title: 'Tüketim', icon: Activity },
  { id: 4, title: 'Tarife', icon: Receipt },
  { id: 5, title: 'Batarya', icon: Battery },
  { id: 6, title: 'CAPEX/OPEX', icon: Wallet },
  { id: 7, title: 'Enflasyon/FX', icon: Banknote },
  { id: 8, title: 'Finansman & MC', icon: FlaskConical },
  { id: 9, title: 'Çalıştır', icon: Play },
];

const CITY_PRESETS: Record<string, { lat: number; lon: number }> = {
  'Antalya': { lat: 36.8969, lon: 30.7133 },
  'Konya': { lat: 37.8746, lon: 32.4932 },
  'İzmir': { lat: 38.4192, lon: 27.1287 },
  'İstanbul': { lat: 41.0082, lon: 28.9784 },
  'Ankara': { lat: 39.9334, lon: 32.8597 },
  'Adana': { lat: 37.0, lon: 35.3213 },
  'Şanlıurfa': { lat: 37.1591, lon: 38.7969 },
  'Mersin': { lat: 36.8121, lon: 34.6415 },
  'Gaziantep': { lat: 37.0662, lon: 37.3833 },
  'Diyarbakır': { lat: 37.9144, lon: 40.2306 },
};

export default function NewProjectPage() {
  const router = useRouter();
  const params = useSearchParams();
  const editingId = params.get('edit');
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState<ProjectConfig>(() => {
    const c = buildDefaultConfig();
    // Builder default'larını ekle
    c.consumption.profileId = 'custom_builder';
    c.consumption.builder = {
      daily: { ...DEFAULT_DAILY_OFFICE },
      monthly: [...DEFAULT_MONTHLY_EQUAL.months],
      weekendFactor: 0.3,
    };
    return c;
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editing existing project — load
  useEffect(() => {
    if (!editingId) return;
    fetch(`/api/projects/${editingId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.config) {
          const c = data.config as ProjectConfig;
          // Builder yoksa default ekle
          if (!c.consumption.builder) {
            c.consumption.builder = { daily: { ...DEFAULT_DAILY_OFFICE }, monthly: [...DEFAULT_MONTHLY_EQUAL.months], weekendFactor: 0.3 };
          }
          setConfig(c);
        }
      })
      .catch(() => {});
  }, [editingId]);

  const updateConfig = <K extends keyof ProjectConfig>(key: K, value: ProjectConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };
  const updateNested = <K extends keyof ProjectConfig, S extends keyof ProjectConfig[K]>(
    key: K, field: S, value: ProjectConfig[K][S]
  ) => {
    setConfig((prev) => ({ ...prev, [key]: { ...(prev[key] as object), [field]: value } as ProjectConfig[K] }));
  };

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      // Recompute CAPEX battery component if changed
      const finalCapex = { ...config.capex };
      if (config.battery.enabled) {
        finalCapex.battery =
          config.battery.nominalCapacityKwh * config.battery.capexTlPerKwh +
          config.battery.nominalPowerKw * config.battery.capexTlPerKw +
          config.battery.bosTl;
      } else {
        finalCapex.battery = 0;
      }
      finalCapex.total =
        finalCapex.pvModule + finalCapex.inverter + finalCapex.mounting + finalCapex.cabling +
        finalCapex.labor + finalCapex.engineering + finalCapex.gridConnection + finalCapex.tedasZbof +
        finalCapex.land + finalCapex.insurance + finalCapex.contingency + finalCapex.battery;
      const finalConfig = { ...config, capex: finalCapex };

      let projectId: string;
      if (editingId) {
        const updateRes = await fetch(`/api/projects/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config: finalConfig }),
        });
        if (!updateRes.ok) throw new Error('Proje güncellenemedi');
        projectId = editingId;
      } else {
        const createRes = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config: finalConfig }),
        });
        if (!createRes.ok) throw new Error('Proje oluşturulamadı');
        const data = await createRes.json();
        projectId = data.id;
      }

      const simRes = await fetch(`/api/simulate/${projectId}`, { method: 'POST' });
      if (!simRes.ok) {
        const data = await simRes.json().catch(() => ({}));
        throw new Error(data.detail || data.error || 'Simülasyon hatası');
      }

      router.push(`/projects/${projectId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link href={editingId ? `/projects/${editingId}` : '/'}><ArrowLeft className="h-4 w-4 mr-1" /> Geri</Link>
        </Button>
        <div className="text-sm text-muted-foreground">
          {editingId ? '✏️ Mevcut proje düzenleniyor' : '➕ Yeni proje'} · Adım {step} / {STEPS.length}
        </div>
      </div>

      <div className="space-y-2">
        <Progress value={(step / STEPS.length) * 100} />
        <div className="grid grid-cols-9 gap-1">
          {STEPS.map((s) => {
            const Icon = s.icon;
            const isActive = s.id === step;
            const isDone = s.id < step;
            return (
              <button
                key={s.id}
                onClick={() => setStep(s.id)}
                className={`p-2 rounded-md text-left transition-all border ${
                  isActive ? 'border-primary bg-primary/5' : isDone ? 'border-eco/40 bg-eco/5 text-eco-dark' : 'border-border bg-card text-muted-foreground hover:bg-secondary'
                }`}
              >
                <Icon className="h-4 w-4 mb-1" />
                <div className="text-[10px] font-medium leading-tight">{s.title}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP 1 — Proje & Lokasyon */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Proje Tanımı ve Lokasyon</CardTitle>
            <CardDescription>Projenin adı, türü ve coğrafi konumu.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Proje Adı"><Input value={config.name} onChange={(e) => updateConfig('name', e.target.value)} /></Field>
            <Field label="Açıklama"><Input value={config.description ?? ''} onChange={(e) => updateConfig('description', e.target.value)} placeholder="Kısa not (opsiyonel)" /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Proje Türü">
                <Select value={config.projectType} onValueChange={(v) => updateConfig('projectType', v as ProjectType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rooftop_ci">Çatı C&I (Ticari/Sanayi)</SelectItem>
                    <SelectItem value="ground_mount">Arazi GES (≤5 MW)</SelectItem>
                    <SelectItem value="hybrid_bess">GES + BESS Hibrit</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Şehir (preset)">
                <Select value={config.location.city ?? ''} onValueChange={(v) => { const p = CITY_PRESETS[v]; if (p) updateConfig('location', { lat: p.lat, lon: p.lon, city: v }); }}>
                  <SelectTrigger><SelectValue placeholder="Şehir seç" /></SelectTrigger>
                  <SelectContent>{Object.keys(CITY_PRESETS).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Enlem (°)"><Input type="number" step="0.0001" value={config.location.lat} onChange={(e) => updateConfig('location', { ...config.location, lat: parseFloat(e.target.value) })} /></Field>
              <Field label="Boylam (°)"><Input type="number" step="0.0001" value={config.location.lon} onChange={(e) => updateConfig('location', { ...config.location, lon: parseFloat(e.target.value) })} /></Field>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 2 — PV Sistem (PanelOrientation görsel ile) */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              PV Sistem Konfigürasyonu
              <InfoTooltip {...TOOLTIPS.pvgis} />
            </CardTitle>
            <CardDescription>Kurulu güç, eğim, azimut, modül. PVGIS bu parametrelerle 8760 saatlik üretim çekecek.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Kurulu Güç (kWp)"><Input type="number" step="1" value={config.pv.peakPowerKwp} onChange={(e) => updateNested('pv', 'peakPowerKwp', parseFloat(e.target.value))} /></Field>
              <Field label="Sistem Kaybı (%)" hint="Tipik 12-16%"><Input type="number" step="0.5" value={config.pv.loss} onChange={(e) => updateNested('pv', 'loss', parseFloat(e.target.value))} /></Field>
            </div>

            <PanelOrientation
              angle={config.pv.angle}
              aspect={config.pv.aspect}
              onAngleChange={(v) => updateNested('pv', 'angle', v)}
              onAspectChange={(v) => updateNested('pv', 'aspect', v)}
            />

            <OptimalAngleFinder
              location={config.location}
              pv={config.pv}
              onApply={(angle, aspect) => {
                updateNested('pv', 'angle', angle);
                updateNested('pv', 'aspect', aspect);
              }}
            />

            <ModuleInverterSizer peakPowerKwp={config.pv.peakPowerKwp} />

            <div className="grid grid-cols-2 gap-4">
              <Field label="Modül Teknolojisi">
                <Select value={config.pv.moduleTech} onValueChange={(v) => updateNested('pv', 'moduleTech', v as ModuleTech)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="crystSi">Kristal Si (mono/poli)</SelectItem>
                    <SelectItem value="CIS">CIS</SelectItem>
                    <SelectItem value="CdTe">CdTe</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Montaj">
                <Select value={config.pv.mounting} onValueChange={(v) => updateNested('pv', 'mounting', v as Mounting)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="building">Çatı (building)</SelectItem>
                    <SelectItem value="free">Arazi (free)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label={<span className="flex items-center gap-1.5">Yıllık Degradasyon (%) <InfoTooltip {...TOOLTIPS.degradation} /></span>}>
                <Input type="number" step="0.05" value={config.pv.annualDegradationPct * 100} onChange={(e) => updateNested('pv', 'annualDegradationPct', parseFloat(e.target.value) / 100)} />
              </Field>
              <Field label={<span className="flex items-center gap-1.5">İlk Yıl LID (%) <InfoTooltip {...TOOLTIPS.lid} /></span>}>
                <Input type="number" step="0.1" value={config.pv.lidPct * 100} onChange={(e) => updateNested('pv', 'lidPct', parseFloat(e.target.value) / 100)} />
              </Field>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 3 — Tüketim (ConsumptionBuilder) */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Tüketim Profili
              <InfoTooltip {...TOOLTIPS.netting} />
            </CardTitle>
            <CardDescription>Saatlik mahsuplaşma için 8760 saatlik tüketim profili oluştur.</CardDescription>
          </CardHeader>
          <CardContent>
            <ConsumptionBuilder
              value={{
                annualKwh: config.consumption.annualKwh,
                prevYearKwh: config.consumption.prevYearKwh,
                daily: config.consumption.builder?.daily ?? { ...DEFAULT_DAILY_OFFICE },
                monthly: { months: config.consumption.builder?.monthly ?? [...DEFAULT_MONTHLY_EQUAL.months] },
                weekendFactor: config.consumption.builder?.weekendFactor ?? 0.3,
              }}
              onChange={(v) => updateConfig('consumption', {
                ...config.consumption,
                profileId: 'custom_builder',
                annualKwh: v.annualKwh,
                prevYearKwh: v.prevYearKwh,
                builder: { daily: v.daily, monthly: v.monthly.months, weekendFactor: v.weekendFactor },
              })}
            />
          </CardContent>
        </Card>
      )}

      {/* STEP 4 — Tarife */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Tarife & Abone Grubu
              <InfoTooltip {...TOOLTIPS.sktt} />
            </CardTitle>
            <CardDescription>EPDK Karar 14461 (04.04.2026) değerleri otomatik yüklenir.</CardDescription>
          </CardHeader>
          <CardContent>
            <TariffPicker tariff={config.tariff} onChange={(t) => updateConfig('tariff', t)} />
          </CardContent>
        </Card>
      )}

      {/* STEP 5 — Batarya */}
      {step === 5 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Batarya (BESS)
              <InfoTooltip {...TOOLTIPS.augmentation} />
            </CardTitle>
            <CardDescription>LFP varsayımıyla.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Switch checked={config.battery.enabled} onCheckedChange={(c) => updateNested('battery', 'enabled', c)} />
              <Label>Batarya sistemini etkinleştir</Label>
            </div>
            {config.battery.enabled && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Nominal Kapasite (kWh)"><Input type="number" step="10" value={config.battery.nominalCapacityKwh} onChange={(e) => updateNested('battery', 'nominalCapacityKwh', parseFloat(e.target.value))} /></Field>
                  <Field label="Nominal Güç (kW)"><Input type="number" step="10" value={config.battery.nominalPowerKw} onChange={(e) => updateNested('battery', 'nominalPowerKw', parseFloat(e.target.value))} /></Field>
                  <Field label="Round-trip Verim (0..1)"><Input type="number" step="0.01" value={config.battery.roundTripEfficiency} onChange={(e) => updateNested('battery', 'roundTripEfficiency', parseFloat(e.target.value))} /></Field>
                  <Field label="Çevrim Ömrü (80% DoD)"><Input type="number" step="500" value={config.battery.cycleLifeAt80Dod} onChange={(e) => updateNested('battery', 'cycleLifeAt80Dod', parseFloat(e.target.value))} /></Field>
                  <Field label="Birim CAPEX (TL/kWh)"><Input type="number" step="100" value={config.battery.capexTlPerKwh} onChange={(e) => updateNested('battery', 'capexTlPerKwh', parseFloat(e.target.value))} /></Field>
                  <Field label="Birim CAPEX PCS (TL/kW)"><Input type="number" step="100" value={config.battery.capexTlPerKw} onChange={(e) => updateNested('battery', 'capexTlPerKw', parseFloat(e.target.value))} /></Field>
                </div>
                <div className="flex items-center gap-6 pt-2">
                  <div className="flex items-center gap-2"><Switch checked={config.battery.enablePeakShaving} onCheckedChange={(c) => updateNested('battery', 'enablePeakShaving', c)} /><Label>Peak Shaving</Label></div>
                  <div className="flex items-center gap-2"><Switch checked={config.battery.enableArbitrage} onCheckedChange={(c) => updateNested('battery', 'enableArbitrage', c)} /><Label>PTF Arbitraj</Label></div>
                  <div className="flex items-center gap-2"><Switch checked={config.battery.augmentationEnabled} onCheckedChange={(c) => updateNested('battery', 'augmentationEnabled', c)} /><Label>Augmentation</Label></div>
                </div>
                <div className="rounded-lg bg-secondary/50 p-4 text-sm">
                  Batarya CAPEX: <span className="font-mono text-foreground">{formatTl(config.battery.nominalCapacityKwh * config.battery.capexTlPerKwh + config.battery.nominalPowerKw * config.battery.capexTlPerKw + config.battery.bosTl, { compact: true })}</span>
                </div>

                {config.battery.enableArbitrage && (
                  <PtfLoader
                    ptfHourly={config.ptfHourly}
                    onChange={(h) => updateConfig('ptfHourly', h)}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* STEP 6 — CAPEX/OPEX */}
      {step === 6 && (
        <CapexOpexCockpit
          capex={config.capex}
          opex={config.opex}
          onCapexChange={(c) => updateConfig('capex', c)}
          onOpexChange={(o) => updateConfig('opex', o)}
          peakPowerKwp={config.pv.peakPowerKwp}
          usdTry={config.fx.usdTry}
          projectType={config.projectType}
        />
      )}

      {/* STEP 7 — Enflasyon & FX */}
      {step === 7 && (
        <InflationFxCockpit
          fx={config.fx}
          tariff={config.tariff}
          onFxChange={(f) => updateConfig('fx', f)}
          onTariffChange={(t) => updateConfig('tariff', t)}
          analysisYears={config.analysisYears}
        />
      )}

      {/* STEP 8 — Finansman & Monte Carlo */}
      {step === 8 && (
        <Card>
          <CardHeader>
            <CardTitle>Finansman ve Risk Analizi</CardTitle>
            <CardDescription>3 finansman seçeneği + Monte Carlo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Finansman Tipi">
              <Select value={config.financing.type} onValueChange={(v) => updateNested('financing', 'type', v as FinancingType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="equity">%100 Öz Sermaye</SelectItem>
                  <SelectItem value="loan">Banka Kredisi</SelectItem>
                  <SelectItem value="leasing">Leasing</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {config.financing.type === 'loan' && (
              <div className="grid grid-cols-2 gap-4">
                <Field label={<span className="flex items-center gap-1.5">Öz Sermaye Payı (%) <InfoTooltip title="Öz Sermaye Payı" body="Toplam yatırımın yüzde kaçının öz kaynaktan finanse edileceği. Türkiye'de banka asgari %25-30 öz sermaye talep eder. Örn. %30 = sponsor 30, banka 70 kredi sağlar." /></span>} hint="Banka asgari: %25-30">
                  <div className="flex items-center gap-2">
                    <Input type="number" step="5" min={10} max={100} value={Math.round((config.financing.equityPct ?? 0.3) * 100)} onChange={(e) => updateNested('financing', 'equityPct', Math.max(0.05, Math.min(1, parseFloat(e.target.value) / 100)))} />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </Field>
                <Field label="Vade (yıl)"><Input type="number" step="1" value={config.financing.loanTermYears ?? 7} onChange={(e) => updateNested('financing', 'loanTermYears', parseFloat(e.target.value))} /></Field>
                <Field label="TL Faiz Oranı (%)"><Input type="number" step="0.5" value={config.financing.interestRatePctTl ?? 35} onChange={(e) => updateNested('financing', 'interestRatePctTl', parseFloat(e.target.value))} /></Field>
                <Field label="Geri Ödeme">
                  <Select value={config.financing.repaymentType ?? 'annuity'} onValueChange={(v) => updateNested('financing', 'repaymentType', v as 'annuity' | 'equal_principal')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="annuity">Annüite</SelectItem>
                      <SelectItem value="equal_principal">Eşit Anapara</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
              <Field label={<span className="flex items-center gap-1.5">İndirgeme Oranı / WACC (%) <InfoTooltip {...TOOLTIPS.npv} /></span>}>
                <Input type="number" step="0.5" value={config.financing.discountRatePct} onChange={(e) => updateNested('financing', 'discountRatePct', parseFloat(e.target.value))} />
              </Field>
              <Field label="Analiz Süresi (yıl)"><Input type="number" step="1" min={5} max={30} value={config.analysisYears} onChange={(e) => updateConfig('analysisYears', parseInt(e.target.value))} /></Field>
            </div>
            <div className="pt-4 border-t">
              <div className="flex items-center gap-3 mb-3">
                <Switch checked={config.monteCarlo.enabled} onCheckedChange={(c) => updateNested('monteCarlo', 'enabled', c)} />
                <Label className="flex items-center gap-1.5">Monte Carlo Risk Analizi <InfoTooltip {...TOOLTIPS.monteCarlo} /></Label>
              </div>
              {config.monteCarlo.enabled && (
                <div className="grid grid-cols-2 gap-4">
                  <Field label="İterasyon"><Input type="number" step="100" value={config.monteCarlo.iterations} onChange={(e) => updateNested('monteCarlo', 'iterations', parseFloat(e.target.value))} /></Field>
                  <Field label="Seed (tekrarlanabilirlik)"><Input type="number" step="1" value={config.monteCarlo.seed ?? 42} onChange={(e) => updateNested('monteCarlo', 'seed', parseInt(e.target.value, 10))} /></Field>
                </div>
              )}
            </div>

            {/* --- PPA --- */}
            {config.financing.type === 'loan' && (
              <div className="pt-4 border-t">
                <div className="flex items-center gap-3 mb-3">
                  <Switch checked={!!config.financing.refinancing?.enabled} onCheckedChange={(c) => updateConfig('financing', { ...config.financing, refinancing: { enabled: c, yearN: config.financing.refinancing?.yearN ?? 5, newInterestRatePctTl: config.financing.refinancing?.newInterestRatePctTl ?? 22, newTermYears: config.financing.refinancing?.newTermYears ?? 5, refinancingFeePct: config.financing.refinancing?.refinancingFeePct ?? 1 } })} />
                  <Label>Refinansman (yıl N'de yeni faizle yenile)</Label>
                </div>
                {config.financing.refinancing?.enabled && (
                  <div className="grid grid-cols-4 gap-3">
                    <Field label="Refi Yılı"><Input type="number" min={2} max={20} value={config.financing.refinancing.yearN} onChange={(e) => updateConfig('financing', { ...config.financing, refinancing: { ...config.financing.refinancing!, yearN: parseInt(e.target.value) || 5 } })} /></Field>
                    <Field label="Yeni Faiz (%)"><Input type="number" step="0.5" value={config.financing.refinancing.newInterestRatePctTl} onChange={(e) => updateConfig('financing', { ...config.financing, refinancing: { ...config.financing.refinancing!, newInterestRatePctTl: parseFloat(e.target.value) || 22 } })} /></Field>
                    <Field label="Yeni Vade (yıl)"><Input type="number" value={config.financing.refinancing.newTermYears} onChange={(e) => updateConfig('financing', { ...config.financing, refinancing: { ...config.financing.refinancing!, newTermYears: parseInt(e.target.value) || 5 } })} /></Field>
                    <Field label="Refi Komisyonu (%)"><Input type="number" step="0.1" value={config.financing.refinancing.refinancingFeePct} onChange={(e) => updateConfig('financing', { ...config.financing, refinancing: { ...config.financing.refinancing!, refinancingFeePct: parseFloat(e.target.value) || 1 } })} /></Field>
                  </div>
                )}
              </div>
            )}

            <div className="pt-4 border-t">
              <div className="flex items-center gap-3 mb-3">
                <Switch checked={!!config.ppa?.enabled} onCheckedChange={(c) => updateConfig('ppa', { ...(config.ppa ?? { ppaPriceTlKwh: 4.5, ppaTermYears: 10, ppaEscalationPct: 2, scope: 'surplus_only' as const }), enabled: c })} />
                <Label className="flex items-center gap-1.5">PPA (İkili Anlaşma) <InfoTooltip title="PPA" body="Power Purchase Agreement. Kurumsal alıcı ile sabit fiyat anlaşması (örn. 10 yıl). PPA fiyatı tarife satış fiyatı yerine geçer." /></Label>
              </div>
              {config.ppa?.enabled && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="PPA Fiyatı (TL/kWh)"><Input type="number" step="0.05" value={config.ppa.ppaPriceTlKwh} onChange={(e) => updateConfig('ppa', { ...config.ppa!, ppaPriceTlKwh: parseFloat(e.target.value) || 0 })} /></Field>
                  <Field label="Vade (yıl)"><Input type="number" value={config.ppa.ppaTermYears} onChange={(e) => updateConfig('ppa', { ...config.ppa!, ppaTermYears: parseInt(e.target.value) || 10 })} /></Field>
                  <Field label="Yıllık Escalation (%)"><Input type="number" step="0.5" value={config.ppa.ppaEscalationPct} onChange={(e) => updateConfig('ppa', { ...config.ppa!, ppaEscalationPct: parseFloat(e.target.value) || 0 })} /></Field>
                  <Field label="Kapsam">
                    <Select value={config.ppa.scope} onValueChange={(v) => updateConfig('ppa', { ...config.ppa!, scope: v as 'all' | 'surplus_only' })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="surplus_only">Yalnız İhtiyaç Fazlası</SelectItem>
                        <SelectItem value="all">Tüm Üretim (mahsup yok)</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Karşı Taraf (rapor için)"><Input value={config.ppa.counterpartyName ?? ''} onChange={(e) => updateConfig('ppa', { ...config.ppa!, counterpartyName: e.target.value })} placeholder="örn. Migros, Türk Telekom" /></Field>
                </div>
              )}
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center gap-3 mb-3">
                <Switch checked={!!config.carbonCredit?.enabled} onCheckedChange={(c) => updateConfig('carbonCredit', { ...(config.carbonCredit ?? { standard: 'VCS' as const, pricePerTonUsd: 12, certificationCostUsdYearly: 8000, creditingPeriodYears: 10 }), enabled: c })} />
                <Label className="flex items-center gap-1.5">Karbon Kredisi <InfoTooltip title="Karbon Kredisi" body="VCS / Gold Standard / CDM ile her ton önlenen CO2e için kredi satışı. 2026 VCS solar tipik $8-15/ton. Sertifika maliyetini yıllık OPEX'e ekler." /></Label>
              </div>
              {config.carbonCredit?.enabled && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Standart">
                    <Select value={config.carbonCredit.standard} onValueChange={(v) => updateConfig('carbonCredit', { ...config.carbonCredit!, standard: v as 'VCS' | 'GOLD_STANDARD' | 'CDM' | 'OTHER' })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="VCS">VCS (Verra)</SelectItem>
                        <SelectItem value="GOLD_STANDARD">Gold Standard</SelectItem>
                        <SelectItem value="CDM">CDM (UN)</SelectItem>
                        <SelectItem value="OTHER">Diğer</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Fiyat (USD/tCO₂e)"><Input type="number" step="0.5" value={config.carbonCredit.pricePerTonUsd} onChange={(e) => updateConfig('carbonCredit', { ...config.carbonCredit!, pricePerTonUsd: parseFloat(e.target.value) || 0 })} /></Field>
                  <Field label="Yıllık Sertifika Maliyeti (USD)"><Input type="number" step="500" value={config.carbonCredit.certificationCostUsdYearly} onChange={(e) => updateConfig('carbonCredit', { ...config.carbonCredit!, certificationCostUsdYearly: parseFloat(e.target.value) || 0 })} /></Field>
                  <Field label="Crediting Period (yıl)"><Input type="number" value={config.carbonCredit.creditingPeriodYears} onChange={(e) => updateConfig('carbonCredit', { ...config.carbonCredit!, creditingPeriodYears: parseInt(e.target.value) || 10 })} /></Field>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 9 — Run */}
      {step === 9 && (
        <Card>
          <CardHeader>
            <CardTitle>Özet ve Çalıştır</CardTitle>
            <CardDescription>"Çalıştır" ile PVGIS çekilir, 8760×25 yıl + Monte Carlo çalışır, dashboard açılır.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <SummaryRow label="Proje" value={config.name} />
              <SummaryRow label="Türü" value={config.projectType} />
              <SummaryRow label="Lokasyon" value={`${config.location.city ?? ''} (${config.location.lat.toFixed(3)}, ${config.location.lon.toFixed(3)})`} />
              <SummaryRow label="Kurulu Güç" value={`${config.pv.peakPowerKwp} kWp`} />
              <SummaryRow label="Açı / Azimut" value={`${config.pv.angle}° / ${config.pv.aspect}°`} />
              <SummaryRow label="Tüketim" value={formatKwh(config.consumption.annualKwh)} />
              <SummaryRow label="Tüketim modu" value={config.consumption.profileId === 'custom_builder' ? 'Builder (saatlik + aylık)' : config.consumption.profileId} />
              <SummaryRow label="Abone Grubu" value={config.tariff.consumerGroup} />
              <SummaryRow label="Batarya" value={config.battery.enabled ? `${config.battery.nominalCapacityKwh} kWh / ${config.battery.nominalPowerKw} kW` : 'Yok'} />
              <SummaryRow label="Finansman" value={config.financing.type} />
              <SummaryRow label="Discount Rate" value={`${config.financing.discountRatePct}%`} />
              <SummaryRow label="Monte Carlo" value={config.monteCarlo.enabled ? `${config.monteCarlo.iterations} koşum` : 'Kapalı'} />
            </div>
            {error && <div className="rounded-lg bg-destructive/10 text-destructive p-3 text-sm">{error}</div>}
            <Button onClick={submit} disabled={submitting} size="lg" className="w-full">
              {submitting ? 'Çalışıyor — PVGIS + 8760×25 saat motoru + finans + Monte Carlo...' : (editingId ? 'Güncelle & Yeniden Çalıştır' : 'Fizibiliteyi Çalıştır')}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Önceki
        </Button>
        <Button onClick={() => setStep((s) => Math.min(STEPS.length, s + 1))} disabled={step === STEPS.length}>
          Sonraki <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: React.ReactNode; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-border/50">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
