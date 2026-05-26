/**
 * JSON-file storage (zero-native, Windows + Node 24 dostu).
 *
 * Tablolar:
 *   - projects.json       → ProjectRow[]
 *   - pvgis_cache.json    → Record<cacheKey, PvgisCacheRow>
 *   - tariffs.json        → TariffRow[]
 *
 * Eş zamanlı yazma için file-level lock (basit `fs.renameSync` atomic).
 * Tek kullanıcılı demo için yeterli; çoklu kullanıcıda Postgres'e taşı.
 */

import fs from 'fs';
import path from 'path';
import type { TariffEntry, TimeOfUseDefinition, LastResortSupplyConfig, UnlicensedFees } from './tariffs/schema';
import { TARIFFS_2026, TIME_OF_USE_2026, LAST_RESORT_2026, UNLICENSED_FEES_2026 } from './tariffs/seed_2026';

const DATA_DIR = path.resolve(process.cwd(), 'data');

/**
 * Vercel serverless ortamında dosya sistemi salt okunurdur.
 * Bu yüzden serverless'ta in-memory store kullanırız (lambda restart'larında veri kaybolur).
 * Lokal/Docker'da JSON dosya yazılır (kalıcı).
 *
 * Üretim için Vercel KV / Postgres / Upstash kullanılması önerilir.
 */
const IS_READONLY_FS = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

interface BaseStore<T> {
  read(): T;
  write(value: T): void;
}

function ensureDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch { /* ignore */ }
  }
}

// In-memory cache (serverless için).
// globalThis'e pin'lenir → aynı warm Lambda container'da farklı invocation'lar arasında paylaşılır.
// Cold start'ta sıfırlanır (demo modda bilinen kısıt — gerçek persistence için Vercel KV / Postgres gerek).
const globalForMemory = globalThis as unknown as { __gesFizMemoryStore?: Record<string, unknown> };
const memoryStore: Record<string, unknown> = globalForMemory.__gesFizMemoryStore ?? {};
if (!globalForMemory.__gesFizMemoryStore) globalForMemory.__gesFizMemoryStore = memoryStore;

function fileStore<T>(filename: string, initial: T): BaseStore<T> {
  const filePath = path.join(DATA_DIR, filename);

  if (IS_READONLY_FS) {
    // Serverless: bellekte tut, başlangıçta demo seed varsa onu yükle
    if (!(filename in memoryStore)) memoryStore[filename] = structuredClone(initial);
    return {
      read(): T {
        return memoryStore[filename] as T;
      },
      write(value: T): void {
        memoryStore[filename] = value;
      },
    };
  }

  return {
    read(): T {
      ensureDir();
      if (!fs.existsSync(filePath)) {
        try { fs.writeFileSync(filePath, JSON.stringify(initial, null, 2), 'utf-8'); } catch { /* ignore */ }
        return initial;
      }
      try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(raw) as T;
      } catch {
        return initial;
      }
    },
    write(value: T): void {
      ensureDir();
      try {
        const tmp = filePath + '.tmp';
        fs.writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf-8');
        fs.renameSync(tmp, filePath);
      } catch {
        // FS yazma başarısızsa bellekte tut
        memoryStore[filename] = value;
      }
    },
  };
}

/** Demo modu mu? (Vercel'de evet) */
export const IS_DEMO_MODE = IS_READONLY_FS;

// ---------- Domain rows ----------

export interface ProjectRow {
  id: string;
  name: string;
  description?: string;
  projectType: string;
  status: 'draft' | 'completed' | 'archived';
  configJson: string; // full ProjectConfig JSON
  resultsJson?: string; // SimulationResult JSON
  createdAt: string;
  updatedAt: string;
}

export interface PvgisCacheRow {
  cacheKey: string;
  lat: number;
  lon: number;
  paramsJson: string;
  hourlyBlob: string; // JSON stringified number[]
  annualKwh: number;
  specificYield: number;
  cachedAt: string;
  expiresAt: string;
}

export interface TariffRow {
  id: number;
  consumerGroup: string;
  voltageLevel: string;
  tariffType: string;
  period: string;
  energyPriceTlKwh: number;
  distributionFeeTlKwh: number;
  validFrom: string;
  source: string;
}

// ---------- Stores ----------

const projectStore = fileStore<ProjectRow[]>('projects.json', []);
const pvgisStore = fileStore<Record<string, PvgisCacheRow>>('pvgis_cache.json', {});
const tariffStore = fileStore<TariffRow[]>('tariffs.json', []);

