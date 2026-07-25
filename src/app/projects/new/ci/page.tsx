'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CiBuilder } from '@/components/models/ci/CiBuilder';

export const dynamic = 'force-dynamic';

function Inner() {
  const params = useSearchParams();
  const editId = params.get('edit') ?? undefined;
  return <CiBuilder editId={editId} />;
}

export default function NewCiPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-muted-foreground">Yükleniyor…</div>}>
      <Inner />
    </Suspense>
  );
}
