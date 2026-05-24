'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Copy, Loader2 } from 'lucide-react';

export function UseTemplateButton({ templateId }: { templateId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function use() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch('/api/templates/use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId }),
      });
      if (!res.ok) throw new Error('Şablon klonlanamadı');
      const { id } = await res.json();
      router.push(`/projects/new?edit=${id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setLoading(false);
    }
  }

  return (
    <div>
      <Button onClick={use} disabled={loading} className="w-full" size="sm">
        {loading ? (
          <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Klonlanıyor…</>
        ) : (
          <><Copy className="h-3.5 w-3.5 mr-1.5" /> Bu Şablonu Kullan</>
        )}
      </Button>
      {err && <div className="text-[10px] text-destructive mt-1">{err}</div>}
    </div>
  );
}
