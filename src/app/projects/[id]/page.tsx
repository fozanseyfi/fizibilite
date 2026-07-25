import { notFound } from 'next/navigation';
import { getProject } from '@/lib/db';
import { ModelEmbed } from '@/components/models/ModelEmbed';

export const dynamic = 'force-dynamic';

interface StoredConfig {
  kind: 'utility' | 'ci';
  name: string;
  snapshot?: Record<string, string | number | boolean>;
}

export default function ProjectPage({ params }: { params: { id: string } }) {
  const row = getProject(params.id);
  if (!row) notFound();
  const config = JSON.parse(row.configJson) as StoredConfig;
  const kind = config.kind === 'ci' ? 'ci' : 'utility';
  return <ModelEmbed kind={kind} projectId={params.id} initialSnapshot={config.snapshot ?? null} />;
}
