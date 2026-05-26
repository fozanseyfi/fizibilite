'use client';

import { useState, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { InfoTooltip, TOOLTIPS } from '@/components/ui/info-tooltip';
import {
  DEFAULT_DAILY_CONSTANT, DEFAULT_DAILY_OFFICE, DEFAULT_DAILY_HOTEL, DEFAULT_DAILY_FACTORY_2SHIFT,
  DEFAULT_MONTHLY_EQUAL, DEFAULT_MONTHLY_BUSINESS, DEFAULT_MONTHLY_COLD_STORAGE,
  buildHourlyFromBuilder, monthlyTotalsFromHourly,
  DailyDistribution, MonthlyDistribution,
} from '@/lib/consumption-builder';
import { formatKwh } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const MONTH_LABELS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

export interface ConsumptionBuilderValue {
  annualKwh: number;
  prevYearKwh: number;
  daily: DailyDistribution;
  monthly: MonthlyDistribution;
  weekendFactor: number;
}

export function ConsumptionBuilder({
  value,
  onChange,
  generationMonthlyKwh,
}: {
  value: ConsumptionBuilderValue;
  onChange: (v: ConsumptionBuilderValue) => void;
  generationMonthlyKwh?: number[]; // varsa üretim ile birlikte gösterilir
}) {
  const [dailyMode, setDailyMode] = useState<'constant' | 'office' | 'hotel' | 'factory_2shift' | 'custom'>('office');
  const [monthlyMode, setMonthlyMode] = useState<'equal' | 'business' | 'cold_storage' | 'manual'>('equal');

  // Auto-distribute aylık değerleri annualKwh değişince
  useEffect(() => {
    if (monthlyMode === 'equal') {
      onChange({ ...value, monthly: DEFAULT_MONTHLY_EQUAL });
    } else if (monthlyMode === 'business') {
      onChange({ ...value, monthly: DEFAULT_MONTHLY_BUSINESS });
    } else if (monthlyMode === 'cold_storage') {
      onChange({ ...value, monthly: DEFAULT_MONTHLY_COLD_STORAGE });
    }
    // manual'de dokunma
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthlyMode]);

  // Daily preset
  function applyDailyPreset(mode: typeof dailyMode) {
    setDailyMode(mode);
    if (mode === 'constant') onChange({ ...value, daily: { ...DEFAULT_DAILY_CONSTANT } });
    if (mode === 'office') onChange({ ...value, daily: { ...DEFAULT_DAILY_OFFICE } });
    if (mode === 'hotel') onChange({ ...value, daily: { ...DEFAULT_DAILY_HOTEL } });
    if (mode === 'factory_2shift') onChange({ ...value, daily: { ...DEFAULT_DAILY_FACTORY_2SHIFT } });
  }

  // 8760 saatlik üretip aylık özet ver
  const hourly = useMemo(() => {
    try {
      return buildHourlyFromBuilder(value);
    } catch { return null; }
  }, [value]);

  const monthlyKwh = useMemo(() => {
    if (!hourly) return new Array(12).fill(0);
    return monthlyTotalsFromHourly(hourly);
  }, [hourly]);

  const chartData = useMemo(() => {
    return monthlyKwh.map((cons, i) => ({
      month: MONTH_LABELS[i],
      tuketim: cons,
      uretim: generationMonthlyKwh?.[i] ?? 0,
    }));
  }, [monthlyKwh, generationMonthlyKwh]);

  const dailySum = value.daily.slot_00_06 + value.daily.slot_06_10 + value.daily.slot_10_14 + value.daily.slot_14_18 + value.daily.slot_18_24;
  const monthlySum = value.monthly.months.reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* Üst bilgi */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            Yıllık Toplam Tüketim (kWh)
            <InfoTooltip {...{ title: 'Yıllık Tüketim', body: 'Saatlik mahsuplaşma için 8760 saate dağıtılacak yıllık enerji.' }} />
          </Label>
          <Input
            type="number"
            step="1000"
            value={value.annualKwh > 0 ? value.annualKwh : ''}
            onChange={(e) => onChange({ ...value, annualKwh: parseFloat(e.target.value) || 0 })}
            placeholder="örn. 800000"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            Önceki Yıl Tüketim (kWh)
            <InfoTooltip {...TOOLTIPS.paidLimit} />
          </Label>
          <Input
            type="number"
            step="1000"
            value={value.prevYearKwh > 0 ? value.prevYearKwh : ''}
            onChange={(e) => onChange({ ...value, prevYearKwh: parseFloat(e.target.value) || 0 })}
            placeholder="örn. 800000"
          />
        </div>
      </div>

      <Tabs defaultValue="daily">
        <TabsList>
          <TabsTrigger value="daily">Günlük Dağılım (Saatlik)</TabsTrigger>
          <TabsTrigger value="monthly">Aylık Dağılım</TabsTrigger>
          <TabsTrigger value="chart">Grafik</TabsTrigger>
        </TabsList>

        {/* ---- GÜNLÜK ---- */}
        <TabsContent value="daily" className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant={dailyMode === 'constant' ? 'default' : 'outline'} onClick={() => applyDailyPreset('constant')}>Sabit (her dilim %20)</Button>
            <Button type="button" size="sm" variant={dailyMode === 'office' ? 'default' : 'outline'} onClick={() => applyDailyPreset('office')}>Mesai (Ofis)</Button>
            <Button type="button" size="sm" variant={dailyMode === 'hotel' ? 'default' : 'outline'} onClick={() => applyDailyPreset('hotel')}>Otel (7/24)</Button>
            <Button type="button" size="sm" variant={dailyMode === 'factory_2shift' ? 'default' : 'outline'} onClick={() => applyDailyPreset('factory_2shift')}>Fabrika 2 vardiya</Button>
            <Button type="button" size="sm" variant={dailyMode === 'custom' ? 'default' : 'outline'} onClick={() => setDailyMode('custom')}>Özel</Button>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {([
              ['00–06', 'slot_00_06'],
              ['06–10', 'slot_06_10'],
              ['10–14', 'slot_10_14'],
              ['14–18', 'slot_14_18'],
              ['18–24', 'slot_18_24'],
            ] as Array<[string, keyof DailyDistribution]>).map(([label, key]) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs">{label}</Label>
                <Input
                  type="number"
                  step="1"
                  value={value.daily[key]}
                  onChange={(e) => onChange({ ...value, daily: { ...value.daily, [key]: parseFloat(e.target.value) || 0 } })}
                  className="h-9"
                  disabled={dailyMode !== 'custom' && dailyMode !== 'constant'}
                />
                <div className="text-[10px] text-muted-foreground text-center">%</div>
              </div>
            ))}
          </div>
          <div className={`text-xs ${Math.abs(dailySum - 100) < 0.5 ? 'text-eco-dark' : 'text-destructive'}`}>
            Toplam: {dailySum.toFixed(1)}% {Math.abs(dailySum - 100) < 0.5 ? '✓' : '(100 olmalı)'}
          </div>
          <div className="grid grid-cols-2 gap-4 mt-3">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                Hafta sonu çarpanı
                <InfoTooltip title="Hafta sonu çarpanı" body="1.0 = hafta içi ile aynı, 0.5 = hafta içinin yarısı, 0.0 = hafta sonu kapalı." />
              </Label>
              <Input
                type="number"
                step="0.05"
                min={0}
                max={1.5}
                value={value.weekendFactor}
                onChange={(e) => onChange({ ...value, weekendFactor: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
        </TabsContent>

        {/* ---- AYLIK ---- */}
        <TabsContent value="monthly" className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant={monthlyMode === 'equal' ? 'default' : 'outline'} onClick={() => setMonthlyMode('equal')}>Eşit (12 ay)</Button>
            <Button type="button" size="sm" variant={monthlyMode === 'business' ? 'default' : 'outline'} onClick={() => setMonthlyMode('business')}>İş yeri (mevsimsel)</Button>
            <Button type="button" size="sm" variant={monthlyMode === 'cold_storage' ? 'default' : 'outline'} onClick={() => setMonthlyMode('cold_storage')}>Soğuk hava (yaz pik)</Button>
            <Button type="button" size="sm" variant={monthlyMode === 'manual' ? 'default' : 'outline'} onClick={() => setMonthlyMode('manual')}>Manuel</Button>
          </div>
          <div className="grid grid-cols-12 gap-1.5">
            {MONTH_LABELS.map((label, i) => (
              <div key={i} className="space-y-0.5">
                <div className="text-[10px] text-muted-foreground text-center">{label}</div>
                <Input
                  type="number"
                  step="0.5"
                  value={value.monthly.months[i].toFixed(1)}
                  onChange={(e) => {
                    const newMonths = [...value.monthly.months];
                    newMonths[i] = parseFloat(e.target.value) || 0;
                    onChange({ ...value, monthly: { months: newMonths } });
                  }}
                  className="h-8 text-xs px-1.5 text-center"
                  disabled={monthlyMode !== 'manual'}
                />
                <div className="text-[10px] text-muted-foreground text-center">%</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-12 gap-1.5">
            {monthlyKwh.map((v, i) => (
              <div key={i} className="text-[10px] text-center text-muted-foreground">
                {(v / 1000).toFixed(1)}K
              </div>
            ))}
          </div>
          <div className={`text-xs ${Math.abs(monthlySum - 100) < 0.5 ? 'text-eco-dark' : 'text-destructive'}`}>
            Aylık toplam: {monthlySum.toFixed(1)}% {Math.abs(monthlySum - 100) < 0.5 ? '✓' : '(100 olmalı)'}
          </div>
        </TabsContent>

        {/* ---- GRAFİK ---- */}
        <TabsContent value="chart">
          <div className="text-xs text-muted-foreground mb-2">Aylık tüketim (ve varsa üretim) — kWh</div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(v: number) => formatKwh(v, { compact: true })} />
              <Legend />
              <Bar dataKey="tuketim" name="Tüketim" fill="#0f172a" />
              {generationMonthlyKwh && <Bar dataKey="uretim" name="Üretim" fill="#f59e0b" />}
            </BarChart>
          </ResponsiveContainer>
        </TabsContent>
      </Tabs>
    </div>
  );
}
