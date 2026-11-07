'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/admin/toast';
import { useSession } from '@/lib/auth-store';
import { useProjectStore, type ProjectKind } from '@/lib/project-store';
import { useDirtyTracker } from '@/lib/unsaved-changes';
import type { ProjectSummary } from '@/lib/models/types';

/**
 * C&I ve Utility modellerinin ortak kaydet / sil / "kaydedilmemiş değişiklik" mantığı.
 * - Aynı adla ikinci proje kaydedilmez (uyarı gösterilir).
 * - Girdiler son kayıttan farklıysa sayfadan ayrılırken uyarı penceresi açılır.
 */
export function useProjectSave<I extends object>(opts: {
  projectId?: string;
  kind: ProjectKind;
  inputs: I;
  name: string;
  buildSummary: () => ProjectSummary;
}) {
  const { projectId, kind, inputs, name, buildSummary } = opts;
  const router = useRouter();
  const session = useSession();
  const saveProject = useProjectStore((s) => s.save);
  const removeProject = useProjectStore((s) => s.remove);
  const toast = useToast((s) => s.push);

  const snapshot = JSON.stringify(inputs);
  // Son kaydedilen (veya açılıştaki) girdiler — bundan farklıysa "kirli"
  const [baseline, setBaseline] = useState(snapshot);
  const dirty = snapshot !== baseline;
  const [err, setErr] = useState<string | null>(null);

  /** navigate=false: "Kaydet ve Çık" penceresinden çağrılır, yönlendirmeyi pencere yapar. */
  const persist = useCallback(
    (navigate: boolean): boolean => {
      if (!session) {
        setErr('Oturum bulunamadı, lütfen tekrar giriş yapın.');
        return false;
      }
      const r = saveProject({
        id: projectId,
        ownerId: session.id,
        name,
        kind,
        inputs: inputs as Record<string, unknown>,
        summary: buildSummary(),
      });
      if (!r.ok) {
        setErr(r.error);
        toast(r.error, 'error', 6000);
        return false;
      }
      setErr(null);
      setBaseline(snapshot);
      toast(projectId ? 'Değişiklikler kaydedildi.' : 'Proje kaydedildi.', 'success');
      if (navigate && r.id !== projectId) router.replace(`/projects/${r.id}`);
      return true;
    },
    [session, saveProject, projectId, name, kind, inputs, buildSummary, toast, snapshot, router]
  );

  const saveForGuard = useCallback(() => persist(false), [persist]);
  useDirtyTracker(dirty, saveForGuard);

  const save = useCallback(() => {
    persist(true);
  }, [persist]);

  const del = useCallback(() => {
    if (!projectId || !confirm('Bu proje silinsin mi?')) return;
    setBaseline(snapshot); // silinen projede "kaydedilmedi" uyarısı çıkmasın
    removeProject(projectId);
    toast('Proje silindi.', 'success');
    router.push('/projects');
  }, [projectId, removeProject, toast, router, snapshot]);

  return { save, del, err, dirty };
}
