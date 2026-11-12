/**
 * OSOS / sayaç tüketim verisi — Excel şablonu ve okuyucu (C&I Adım 1).
 *
 * Şablon sayfaları:
 *  - "Açıklama": nasıl doldurulur
 *  - "Yıllık": yıllık ve önceki yıl tüketimi (kWh)
 *  - "Aylık": 12 ayın tüketimi (kWh)
 *  - "Saatlik (OSOS)": 8.760 satır — Tarih, Saat, Tüketim (kWh). OSOS'tan alınan saatlik veri buraya yapıştırılır.
 *
 * Okuma önceliği: Saatlik doluysa her şey ondan türetilir (yıl, ay, ay içi gün, gün içi saat);
 * değilse Aylık; değilse Yıllık. Önceki yıl tüketimi her zaman "Yıllık" sayfasından okunur.
 * Saatlik sayfa yerine OSOS'un kendi dışa aktarımı da okunur: tarih-saat + tüketim sütunları olan en uzun sayfa.
 */
import type { CiInputs } from './engine';
import { DAYS } from './presets';

const MONTHS_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const TEMPLATE_YEAR = 2025;

/** Değerleri %'ye çevir — YUVARLAMADAN (Excel'deki kWh, model içinde birebir korunur); son eleman kalan → toplam tam 100 */
function toPct(vals: number[]): number[] {
  const s = vals.reduce((a, b) => a + b, 0);
  if (s <= 0) return vals.map((_, i) => (i === vals.length - 1 ? 100 : 0));
  const out = vals.map((v) => (v / s) * 100);
  out[out.length - 1] = 100 - out.slice(0, -1).reduce((a, b) => a + b, 0);
  return out;
}

