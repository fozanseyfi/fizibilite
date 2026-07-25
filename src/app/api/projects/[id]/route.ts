import { NextRequest, NextResponse } from 'next/server';
import { getProject, upsertProject, deleteProject, nowIso } from '@/lib/db';
import type { AnyProjectConfig } from '@/lib/models/types';
import { computeSummary, projectName } from '@/lib/models/compute';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const row = getProject(params.id);
  if (!row) return NextResponse.json({ error: 'Proje bulunamadı' }, { status: 404 });
  const config = JSON.parse(row.configJson) as AnyProjectConfig;
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
  const config = body.config as AnyProjectConfig;
  if (!config || (config.kind !== 'utility' && config.kind !== 'ci')) {
    return NextResponse.json({ error: 'Geçersiz model konfigürasyonu' }, { status: 400 });
  }
  const summary = computeSummary(config);
  upsertProject({
    ...row,
    name: projectName(config),
    projectType: config.kind,
    configJson: JSON.stringify(config),
    resultsJson: JSON.stringify(summary),
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
