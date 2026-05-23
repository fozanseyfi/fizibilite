/**
 * MODÜL 2 — CAPEX S-Curve Aylık Yayılım
 *
 * Mevcut tek-noktada-CAPEX modelinin yerini alır. Gerçek inşaat 3-12 ay sürer,
 * S-eğrisi formunda harcanır. IDC ve nakit akışı doğru hesaplanabilsin diye gerekli.
 *
 * 6 eğri tipi:
 *   - linear      : eşit dağılım (referans)
 *   - beta        : Beta(2, 2.5) — hafif sağa yatık çan
 *   - front       : erken ağırlıklı
 *   - back        : geç ağırlıklı (modül teslimi son aylar)
 *   - realistic   : 6 ay için [5, 15, 30, 25, 15, 10] %, diğerine ölçek
 *   - custom      : kullanıcı liste verir (toplam 1.0)
 *
 * Kategori split (C/E/M): Civil önce, Electrical orta, Module son (Karapınar NTP sırası).
 */

import { CapexScheduleInput, CapexScheduleResult, SCurveType } from './types';

const REALISTIC_6MONTH = [0.05, 0.15, 0.30, 0.25, 0.15, 0.10];

export function generateCapexSchedule(input: CapexScheduleInput): CapexScheduleResult {
  const { totalCapexTl, constructionMonths, curveType, customMonthlyPct, capexByCategory } = input;
  if (constructionMonths <= 0) throw new Error('constructionMonths > 0 olmalı');
  if (totalCapexTl <= 0) throw new Error('totalCapexTl > 0 olmalı');

  const pcts = computeMonthlyPercentages(curveType, constructionMonths, customMonthlyPct);
  const monthlyCapexTotal = pcts.map((p) => p * totalCapexTl);
  const cumulativeCapex = cumsum(monthlyCapexTotal);

  let byCategory: CapexScheduleResult['byCategory'] | undefined;
  if (capexByCategory) {
    byCategory = spreadByCategory(capexByCategory, constructionMonths);
  }

  return {
    monthlyCapexTotal,
    cumulativeCapex,
    curveType,
    byCategory,
  };
}

function computeMonthlyPercentages(
  curveType: SCurveType,
  months: number,
  custom?: number[]
): number[] {
  switch (curveType) {
    case 'custom': {
      if (!custom) throw new Error('custom curve için customMonthlyPct gerekli');
      const sum = custom.reduce((a, b) => a + b, 0);
      if (Math.abs(sum - 1.0) > 0.001) {
        throw new Error(`Custom yüzdeleri toplamı 1.0 olmalı (verilen: ${sum.toFixed(4)})`);
      }
      return custom.slice();
    }
    case 'linear':
      return new Array(months).fill(1 / months);
    case 'beta':
      return betaShape(months, 2, 2.5);
    case 'front':
      return frontLoadedShape(months);
    case 'back':
      return backLoadedShape(months);
    case 'realistic':
      return realisticShape(months);
  }
}

/**
 * Beta dağılımı PDF örneklemesi (alpha, beta).
 * Aylık olarak [0,1] aralığını eşit parçalara böler, beta PDF değerlerini normalize eder.
 */
function betaShape(months: number, alpha: number, betaParam: number): number[] {
  // PDF değerlerini orta noktalardan örnekle (daha pürüzsüz)
  const raw: number[] = [];
  for (let i = 0; i < months; i++) {
    const x = (i + 0.5) / months;
    raw.push(betaPdf(x, alpha, betaParam));
  }
  const total = raw.reduce((a, b) => a + b, 0);
  return raw.map((v) => v / total);
}

function betaPdf(x: number, alpha: number, beta: number): number {
  if (x <= 0 || x >= 1) return 0;
  // Stirling yaklaşımı kullanmadan basit: B(α,β) sabiti normalize ile ortadan kalkıyor
  return Math.pow(x, alpha - 1) * Math.pow(1 - x, beta - 1);
}

function frontLoadedShape(months: number): number[] {
  // Sağa eksi eğimli üçgen: en yüksek başta, lineer düşüş
  const raw: number[] = [];
  for (let i = 0; i < months; i++) raw.push(months - i);
  const total = raw.reduce((a, b) => a + b, 0);
  return raw.map((v) => v / total);
}

function backLoadedShape(months: number): number[] {
  const raw: number[] = [];
  for (let i = 0; i < months; i++) raw.push(i + 1);
  const total = raw.reduce((a, b) => a + b, 0);
  return raw.map((v) => v / total);
}

function realisticShape(months: number): number[] {
  if (months === REALISTIC_6MONTH.length) return REALISTIC_6MONTH.slice();
  // Diğer süreler için: 6 aylık profile lineer interpolation
  const out: number[] = new Array(months);
  for (let i = 0; i < months; i++) {
    const xN = i / Math.max(1, months - 1); // 0..1
    const x6 = xN * (REALISTIC_6MONTH.length - 1);
    const i0 = Math.floor(x6);
    const i1 = Math.min(REALISTIC_6MONTH.length - 1, i0 + 1);
    const w = x6 - i0;
    out[i] = REALISTIC_6MONTH[i0] * (1 - w) + REALISTIC_6MONTH[i1] * w;
  }
  const total = out.reduce((a, b) => a + b, 0);
  return out.map((v) => v / total);
}

/**
 * Civil → front-loaded (1..N/2)
 * Electrical → middle-loaded (N/4..3N/4)
 * Module → back-loaded (N/2..N)
 *
 * Her kategori kendi aralığında lineer ağırlıkla, dışında 0.
 */
function spreadByCategory(
  cat: { civil: number; electrical: number; module: number },
  months: number
): { civil: number[]; electrical: number[]; module: number[] } {
  const ramp = (start: number, end: number): number[] => {
    const out = new Array<number>(months).fill(0);
    const s = Math.max(0, Math.floor(start));
    const e = Math.min(months, Math.ceil(end));
    const span = e - s;
    if (span <= 0) {
      // İlk aya koy
      out[0] = 1;
      return out;
    }
    for (let i = s; i < e; i++) out[i] = 1;
    const total = out.reduce((a, b) => a + b, 0);
    return out.map((v) => v / total);
  };

  const civilPcts = frontLoadedShape(months);
  const electricalPcts = ramp(months * 0.25, months * 0.85);
  const modulePcts = backLoadedShape(months);

  return {
    civil: civilPcts.map((p) => p * cat.civil),
    electrical: electricalPcts.map((p) => p * cat.electrical),
    module: modulePcts.map((p) => p * cat.module),
  };
}

function cumsum(arr: number[]): number[] {
  const out: number[] = new Array(arr.length);
  let s = 0;
  for (let i = 0; i < arr.length; i++) {
    s += arr[i];
    out[i] = s;
  }
  return out;
}
