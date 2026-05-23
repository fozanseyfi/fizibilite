/**
 * PVGIS API Client — PRD §4.
 *
 * Avrupa Komisyonu PVGIS-SARAH3 verisinden saatlik PV üretimi çeker.
 * Cache'li (better-sqlite3, 90 gün TTL).
 *
 * Endpoint: https://re.jrc.ec.europa.eu/api/v5_3/seriescalc
 */

import { createHash } from 'crypto';
import { HOURS_PER_YEAR, PVSystemConfig, Location } from './types';
import { readPvgisCache, writePvgisCache } from './db';

const PVGIS_BASE = process.env.PVGIS_BASE_URL || 'https://re.jrc.ec.europa.eu/api/v5_3/seriescalc';
const CACHE_TTL_MS = (Number(process.env.PVGIS_CACHE_TTL_DAYS) || 90) * 24 * 3600 * 1000;
const PVGIS_TIMEOUT_MS = 30_000;

export interface PVGISFetchInput {
  location: Location;
  pv: PVSystemConfig;
  startYear?: number;
  endYear?: number;
}

export interface PVGISFetchResult {
  hourly: number[]; // 8760 kWh
  annualKwh: number;
  specificYieldKwhPerKwp: number;
  source: 'cache' | 'api' | 'fallback';
  cachedAt?: string;
  pvgisInputs: Record<string, string>;
}

function cacheKey(loc: Location, pv: PVSystemConfig): string {
  const raw = [
    loc.lat.toFixed(4),
    loc.lon.toFixed(4),
    pv.peakPowerKwp,
    pv.loss,
    pv.angle,
    pv.aspect,
    pv.moduleTech,
    pv.mounting,
    pv.tracking,
  ].join('|');
  return createHash('sha256').update(raw).digest('hex').slice(0, 32);
}

interface PVGISRawResponse {
  outputs?: {
    hourly?: Array<{ time: string; P: number; G_i?: number }>;
  };
  inputs?: Record<string, unknown>;
}

export async function fetchPVGIS(input: PVGISFetchInput): Promise<PVGISFetchResult> {
  const key = cacheKey(input.location, input.pv);
  const cached = readCache(key);
  if (cached) return cached;

  const params = new URLSearchParams({
    lat: input.location.lat.toFixed(4),
    lon: input.location.lon.toFixed(4),
    startyear: String(input.startYear ?? 2020),
    endyear: String(input.endYear ?? 2020),
    pvcalculation: '1',
    peakpower: String(input.pv.peakPowerKwp),
    loss: String(input.pv.loss),
    angle: String(input.pv.angle),
    aspect: String(input.pv.aspect),
    pvtechchoice: input.pv.moduleTech,
    mountingplace: input.pv.mounting,
    trackingtype: String(input.pv.tracking),
    outputformat: 'json',
    raddatabase: 'PVGIS-SARAH3',
  });

  const url = `${PVGIS_BASE}?${params.toString()}`;
  const inputsRecord = Object.fromEntries(params.entries());

  let lastError: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), PVGIS_TIMEOUT_MS);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) {
        throw new Error(`PVGIS HTTP ${res.status}`);
      }
      const data = (await res.json()) as PVGISRawResponse;
      const hourly = normalizeHourly(data, input.pv.peakPowerKwp);
      const annualKwh = hourly.reduce((a, b) => a + b, 0);
      const result: PVGISFetchResult = {
        hourly,
        annualKwh,
        specificYieldKwhPerKwp: input.pv.peakPowerKwp > 0 ? annualKwh / input.pv.peakPowerKwp : 0,
        source: 'api',
        pvgisInputs: inputsRecord,
      };
      writeCache(key, input.location, input.pv, result);
      return result;
    } catch (err) {
      lastError = err;
      await sleep(Math.pow(3, attempt) * 1000); // 1s, 3s, 9s
    }
  }

  // PVGIS down → fallback synthetic
  const synthetic = generateSyntheticHourly(input.location, input.pv);
  return {
    ...synthetic,
    source: 'fallback',
    pvgisInputs: inputsRecord,
  };
}

function normalizeHourly(raw: PVGISRawResponse, _peakKwp: number): number[] {
  const list = raw?.outputs?.hourly ?? [];
  if (list.length === 0) throw new Error('PVGIS boş veri döndü.');

  // PVGIS P → AC çıkış gücü Watt-saat (kWh = Wh/1000)
  // Tek yıl alındığı varsayımıyla 8760 saate normalize
  const series = list.map((row) => Math.max(0, (row.P || 0) / 1000));

  if (series.length === HOURS_PER_YEAR) return series;
  if (series.length === 8784) {
    // Artık yıl: 29 Şubat'ı düş
    const trimmed = [...series.slice(0, 31 * 24 + 28 * 24), ...series.slice(31 * 24 + 29 * 24)];
    return trimmed.slice(0, HOURS_PER_YEAR);
  }
  // Çoklu yıl → ortala
  if (series.length >= HOURS_PER_YEAR) {
    const years = Math.floor(series.length / HOURS_PER_YEAR);
    const avg = new Array<number>(HOURS_PER_YEAR).fill(0);
    for (let y = 0; y < years; y++) {
      for (let h = 0; h < HOURS_PER_YEAR; h++) {
        avg[h] += series[y * HOURS_PER_YEAR + h];
      }
    }
    return avg.map((v) => v / years);
  }
  throw new Error(`Beklenmeyen PVGIS veri uzunluğu: ${series.length}`);
}

