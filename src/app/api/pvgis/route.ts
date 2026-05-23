import { NextRequest, NextResponse } from 'next/server';
import { fetchPVGIS } from '@/lib/pvgis';
import { Location, PVSystemConfig } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const location = body.location as Location;
  const pv = body.pv as PVSystemConfig;
  try {
    const result = await fetchPVGIS({ location, pv });
    return NextResponse.json({
      annualKwh: result.annualKwh,
      specificYieldKwhPerKwp: result.specificYieldKwhPerKwp,
      source: result.source,
      cachedAt: result.cachedAt,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'PVGIS hatası', detail: err instanceof Error ? err.message : String(err) },
      { status: 502 }
    );
  }
}
