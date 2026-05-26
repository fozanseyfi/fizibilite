import { NextRequest, NextResponse } from 'next/server';
import { getProject, upsertProject, nowIso } from '@/lib/db';
import { runFullSimulation } from '@/lib/simulate';
import { ProjectConfig } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  let row = getProject(params.id);

  // Serverless cold-start fallback: client config gönderdiyse projeyi tekrar oluştur
  if (!row) {
    try {
      const body = await req.json().catch(() => ({}));
      if (body && body.config) {
        const now = nowIso();
        const fallbackConfig = body.config as ProjectConfig;
        row = {
          id: params.id,
          name: fallbackConfig.name || 'Recovered Project',
          description: fallbackConfig.description,
          projectType: fallbackConfig.projectType,
          status: 'draft',
          configJson: JSON.stringify(fallbackConfig),
          createdAt: now,
          updatedAt: now,
        };
        upsertProject(row);
      }
    } catch { /* ignore */ }
  }

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
