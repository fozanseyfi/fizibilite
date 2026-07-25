import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getProject } from '@/lib/db';
import type { AnyProjectConfig } from '@/lib/models/types';
import { UtilityDashboard } from '@/components/models/utility/UtilityDashboard';
import { CiDashboard } from '@/components/models/ci/CiDashboard';
import { ProjectActions } from '@/components/models/ProjectActions';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function ProjectPage({ params }: { params: { id: string } }) {
  const row = getProject(params.id);
  if (!row) notFound();
  const config = JSON.parse(row.configJson) as AnyProjectConfig;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 no-print">
        <Button asChild variant="ghost" size="sm">
          <Link href="/projects"><ArrowLeft className="h-4 w-4 mr-1" /> Projeler</Link>
        </Button>
        <ProjectActions id={params.id} kind={config.kind} />
      </div>

      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{config.name}</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {config.kind === 'utility' ? 'Utility · GES + BESS Proje Finansmanı' : 'C&I / Mesken · Saatlik Mahsuplaşma (EPDK 14531)'}
        </p>
      </div>

      {config.kind === 'utility'
        ? <UtilityDashboard inputs={config.inputs} />
        : <CiDashboard inputs={config.inputs} />}
    </div>
  );
}
