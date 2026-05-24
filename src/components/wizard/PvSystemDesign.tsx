'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { LossBreakdown, DEFAULT_LOSSES, computeLosses, MODULE_LIBRARY, INVERTER_LIBRARY } from '@/lib/pv-losses';
import { PVSystemConfig } from '@/lib/types';
import { Sun, Cable, Zap, Settings2 } from 'lucide-react';

/**
 * PVSyst tarzı kapsamlı PV sistem tasarımı.
 *
 * Bölümler:
 *   1. Modül seçimi (kütüphane veya custom)
 *   2. İnvertör seçimi
 *   3. Konfigürasyon (string × MPPT)
 *   4. Kayıp kırınımı (10 kalem)
 *   5. Toplam kayıp özeti — PVGIS loss parametresine bağlanır
 */
export function PvSystemDesign({
  pv,
  onPvChange,
  losses,
  onLossesChange,
}: {
  pv: PVSystemConfig;
  onPvChange: (next: PVSystemConfig) => void;
  losses: LossBreakdown;
  onLossesChange: (next: LossBreakdown) => void;
}) {
  const [selectedModule, setSelectedModule] = useState(0);
  const [selectedInverter, setSelectedInverter] = useState(0);

  const lossesResult = useMemo(() => computeLosses(losses), [losses]);

  const module = MODULE_LIBRARY[selectedModule];
  const inverter = INVERTER_LIBRARY[selectedInverter];

  // Otomatik konfigürasyon hesabı
  const totalModules = Math.round((pv.peakPowerKwp * 1000) / module.wp);
  const modulesPerString = Math.floor((inverter.maxInputVdc * 0.85) / module.voc);
  const totalStrings = Math.ceil(totalModules / modulesPerString);
  const stringsPerInverter = inverter.mpptCount * 2;
  const totalInverters = Math.ceil(totalStrings / stringsPerInverter);
  const totalAcKw = totalInverters * inverter.acKw;
  const dcAcRatio = totalAcKw > 0 ? (totalModules * module.wp) / 1000 / totalAcKw : 0;

  // Kullanıcı toplam loss'u değiştirdiğinde pv.loss'u güncelle
  function applyLossesToPv() {
    onPvChange({ ...pv, loss: parseFloat(lossesResult.totalLossPct.toFixed(2)) });
  }

  return (
    <div className="space-y-5">
      {/* MODÜL SEÇİMİ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sun className="h-4 w-4 text-solar" /> 1. Modül Seçimi
            <InfoTooltip title="PV Modül" body="2026 Tier-1 N-type TOPCon / mono PERC. Yüksek verim (>22%), iyi sıcaklık katsayısı (-0.28 ~ -0.30%/°C)." />
          </CardTitle>
          <CardDescription className="text-xs">Datasheet bazlı modül kütüphanesi. Custom için manuel girebilirsin.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={String(selectedModule)} onValueChange={(v) => setSelectedModule(parseInt(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {MODULE_LIBRARY.map((m, i) => (
                <SelectItem key={i} value={String(i)}>
                  {m.brand} · {m.model} · {m.wp}W (η %{(m.efficiency * 100).toFixed(1)}) {m.bifacial && '· bifacial'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="grid grid-cols-4 gap-2 text-xs">
            <Spec label="Güç" value={`${module.wp} Wp`} />
            <Spec label="Verim" value={`%${(module.efficiency * 100).toFixed(1)}`} />
            <Spec label="Vmp / Voc" value={`${module.vmp} / ${module.voc} V`} />
            <Spec label="Imp / Isc" value={`${module.imp} / ${module.isc} A`} />
            <Spec label="Sıcaklık Kats." value={`${module.tempCoeffPmaxPctPerC} %/°C`} />
            <Spec label="Bifacial" value={module.bifacial ? 'Evet' : 'Hayır'} />
            <Spec label="Modül Sayısı" value={totalModules.toLocaleString('tr-TR')} highlight />
            <Spec label="Toplam DC" value={`${((totalModules * module.wp) / 1000).toFixed(1)} kW`} highlight />
          </div>
        </CardContent>
      </Card>

      {/* İNVERTÖR SEÇİMİ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4 text-amber-500" /> 2. İnvertör Seçimi
            <InfoTooltip title="İnvertör" body="String inverter (orta proje) veya central (>1 MW). EU efficiency >%98.5. 1500V DC bus desteği önemli (Tier-1 modüller için)." />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={String(selectedInverter)} onValueChange={(v) => setSelectedInverter(parseInt(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {INVERTER_LIBRARY.map((iv, i) => (
                <SelectItem key={i} value={String(i)}>
                  {iv.brand} · {iv.model} · {iv.acKw} kW (η %{(iv.efficiencyEur * 100).toFixed(1)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="grid grid-cols-4 gap-2 text-xs">
            <Spec label="AC Güç" value={`${inverter.acKw} kW`} />
            <Spec label="Max DC" value={`${inverter.maxDcKw} kW`} />
            <Spec label="EU Verim" value={`%${(inverter.efficiencyEur * 100).toFixed(1)}`} />
            <Spec label="MPPT" value={`${inverter.mpptCount}`} />
            <Spec label="Max Vdc" value={`${inverter.maxInputVdc} V`} />
            <Spec label="Tip" value={inverter.type === 'string' ? 'String' : 'Central'} />
            <Spec label="İnvertör Sayısı" value={`${totalInverters}`} highlight />
            <Spec label="Toplam AC" value={`${totalAcKw.toFixed(0)} kW`} highlight />
          </div>
        </CardContent>
      </Card>

      {/* KONFIGÜRASYON */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings2 className="h-4 w-4 text-primary" /> 3. String & DC/AC Konfigürasyonu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs">
            <Spec label="Modül/String" value={`${modulesPerString}`} />
            <Spec label="Toplam String" value={`${totalStrings.toLocaleString('tr-TR')}`} />
            <Spec label="String/Invertör" value={`${stringsPerInverter}`} />
            <Spec label="String DC Vmp" value={`${(module.vmp * modulesPerString).toFixed(0)} V`} />
            <Spec label="String Isc" value={`${module.isc.toFixed(2)} A`} />
            <Spec
              label="DC/AC Oranı"
              value={dcAcRatio.toFixed(2)}
              highlight
              status={dcAcRatio > 1.4 ? 'red' : dcAcRatio > 1.3 ? 'amber' : dcAcRatio >= 1.15 ? 'eco' : 'amber'}
            />
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            DC/AC <strong>1.15-1.30</strong> optimum · <strong>1.30-1.40</strong> arazi GES için OK (clipping toleransı) · &gt;1.40 sık clipping kaybı
          </div>
        </CardContent>
      </Card>

      {/* KAYIPLAR */}
      <Card className="border-amber-300/40">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Cable className="h-4 w-4 text-amber-600" /> 4. Sistem Kayıp Kırınımı (PVSyst Tarzı)
            <InfoTooltip title="Kayıp Zinciri" body="Her kayıp multiplicative uygulanır: remaining = remaining × (1 - loss). Toplam = 1 - Π remaining. Bu değer PVGIS 'loss' parametresine eşittir." />
          </CardTitle>
          <CardDescription className="text-xs">
            Düzenle, sonra altta "Uygula" tıkla — PVGIS kayıp parametresi otomatik güncellenecek.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-secondary">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">Kayıp Kalemi</th>
                  <th className="text-right px-3 py-2 font-semibold whitespace-nowrap">Değer (%)</th>
                  <th className="text-right px-3 py-2 font-semibold whitespace-nowrap">Kümülatif Verim</th>
                </tr>
              </thead>
              <tbody>
                {lossesResult.steps.map((s, i) => (
                  <tr key={s.name} className="border-b border-border/30">
                    <td className="px-3 py-1.5 whitespace-nowrap">{s.name}</td>
                    <td className="px-3 py-1.5 text-right">
                      <LossInput
                        value={s.pct}
                        onChange={(v) => {
                          const keys: (keyof LossBreakdown)[] = ['soilingPct', 'iamPct', 'spectralPct', 'temperaturePct', 'mismatchPct', 'dcCablingPct', 'inverterPct', 'acCablingPct', 'transformerPct', 'availabilityPct'];
                          onLossesChange({ ...losses, [keys[i]]: v });
                        }}
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground whitespace-nowrap">
                      %{(s.remaining * 100).toFixed(1)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-foreground/40 bg-amber-50 font-bold">
                  <td className="px-3 py-2 whitespace-nowrap">TOPLAM SİSTEM KAYBI</td>
                  <td className="px-3 py-2 text-right tabular-nums text-destructive whitespace-nowrap">−%{lossesResult.totalLossPct.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-eco-dark whitespace-nowrap">%{(lossesResult.yieldFactor * 100).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              Mevcut PVGIS loss parametresi: <strong>{pv.loss}%</strong> — Hesaplanan: <strong className="text-foreground">{lossesResult.totalLossPct.toFixed(2)}%</strong>
            </div>
            <Button type="button" onClick={applyLossesToPv} size="sm">
              Hesaplanan Kaybı Uygula ({lossesResult.totalLossPct.toFixed(1)}%)
            </Button>
          </div>
          <div className="rounded-md bg-amber-50 border border-amber-300 p-3 text-xs space-y-1">
            <div className="font-semibold text-amber-900">PVSyst tipik değerleri:</div>
            <ul className="text-amber-800 space-y-0.5">
              <li>• <strong>Soiling</strong>: 2% (kentsel) — 4% (toz çok, çöl)</li>
              <li>• <strong>Temperature</strong>: 4-7% (Türkiye yaz pikleri)</li>
              <li>• <strong>Mismatch</strong>: 1% (yüksek kalite modüller) — 3% (karma kullanım)</li>
              <li>• <strong>İnvertör</strong>: 1.5-2% (datasheet EU efficiency'den)</li>
              <li>• <strong>Availability</strong>: 0.5% (1-2 gün/yıl bakım kesintisi)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Spec({ label, value, highlight = false, status }: { label: string; value: string; highlight?: boolean; status?: 'eco' | 'amber' | 'red' }) {
  const colorClass =
    status === 'eco' ? 'text-eco-dark' :
    status === 'red' ? 'text-destructive' :
    status === 'amber' ? 'text-amber-700' :
    'text-foreground';
  return (
    <div className={`rounded-md border border-border/40 p-2 ${highlight ? 'bg-primary/5 border-primary/30' : 'bg-card'}`}>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider whitespace-nowrap">{label}</div>
      <div className={`text-sm font-bold tabular-nums whitespace-nowrap ${colorClass}`}>{value}</div>
    </div>
  );
}

function LossInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <Input
      type="number"
      step="0.1"
      min="0"
      max="20"
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className="h-7 w-20 text-xs text-right ml-auto"
    />
  );
}
