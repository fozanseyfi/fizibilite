'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CapexBreakdown, OpexConfig, ProjectType } from '@/lib/types';
import { formatTl } from '@/lib/utils';
import { Sparkles } from 'lucide-react';

/**
 * Standart CAPEX dağıtım oranları (toplamın yüzdesi).
 * Çatı C&I için tipik dağılım.
 */
const CAPEX_DISTRIBUTION_ROOFTOP: Record<keyof Omit<CapexBreakdown, 'total' | 'battery'>, number> = {
  pvModule: 0.36,         // %36 — Tier-1 mono PERC
  inverter: 0.12,         // %12
  mounting: 0.16,         // %16 (çatı)
  cabling: 0.08,          // %8
  labor: 0.10,            // %10
  engineering: 0.06,      // %6
  gridConnection: 0.025,  // %2.5
  tedasZbof: 0.02,        // %2
  land: 0,                // çatıda 0
  insurance: 0.01,        // %1
  contingency: 0.045,     // %4.5
};

const CAPEX_DISTRIBUTION_GROUND: Record<keyof Omit<CapexBreakdown, 'total' | 'battery'>, number> = {
  pvModule: 0.32,         // %32 — arazide montaj daha fazla pay alır
  inverter: 0.11,
  mounting: 0.22,         // %22 (arazi çelik yapı + ankraj)
  cabling: 0.08,
  labor: 0.08,
  engineering: 0.05,
  gridConnection: 0.025,
  tedasZbof: 0.02,
  land: 0.06,             // %6 imar + zemin
  insurance: 0.01,
  contingency: 0.045,
};

