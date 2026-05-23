import { NextRequest, NextResponse } from 'next/server';
import { getProject, upsertProject, deleteProject, nowIso } from '@/lib/db';
import { ProjectConfig } from '@/lib/types';
import { ensureCapexComputed } from '@/lib/defaults';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const row = getProject(params.id);
  if (!row) return NextResponse.json({ error: 'Proje bulunamadı' }, { status: 404 });
  const config = JSON.parse(row.configJson) as ProjectConfig;
  const results = row.resultsJson ? JSON.parse(row.resultsJson) : null;
  return NextResponse.json({
    id: row.id,
    name: row.name,
    description: row.description,
    projectType: row.projectType,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    config,
    results,
  });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const row = getProject(params.id);
  if (!row) return NextResponse.json({ error: 'Proje bulunamadı' }, { status: 404 });
  const body = await req.json();
  const config = ensureCapexComputed(body.config as ProjectConfig);
  upsertProject({
    ...row,
    name: config.name,
    description: config.description,
    projectType: config.projectType,
    configJson: JSON.stringify(config),
    updatedAt: nowIso(),
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ok = deleteProject(params.id);
  if (!ok) return NextResponse.json({ error: 'Proje bulunamadı' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
