import { NextRequest, NextResponse } from 'next/server';
import { getProject, upsertProject, nowIso } from '@/lib/db';
import { runFullSimulation } from '@/lib/simulate';
import { ProjectConfig } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const row = getProject(params.id);
  if (!row) return NextResponse.json({ error: 'Proje bulunamadı' }, { status: 404 });
  const config = JSON.parse(row.configJson) as ProjectConfig;
  try {
    const result = await runFullSimulation(config);
    upsertProject({
      ...row,
      status: 'completed',
      resultsJson: JSON.stringify(result),
      updatedAt: nowIso(),
    });
    return NextResponse.json({ ok: true, durationMs: result.durationMs });
  } catch (err) {
    return NextResponse.json(
      { error: 'Simülasyon hatası', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
