'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area } from 'recharts';

const HOURS = Array.from({ length: 24 }, (_, h) => h);

// Hazır profiller
const PRESETS: Record<string, { gen: number[]; cons: number[]; label: string; desc: string }> = {
  office: {
    label: 'Ofis 5×8 (klasik kötü uyum)',
    desc: 'Güneş öğleyin tepe, ofis tüketimi 09-17 ortalama → fazla üretim çok',
    gen: [0, 0, 0, 0, 0, 0, 50, 200, 500, 800, 950, 1000, 950, 800, 500, 200, 50, 0, 0, 0, 0, 0, 0, 0],
    cons: [50, 50, 50, 50, 50, 50, 100, 300, 500, 500, 500, 400, 500, 500, 500, 500, 500, 300, 100, 50, 50, 50, 50, 50],
  },
  factory: {
    label: 'Fabrika 3 vardiya (mükemmel uyum)',
    desc: '24/7 sabit yüksek tüketim, fazla üretim çok az',
    gen: [0, 0, 0, 0, 0, 0, 50, 200, 500, 800, 950, 1000, 950, 800, 500, 200, 50, 0, 0, 0, 0, 0, 0, 0],
    cons: [400, 400, 400, 400, 400, 400, 500, 600, 700, 700, 700, 700, 700, 700, 700, 700, 600, 500, 500, 500, 500, 500, 500, 400],
  },
  hotel: {
    label: 'Otel (orta uyum)',
    desc: 'Akşam pikI, gece-sabah orta, gündüz düşük',
    gen: [0, 0, 0, 0, 0, 0, 50, 200, 500, 800, 950, 1000, 950, 800, 500, 200, 50, 0, 0, 0, 0, 0, 0, 0],
    cons: [300, 250, 200, 200, 200, 250, 350, 450, 400, 350, 350, 350, 400, 400, 350, 400, 450, 500, 600, 600, 550, 500, 450, 350],
  },
};

const PURCHASE_PRICE = 4.28; // Ticarethane LV alış
const SALE_PRICE = 3.95;     // Ticarethane LV satış

