import { notFound } from 'next/navigation';
import { getProject } from '@/lib/db';
import { UtilityModel } from '@/components/models/native/UtilityModel';
import { CiModel } from '@/components/models/native/CiModel';
import type { UtilityInputs } from '@/lib/models/utility/engine';
import type { CiInputs } from '@/lib/models/ci/engine';

export const dynamic = 'force-dynamic';

interface StoredConfig {
  kind: 'utility' | 'ci';
  name: string;
  inputs?: UtilityInputs | CiInputs;
}

export default function ProjectPage({ params }: { params: { id: string } }) {
  const row = getProject(params.id);
  if (!row) notFound();
  const config = JSON.parse(row.configJson) as StoredConfig;

  // C&I → native React modeli (tipli girdilerle; girdi yoksa varsayılan)
  if (config.kind === 'ci') {
    return <CiModel projectId={params.id} initialInputs={config.inputs as CiInputs | undefined} />;
  }
  // Utility → native React modeli
  return <UtilityModel projectId={params.id} initialInputs={config.inputs as UtilityInputs | undefined} />;
}
