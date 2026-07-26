import { notFound } from 'next/navigation';
import { getProject } from '@/lib/db';
import { UtilityModel } from '@/components/models/native/UtilityModel';
import { ModelEmbed } from '@/components/models/ModelEmbed';
import type { UtilityInputs } from '@/lib/models/utility/engine';

export const dynamic = 'force-dynamic';

interface StoredConfig {
  kind: 'utility' | 'ci';
  name: string;
  inputs?: UtilityInputs;
  snapshot?: Record<string, string | number | boolean>;
}

export default function ProjectPage({ params }: { params: { id: string } }) {
  const row = getProject(params.id);
  if (!row) notFound();
  const config = JSON.parse(row.configJson) as StoredConfig;

  // Utility → native React modeli (tipli girdilerle)
  if (config.kind === 'utility' && config.inputs) {
    return <UtilityModel projectId={params.id} initialInputs={config.inputs} />;
  }
  // C&I → şimdilik gömülü model (native port sıradaki adım)
  const kind = config.kind === 'ci' ? 'ci' : 'utility';
  return <ModelEmbed kind={kind} projectId={params.id} initialSnapshot={config.snapshot ?? null} />;
}
