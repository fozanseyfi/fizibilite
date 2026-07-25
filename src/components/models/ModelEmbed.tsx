'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Loader2, Trash2 } from 'lucide-react';

type Snapshot = Record<string, string | number | boolean>;

/** iframe içindeki tüm input/select değerlerini yakalar. */
function snapshot(doc: Document): Snapshot {
  const out: Snapshot = {};
  doc.querySelectorAll('input, select').forEach((node) => {
    const el = node as HTMLInputElement | HTMLSelectElement;
    if (el instanceof HTMLInputElement && el.type === 'checkbox') {
      if (el.id) out[el.id] = el.checked;
      return;
    }
    if (el.id) {
      out[el.id] = el.value;
      return;
    }
    // ızgara hücreleri (g_m / g_wd / g_we) — id yok, data-h var
    const grid = (el as HTMLElement).closest('.hgrid') as HTMLElement | null;
    const h = (el as HTMLElement).dataset?.h;
    if (grid?.id && h != null) out[`${grid.id}#${h}`] = el.value;
  });
  return out;
}

/** Snapshot'ı iframe içine geri yükler ve motoru yeniden çalıştırır. */
function restore(win: Window, doc: Document, snap: Snapshot) {
  const W = win as unknown as { Event: typeof Event };
  const fire = (el: Element, type: string) => el.dispatchEvent(new W.Event(type, { bubbles: true }));

  // 1) select'ler önce — profil/mevsim seçimleri ızgaraları yeniden kurar
  Object.keys(snap).forEach((k) => {
    if (k.includes('#')) return;
    const el = doc.getElementById(k);
    if (el && el.tagName === 'SELECT') { (el as HTMLSelectElement).value = String(snap[k]); fire(el, 'change'); }
  });
  // 2) checkbox'lar
  Object.keys(snap).forEach((k) => {
    if (k.includes('#')) return;
    const el = doc.getElementById(k) as HTMLInputElement | null;
    if (el && el.type === 'checkbox') { el.checked = snap[k] === true || snap[k] === 'true'; fire(el, 'change'); fire(el, 'input'); }
  });
  // 3) sayısal/metin input'lar (id'li)
  Object.keys(snap).forEach((k) => {
    if (k.includes('#')) return;
    const el = doc.getElementById(k) as HTMLInputElement | null;
    if (el && el.tagName === 'INPUT' && el.type !== 'checkbox') el.value = String(snap[k]);
  });
  // 4) ızgara hücreleri
  Object.keys(snap).forEach((k) => {
    if (!k.includes('#')) return;
    const [gid, h] = k.split('#');
    const cont = doc.getElementById(gid);
    const el = cont?.querySelector(`input[data-h="${h}"]`) as HTMLInputElement | null;
    if (el && !el.readOnly) el.value = String(snap[k]);
  });
  // 5) yeniden hesap: tüm (readonly olmayan) input'lara 'input' olayı at
  doc.querySelectorAll('input:not([readonly]), select').forEach((el) => fire(el, 'input'));
  const w = win as unknown as { calcAll?: () => void };
  if (typeof w.calcAll === 'function') { try { w.calcAll(); } catch { /* ignore */ } }
}

interface WinWithState {
  STATE?: { p?: Record<string, unknown>; m?: Record<string, unknown> };
  calcAll?: () => void;
}

function buildSummary(kind: 'utility' | 'ci', win: WinWithState) {
  const st = win.STATE;
  if (!st || !st.p || !st.m) return { name: 'Adsız Proje', summary: null };
  const p = st.p as Record<string, number & boolean & string>;
  const m = st.m as Record<string, number>;
  const name = (p.pname as unknown as string) || 'Adsız Proje';
  if (kind === 'utility') {
    return {
      name,
      summary: {
        kind: 'utility' as const,
        capexUsd: m.totalUses, npvUsd: m.npv, irrPct: m.irr, paybackYears: m.pbS,
        lcoe: m.lcoe, minDscr: m.minDSCR,
        capacityLabel: p.bessOn ? `${p.mw} MWp + ${p.bMWh} MWh` : `${p.mw} MWp`,
      },
    };
  }
  const years = (m.years as unknown as Array<{ s: { prod: number; mah: number; shift: number } }>);
  const y1 = years && years[0];
  const selfC = y1 && y1.s.prod > 0 ? (y1.s.mah + y1.s.shift) / y1.s.prod : 0;
  return {
    name,
    summary: {
      kind: 'ci' as const,
      capexUsd: m.capex, npvUsd: m.npv, irrPct: m.irr, paybackYears: m.pb,
      selfConsumption: selfC,
      capacityLabel: p.bessOn ? `${p.kwp} kWp + ${p.bKwh} kWh` : `${p.kwp} kWp`,
    },
  };
}

