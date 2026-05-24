'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { HourDayHeatmap } from '@/components/dashboard/Heatmap';
import { formatKwh } from '@/lib/utils';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const MONTH_NAMES = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

export function PvSimulationCharts({
  monthlyGen,
  yearlyGen,
  hourlyY1,
}: {
  monthlyGen: number[];
  yearlyGen: { year: number; gen: number }[];
  hourlyY1: number[];
}) {
  const monthlyData = monthlyGen.map((v, i) => ({ month: MONTH_NAMES[i], gen: v }));
  const avgMonthly = monthlyGen.reduce((a, b) => a + b, 0) / 12;

  return (
    <>
      {/* Aylık üretim */}
      <Card>
        <CardHeader>
          <CardTitle>Aylık Üretim Profili (Yıl 1)</CardTitle>
          <CardDescription>Aylık üretim dağılımı. Türkiye için yaz pikleri Mayıs-Ağustos, kış düşüşü Aralık-Ocak.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(v: number) => formatKwh(v, { compact: true })} />
              <Bar dataKey="gen" fill="#f59e0b" name="Üretim" />
              <ReferenceLine y={avgMonthly} stroke="#0f172a" strokeDasharray="5 5" label={{ value: `Ort: ${(avgMonthly / 1000).toFixed(0)}K`, position: 'right', fontSize: 10 }} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Yıllık degradasyon trendi */}
      <Card>
        <CardHeader>
          <CardTitle>25 Yıllık Üretim Trendi (Degradasyon Dahil)</CardTitle>
          <CardDescription>Her yıl LID + yıllık degradasyon multiplicative uygulanır. Yıl 25 üretimi yıl 1&apos;in ~%88&apos;i.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={yearlyGen}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(v: number) => formatKwh(v, { compact: true })} />
              <Line type="monotone" dataKey="gen" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} name="Yıllık Üretim" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Saatlik heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Saatlik Üretim Heatmap (Yıl 1)</CardTitle>
          <CardDescription>X: günler (1-365) · Y: saat (00-24). Sıcak renk = yüksek üretim. Yaz/öğle pikleri sarı, kış/gece koyu.</CardDescription>
        </CardHeader>
        <CardContent>
          <HourDayHeatmap values={hourlyY1} colorScale="solar" />
        </CardContent>
      </Card>
    </>
  );
}