export function NettingCalculator() {
  const [preset, setPreset] = useState<keyof typeof PRESETS>('office');
  const profile = PRESETS[preset];

  const data = useMemo(() => {
    return HOURS.map((h) => {
      const gen = profile.gen[h];
      const cons = profile.cons[h];
      const netted = Math.min(gen, cons);
      const surplus = Math.max(0, gen - cons);
      const netConsumption = Math.max(0, cons - gen);
      return {
        hour: `${String(h).padStart(2, '0')}:00`,
        gen,
        cons,
        netted,
        surplus,
        netConsumption,
      };
    });
  }, [profile]);

  const totals = useMemo(() => {
    const sumGen = data.reduce((a, d) => a + d.gen, 0);
    const sumCons = data.reduce((a, d) => a + d.cons, 0);
    const sumNetted = data.reduce((a, d) => a + d.netted, 0);
    const sumSurplus = data.reduce((a, d) => a + d.surplus, 0);
    const sumNetCons = data.reduce((a, d) => a + d.netConsumption, 0);
    const selfConsumption = sumGen > 0 ? sumNetted / sumGen : 0;
    const autonomy = sumCons > 0 ? sumNetted / sumCons : 0;
    // Finansal
    const savings = sumNetted * PURCHASE_PRICE;
    const surplusRevenue = sumSurplus * SALE_PRICE;
    const gridBill = sumNetCons * PURCHASE_PRICE;
    const netDailyBenefit = savings + surplusRevenue - gridBill;
    return { sumGen, sumCons, sumNetted, sumSurplus, sumNetCons, selfConsumption, autonomy, savings, surplusRevenue, gridBill, netDailyBenefit };
  }, [data]);

  return (
    <div className="space-y-4">
      {/* Preset seçimi */}
      <div>
        <Label className="text-xs mb-2 block">Hazır profil seç:</Label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {(Object.keys(PRESETS) as Array<keyof typeof PRESETS>).map((k) => (
            <button
              key={k}
              onClick={() => setPreset(k)}
              className={`p-3 rounded-md border text-left transition-all ${
                preset === k ? 'border-primary bg-primary/5' : 'border-border hover:bg-secondary'
              }`}
            >
              <div className="font-semibold text-xs">{PRESETS[k].label}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{PRESETS[k].desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Grafik */}
      <div className="rounded-lg border border-border/40 p-3 bg-card">
        <div className="text-xs font-semibold mb-2 text-muted-foreground">24 SAATLİK PROFIL (kWh)</div>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hour" fontSize={9} interval={1} />
            <YAxis fontSize={10} />
            <Tooltip formatter={(v: number) => `${v.toFixed(0)} kWh`} />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Area type="monotone" dataKey="gen" fill="#fcd34d" stroke="#f59e0b" name="Üretim" />
            <Line type="monotone" dataKey="cons" stroke="#0f172a" strokeWidth={2} dot={false} name="Tüketim" />
            <Bar dataKey="netted" fill="#10b981" name="Mahsuplaşılan" stackId="b" />
            <Bar dataKey="surplus" fill="#94a3b8" name="Fazla Üretim" stackId="b" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Sonuçlar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Metric label="Üretim" value={`${totals.sumGen.toLocaleString('tr-TR')} kWh`} color="solar" />
        <Metric label="Tüketim" value={`${totals.sumCons.toLocaleString('tr-TR')} kWh`} color="navy" />
        <Metric label="Mahsup" value={`${totals.sumNetted.toLocaleString('tr-TR')} kWh`} color="eco" />
        <Metric label="Öz Tüketim Oranı" value={`%${(totals.selfConsumption * 100).toFixed(0)}`} color="eco" sub={`Otonomi: %${(totals.autonomy * 100).toFixed(0)}`} />
      </div>

      {/* Finansal sonuç */}
      <div className="rounded-lg border border-border/40 p-4 bg-secondary/30">
        <div className="text-xs font-semibold mb-3 text-muted-foreground">GÜNLÜK FİNANSAL ETKİ (Ticarethane LV tarife)</div>
        <table className="w-full text-sm">
          <tbody>
            <FinRow label="Mahsuplaşma tasarrufu" value={`+${totals.savings.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL`} note={`${totals.sumNetted.toFixed(0)} kWh × ${PURCHASE_PRICE} TL`} positive />
            <FinRow label="Fazla üretim satışı" value={`+${totals.surplusRevenue.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL`} note={`${totals.sumSurplus.toFixed(0)} kWh × ${SALE_PRICE} TL`} positive />
            <FinRow label="Şebekeden alış (akşam/gece)" value={`−${totals.gridBill.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL`} note={`${totals.sumNetCons.toFixed(0)} kWh × ${PURCHASE_PRICE} TL`} negative />
            <tr className="border-t-2 border-foreground/40 font-bold">
              <td className="py-2">Net Günlük Fayda</td>
              <td className="py-2 text-right tabular-nums whitespace-nowrap text-primary">
                {totals.netDailyBenefit >= 0 ? '+' : ''}{totals.netDailyBenefit.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL/gün
              </td>
              <td className="py-2 text-right text-xs text-muted-foreground">≈ {(totals.netDailyBenefit * 365).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL/yıl</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="text-[11px] text-muted-foreground leading-relaxed bg-amber-50 border border-amber-300 rounded p-3">
        <strong className="text-amber-900">💡 Karşılaştır:</strong> Yukarıdaki <strong>3 profil</strong> arasında geçiş yap.
        Aynı toplam üretim ve tüketimde bile profilin uyumuna göre net fayda çok farklı çıkıyor. Saatlik rejimde
        <strong> üretim-tüketim profili eşleşmesi</strong> hayati.
      </div>
    </div>
  );
}

function Metric({ label, value, color, sub }: { label: string; value: string; color: 'solar' | 'eco' | 'navy'; sub?: string }) {
  const colorClass = color === 'solar' ? 'border-l-solar' : color === 'eco' ? 'border-l-eco' : 'border-l-navy';
  return (
    <div className={`rounded-md border border-border/40 border-l-4 ${colorClass} p-2.5`}>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider whitespace-nowrap">{label}</div>
      <div className="text-base font-bold tabular-nums whitespace-nowrap">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground whitespace-nowrap">{sub}</div>}
    </div>
  );
}

function FinRow({ label, value, note, positive = false, negative = false }: { label: string; value: string; note?: string; positive?: boolean; negative?: boolean }) {
  const valueColor = positive ? 'text-eco-dark' : negative ? 'text-destructive' : '';
  return (
    <tr className="border-b border-border/30">
      <td className="py-1.5 text-xs">{label}</td>
      <td className={`py-1.5 text-right tabular-nums whitespace-nowrap text-sm font-medium ${valueColor}`}>{value}</td>
      <td className="py-1.5 text-right text-[10px] text-muted-foreground whitespace-nowrap">{note}</td>
    </tr>
  );
}
