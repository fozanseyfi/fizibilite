import { NextRequest, NextResponse } from 'next/server';
import { fetchPVGIS } from '@/lib/pvgis';
import { Location, PVSystemConfig } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Lokasyon için optimal açı/azimut arar.
 * Belirli aralıkta PVGIS çağrıları yapar, en yüksek yıllık üretimi veren kombinasyonu döner.
 *
 * Body: { location, pv (sadece peakPower + loss + tech + mounting kullanılır) }
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const location = body.location as Location;
  const pv = body.pv as PVSystemConfig;

  // Türkiye için makul arama uzayı
  const angles = [15, 20, 25, 30, 35, 40];
  const aspects = [-30, -15, 0, 15, 30];

  const results: Array<{ angle: number; aspect: number; annualKwh: number; specificYield: number }> = [];
  let best = { angle: 30, aspect: 0, annualKwh: 0, specificYield: 0 };

  // Hafif paralel + sıralı karışım (PVGIS'e nazik davranmak için 3'lü grup)
  const tasks: Array<{ angle: number; aspect: number }> = [];
  for (const a of angles) for (const az of aspects) tasks.push({ angle: a, aspect: az });

  for (let i = 0; i < tasks.length; i += 3) {
    const batch = tasks.slice(i, i + 3);
    const batchResults = await Promise.all(
      batch.map(async ({ angle, aspect }) => {
        try {
          const r = await fetchPVGIS({
            location,
            pv: { ...pv, angle, aspect },
          });
          return {
            angle,
            aspect,
            annualKwh: r.annualKwh,
            specificYield: r.specificYieldKwhPerKwp,
          };
        } catch {
          return null;
        }
      })
    );
    for (const r of batchResults) {
      if (r) {
        results.push(r);
        if (r.annualKwh > best.annualKwh) best = r;
      }
    }
  }

  // Sürpriz değişimi göster (baseline = 30°/0°)
  const baseline = results.find((r) => r.angle === 30 && r.aspect === 0) ?? best;
  const improvement = baseline.annualKwh > 0 ? ((best.annualKwh - baseline.annualKwh) / baseline.annualKwh) * 100 : 0;

  return NextResponse.json({
    best,
    baseline,
    improvementPct: improvement,
    grid: results,
    searchedCombinations: results.length,
  });
}