/**
 * Yıl N için üretim: LID (ilk yıl) + yıllık degradasyon.
 */
export function applyDegradation(
  baseHourly: number[],
  pv: PVSystemConfig,
  yearIndex: number
): number[] {
  const lidFactor = 1 - pv.lidPct;
  const degFactor = Math.pow(1 - pv.annualDegradationPct, yearIndex);
  const scale = lidFactor * degFactor;
  return baseHourly.map((v) => v * scale);
}

// ---------- Cache (JSON-file store) ----------

function readCache(key: string): PVGISFetchResult | null {
  try {
    const row = readPvgisCache(key);
    if (!row) return null;
    if (new Date(row.expiresAt).getTime() < Date.now()) return null;
    const hourly = JSON.parse(row.hourlyBlob) as number[];
    return {
      hourly,
      annualKwh: row.annualKwh,
      specificYieldKwhPerKwp: row.specificYield,
      source: 'cache',
      cachedAt: row.cachedAt,
      pvgisInputs: {},
    };
  } catch {
    return null;
  }
}

function writeCache(key: string, loc: Location, pv: PVSystemConfig, result: PVGISFetchResult): void {
  try {
    const now = new Date();
    const expires = new Date(now.getTime() + CACHE_TTL_MS);
    writePvgisCache({
      cacheKey: key,
      lat: loc.lat,
      lon: loc.lon,
      paramsJson: JSON.stringify(pv),
      hourlyBlob: JSON.stringify(result.hourly),
      annualKwh: result.annualKwh,
      specificYield: result.specificYieldKwhPerKwp,
      cachedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
    });
  } catch {
    // Cache yazılamasa bile sonuç döner
  }
}

// ---------- Fallback (PVGIS unreachable) ----------

/**
 * Basit fiziksel model: lat'a göre yıllık spesifik üretim 1400-1750 kWh/kWp,
 * günlük sinüs profili, mevsimsel sinüs.
 * Üretim grafiği yaklaşık olarak gerçekçidir; offline demo için yeterlidir.
 */
function generateSyntheticHourly(
  loc: Location,
  pv: PVSystemConfig
): Omit<PVGISFetchResult, 'source' | 'pvgisInputs'> {
  // Türkiye için lat 36-42 aralığı → yıllık 1750 → 1450 kWh/kWp
  const specYieldBase = 1900 - (loc.lat - 35) * 70; // lat arttıkça azalır
  const specYield = Math.max(1200, Math.min(2000, specYieldBase));
  const lossFactor = 1 - pv.loss / 100;
  const annualKwh = pv.peakPowerKwp * specYield * lossFactor;

  const hourly = new Array<number>(HOURS_PER_YEAR);
  const peakDayProfile = (h: number) => {
    // 6-19 aralığı, sin² şekli
    if (h < 6 || h > 19) return 0;
    const t = (h - 6) / 13;
    return Math.pow(Math.sin(Math.PI * t), 2);
  };
  const dailyShape = Array.from({ length: 24 }, (_, h) => peakDayProfile(h));
  const dailySum = dailyShape.reduce((a, b) => a + b, 0);
  const dailyNorm = dailyShape.map((v) => v / dailySum); // toplam 1.0

  const monthlyFactor = [0.55, 0.7, 0.9, 1.05, 1.2, 1.3, 1.35, 1.25, 1.05, 0.85, 0.6, 0.5];
  const monthlySum = monthlyFactor.reduce((a, b) => a + b, 0);
  const monthlyNorm = monthlyFactor.map((v) => (v * 12) / monthlySum);
  const dpm = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  let cursor = 0;
  for (let m = 0; m < 12; m++) {
    const days = dpm[m];
    const monthlyAnnualShare = (monthlyNorm[m] / 12) * annualKwh;
    const perDay = monthlyAnnualShare / days;
    for (let d = 0; d < days; d++) {
      for (let h = 0; h < 24; h++) {
        hourly[cursor] = perDay * dailyNorm[h];
        cursor++;
      }
    }
  }

  return {
    hourly,
    annualKwh,
    specificYieldKwhPerKwp: pv.peakPowerKwp > 0 ? annualKwh / pv.peakPowerKwp : 0,
  };
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
