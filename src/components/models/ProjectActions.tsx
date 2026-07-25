'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Printer } from 'lucide-react';

export function ProjectActions({ id, kind }: { id: string; kind: 'utility' | 'ci' }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const editHref = kind === 'utility' ? `/projects/new/utility?edit=${id}` : `/projects/new/ci?edit=${id}`;

  async function del() {
    if (!confirm('Bu proje silinsin mi?')) return;
    setBusy(true);
    try {
      await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      router.push('/projects');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => window.print()}>
        <Printer className="h-3.5 w-3.5 mr-1" /> PDF
      </Button>
      <Button asChild variant="outline" size="sm">
        <Link href={editHref}><Pencil className="h-3.5 w-3.5 mr-1" /> Düzenle</Link>
      </Button>
      <Button variant="outline" size="sm" onClick={del} disabled={busy} className="text-destructive hover:bg-destructive/10">
        <Trash2 className="h-3.5 w-3.5 mr-1" /> Sil
      </Button>
    </div>
  );
}
