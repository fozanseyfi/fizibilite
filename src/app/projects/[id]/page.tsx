import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getProject } from '@/lib/db';
import { ProjectConfig, SimulationResult } from '@/lib/types';
import { ResultsDashboard } from '@/components/dashboard/ResultsDashboard';
import { slimify } from '@/lib/slim-result';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, ArrowLeft, Trash2 } from 'lucide-react';
import { SimulateButton } from './simulate-button';

export const dynamic = 'force-dynamic';

export default function ProjectPage({ params }: { params: { id: string } }) {
  const row = getProject(params.id);
  if (!row) notFound();

  const config = JSON.parse(row.configJson) as ProjectConfig;
  const result = row.resultsJson ? (JSON.parse(row.resultsJson) as SimulationResult) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/"><ArrowLeft className="h-4 w-4 mr-1" /> Projeler</Link>
        </Button>
        <div className="flex gap-2">
          <SimulateButton projectId={params.id} hasResults={!!result} />
        </div>
      </div>

      {!result ? (
        <Card>
          <CardHeader>
            <CardTitle>{config.name}</CardTitle>
            <CardDescription>Henüz simülasyon çalıştırılmadı. PVGIS'ten üretim çekip 8760 saatlik motoru çalıştırmak için aşağıdaki butona tıklayın.</CardDescription>
          </CardHeader>
          <CardContent>
            <SimulateButton projectId={params.id} hasResults={false} large />
          </CardContent>
        </Card>
      ) : (
        <ResultsDashboard projectId={params.id} config={config} result={slimify(result)} />
      )}
    </div>
  );
}