// Zenginleştirilmiş tarife veri kümesi (EPDK 14461 ve sonrası)
interface TariffsV2Store {
  entries: TariffEntry[];
  timeOfUse: TimeOfUseDefinition;
  skt: LastResortSupplyConfig;
  unlicensedFees: UnlicensedFees;
  lastSyncedAt: string | null;
  lastSyncSource: string | null;
}

const tariffsV2Store = fileStore<TariffsV2Store>('tariffs_v2.json', {
  entries: TARIFFS_2026,
  timeOfUse: TIME_OF_USE_2026,
  skt: LAST_RESORT_2026,
  unlicensedFees: UNLICENSED_FEES_2026,
  lastSyncedAt: null,
  lastSyncSource: null,
});

// ---------- Projects ----------

export function listProjects(): ProjectRow[] {
  return projectStore.read().sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1));
}

export function getProject(id: string): ProjectRow | null {
  return projectStore.read().find((p) => p.id === id) ?? null;
}

export function upsertProject(row: ProjectRow): ProjectRow {
  const rows = projectStore.read();
  const idx = rows.findIndex((p) => p.id === row.id);
  if (idx >= 0) rows[idx] = row;
  else rows.push(row);
  projectStore.write(rows);
  return row;
}

export function deleteProject(id: string): boolean {
  const rows = projectStore.read();
  const filtered = rows.filter((p) => p.id !== id);
  if (filtered.length === rows.length) return false;
  projectStore.write(filtered);
  return true;
}

// ---------- PVGIS cache ----------

export function readPvgisCache(key: string): PvgisCacheRow | null {
  const map = pvgisStore.read();
  return map[key] ?? null;
}

export function writePvgisCache(row: PvgisCacheRow): void {
  const map = pvgisStore.read();
  map[row.cacheKey] = row;
  pvgisStore.write(map);
}

export function clearExpiredPvgisCache(): void {
  const map = pvgisStore.read();
  const now = Date.now();
  let dirty = false;
  for (const key of Object.keys(map)) {
    if (new Date(map[key].expiresAt).getTime() < now) {
      delete map[key];
      dirty = true;
    }
  }
  if (dirty) pvgisStore.write(map);
}

// ---------- Tariffs ----------

export function listTariffs(): TariffRow[] {
  const rows = tariffStore.read();
  if (rows.length === 0) {
    seedTariffs();
    return tariffStore.read();
  }
  return rows;
}

export function getTariffForGroup(group: string): TariffRow | null {
  const rows = listTariffs();
  return rows.find((r) => r.consumerGroup === group && r.tariffType === 'single_term') ?? null;
}

// ---------- Tariffs V2 (EPDK 14461 zengin şema) ----------

export function getTariffsV2(): TariffsV2Store {
  return tariffsV2Store.read();
}

export function listTariffsV2(filter?: { activeOn?: string }): TariffEntry[] {
  const entries = tariffsV2Store.read().entries;
  if (filter?.activeOn) {
    const t = new Date(filter.activeOn).getTime();
    return entries.filter((e) => {
      const from = new Date(e.validFrom).getTime();
      const to = e.validTo ? new Date(e.validTo).getTime() : Infinity;
      return from <= t && t <= to;
    });
  }
  return entries;
}

export function upsertTariffV2(entry: TariffEntry): void {
  const cur = tariffsV2Store.read();
  const idx = cur.entries.findIndex((e) => e.id === entry.id);
  if (idx >= 0) cur.entries[idx] = entry;
  else cur.entries.push(entry);
  tariffsV2Store.write(cur);
}

/**
 * Yeni tarife seti DB'ye eklenirken eski kayıtların `validTo`'su
 * `newValidFrom - 1 gün` olarak güncellenir.
 */
export function replaceTariffsV2(newEntries: TariffEntry[], opts: { syncSource: string }): { added: number; expired: number } {
  const cur = tariffsV2Store.read();
  const newValidFrom = newEntries[0]?.validFrom;
  if (!newValidFrom) throw new Error('Yeni tarife seti boş');
  const expireOnIso = new Date(new Date(newValidFrom).getTime() - 24 * 3600 * 1000).toISOString().slice(0, 10);

  let expired = 0;
  for (const e of cur.entries) {
    if (e.validTo === null || e.validTo === undefined) {
      e.validTo = expireOnIso;
      expired++;
    }
  }
  cur.entries.push(...newEntries);
  cur.lastSyncedAt = new Date().toISOString();
  cur.lastSyncSource = opts.syncSource;
  tariffsV2Store.write(cur);
  return { added: newEntries.length, expired };
}

