'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Play, RefreshCw, Loader2 } from 'lucide-react';

export function SimulateButton({
  projectId,
  hasResults,
  large = false,
}: {
  projectId: string;
  hasResults: boolean;
  large?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/simulate/${projectId}`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || data.error || 'Simülasyon hatası');
      }
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button onClick={run} disabled={busy} size={large ? 'lg' : 'default'}>
        {busy ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Hesaplanıyor...</>
        ) : hasResults ? (
          <><RefreshCw className="h-4 w-4 mr-2" /> Yeniden Çalıştır</>
        ) : (
          <><Play className="h-4 w-4 mr-2" /> Simülasyonu Başlat</>
        )}
      </Button>
      {err && <div className="text-xs text-destructive">{err}</div>}
    </div>
  );
}
