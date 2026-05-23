import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { getProject } from '@/lib/db';
import { ProjectConfig, SimulationResult } from '@/lib/types';
import { buildExcelReport } from '@/lib/reports/excel';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Excel rapor dışa aktarımı.
 * Query: ?type=combined (default) | generation | consumption
 *   - combined: 11 sheet tam rapor
 *   - generation: sadece saatlik üretim (timestamp + kWh)
 *   - consumption: sadece saatlik tüketim (timestamp + kWh)
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const row = getProject(params.id);
  if (!row) return NextResponse.json({ error: 'Proje bulunamadı' }, { status: 404 });
  if (!row.resultsJson) return NextResponse.json({ error: 'Önce simülasyon çalıştırın.' }, { status: 400 });
  const config = JSON.parse(row.configJson) as ProjectConfig;
  const result = JSON.parse(row.resultsJson) as SimulationResult;

  const type = new URL(req.url).searchParams.get('type') ?? 'combined';
  let buf: Buffer;
  let suffix: string;
  if (type === 'generation') {
    buf = await buildSimpleHourlyExcel('Üretim (kWh)', result.generationByYear[0]);
    suffix = '_uretim_saatlik';
  } else if (type === 'consumption') {
    buf = await buildSimpleHourlyExcel('Tüketim (kWh)', result.consumptionByYear[0]);
    suffix = '_tuketim_saatlik';
  } else {
    buf = await buildExcelReport(config, result);
    suffix = '';
  }

  const filename = encodeURIComponent(`${row.name}${suffix}.xlsx`);
  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

async function buildSimpleHourlyExcel(label: string, values: number[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'GES-Fizibilite Pro';
  const ws = wb.addWorksheet(label);
  ws.columns = [
    { header: 'Saat', key: 'h', width: 8 },
    { header: 'Tarih', key: 'date', width: 14 },
    { header: 'Saat (HH:00)', key: 'hour', width: 12 },
    { header: label, key: 'val', width: 16 },
  ];
  ws.getRow(1).font = { bold: true };
  const start = new Date(Date.UTC(2026, 0, 1));
  for (let h = 0; h < values.length; h++) {
    const d = new Date(start.getTime() + h * 3600_000);
    ws.addRow({
      h: h + 1,
      date: d.toISOString().slice(0, 10),
      hour: `${String(d.getUTCHours()).padStart(2, '0')}:00`,
      val: Math.round(values[h] * 10000) / 10000,
    });
  }
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
