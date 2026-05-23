'use client';

import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { Upload, Activity, Check } from 'lucide-react';
import { generateSyntheticPtf2026, parsePtfCsv, monthlyAveragePtf } from '@/lib/ptf';

/**
 * PTF (Piyasa Takas Fiyatı) saatlik veri yükleyici.
 * - Sentetik 2026 profili (Türkiye tipik)
 * - CSV upload (EPİAŞ Şeffaflık'tan export)
 */
export function PtfLoader({
  ptfHourly,
  onChange,
}: {
  ptfHourly?: number[];
  onChange: (hourly: number[] | undefined) => void;
}) {
  const [mode, setMode] = useState<'synthetic' | 'csv' | 'none'>(ptfHourly ? 'csv' : 'synthetic');
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function applySynthetic() {
    setMode('synthetic');
    setErr(null);
    onChange(generateSyntheticPtf2026());
  }

  function handleCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result);
        const { hourly, errors } = parsePtfCsv(text);
        if (errors.length > 0) setErr(errors.join(' '));
        else setErr(null);
        if (hourly.length > 0) {
          onChange(hourly);
          setMode('csv');
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'CSV parse hatası');
      }
    };
    reader.readAsText(file);
  }

  const monthlyAvg = ptfHourly ? monthlyAveragePtf(ptfHourly) : null;
  const annualAvg = ptfHourly ? ptfHourly.reduce((a, b) => a + b, 0) / ptfHourly.length : 0;

  return (
    <Card className="border-eco/30 bg-eco/5">
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-eco-dark" />
          <Label className="text-sm font-semibold flex items-center gap-1.5">
            PTF Saatlik Veri (batarya arbitrajı için)
            <InfoTooltip title="PTF" body="Piyasa Takas Fiyatı — EPİAŞ Şeffaflık Platformu'nda saatlik açıklanır. Batarya arbitraj kararlarında (ucuz saat şarj, pahalı saat boşaltım) kullanılır." />
          </Label>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button type="button" size="sm" variant={mode === 'none' ? 'outline' : 'outline'} onClick={() => { setMode('none'); onChange(undefined); }}>
            Devre Dışı
          </Button>
          <Button type="button" size="sm" variant={mode === 'synthetic' ? 'default' : 'outline'} onClick={applySynthetic}>
            Sentetik 2026 Profili
          </Button>
          <Button type="button" size="sm" variant={mode === 'csv' ? 'default' : 'outline'} onClick={() => fileRef.current?.click()}>
            <Upload className="h-3 w-3 mr-1" /> CSV Yükle (EPİAŞ)
          </Button>
          <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleCsv} />
        </div>
        {err && <div className="text-xs text-amber-700 bg-amber-50 rounded p-2 border border-amber-200">{err}</div>}
        {ptfHourly && ptfHourly.length > 0 && (
          <div className="text-xs space-y-1 pt-2 border-t border-border/30">
            <div className="flex items-center gap-2 text-eco-dark">
              <Check className="h-3 w-3" /> {ptfHourly.length} saatlik veri yüklü · Yıllık ort: {annualAvg.toFixed(2)} TL/kWh
            </div>
            {monthlyAvg && (
              <div className="grid grid-cols-12 gap-1 mt-1">
                {monthlyAvg.map((v, i) => (
                  <div key={i} className="text-center">
                    <div className="text-[9px] text-muted-foreground">{['O', 'Ş', 'M', 'N', 'M', 'H', 'T', 'A', 'E', 'E', 'K', 'A'][i]}</div>
                    <div className="text-[10px] font-mono">{v.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="text-[10px] text-muted-foreground">
              CSV formatı: 2 kolon (timestamp, PTF) · 8760 satır · TL/MWh veya TL/kWh otomatik algılanır
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