/** Şablon çalışma kitabını üretir (indirme ve test için) */
export async function buildOsosTemplate() {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Fizibilite Platformu';
  const head = { font: { bold: true, color: { argb: 'FFFFFFFF' } }, fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF16304F' } } };
  const input = { fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFFFF8E1' } } };
  // Formülle hesaplanan hücreler (mavi zemin)
  const calc = { fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFE8F0FB' } }, font: { color: { argb: 'FF1F4E8C' } } };

  const a = wb.addWorksheet('Açıklama');
  a.columns = [{ width: 110 }];
  [
    'C&I Fizibilite — OSOS / sayaç tüketim verisi şablonu',
    '',
    'Bu dosyayı doldurup Fizibilite Modeli → Adım 1 → "Excel yükle" ile yükleyin. Üç seviyeden yalnızca birini doldurmanız yeterli:',
    '1) En ayrıntılısı: "Saatlik (OSOS)" sayfası — 8.760 saatin her birinin tüketimi (kWh). OSOS portalından aldığınız saatlik veriyi C sütununa yapıştırın.',
    '   Yıllık toplam, ay ay yüzdeler, ay içi gün dağılımı ve gün içi saatlik profil (hafta içi / hafta sonu) bu sayfadan otomatik hesaplanır.',
    '   "Aylık" ve "Yıllık" sayfalarındaki tüketimler saatlik veriden FORMÜLLE otomatik hesaplanır (mavi hücreler) — kontrol için bakabilirsiniz.',
    '2) Saatlik veri yoksa: "Aylık" sayfasında 12 ayın tüketimini mavi formül hücrelerinin ÜZERİNE yazın. Yıllık toplam Aylık sayfasından otomatik gelir.',
    '3) Yalnızca toplam biliniyorsa: "Yıllık" sayfasında yıllık tüketim hücresinin üzerine yazın.',
    '"Yıllık" sayfasındaki "Önceki yıl tüketimi" bedelli üretim limitinin bazıdır (limit = önceki yıl × 2); her durumda okunur.',
    '',
    'Sarı hücreler girilecek alanlardır, mavi hücreler formüldür.  Tarih ve saat sütunlarını değiştirmeyin. Boş bırakılan saatler 0 kabul edilmez; o sayfa eksik sayılır (en az %80 dolu olmalı).',
    'Not: Model, ayın ilk gününü pazartesi kabul eden temsili bir takvim kullanır; günlük tüketimler ayın günü sırasıyla aktarılır.',
  ].forEach((t, i) => { const r = a.addRow([t]); if (i === 0) r.font = { bold: true, size: 14 }; r.alignment = { wrapText: true }; });

  const y = wb.addWorksheet('Yıllık');
  y.columns = [{ header: 'Kalem', width: 34 }, { header: 'Tüketim (kWh)', width: 18 }];
  y.getRow(1).eachCell((c) => Object.assign(c, head));
  // Yıllık tüketim = Aylık toplam (formül); Aylık da saatlikten formülle gelir. Saatlik yoksa üzerine yazılabilir.
  y.addRow(['Yıllık tüketim (Aylık sayfasından otomatik)', { formula: "SUM('Aylık'!B2:B13)" }]);
  y.addRow(['Önceki yıl tüketimi', null]);
  Object.assign(y.getCell(2, 2), calc, { numFmt: '#,##0' });
  Object.assign(y.getCell(3, 2), input, { numFmt: '#,##0' });
  y.getColumn(1).width = 44;

  const m = wb.addWorksheet('Aylık');
  m.columns = [{ header: 'Ay', width: 14 }, { header: 'Tüketim (kWh)', width: 18 }];
  m.getRow(1).eachCell((c) => Object.assign(c, head));
  // Her ay = Saatlik sayfasında o ayın saatlerinin toplamı (formül). Saatlik veri yoksa üzerine elle yazın.
  MONTHS_TR.forEach((mo, i) => {
    m.addRow([mo, { formula: "SUMPRODUCT((MONTH('Saatlik (OSOS)'!$A$2:$A$8761)=" + (i + 1) + ")*('Saatlik (OSOS)'!$C$2:$C$8761))" }]);
    Object.assign(m.getCell(i + 2, 2), calc, { numFmt: '#,##0' });
  });
  m.addRow(['Toplam', { formula: 'SUM(B2:B13)' }]).font = { bold: true };

  const h = wb.addWorksheet('Saatlik (OSOS)');
  h.columns = [{ header: 'Tarih', width: 13 }, { header: 'Saat', width: 8 }, { header: 'Tüketim (kWh)', width: 16 }];
  h.getRow(1).eachCell((c) => Object.assign(c, head));
  h.views = [{ state: 'frozen', ySplit: 1 }];
  for (let mi = 0; mi < 12; mi++) {
    for (let d = 1; d <= DAYS[mi]; d++) {
      for (let hr = 0; hr < 24; hr++) {
        h.addRow([new Date(Date.UTC(TEMPLATE_YEAR, mi, d)), `${String(hr).padStart(2, '0')}:00`, null]);
      }
    }
  }
  h.getColumn(1).numFmt = 'dd.mm.yyyy';
  h.getColumn(3).numFmt = '#,##0.00';
  h.getColumn(3).eachCell((c, row) => { if (row > 1) c.fill = input.fill; });

  return wb;
}

export async function downloadOsosTemplate(): Promise<void> {
  const wb = await buildOsosTemplate();
  const buf = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const link = document.createElement('a');
  link.href = url; link.download = 'OSOS-tuketim-sablonu.xlsx';
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export interface OsosResult {
  patch: Partial<CiInputs>;
  summary: string;
  level: 'saatlik' | 'aylık' | 'yıllık';
}

type Cell = { value: unknown } | undefined;
const num = (v: unknown): number | null => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (v && typeof v === 'object' && 'result' in (v as Record<string, unknown>)) return num((v as { result: unknown }).result);
  if (typeof v === 'string') {
    const t = v.trim().replace(/\s/g, '');
    if (!t) return null;
    // 1.234,56 (TR) veya 1,234.56 (EN) ya da düz
    const tr = /^-?\d{1,3}(\.\d{3})*(,\d+)?$/.test(t) ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '');
    const n = Number(tr);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};
/** Tarih (ve varsa saat) → {ay, gün, saat?, haftaSonu} */
function parseDate(v: unknown): { y: number; mi: number; d: number; h?: number; we: boolean } | null {
  let dt: Date | null = null;
  if (v instanceof Date) dt = v;
  else if (typeof v === 'number' && v > 30000 && v < 80000) dt = new Date(Math.round((v - 25569) * 86400000)); // Excel seri tarih
  else if (typeof v === 'string') {
    const s = v.trim();
    let m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:[ T](\d{1,2})(?::\d{2})?)?/);
    if (m) {
      const h = m[4] !== undefined ? +m[4] : undefined;
      const date = new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
      return { y: +m[3], mi: +m[2] - 1, d: +m[1] - 1, h, we: [0, 6].includes(date.getUTCDay()) };
    }
    m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}))?/);
    if (m) {
      const date = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
      return { y: +m[1], mi: +m[2] - 1, d: +m[3] - 1, h: m[4] !== undefined ? +m[4] : undefined, we: [0, 6].includes(date.getUTCDay()) };
    }
  }
  if (!dt || isNaN(dt.getTime())) return null;
  const hasTime = dt.getUTCHours() !== 0 || dt.getUTCMinutes() !== 0;
  return { y: dt.getUTCFullYear(), mi: dt.getUTCMonth(), d: dt.getUTCDate() - 1, h: hasTime ? dt.getUTCHours() : undefined, we: [0, 6].includes(dt.getUTCDay()) };
}
const parseHour = (v: unknown): number | null => {
  if (typeof v === 'number') return v >= 0 && v < 1 ? Math.round(v * 24) % 24 : v >= 0 && v <= 24 ? Math.floor(v) % 24 : null; // Excel saat kesri ya da 0–23
  if (v instanceof Date) return v.getUTCHours();
  if (typeof v === 'string') { const m = v.trim().match(/^(\d{1,2})/); return m ? +m[1] % 24 : null; }
  return null;
};

