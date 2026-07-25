import { NextRequest, NextResponse } from 'next/server';
import { getProject, upsertProject, deleteProject, nowIso } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface StoredConfig {
  kind: 'utility' | 'ci';
  name: string;
  snapshot?: Record<string, string | number | boolean>;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const row = getProject(params.id);
  if (!row) return NextResponse.json({ error: 'Proje bulunamadı' }, { status: 404 });
  const config = JSON.parse(row.configJson) as StoredConfig;
  return NextResponse.json({
    id: row.id,
    name: row.name,
    kind: row.projectType,
    status: row.status,
    config,
    summary: row.resultsJson ? JSON.parse(row.resultsJson) : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const row = getProject(params.id);
  if (!row) return NextResponse.json({ error: 'Proje bulunamadı' }, { status: 404 });
  const body = await req.json();
  const config = body.config as StoredConfig;
  if (!config || (config.kind !== 'utility' && config.kind !== 'ci')) {
    return NextResponse.json({ error: 'Geçersiz model konfigürasyonu' }, { status: 400 });
  }
  upsertProject({
    ...row,
    name: config.name || row.name,
    projectType: config.kind,
    configJson: JSON.stringify(config),
    resultsJson: body.summary ? JSON.stringify(body.summary) : row.resultsJson,
    status: 'completed',
    updatedAt: nowIso(),
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ok = deleteProject(params.id);
  if (!ok) return NextResponse.json({ error: 'Proje bulunamadı' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
