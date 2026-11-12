import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { parseOsosFile } from '@/lib/models/ci/osos';

const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const asFile = async (wb: ExcelJS.Workbook) => {
  const buf = await wb.xlsx.writeBuffer();
  return { name: 'test.xlsx', arrayBuffer: async () => buf as ArrayBuffer } as unknown as File;
};

describe('OSOS Excel okuyucu', () => {
  it('saatlik sayfadan yıl, ay, ay içi gün ve gün içi profil türetir', async () => {
    const wb = new ExcelJS.Workbook();
    const y = wb.addWorksheet('Yıllık');
    y.addRow(['Kalem', 'Tüketim (kWh)']); y.addRow(['Yıllık tüketim', null]); y.addRow(['Önceki yıl tüketimi', 900000]);
    const h = wb.addWorksheet('Saatlik (OSOS)');
    h.addRow(['Tarih', 'Saat', 'Tüketim (kWh)']);
    let total = 0;
    for (let mi = 0; mi < 12; mi++) for (let d = 1; d <= DAYS[mi]; d++) {
      const date = new Date(Date.UTC(2025, mi, d));
      const we = [0, 6].includes(date.getUTCDay());
      for (let hr = 0; hr < 24; hr++) {
        const v = (we ? 5 : 10) * (hr >= 8 && hr < 18 ? 3 : 1) * (mi === 6 ? 1.5 : 1);
        total += v;
        h.addRow([date, `${String(hr).padStart(2, '0')}:00`, v]);
      }
    }
    const r = await parseOsosFile(await asFile(wb));
    expect(r.level).toBe('saatlik');
    expect(r.patch.consY).toBe(Math.round(total));
    expect(r.patch.consPrev).toBe(900000);
    expect(r.patch.monthly!.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 6);
    expect(r.patch.monthly![6]).toBeGreaterThan(r.patch.monthly![5]); // Temmuz 1,5×
    expect(r.patch.dayW![0]!.length).toBe(31);
    expect(r.patch.dayW![1]!.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 6);
    expect(r.patch.weSplit).toBe(true);
    expect(r.patch.weRatio).toBe(50);
    expect(r.patch.wd![10]).toBeGreaterThan(r.patch.wd![2]); // gündüz yoğun
    expect(r.patch.hourWd!.every((a) => a && a.length === 24)).toBe(true); // her ayın kendi profili
    expect(r.patch.hourWe![6]!.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 6);
  });

  it('saatlik yoksa aylık sayfayı okur', async () => {
    const wb = new ExcelJS.Workbook();
    const m = wb.addWorksheet('Aylık');
    m.addRow(['Ay', 'Tüketim (kWh)']);
    for (let i = 0; i < 12; i++) m.addRow(['ay', 1000 * (i + 1)]);
    const r = await parseOsosFile(await asFile(wb));
    expect(r.level).toBe('aylık');
    expect(r.patch.consY).toBe(78000);
    expect(r.patch.monthly![11]).toBeGreaterThan(r.patch.monthly![0]);
  });

  it('boş dosyada anlaşılır hata verir', async () => {
    const wb = new ExcelJS.Workbook(); wb.addWorksheet('Yıllık');
    await expect(parseOsosFile(await asFile(wb))).rejects.toThrow(/okunabilir tüketim/);
  });
});