export async function parseOsosFile(file: File): Promise<OsosResult> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const patch: Partial<CiInputs> = {};
  const notes: string[] = [];

  // Önceki yıl / yıllık
  const ys = wb.getWorksheet('Yıllık');
  let yearly: number | null = null;
  if (ys) {
    ys.eachRow((row, r) => {
      if (r === 1) return;
      const k = String((row.getCell(1) as Cell)?.value ?? '').toLowerCase();
      const v = num((row.getCell(2) as Cell)?.value);
      if (v === null || v <= 0) return;
      if (k.includes('önceki')) patch.consPrev = Math.round(v);
      else if (k.includes('yıllık')) yearly = v;
    });
  }

  // Saatlik: şablon sayfası ya da en uzun sayfa (OSOS dışa aktarımı)
  let hs = wb.getWorksheet('Saatlik (OSOS)');
  if (!hs || hs.rowCount < 1000) {
    let best: typeof hs = undefined;
    wb.eachSheet((s) => { if (!['Açıklama', 'Yıllık', 'Aylık'].includes(s.name) && s.rowCount > (best?.rowCount ?? 1000)) best = s; });
    if (best) hs = best;
  }
  const hourly: { mi: number; d: number; h: number; we: boolean; v: number }[] = [];
  const years = new Map<number, number>();
  if (hs && hs.rowCount >= 1000) {
    const seq = new Map<string, number>(); // saat sütunu yoksa aynı gün içindeki sıra
    hs.eachRow((row, r) => {
      if (r === 1) return;
      const c1 = (row.getCell(1) as Cell)?.value, c2 = (row.getCell(2) as Cell)?.value, c3 = (row.getCell(3) as Cell)?.value;
      const dt = parseDate(c1);
      if (!dt || dt.mi < 0 || dt.mi > 11 || dt.d >= DAYS[dt.mi]) return;
      // Düzen: [Tarih, Saat, kWh] ya da [TarihSaat, kWh]
      let h = parseHour(c2), v = num(c3);
      if (v === null && dt.h !== undefined) { h = dt.h; v = num(c2); }
      if (h === null || h === undefined) {
        const key = `${dt.mi}-${dt.d}`; h = seq.get(key) ?? 0; seq.set(key, h + 1);
      }
      if (v === null || v < 0 || h > 23) return;
      hourly.push({ mi: dt.mi, d: dt.d, h, we: dt.we, v });
      years.set(dt.y, (years.get(dt.y) ?? 0) + 1);
    });
  }

  if (hourly.length >= 8760 * 0.8) {
    const mon = Array(12).fill(0);
    const day: number[][] = DAYS.map((n) => Array(n).fill(0));
    const hrs: number[][][] = DAYS.map((n) => Array.from({ length: n }, () => Array(24).fill(0)));
    const isWe: boolean[][] = DAYS.map((n) => Array(n).fill(false));
    hourly.forEach((x) => { mon[x.mi] += x.v; day[x.mi][x.d] += x.v; hrs[x.mi][x.d][x.h] += x.v; isWe[x.mi][x.d] = x.we; });
    const total = mon.reduce((a, b) => a + b, 0);
    // Gün içi profil: günlerin saatlik paylarının ortalaması (hafta içi / hafta sonu ayrı)
    const shape = (we: boolean, only?: number) => {
      const acc = Array(24).fill(0); let n = 0, kwh = 0;
      for (let mi = 0; mi < 12; mi++) for (let d = 0; d < DAYS[mi]; d++) {
        if (only !== undefined && mi !== only) continue;
        if (isWe[mi][d] !== we || day[mi][d] <= 0) continue;
        hrs[mi][d].forEach((v, h) => { acc[h] += v; }); n++; kwh += day[mi][d];
      }
      return { pct: n && kwh > 0 ? toPct(acc) : null, avg: n ? kwh / n : 0 };
    };
    const wd = shape(false), we = shape(true);
    const shapeAll = (mi: number) => {
      const acc = Array(24).fill(0); let kwh = 0;
      for (let d = 0; d < DAYS[mi]; d++) { if (day[mi][d] <= 0) continue; hrs[mi][d].forEach((v, h) => { acc[h] += v; }); kwh += day[mi][d]; }
      return kwh > 0 ? toPct(acc) : null;
    };
    const weRatio = wd.avg > 0 ? Math.round((we.avg / wd.avg) * 100) : 100;
    const shapeDiff = wd.pct && we.pct ? wd.pct.reduce((s, v, h) => s + Math.abs(v - we.pct![h]), 0) : 0;
    const split = Math.abs(weRatio - 100) > 10 || shapeDiff > 15;
    patch.consY = total; // yuvarlamadan — Excel toplamı birebir (ekranda tam sayı gösterilir)
    patch.monthly = toPct(mon);
    patch.dayW = day.map((arr) => (arr.some((v) => v > 0) ? toPct(arr) : null));
    if (wd.pct) patch.wd = wd.pct;
    if (we.pct) patch.we = split ? we.pct : wd.pct ?? we.pct;
    // Ay ay gün içi profil (her ayın kendi ortalama günü)
    patch.hourWd = Array.from({ length: 12 }, (_, mi) => (split ? shape(false, mi).pct : shapeAll(mi)));
    patch.hourWe = split ? Array.from({ length: 12 }, (_, mi) => shape(true, mi).pct) : undefined;
    patch.weSplit = split;
    patch.weRatio = weRatio;
    // En çok satırı olan yıl → modelde gerçek takvim (hafta içi / hafta sonu günleri doğru yere düşer)
    patch.calYear = [...years.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    patch.osos = { file: file.name, level: 'saatlik' };
    notes.push(`${hourly.length.toLocaleString('tr-TR')} saatlik değer okundu · yıllık ${Math.round(total).toLocaleString('tr-TR')} kWh`);
    notes.push(split ? `hafta sonu farklı (hafta sonu günü hafta içinin %${weRatio}'i) — hafta içi/sonu ayrımı açıldı` : 'hafta içi ve hafta sonu benzer — tek profil kullanıldı');
    return { patch, summary: notes.join(' · '), level: 'saatlik' };
  }

  // Aylık
  const ms = wb.getWorksheet('Aylık');
  if (ms) {
    const vals: number[] = [];
    for (let r = 2; r <= 13; r++) { const v = num((ms.getCell(r, 2) as Cell)?.value); vals.push(v ?? NaN); }
    const filled = vals.filter((v) => Number.isFinite(v) && v >= 0).length;
    if (filled >= 10) {
      const clean = vals.map((v) => (Number.isFinite(v) && v >= 0 ? v : 0));
      const total = clean.reduce((a, b) => a + b, 0);
      if (total > 0) {
        patch.consY = total;
        patch.monthly = toPct(clean);
        notes.push(`aylık tüketimler okundu · yıllık ${Math.round(total).toLocaleString('tr-TR')} kWh`);
        if (filled < 12) notes.push(`${12 - filled} ay boş — 0 kabul edildi`);
        patch.osos = { file: file.name, level: 'aylık' };
        return { patch, summary: notes.join(' · '), level: 'aylık' };
      }
    }
  }

  if (yearly) {
    patch.consY = Math.round(yearly);
    patch.osos = { file: file.name, level: 'yıllık' };
    notes.push(`yıllık tüketim okundu · ${Math.round(yearly).toLocaleString('tr-TR')} kWh`);
    return { patch, summary: notes.join(' · '), level: 'yıllık' };
  }
  throw new Error('Dosyada okunabilir tüketim bulunamadı. Şablonun "Saatlik (OSOS)", "Aylık" ya da "Yıllık" sayfasını doldurun.');
}
