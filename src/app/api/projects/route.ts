import { NextRequest, NextResponse } from 'next/server';
import { listProjects, upsertProject, nowIso, ProjectRow } from '@/lib/db';
import { uid } from '@/lib/utils';
import { ProjectConfig } from '@/lib/types';
import { ensureCapexComputed } from '@/lib/defaults';

export const dynamic = 'force-dynamic';

export async function GET() {
  const rows = listProjects();
  return NextResponse.json({
    projects: rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      projectType: r.projectType,
      status: r.status,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const config = ensureCapexComputed(body.config as ProjectConfig);
  const id = body.id || uid('proj');
  const now = nowIso();
  const row: ProjectRow = {
    id,
    name: config.name,
    description: config.description,
    projectType: config.projectType,
    status: 'draft',
    configJson: JSON.stringify(config),
    createdAt: now,
    updatedAt: now,
  };
  upsertProject(row);
  return NextResponse.json({ id, ok: true });
}
