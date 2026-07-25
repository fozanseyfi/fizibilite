import { NextRequest, NextResponse } from 'next/server';
import { listProjects, getProject, upsertProject, nowIso, ProjectRow } from '@/lib/db';
import { uid } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface StoredConfig {
  kind: 'utility' | 'ci';
  name: string;
  snapshot?: Record<string, string | number | boolean>;
}

export async function GET() {
  const rows = listProjects();
  return NextResponse.json({
    projects: rows.map((r) => ({
      id: r.id,
      name: r.name,
      kind: r.projectType,
      status: r.status,
      summary: r.resultsJson ? JSON.parse(r.resultsJson) : null,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const config = body.config as StoredConfig;
  if (!config || (config.kind !== 'utility' && config.kind !== 'ci')) {
    return NextResponse.json({ error: 'Geçersiz model konfigürasyonu' }, { status: 400 });
  }
  const id = body.id || uid('proj');
  const now = nowIso();
  const row: ProjectRow = {
    id,
    name: config.name || 'Adsız Proje',
    projectType: config.kind,
    status: 'completed',
    configJson: JSON.stringify(config),
    resultsJson: body.summary ? JSON.stringify(body.summary) : undefined,
    createdAt: getProject(id)?.createdAt ?? now,
    updatedAt: now,
  };
  upsertProject(row);
  return NextResponse.json({ id, ok: true });
}
