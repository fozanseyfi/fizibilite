'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { Sigma } from 'lucide-react';

/**
 * Modül + invertör + string boyutlandırıcı.
 * Banka due diligence ekiplerinin sorduğu klasik sorulara cevap verir:
 *   - Toplam panel sayısı?
 *   - DC/AC oranı?
 *   - String sayısı?
 *   - İnvertör sayısı?
 */
export function ModuleInverterSizer({ peakPowerKwp }: { peakPowerKwp: number }) {
  const [moduleWp, setModuleWp] = useState(580); // 2026 Tier-1 mono PERC tipik
  const [inverterKw, setInverterKw] = useState(100); // string inverter tipik
  const [modulesPerString, setModulesPerString] = useState(22);
  const [mpptsPerInverter, setMpptsPerInverter] = useState(8);
  const [maxStringsPerMppt, setMaxStringsPerMppt] = useState(2);

  const sizing = useMemo(() => {
    const moduleKw = moduleWp / 1000;
    const totalModules = Math.round((peakPowerKwp * 1000) / moduleWp);
    const totalStrings = Math.ceil(totalModules / modulesPerString);
    const stringsPerInverter = mpptsPerInverter * maxStringsPerMppt;
    const totalInverters = Math.ceil(totalStrings / stringsPerInverter);
    const totalAcKw = totalInverters * inverterKw;
    const actualDcKw = totalModules * moduleKw;
    const dcAcRatio = totalAcKw > 0 ? actualDcKw / totalAcKw : 0;

    return {
      totalModules,
      totalStrings,
      totalInverters,
      totalAcKw,
      actualDcKw,
      dcAcRatio,
      stringsPerInverter,
    };
  }, [peakPowerKwp, moduleWp, inverterKw, modulesPerString, mpptsPerInverter, maxStringsPerMppt]);

  const ratioColor =
    sizing.dcAcRatio > 1.4 ? 'text-destructive' :
    sizing.dcAcRatio > 1.3 ? 'text-amber-600' :
    sizing.dcAcRatio >= 1.15 ? 'text-eco-dark' :
    'text-amber-600';

  const ratioMsg =
    sizing.dcAcRatio > 1.4 ? 'Yüksek kırpılma (clipping) riski' :
    sizing.dcAcRatio > 1.3 ? 'Sık inverter clipping; arazi GES için OK' :
    sizing.dcAcRatio >= 1.15 ? 'Optimal aralık (Türkiye için)' :
    'Düşük oran — invertör küçültülebilir veya panel eklenebilir';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sigma className="h-5 w-5 text-primary" />
          Modül + İnvertör + String Boyutlandırma
        </CardTitle>
        <CardDescription className="text-xs">Toplam kurulu güç {peakPowerKwp} kWp üzerinden saha donanım dağılımı.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1.5">
              Modül Gücü (Wp)
              <InfoTooltip title="Modül Gücü" body="2026 Tier-1 mono PERC tipik 540-620 Wp. JinkoSolar Tiger Neo, Trina Vertex N, LONGi Hi-MO 7." />
            </Label>
            <Input type="number" step="5" value={moduleWp} onChange={(e) => setModuleWp(parseFloat(e.target.value) || 0)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1.5">
              İnvertör AC Gücü (kW)
              <InfoTooltip title="İnvertör Gücü" body="String inverter tipik 50-125 kW. Central inverter 1-5 MW. Huawei SUN2000, Sungrow SG, SMA Sunny Tripower." />
            </Label>
            <Input type="number" step="5" value={inverterKw} onChange={(e) => setInverterKw(parseFloat(e.target.value) || 0)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1.5">
              Stringdeki Modül Sayısı
              <InfoTooltip title="String Modülü" body="DC voltaj eşiğine göre belirlenir. Mono PERC 540 Wp için tipik 18-26 modül/string (1500V sistem). Soğuk bölgelerde daha az." />
            </Label>
            <Input type="number" step="1" value={modulesPerString} onChange={(e) => setModulesPerString(parseFloat(e.target.value) || 0)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1.5">
              MPPT Sayısı / İnvertör
              <InfoTooltip title="MPPT" body="Maximum Power Point Tracker. Tipik string inverter 6-12 MPPT'ye sahip. Her MPPT bağımsız çalışır (gölgeleme/yön farkı toleransı)." />
            </Label>
            <Input type="number" step="1" value={mpptsPerInverter} onChange={(e) => setMpptsPerInverter(parseFloat(e.target.value) || 0)} />
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">String / MPPT (paralel)</Label>
            <Input type="number" step="1" value={maxStringsPerMppt} onChange={(e) => setMaxStringsPerMppt(parseFloat(e.target.value) || 0)} />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-4 pt-4 border-t border-border/40">
          <Result label="Toplam Modül" value={sizing.totalModules.toLocaleString('tr-TR')} sub="adet" />
          <Result label="Toplam String" value={sizing.totalStrings.toLocaleString('tr-TR')} sub={`${sizing.stringsPerInverter}/inv`} />
          <Result label="Toplam İnvertör" value={sizing.totalInverters.toLocaleString('tr-TR')} sub={`${inverterKw} kW her biri`} />
          <Result label="DC Kapasite (gerçek)" value={`${sizing.actualDcKw.toFixed(0)} kW`} sub={`${peakPowerKwp} kWp hedef`} />
          <Result label="AC Kapasite" value={`${sizing.totalAcKw.toFixed(0)} kW`} sub="invertör tarafı" />
          <Result label="DC/AC Oranı" value={sizing.dcAcRatio.toFixed(2)} sub={ratioMsg} color={ratioColor} />
        </div>

        <div className="text-xs text-muted-foreground p-3 bg-secondary/40 rounded-md">
          <strong>DC/AC oran rehberi:</strong> 1.15-1.30 optimum, 1.30-1.40 arazi GES için OK (yüksek clipping toleransı ile),
          1.40+ sık clipping/kayıp. Düşük (1.0-1.15) invertör overdimensioning, kayıp az ama CAPEX yüksek.
        </div>
      </CardContent>
    </Card>
  );
}

function Result({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-md border border-border/40 p-2 bg-card">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider whitespace-nowrap">{label}</div>
      <div className={`text-lg font-bold tabular-nums whitespace-nowrap ${color ?? ''}`}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground whitespace-nowrap">{sub}</div>}
    </div>
  );
}
