"use client";

/**
 * "Kaydedilmemiş değişiklikler var" koruması — teklif platformundaki
 * UnsavedChangesProvider'ın uyarlaması.
 *
 * - Form/model bileşenleri `useDirtyTracker(isDirty, onSave)` çağırır.
 * - Kirliyken site içi bir linke tıklanırsa (veya `requestLeave` ile çıkış
 *   istenirse) pencere açılır: Düzenlemeye devam et / Kaydetmeden çık / Kaydet ve çık.
 * - Sekme kapatma / yenileme / dış siteye gitme: tarayıcının kendi uyarısı (beforeunload).
 */

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Kaydet ve çık için: true dönerse kayıt başarılı, çıkılabilir. */
type SaveFn = () => Promise<boolean> | boolean;

interface Entry { dirty: boolean; save?: SaveFn }

interface CtxValue {
  register: (id: symbol, entry: Entry | null) => void;
  /** Kirli değilse hemen çalıştırır; kirliyse önce uyarı penceresini açar. */
  requestLeave: (action: () => void) => void;
}

const Ctx = createContext<CtxValue | null>(null);

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const entries = useRef<Map<symbol, Entry>>(new Map());
  const [pending, setPending] = useState<(() => void) | null>(null);
  const [saving, setSaving] = useState(false);

  const isDirty = () => [...entries.current.values()].some((e) => e.dirty);

  const register = useCallback((id: symbol, entry: Entry | null) => {
    if (entry) entries.current.set(id, entry);
    else entries.current.delete(id);
  }, []);

  const requestLeave = useCallback((action: () => void) => {
    if (isDirty()) setPending(() => action);
    else action();
  }, []);

  // Sekme kapatma / yenileme / dış link
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty()) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  // Site içi link tıklamaları (capture aşamasında, Next Link'ten önce)
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!isDirty() || e.defaultPrevented || e.button !== 0) return;
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return; // yeni sekme
      const a = (e.target as HTMLElement | null)?.closest("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return; // dosya indirme sayfadan çıkış değildir
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || /^(https?:|mailto:|tel:|blob:|data:)/i.test(href)) return;
      e.preventDefault();
      e.stopPropagation();
      setPending(() => () => router.push(href));
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [router]);

  function leave() {
    const action = pending;
    // Kirli bayraklarını sıfırla ki hedefe giderken tekrar sorulmasın
    entries.current.forEach((e) => (e.dirty = false));
    setPending(null);
    action?.();
  }

  async function saveAndLeave() {
    const saver = [...entries.current.values()].find((e) => e.dirty && e.save)?.save;
    if (!saver) return leave();
    setSaving(true);
    try {
      if (await saver()) leave();
      else setPending(null); // kayıt başarısız (ör. aynı ad) — sayfada kal, hata gösterilir
    } finally {
      setSaving(false);
    }
  }

  const value = useMemo<CtxValue>(() => ({ register, requestLeave }), [register, requestLeave]);
  const canSave = [...entries.current.values()].some((e) => e.dirty && e.save);

  return (
    <Ctx.Provider value={value}>
      {children}
      {pending && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="unsaved-title"
          onClick={(e) => e.target === e.currentTarget && !saving && setPending(null)}
        >
          <div className="w-full max-w-xl overflow-hidden rounded-2xl border bg-card shadow-2xl">
            <div className="flex items-start gap-3 px-6 py-5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-yellow/15 text-solar-dark dark:text-solar-light">
                <AlertTriangle className="size-5" />
              </div>
              <div className="min-w-0">
                <h2 id="unsaved-title" className="text-base font-bold tracking-tight">
                  Kaydedilmemiş değişiklikler var
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Bu sayfadan çıkarsanız yaptığınız değişiklikler kaydedilmeyecek. Çıkmadan önce
                  kaydetmek ister misiniz?
                </p>
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t bg-secondary/30 px-6 py-4 sm:flex-row sm:flex-wrap sm:justify-end">
              <Button variant="outline" onClick={() => setPending(null)} disabled={saving}>
                Düzenlemeye Devam Et
              </Button>
              <Button variant="outline" onClick={leave} disabled={saving} className="text-destructive hover:bg-destructive/10">
                Kaydetmeden Çık
              </Button>
              {canSave && (
                <Button onClick={saveAndLeave} disabled={saving} className="gap-1.5">
                  {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  Kaydet ve Çık
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}

/** Model/form bileşenleri çağırır: kirli durumu + (varsa) kaydet fonksiyonunu bildirir. */
export function useDirtyTracker(isDirty: boolean, save?: SaveFn) {
  const ctx = useContext(Ctx);
  const idRef = useRef<symbol>();
  if (!idRef.current) idRef.current = Symbol("dirty");

  useEffect(() => {
    ctx?.register(idRef.current!, { dirty: isDirty, save });
  }, [ctx, isDirty, save]);

  useEffect(() => () => ctx?.register(idRef.current!, null), [ctx]);
}

/** Çıkış Yap gibi link olmayan "sayfadan ayrılma" aksiyonları için. */
export function useRequestLeave() {
  const ctx = useContext(Ctx);
  return useCallback((action: () => void) => (ctx ? ctx.requestLeave(action) : action()), [ctx]);
}