export function updateTimeOfUseV2(tou: TimeOfUseDefinition): void {
  const cur = tariffsV2Store.read();
  cur.timeOfUse = tou;
  tariffsV2Store.write(cur);
}

export function updateSktV2(skt: LastResortSupplyConfig): void {
  const cur = tariffsV2Store.read();
  cur.skt = skt;
  tariffsV2Store.write(cur);
}

function seedTariffs(): void {
  // EPDK 1 Nisan 2026 örnek tarife seti — admin tarafından güncellenebilir.
  const rows: Omit<TariffRow, 'id'>[] = [
    { consumerGroup: 'MESKEN', voltageLevel: 'LV', tariffType: 'single_term', period: 'all_day', energyPriceTlKwh: 3.45, distributionFeeTlKwh: 0.78, validFrom: '2026-04-01', source: 'EPDK Kararı' },
    { consumerGroup: 'TICARETHANE_LV', voltageLevel: 'LV', tariffType: 'single_term', period: 'all_day', energyPriceTlKwh: 4.28, distributionFeeTlKwh: 0.95, validFrom: '2026-04-01', source: 'EPDK Kararı' },
    { consumerGroup: 'TICARETHANE_LV', voltageLevel: 'LV', tariffType: 'time_of_use', period: 'day', energyPriceTlKwh: 4.05, distributionFeeTlKwh: 0.95, validFrom: '2026-04-01', source: 'EPDK Kararı' },
    { consumerGroup: 'TICARETHANE_LV', voltageLevel: 'LV', tariffType: 'time_of_use', period: 'peak', energyPriceTlKwh: 5.98, distributionFeeTlKwh: 0.95, validFrom: '2026-04-01', source: 'EPDK Kararı' },
    { consumerGroup: 'TICARETHANE_LV', voltageLevel: 'LV', tariffType: 'time_of_use', period: 'night', energyPriceTlKwh: 2.15, distributionFeeTlKwh: 0.95, validFrom: '2026-04-01', source: 'EPDK Kararı' },
    { consumerGroup: 'SANAYI_LV', voltageLevel: 'LV', tariffType: 'single_term', period: 'all_day', energyPriceTlKwh: 4.05, distributionFeeTlKwh: 0.87, validFrom: '2026-04-01', source: 'EPDK Kararı' },
    { consumerGroup: 'SANAYI_MV', voltageLevel: 'MV', tariffType: 'single_term', period: 'all_day', energyPriceTlKwh: 3.58, distributionFeeTlKwh: 0.45, validFrom: '2026-04-01', source: 'EPDK Kararı' },
    { consumerGroup: 'SANAYI_MV', voltageLevel: 'MV', tariffType: 'time_of_use', period: 'day', energyPriceTlKwh: 3.45, distributionFeeTlKwh: 0.45, validFrom: '2026-04-01', source: 'EPDK Kararı' },
    { consumerGroup: 'SANAYI_MV', voltageLevel: 'MV', tariffType: 'time_of_use', period: 'peak', energyPriceTlKwh: 5.18, distributionFeeTlKwh: 0.45, validFrom: '2026-04-01', source: 'EPDK Kararı' },
    { consumerGroup: 'SANAYI_MV', voltageLevel: 'MV', tariffType: 'time_of_use', period: 'night', energyPriceTlKwh: 1.98, distributionFeeTlKwh: 0.45, validFrom: '2026-04-01', source: 'EPDK Kararı' },
    { consumerGroup: 'TARIMSAL_SULAMA', voltageLevel: 'LV', tariffType: 'single_term', period: 'all_day', energyPriceTlKwh: 2.85, distributionFeeTlKwh: 0.75, validFrom: '2026-04-01', source: 'EPDK Kararı' },
    { consumerGroup: 'AYDINLATMA', voltageLevel: 'LV', tariffType: 'single_term', period: 'all_day', energyPriceTlKwh: 4.5, distributionFeeTlKwh: 0.9, validFrom: '2026-04-01', source: 'EPDK Kararı' },
  ];
  const withIds: TariffRow[] = rows.map((r, i) => ({ id: i + 1, ...r }));
  tariffStore.write(withIds);
}

export function nowIso(): string {
  return new Date().toISOString();
}
