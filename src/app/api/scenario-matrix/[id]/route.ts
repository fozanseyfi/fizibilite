import { NextRequest, NextResponse } from 'next/server';
import { getProject } from '@/lib/db';
import { ProjectConfig, SimulationResult } from '@/lib/types';
import { runScenarioMatrix } from '@/lib/pf/scenario-matrix';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const row = getProject(params.id);
  if (!row) return NextResponse.json({ error: 'Proje bulunamadı' }, { status: 404 });
  if (!row.resultsJson) return NextResponse.json({ error: 'Önce baz simülasyon çalıştırın' }, { status: 400 });
  const config = JSON.parse(row.configJson) as ProjectConfig;
  const result = JSON.parse(row.resultsJson) as SimulationResult;
  const matrix = runScenarioMatrix({ baseConfig: config, baseResult: result });
  return NextResponse.json(matrix);
}
