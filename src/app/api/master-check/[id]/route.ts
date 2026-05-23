import { NextRequest, NextResponse } from 'next/server';
import { getProject } from '@/lib/db';
import { ProjectConfig, SimulationResult } from '@/lib/types';
import { runMasterCheck } from '@/lib/pf/master-check';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const row = getProject(params.id);
  if (!row) return NextResponse.json({ error: 'Proje bulunamadı' }, { status: 404 });
  if (!row.resultsJson) return NextResponse.json({ error: 'Önce simülasyon çalıştırın' }, { status: 400 });
  const config = JSON.parse(row.configJson) as ProjectConfig;
  const result = JSON.parse(row.resultsJson) as SimulationResult;
  const report = runMasterCheck(config, result);
  return NextResponse.json(report);
}
