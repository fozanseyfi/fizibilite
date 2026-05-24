import { NextRequest, NextResponse } from 'next/server';
import { upsertProject, nowIso } from '@/lib/db';
import { uid } from '@/lib/utils';
import { DEMO_PROJECTS, ensureCapexComputed } from '@/lib/defaults';

export const dynamic = 'force-dynamic';

/**
 * Bir şablonun kopyasını yeni proje olarak yaratır.
 * Body: { templateId: string }
 * Response: { id: string }
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const templateId = body.templateId as string;
  const template = DEMO_PROJECTS.find((d) => d.id === templateId);
  if (!template) return NextResponse.json({ error: 'Şablon bulunamadı' }, { status: 404 });

  const newId = uid('proj');
  const config = ensureCapexComputed({
    ...template.config,
    name: `${template.config.name} (Kopya)`,
  });
  const now = nowIso();
  upsertProject({
    id: newId,
    name: config.name,
    description: config.description,
    projectType: config.projectType,
    status: 'draft',
    configJson: JSON.stringify(config),
    createdAt: now,
    updatedAt: now,
  });
  return NextResponse.json({ id: newId, ok: true });
}
