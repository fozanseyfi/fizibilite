'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { NettingResult } from '@/lib/types';
import { formatKwh } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import Link from 'next/link';

const DPM = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MONTH_LABELS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

export function HourlyDataTable({
  projectId,
  generation,
  consumption,
  netting,
}: {
  projectId: string;
  generation: number[];
  consumption: number[];
  netting: NettingResult;
}) {
  const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('week');
  const [periodIndex, setPeriodIndex] = useState(0);

  const ranges = useMemo(() => buildRanges(granularity), [granularity]);
  const currentRange = ranges[Math.min(periodIndex, ranges.length - 1)];

  const rows = useMemo(() => {
    const out: HourlyRow[] = [];
    for (let h = currentRange.startHour; h < currentRange.endHour; h++) {
      out.push({
        hourIndex: h,
        timestamp: hourToTimestamp(h),
        generation: generation[h] || 0,
        consumption: consumption[h] || 0,
        netted: netting.netted[h] || 0,
        netConsumption: netting.netConsumption[h] || 0,
        surplus: netting.surplusGeneration[h] || 0,
        paidSurplus: netting.paidSurplus[h] || 0,
        yekdemFree: netting.yekdemFree[h] || 0,
      });
    }
    return out;
  }, [currentRange, generation, consumption, netting]);

  const summary = useMemo(() => {
    const acc = { gen: 0, cons: 0, netted: 0, netCons: 0, surplus: 0, paid: 0, yekdem: 0 };
    for (const r of rows) {
      acc.gen += r.generation;
      acc.cons += r.consumption;
      acc.netted += r.netted;
      acc.netCons += r.netConsumption;
      acc.surplus += r.surplus;
      acc.paid += r.paidSurplus;
      acc.yekdem += r.yekdemFree;
    }
    return acc;
  }, [rows]);

  return (
    <div className="space-y-4">
      {/* Filtre bar */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Saatlik Veri (Yıl 1)</CardTitle>
          <CardDescription>Tüm 8760 saatin enerji ve mahsuplaşma detayı. Periyot seç ve incele.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Granülerlik</Label>
              <div className="inline-flex gap-1 p-1 bg-secondary rounded-md">
                {(['day', 'week', 'month'] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => { setGranularity(g); setPeriodIndex(0); }}
                    className={`px-3 py-1.5 text-xs font-medium rounded ${granularity === g ? 'bg-background shadow' : 'text-muted-foreground'}`}
                  >
                    {g === 'day' ? 'Gün' : g === 'week' ? 'Hafta' : 'Ay'}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1 min-w-[200px]">
              <Label className="text-xs">Periyot</Label>
              <Select value={String(periodIndex)} onValueChange={(v) => setPeriodIndex(parseInt(v, 10))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-80">
                  {ranges.map((r, i) => (
                    <SelectItem key={i} value={String(i)}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="outline" onClick={() => setPeriodIndex((p) => Math.max(0, p - 1))} disabled={periodIndex === 0}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="outline" onClick={() => setPeriodIndex((p) => Math.min(ranges.length - 1, p + 1))} disabled={periodIndex === ranges.length - 1}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1" />
            <Button variant="outline" asChild>
              <Link href={`/api/reports/excel/${projectId}?type=combined`} target="_blank">
                <Download className="h-4 w-4 mr-2" /> Tüm 8760 Saat (Excel)
              </Link>
            </Button>
          </div>

          {/* Özet kartlar */}
          <div className="grid grid-cols-4 md:grid-cols-7 gap-2 text-center">
            <SummaryCell label="Üretim" value={summary.gen} color="solar" />
            <SummaryCell label="Tüketim" value={summary.cons} color="navy" />
            <SummaryCell label="Mahsup" value={summary.netted} color="eco" />
            <SummaryCell label="Net Çekiş" value={summary.netCons} color="navy" />
            <SummaryCell label="Fazla Üretim" value={summary.surplus} color="solar" />
            <SummaryCell label="Bedelli" value={summary.paid} color="eco" />
            <SummaryCell label="YEKDEM" value={summary.yekdem} color="navy" />
          </div>
        </CardContent>
      </Card>

      {/* Tablo */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[600px]">
            <table className="min-w-full text-xs">
              <thead className="bg-secondary sticky top-0 z-10">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">#</th>
                  <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">Tarih · Saat Aralığı</th>
                  <th className="text-right px-3 py-2 font-semibold whitespace-nowrap">Üretim (kWh)</th>
                  <th className="text-right px-3 py-2 font-semibold whitespace-nowrap">Tüketim (kWh)</th>
                  <th className="text-right px-3 py-2 font-semibold whitespace-nowrap">Mahsup (kWh)</th>
                  <th className="text-right px-3 py-2 font-semibold whitespace-nowrap">Net Çekiş (kWh)</th>
                  <th className="text-right px-3 py-2 font-semibold whitespace-nowrap">Fazla (kWh)</th>
                  <th className="text-right px-3 py-2 font-semibold whitespace-nowrap">Bedelli (kWh)</th>
                  <th className="text-right px-3 py-2 font-semibold whitespace-nowrap">YEKDEM (kWh)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.hourIndex} className="border-b border-border/30 hover:bg-secondary/30">
                    <td className="px-3 py-1.5 text-muted-foreground tabular-nums whitespace-nowrap">{r.hourIndex + 1}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">{r.timestamp}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums whitespace-nowrap text-solar-dark">{r.generation.toFixed(2)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums whitespace-nowrap">{r.consumption.toFixed(2)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums whitespace-nowrap text-eco-dark font-medium">{r.netted.toFixed(2)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums whitespace-nowrap text-destructive">{r.netConsumption.toFixed(2)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums whitespace-nowrap">{r.surplus.toFixed(2)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums whitespace-nowrap">{r.paidSurplus.toFixed(2)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums whitespace-nowrap text-muted-foreground">{r.yekdemFree.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-secondary sticky bottom-0">
                <tr className="font-bold border-t-2 border-foreground/40">
                  <td className="px-3 py-2 whitespace-nowrap" colSpan={2}>Periyot Toplamı ({rows.length} saat)</td>
                  <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">{summary.gen.toFixed(0)}</td>
                  <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">{summary.cons.toFixed(0)}</td>
                  <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap text-eco-dark">{summary.netted.toFixed(0)}</td>
                  <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap text-destructive">{summary.netCons.toFixed(0)}</td>
                  <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">{summary.surplus.toFixed(0)}</td>
                  <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">{summary.paid.toFixed(0)}</td>
                  <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap text-muted-foreground">{summary.yekdem.toFixed(0)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface HourlyRow {
  hourIndex: number;
  timestamp: string;
  generation: number;
  consumption: number;
  netted: number;
  netConsumption: number;
  surplus: number;
  paidSurplus: number;
  yekdemFree: number;
}

interface PeriodRange {
  startHour: number;
  endHour: number;
  label: string;
}

function buildRanges(granularity: 'day' | 'week' | 'month'): PeriodRange[] {
  if (granularity === 'day') {
    const out: PeriodRange[] = [];
    let cursor = 0;
    for (let m = 0; m < 12; m++) {
      for (let d = 1; d <= DPM[m]; d++) {
        const start = cursor;
        const end = cursor + 24;
        cursor = end;
        out.push({ startHour: start, endHour: end, label: `${String(d).padStart(2, '0')} ${MONTH_LABELS[m]}` });
      }
    }
    return out;
  }
  if (granularity === 'week') {
    const out: PeriodRange[] = [];
    for (let w = 0; w < 52; w++) {
      const start = w * 7 * 24;
      const end = Math.min(8760, start + 7 * 24);
      const startDate = hourToDate(start);
      const endDate = hourToDate(end - 1);
      out.push({
        startHour: start,
        endHour: end,
        label: `Hafta ${w + 1} (${formatDate(startDate)} – ${formatDate(endDate)})`,
      });
    }
    // Son birkaç saatlik artık
    if (52 * 7 * 24 < 8760) {
      out.push({ startHour: 52 * 7 * 24, endHour: 8760, label: 'Yıl sonu artık saatler' });
    }
    return out;
  }
  // month
  const out: PeriodRange[] = [];
  let cursor = 0;
  for (let m = 0; m < 12; m++) {
    const start = cursor;
    const end = cursor + DPM[m] * 24;
    cursor = end;
    out.push({ startHour: start, endHour: end, label: `${MONTH_LABELS[m]} (${DPM[m]} gün)` });
  }
  return out;
}

function hourToDate(h: number): Date {
  return new Date(Date.UTC(2026, 0, 1) + h * 3600_000);
}

function hourToTimestamp(h: number): string {
  const d = hourToDate(h);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const startHour = String(d.getUTCHours()).padStart(2, '0');
  const endHour = String((d.getUTCHours() + 1) % 24).padStart(2, '0');
  const dow = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'][(d.getUTCDay() + 6) % 7];
  return `${day}.${month} ${dow} · ${startHour}:00–${endHour}:00`;
}

function formatDate(d: Date): string {
  return `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function SummaryCell({ label, value, color }: { label: string; value: number; color: 'solar' | 'eco' | 'navy' }) {
  const borderClass = color === 'solar' ? 'border-l-solar' : color === 'eco' ? 'border-l-eco' : 'border-l-navy';
  return (
    <div className={`rounded-md border-l-4 bg-secondary/30 p-2 ${borderClass}`}>
      <div className="text-[10px] text-muted-foreground whitespace-nowrap">{label}</div>
      <div className="text-sm font-bold tabular-nums whitespace-nowrap">{formatKwh(value, { compact: true })}</div>
    </div>
  );
}