export function ModelEmbed({
  kind, projectId, initialSnapshot,
}: {
  kind: 'utility' | 'ci';
  projectId?: string;
  initialSnapshot?: Snapshot | null;
}) {
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    let ro: ResizeObserver | null = null;
    const onLoad = () => {
      const win = iframe.contentWindow;
      const doc = iframe.contentDocument;
      if (!win || !doc) return;
      // iframe'in kendi init'i (calcAll) çalıştıktan sonra girdileri geri yükle
      setTimeout(() => {
        if (initialSnapshot && Object.keys(initialSnapshot).length) {
          try { restore(win, doc, initialSnapshot); } catch { /* ignore */ }
        }
        setReady(true);
        const resize = () => { try { iframe.style.height = (doc.body.scrollHeight + 4) + 'px'; } catch { /* ignore */ } };
        resize();
        const RO = (win as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver;
        ro = new RO(resize);
        ro.observe(doc.body);
        // sekme değişiminde de yeniden boyutla
        doc.querySelectorAll('nav button').forEach((b) => b.addEventListener('click', () => setTimeout(resize, 60)));
      }, 120);
    };
    iframe.addEventListener('load', onLoad);
    return () => { iframe.removeEventListener('load', onLoad); ro?.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    const iframe = iframeRef.current;
    const win = iframe?.contentWindow as unknown as WinWithState | undefined;
    const doc = iframe?.contentDocument;
    if (!win || !doc) return;
    setSaving(true); setError(null);
    try {
      if (typeof win.calcAll === 'function') { try { win.calcAll(); } catch { /* ignore */ } }
      const snap = snapshot(doc);
      const { name, summary } = buildSummary(kind, win);
      const config = { kind, name, snapshot: snap };
      let id = projectId;
      if (projectId) {
        const r = await fetch(`/api/projects/${projectId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ config, summary }) });
        if (!r.ok) throw new Error('Güncellenemedi');
      } else {
        const r = await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ config, summary }) });
        if (!r.ok) throw new Error('Oluşturulamadı');
        id = (await r.json()).id;
      }
      router.push(`/projects/${id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function del() {
    if (!projectId || !confirm('Bu proje silinsin mi?')) return;
    setSaving(true);
    try {
      await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
      router.push('/projects');
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap no-print sticky top-0 z-20 bg-background/95 backdrop-blur py-2 border-b border-border/60">
        <Button asChild variant="ghost" size="sm">
          <Link href={projectId ? '/projects' : '/projects/new'}><ArrowLeft className="h-4 w-4 mr-1" /> {projectId ? 'Projeler' : 'Model seçimi'}</Link>
        </Button>
        <div className="flex items-center gap-2">
          {error && <span className="text-xs text-destructive">{error}</span>}
          {projectId && (
            <Button variant="outline" size="sm" onClick={del} disabled={saving} className="text-destructive hover:bg-destructive/10">
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Sil
            </Button>
          )}
          <Button onClick={save} disabled={saving || !ready} size="sm">
            {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
            {projectId ? 'Güncelle & Kaydet' : 'Projeyi Kaydet'}
          </Button>
        </div>
      </div>

      {!ready && (
        <div className="text-center py-6 text-sm text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Model yükleniyor…
        </div>
      )}

      <iframe
        ref={iframeRef}
        src={`/models/${kind}.html`}
        title={kind === 'utility' ? 'Utility Fizibilite Modeli' : 'C&I Saatlik Mahsuplaşma Kokpiti'}
        className="w-full border-0 block"
        style={{ minHeight: 600 }}
      />
    </div>
  );
}
