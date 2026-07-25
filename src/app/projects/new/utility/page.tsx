'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { UtilityBuilder } from '@/components/models/utility/UtilityBuilder';

export const dynamic = 'force-dynamic';

function Inner() {
  const params = useSearchParams();
  const editId = params.get('edit') ?? undefined;
  return <UtilityBuilder editId={editId} />;
}

export default function NewUtilityPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-muted-foreground">Yükleniyor…</div>}>
      <Inner />
    </Suspense>
  );
}
