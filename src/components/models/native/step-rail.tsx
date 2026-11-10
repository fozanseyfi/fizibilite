'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Adım çizgisi — modelin solundaki boşlukta (sidebar ile model arası), aktif sekmedeki
 * adımları/bölümleri yukarıdan aşağı numaralı noktalarla gösterir. Tıklayınca o bölüme gider;
 * sayfada ilerledikçe bulunulan bölüm vurgulanır. Sekme değişince ya da bölümler açılıp
 * kapanınca kendini yeniden kurar (dinamik). Mevcut boşluğu değiştirmez: noktalar
 * <main>'in sol iç boşluğunun ortasına sabitlenir; boşluk çok darsa gizlenir.
 */

const SECTION_SEL = '.step, .card, .chartcard, .sucard, .exec-hero, .pitch';

interface Item { el: HTMLElement; title: string }

function titleOf(el: HTMLElement): string {
  const h = el.querySelector('.step-head h2, h2, h3, .eh-title, .exec-sect') as HTMLElement | null;
  const raw = (h ?? el).textContent ?? '';
  // Başlıktaki küçük açıklamayı (· ...) at
  return raw.replace(/\s+/g, ' ').split(' · ')[0].trim().slice(0, 80) || 'Bölüm';
}

function collect(root: HTMLElement): Item[] {
  const tab = root.querySelector('.tab.active') as HTMLElement | null;
  if (!tab) return [];
  const all = Array.from(tab.querySelectorAll(SECTION_SEL)) as HTMLElement[];
  // İç içe olanları ele (yalnız en dıştaki bölüm), görünmeyenleri at
  const outer = all.filter((el) => !all.some((o) => o !== el && o.contains(el)) && el.offsetParent !== null && el.offsetHeight > 24);
  return outer.map((el) => ({ el, title: titleOf(el) }));
}

export function StepRail() {
  const anchor = useRef<HTMLSpanElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [active, setActive] = useState(0);
  const [geo, setGeo] = useState<{ x: number; size: number; top: number } | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  const offset = useCallback(() => {
    const root = anchor.current?.closest('.mdl') as HTMLElement | null;
    const tabs = root?.querySelector('.m-tabs') as HTMLElement | null;
    return 56 + (tabs?.offsetHeight ?? 48) + 12;
  }, []);

  // Bölümleri ve konumu hesapla
  useEffect(() => {
    const root = anchor.current?.closest('.mdl') as HTMLElement | null;
    const main = root?.closest('main') as HTMLElement | null;
    if (!root || !main) return;
    let raf = 0;
    const rebuild = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const next = collect(root);
        setItems((prev) => (prev.length === next.length && prev.every((p, i) => p.el === next[i].el && p.title === next[i].title) ? prev : next));
        const pad = parseFloat(getComputedStyle(main).paddingLeft) || 0;
        const mainLeft = main.getBoundingClientRect().left;
        const size = Math.min(24, pad - 6);
        setGeo(size >= 16 ? { x: mainLeft + pad / 2, size, top: offset() } : null);
      });
    };
    rebuild();
    const mo = new MutationObserver(rebuild);
    mo.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'open'] });
    window.addEventListener('resize', rebuild);
    // Sidebar daraltma gibi yerleşim değişiklikleri
    const ro = new ResizeObserver(rebuild);
    ro.observe(main);
    return () => { cancelAnimationFrame(raf); mo.disconnect(); ro.disconnect(); window.removeEventListener('resize', rebuild); };
  }, [offset]);

  // Kaydırırken bulunulan bölüm
  useEffect(() => {
    if (!items.length) return;
    const onScroll = () => {
      const line = offset() + 8;
      let cur = 0;
      items.forEach((it, i) => { if (it.el.getBoundingClientRect().top <= line) cur = i; });
      // Sayfanın sonuna gelindiyse son bölüm
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) cur = items.length - 1;
      setActive(cur);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [items, offset]);

  const go = (i: number) => {
    const el = items[i]?.el;
    if (!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset() + 2, behavior: 'smooth' });
  };

  const show = geo && items.length > 1;
  const gap = show ? Math.max(4, Math.min(12, (window.innerHeight - geo.top - 40 - items.length * geo.size) / Math.max(1, items.length - 1))) : 0;

  return (
    <>
      <span ref={anchor} hidden />
      {show && (
        <div
          className="step-rail no-print"
          role="navigation"
          aria-label="Bölümler"
          style={{ left: geo.x, top: geo.top, gap, ['--sr-size' as string]: `${geo.size}px` }}
        >
          <span className="sr-line" aria-hidden />
          {items.map((it, i) => (
            <button
              key={i}
              type="button"
              className={`sr-dot${i === active ? ' on' : ''}${i < active ? ' past' : ''}`}
              onClick={() => go(i)}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              aria-label={`${i + 1}. ${it.title}`}
              aria-current={i === active ? 'step' : undefined}
            >
              {i + 1}
              {hover === i && <span className="sr-tip">{it.title}</span>}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
