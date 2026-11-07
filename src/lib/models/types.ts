// Fizibilite Platformu — iki model türü için paylaşılan tipler.
// Teknik altyapı, gönderilen iki HTML fizibilite modelinden port edilmiştir:
//  - utility: "GES + BESS Proje Finansmanı Fizibilite Modeli"
//  - ci:      "C&I Saatlik Mahsuplaşma Fizibilite Kokpiti — EPDK 14531"

import type { UtilityInputs } from './utility/engine';
import type { CiInputs } from './ci/engine';

export type ModelKind = 'utility' | 'ci' | 'bess-ci' | 'bess-utility';

export const MODEL_LABELS: Record<ModelKind, string> = {
  utility: 'Utility (GES + BESS Proje Finansmanı)',
  ci: 'C&I / Mesken (Saatlik Mahsuplaşma)',
  'bess-ci': 'Batarya Ekleme — C&I / Mesken',
  'bess-utility': 'Batarya Ekleme — Utility',
};

export interface UtilityProjectConfig {
  kind: 'utility';
  name: string;
  inputs: UtilityInputs;
}

export interface CiProjectConfig {
  kind: 'ci';
  name: string;
  inputs: CiInputs;
}

export type AnyProjectConfig = UtilityProjectConfig | CiProjectConfig;

/** Portföy/liste görünümleri için ortak KPI özeti (iki model de üretir). */
export interface ProjectSummary {
  kind: ModelKind;
  /** USD bazlı toplam yatırım (Utility: totalUses, C&I: CAPEX) */
  capexUsd: number;
  npvUsd: number;
  irrPct: number;        // 0..1
  paybackYears: number;
  /** Utility için proje IRR; C&I için proje IRR aynı alanda */
  lcoe?: number;         // Utility: $/MWh
  minDscr?: number;      // sadece Utility (borçluysa)
  selfConsumption?: number; // sadece C&I (0..1)
  capacityLabel: string; // "100 MWp" / "1.000 kWp + 1.000 kWh"
}

/** Listelerde kısa tip etiketi */
export const KIND_SHORT: Record<ModelKind, string> = {
  utility: 'Utility',
  ci: 'C&I / Mesken',
  'bess-ci': 'Batarya · C&I',
  'bess-utility': 'Batarya · Utility',
};
