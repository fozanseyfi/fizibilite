'use client';

import Link from 'next/link';
import { FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { UtilityModel } from '@/components/models/native/UtilityModel';
import { CiModel } from '@/components/models/native/CiModel';
import { BessCiModel } from '@/components/models/native/BessCiModel';
import { BessUtilityModel } from '@/components/models/native/BessUtilityModel';
import type { BessCiInputs } from '@/lib/models/bess/ci';
import type { BessUtilityInputs } from '@/lib/models/bess/utility';
import type { UtilityInputs } from '@/lib/models/utility/engine';
import type { CiInputs } from '@/lib/models/ci/engine';
import { useSession } from '@/lib/auth-store';
import { useProjectStore, useProjectsHydrated } from '@/lib/project-store';

export default function ProjectPage({ params }: { params: { id: string } }) {
  const hydrated = useProjectsHydrated();
  const session = useSession();
  const row = useProjectStore((s) => s.projects.find((p) => p.id === params.id && p.ownerId === session?.id));

  if (!hydrated) return null;

  if (!row) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardContent className="py-12 text-center">
          <FolderOpen className="mx-auto mb-3 h-9 w-9 text-muted-foreground/40" />
          <p className="font-medium">Proje bulunamadı</p>
          <p className="mt-1 text-sm text-muted-foreground">Silinmiş olabilir ya da başka bir hesaba ait.</p>
          <Button asChild size="sm" className="mt-4">
            <Link href="/projects">Projelere dön</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // key: farklı projeye geçişte model state'i sıfırlansın
  switch (row.kind) {
    case 'ci':
      return <CiModel key={row.id} projectId={row.id} initialInputs={row.inputs as unknown as CiInputs} />;
    case 'bess-ci':
      return <BessCiModel key={row.id} projectId={row.id} initialInputs={row.inputs as unknown as BessCiInputs} />;
    case 'bess-utility':
      return <BessUtilityModel key={row.id} projectId={row.id} initialInputs={row.inputs as unknown as BessUtilityInputs} />;
    default:
      return <UtilityModel key={row.id} projectId={row.id} initialInputs={row.inputs as unknown as UtilityInputs} />;
  }
}
