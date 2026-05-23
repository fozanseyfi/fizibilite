import { NextResponse } from 'next/server';
import { listProjects, upsertProject, nowIso } from '@/lib/db';
import { DEMO_PROJECTS, ensureCapexComputed } from '@/lib/defaults';

export const dynamic = 'force-dynamic';

export async function POST() {
  const existing = listProjects();
  const existingIds = new Set(existing.map((p) => p.id));
  let added = 0;
  for (const demo of DEMO_PROJECTS) {
    if (existingIds.has(demo.id)) continue;
    const config = ensureCapexComputed(demo.config);
    const now = nowIso();
    upsertProject({
      id: demo.id,
      name: config.name,
      description: config.description,
      projectType: config.projectType,
      status: 'draft',
      configJson: JSON.stringify(config),
      createdAt: now,
      updatedAt: now,
    });
    added++;
  }
  return NextResponse.json({ ok: true, added, totalDemo: DEMO_PROJECTS.length });
}
