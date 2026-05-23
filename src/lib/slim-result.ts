/**
 * Saatlik 25 yıllık veriyi Client Component'e göndermek yerine slim'leştirir:
 * - Sadece yıl 1 için saatlik diziler (8760)
 * - Diğer yıllar için yıllık agregat
 *
 * Tam veri Excel/PDF için server-side kalır.
 */

import { SimulationResult, NettingResult, BatteryDispatchResult } from './types';

export interface SlimNetting {
  annual: NettingResult['annual'];
  paidGenerationLimitKwh: number;
  overLimitStartHour: number | null;
}

export interface SlimBattery {
  cycles: number;
  effectiveCapacityKwh: number;
}

export interface SlimResult {
  // Year 1 detail (for heatmaps + tables)
  year1: {
    generation: number[]; // 8760
    consumption: number[]; // 8760
    netting: NettingResult; // full
    battery: BatteryDispatchResult; // full
  };
  // Yearly aggregates (for trends)
  yearly: Array<{
    year: number;
    generation: number;
    consumption: number;
    netting: SlimNetting;
    battery: SlimBattery;
  }>;
  // Yıl 1'in 12 aylık nakit akışı (büyük olmasın diye sadece year 1)
  monthlyYear1: SimulationResult['finance']['monthly'];
  finance: SimulationResult['finance'];
  monteCarlo?: SimulationResult['monteCarlo'];
  computedAt: string;
  durationMs: number;
}

export function slimify(result: SimulationResult): SlimResult {
  return {
    year1: {
      generation: result.generationByYear[0],
      consumption: result.consumptionByYear[0],
      netting: result.nettingByYear[0],
      battery: result.batteryByYear[0],
    },
    yearly: result.finance.yearly.map((y, i) => ({
      year: y.year,
      generation: y.generationKwh,
      consumption: y.consumptionKwh,
      netting: {
        annual: result.nettingByYear[i].annual,
        paidGenerationLimitKwh: result.nettingByYear[i].paidGenerationLimitKwh,
        overLimitStartHour: result.nettingByYear[i].overLimitStartHour,
      },
      battery: {
        cycles: result.batteryByYear[i].cycles,
        effectiveCapacityKwh: result.batteryByYear[i].effectiveCapacityKwh,
      },
    })),
    monthlyYear1: result.finance.monthly.filter((m) => m.year === 1),
    finance: { ...result.finance, monthly: [] }, // payload'ı küçük tutmak için aylık geniş tabloyu sil
    monteCarlo: result.monteCarlo,
    computedAt: result.computedAt,
    durationMs: result.durationMs,
  };
}