export function CapexOpexCockpit({
  capex,
  opex,
  onCapexChange,
  onOpexChange,
  peakPowerKwp,
  usdTry,
  projectType = 'rooftop_ci',
}: {
  capex: CapexBreakdown;
  opex: OpexConfig;
  onCapexChange: (next: CapexBreakdown) => void;
  onOpexChange: (next: OpexConfig) => void;
  peakPowerKwp: number;
  usdTry: number;
  projectType?: ProjectType;
}) {
  const capexTotal =
    capex.pvModule + capex.inverter + capex.mounting + capex.cabling + capex.labor + capex.engineering +
    capex.gridConnection + capex.tedasZbof + capex.land + capex.insurance + capex.contingency + capex.battery;

  const [totalInput, setTotalInput] = useState<number>(capexTotal);

  const updateCapex = (k: keyof CapexBreakdown, v: number) => {
    onCapexChange({ ...capex, [k]: v });
  };
  const updateOpex = (k: keyof OpexConfig, v: number) => {
    onOpexChange({ ...opex, [k]: v });
  };

  const usdPerWp = (kWp: number, totalTl: number) => (peakPowerKwp > 0 ? totalTl / (peakPowerKwp * 1000 * usdTry) : 0);

  function autoDistribute() {
    const distribution = projectType === 'ground_mount' ? CAPEX_DISTRIBUTION_GROUND : CAPEX_DISTRIBUTION_ROOFTOP;
    const battery = capex.battery; // batarya dışarıda sabit kalır
    const allocatable = totalInput - battery;
    if (allocatable <= 0) return;
    const next: CapexBreakdown = {
      ...capex,
      pvModule: Math.round(allocatable * distribution.pvModule),
      inverter: Math.round(allocatable * distribution.inverter),
      mounting: Math.round(allocatable * distribution.mounting),
      cabling: Math.round(allocatable * distribution.cabling),
      labor: Math.round(allocatable * distribution.labor),
      engineering: Math.round(allocatable * distribution.engineering),
      gridConnection: Math.round(allocatable * distribution.gridConnection),
      tedasZbof: Math.round(allocatable * distribution.tedasZbof),
      land: Math.round(allocatable * distribution.land),
      insurance: Math.round(allocatable * distribution.insurance),
      contingency: Math.round(allocatable * distribution.contingency),
      battery,
      total: totalInput,
    };
    onCapexChange(next);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* CAPEX */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            CAPEX Kokpiti
            <InfoTooltip title="CAPEX" body="İlk yatırım maliyetlerinin tüm kalemleri. Toplamı girip 'Otomatik Dağıt' ile standart oranlarla doldurabilirsin, sonra her kalemi tek tek düzenleyebilirsin." />
          </CardTitle>
          <CardDescription>
            Mevcut toplam: <span className="font-mono font-semibold text-foreground">{formatTl(capexTotal, { compact: true })}</span> · {(capexTotal / (peakPowerKwp * 1000 * usdTry)).toFixed(2)} USD/Wp · {formatTl(capexTotal / peakPowerKwp, { compact: false })}/kWp
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {/* Toplam yatırım + otomatik dağıt */}
          <div className="rounded-lg bg-primary/5 border border-primary/30 p-3 space-y-2">
            <Label className="flex items-center gap-1.5 text-xs">
              Toplam Yatırım Tutarı (TL)
              <InfoTooltip title="Otomatik Dağıt" body={`Bu tutarı kalemler arasında ${projectType === 'ground_mount' ? 'arazi GES' : 'çatı C&I'} için standart oranlara göre dağıtır. PV %${projectType === 'ground_mount' ? 32 : 36}, İnvertör %${projectType === 'ground_mount' ? 11 : 12}, Montaj %${projectType === 'ground_mount' ? 22 : 16}, vs. Batarya dışarıda kalır.`} />
            </Label>
            <div className="flex gap-2">
              <Input
                type="number"
                step="100000"
                value={totalInput}
                onChange={(e) => setTotalInput(parseFloat(e.target.value) || 0)}
                className="flex-1"
              />
              <Button type="button" onClick={autoDistribute} disabled={totalInput <= 0}>
                <Sparkles className="h-4 w-4 mr-2" /> Otomatik Dağıt
              </Button>
            </div>
            <div className="text-[10px] text-muted-foreground">
              {projectType === 'ground_mount' ? 'Arazi GES' : 'Çatı C&I'} standart oranları kullanılır. Sonra her kalemi tek tek düzenleyebilirsin.
            </div>
          </div>
          <CapexRow label="PV Modül" value={capex.pvModule} unit={`${usdPerWp(peakPowerKwp, capex.pvModule).toFixed(3)} USD/Wp`} onChange={(v) => updateCapex('pvModule', v)} info="2026 Türkiye ortalaması: 0.18 USD/Wp (Tier-1 mono PERC)." />
          <CapexRow label="İnvertör" value={capex.inverter} unit={`${usdPerWp(peakPowerKwp, capex.inverter).toFixed(3)} USD/Wp`} onChange={(v) => updateCapex('inverter', v)} info="String/central inverter. 2026: 0.06 USD/Wp." />
          <CapexRow label="Montaj / Yapı" value={capex.mounting} unit={`${usdPerWp(peakPowerKwp, capex.mounting).toFixed(3)} USD/Wp`} onChange={(v) => updateCapex('mounting', v)} info="Çatı 0.08, arazi 0.12 USD/Wp (çelik yapı + ankraj)." />
          <CapexRow label="Kablo & DC/AC pano" value={capex.cabling} unit={`${usdPerWp(peakPowerKwp, capex.cabling).toFixed(3)} USD/Wp`} onChange={(v) => updateCapex('cabling', v)} info="Tipik 0.04 USD/Wp." />
          <CapexRow label="İşçilik" value={capex.labor} unit={`${usdPerWp(peakPowerKwp, capex.labor).toFixed(3)} USD/Wp`} onChange={(v) => updateCapex('labor', v)} info="Türkiye işçilik 2026: 0.05 USD/Wp." />
          <CapexRow label="Mühendislik & Tasarım" value={capex.engineering} unit={`${usdPerWp(peakPowerKwp, capex.engineering).toFixed(3)} USD/Wp`} onChange={(v) => updateCapex('engineering', v)} info="Proje, etüt, danışmanlık." />
          <CapexRow label="Bağlantı Bedeli" value={capex.gridConnection} unit="TL" onChange={(v) => updateCapex('gridConnection', v)} info="Dağıtım şirketine ödenir, bölgesel." />
          <CapexRow label="TEDAŞ + ZBÖF" value={capex.tedasZbof} unit="TL" onChange={(v) => updateCapex('tedasZbof', v)} info="TEDAŞ proje onay + Zorunlu Bağlantı Ön Fizibilite bedeli." />
          <CapexRow label="İmar / Zemin (arazi)" value={capex.land} unit="TL" onChange={(v) => updateCapex('land', v)} info="Yalnızca arazi GES için. Çatı projelerinde 0." />
          <CapexRow label="Sigorta (CAR)" value={capex.insurance} unit="TL" onChange={(v) => updateCapex('insurance', v)} info="İnşaat dönemi sigortası, tipik %1 CAPEX." />
          <CapexRow label="Beklenmeyen (contingency)" value={capex.contingency} unit="TL" onChange={(v) => updateCapex('contingency', v)} info="Sürpriz maliyetler için %3-5 CAPEX." />
          <CapexRow label="Batarya (BESS)" value={capex.battery} unit="TL" onChange={(v) => updateCapex('battery', v)} info="LFP 2026: ~8.500 TL/kWh enerji + 3.500 TL/kW güç + BoS." />
        </CardContent>
      </Card>

      {/* OPEX */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            OPEX Kokpiti
            <InfoTooltip title="OPEX" body="Yıllık işletme giderleri. Enflasyonla yıllık artar." />
          </CardTitle>
          <CardDescription>Yıllık tahmini: <span className="font-mono font-semibold text-foreground">{formatTl(estimateAnnualOpex(opex, peakPowerKwp), { compact: true })}</span></CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <CapexRow label="O&M (bakım)" value={opex.omTlPerKwpYear} unit="TL/kWp/yıl" onChange={(v) => updateOpex('omTlPerKwpYear', v)} info="Saha tipi ve büyüklüğe göre 80-150 TL/kWp/yıl." />
          <CapexRow label="Sigorta (işletme) %" value={opex.insurancePctCapex * 100} unit="% CAPEX/yıl" onChange={(v) => updateOpex('insurancePctCapex', v / 100)} info="Tipik %0.5 CAPEX/yıl. All-risk + üçüncü şahıs." />
          <CapexRow label="İnvertör Değişimi %" value={opex.inverterReplacementPctCapex * 100} unit="% CAPEX (bir kez)" onChange={(v) => updateOpex('inverterReplacementPctCapex', v / 100)} info="Genelde yıl 12'de invertör tam değişimi, ~%8 CAPEX." />
          <CapexRow label="İnvertör Değişim Yılı" value={opex.inverterReplacementYear} unit="yıl" onChange={(v) => updateOpex('inverterReplacementYear', v)} info="Tipik 10-15 yıl arası." />
          <CapexRow label="Yedek Parça (yıllık)" value={opex.spareParts} unit="TL/yıl" onChange={(v) => updateOpex('spareParts', v)} info="MC4 konnektör, kablo, sigorta vs." />
          <CapexRow label="Güvenlik (arazi)" value={opex.security} unit="TL/yıl" onChange={(v) => updateOpex('security', v)} info="Yalnızca arazi projeleri için." />
          <CapexRow label="Sistem Kullanım Bedeli" value={opex.systemUsageTlKwh} unit="TL/kWh" onChange={(v) => updateOpex('systemUsageTlKwh', v)} info="Lisanssız GES sistem kullanım bedeli, EPDK." />
          <CapexRow label="Emlak Vergisi (arazi)" value={opex.propertyTax} unit="TL/yıl" onChange={(v) => updateOpex('propertyTax', v)} info="Arazi için yıllık emlak vergisi." />
          <CapexRow label="Yönetim & Muhasebe" value={opex.managementFees} unit="TL/yıl" onChange={(v) => updateOpex('managementFees', v)} info="Asset manager, mali müşavir vb." />
        </CardContent>
      </Card>
    </div>
  );
}

function CapexRow({ label, value, unit, onChange, info }: { label: string; value: number; unit: string; onChange: (v: number) => void; info?: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
      <Label className="flex items-center gap-1.5 text-xs">
        {label}
        {info && <InfoTooltip title={label} body={info} />}
      </Label>
      <div className="flex items-center gap-2 w-44">
        <Input
          type="number"
          step={value > 1000 ? 1000 : value > 10 ? 1 : 0.01}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="h-8 text-xs text-right"
        />
        <div className="text-[10px] text-muted-foreground whitespace-nowrap w-16">{unit}</div>
      </div>
    </div>
  );
}

function estimateAnnualOpex(opex: OpexConfig, kWp: number): number {
  return opex.omTlPerKwpYear * kWp + opex.spareParts + opex.security + opex.propertyTax + opex.managementFees;
}
