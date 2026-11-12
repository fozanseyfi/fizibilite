'use client';

import { useEffect, useRef, useState } from 'react';
import { nf, pct } from '@/lib/models/fmt';
import type { NetFlows } from '@/components/models/native/ci-render';

/**
 * Enerji akışı (Sankey) — C&I mahsuplaşma görünümü.
 * Sol: enerjinin geldiği yer (Güneş, Batarya deşarjı, Şebeke çekişi).
 * Sağ: gittiği yer (Batarya şarjı, Yük kullanımı, Şebekeye satış/fazla).
 * Bant kalınlığı enerjiyle orantılı; üzerine gelince miktar ve pay gösterilir.
 */

type NodeKey = 'sun' | 'batOut' | 'grid' | 'batIn' | 'load' | 'gridOut';
interface Flow { from: NodeKey; to: NodeKey; v: number; label: string }

const COL: Record<NodeKey, string> = {
  sun: '#E2B33C', batOut: '#4FA866', grid: '#4A86C8',
  batIn: '#4FA866', load: '#E07B3C', gridOut: '#4A86C8',
};
const NAME: Record<NodeKey, string> = {
  sun: 'Güneş', batOut: 'Batarya', grid: 'Şebeke',
  batIn: 'Batarya', load: 'Yük kullanımı', gridOut: 'Şebeke',
};

export function NetSankey({ f }: { f: NetFlows }) {
  const [hover, setHover] = useState<number | null>(null);
  // Dar ekranda (telefon) grafik dar ölçekle çizilir; yazılar okunur kalsın
  const box = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const el = box.current; if (!el) return;
    const ro = new ResizeObserver(() => setNarrow(el.clientWidth < 560));
    ro.observe(el); return () => ro.disconnect();
  }, []);
  const big = Math.max(f.prod, f.cons) > 20000;
  const unit = big ? 'MWh' : 'kWh';
  const fmtE = (kwh: number) => `${nf(big ? kwh / 1000 : kwh, big ? 1 : kwh < 100 ? 1 : 0)} ${unit}`;

  const flows: Flow[] = [
    { from: 'sun', to: 'batIn', v: f.ch, label: 'Güneş → batarya şarjı' },
    { from: 'sun', to: 'load', v: f.mah, label: 'Güneş → yük (doğrudan mahsup)' },
    { from: 'sun', to: 'gridOut', v: f.faz, label: 'Güneş → şebekeye fazla üretim' },
    { from: 'batOut', to: 'load', v: f.dch, label: 'Batarya → yük (akşama kaydırma)' },
    { from: 'grid', to: 'load', v: f.cek, label: 'Şebeke → yük (çekiş)' },
  ].filter((x) => x.v > 1e-6) as Flow[];

  const left: NodeKey[] = (['sun', 'batOut', 'grid'] as NodeKey[]).filter((k) => flows.some((x) => x.from === k));
  const right: NodeKey[] = (['batIn', 'load', 'gridOut'] as NodeKey[]).filter((k) => flows.some((x) => x.to === k));
  const tot = (k: NodeKey) => flows.filter((x) => x.from === k || x.to === k).reduce((s, x) => s + x.v, 0);
  const sumL = left.reduce((s, k) => s + tot(k), 0), sumR = right.reduce((s, k) => s + tot(k), 0);
  if (!flows.length || sumL <= 0) return <p className="tsub">Seçili dönemde enerji akışı yok.</p>;

  const W = narrow ? 400 : 900, H = narrow ? 360 : 340, pt = narrow ? 10 : 30, pb = 8, nodeW = narrow ? 112 : 150, gap = 12, MIN = 24;
  const avail = H - pt - pb;
  // Ölçek: küçük düğümler en az MIN yükseklik alır (etiket okunsun), kalan alan orantılı paylaşılır
  const sideScale = (keys: NodeKey[], sum: number) => {
    let sc = (avail - gap * (keys.length - 1)) / sum;
    for (let it = 0; it < 3; it++) {
      const small = keys.filter((k) => tot(k) * sc < MIN);
      const rest = keys.filter((k) => !small.includes(k)).reduce((x, k) => x + tot(k), 0);
      if (!small.length || rest <= 0) break;
      sc = (avail - gap * (keys.length - 1) - MIN * small.length) / rest;
    }
    return sc;
  };
  const scale = Math.min(sideScale(left, sumL), sideScale(right, sumR));
  // Düğüm konumları
  const pos: Partial<Record<NodeKey, { y: number; h: number; x: number }>> = {};
  const place = (keys: NodeKey[], x: number) => {
    const hs = keys.map((k) => Math.max(tot(k) * scale, MIN));
    const used = hs.reduce((x2, h) => x2 + h, 0) + gap * (keys.length - 1);
    let y = pt + (avail - used) / 2;
    keys.forEach((k, j) => { pos[k] = { x, y, h: hs[j] }; y += hs[j] + gap; });
  };
  place(left, 0); place(right, W - nodeW);
  // Bantlar: kaynakta hedef sırasına, hedefte kaynak sırasına göre yığılır (kesişme az)
  const outOff: Partial<Record<NodeKey, number>> = {}, inOff: Partial<Record<NodeKey, number>> = {};
  const order = [...flows].sort((a, b) => right.indexOf(a.to) - right.indexOf(b.to));
  const bands = new Map<Flow, { y0: number; y1: number; t: number }>();
  order.forEach((x) => {
    const s = pos[x.from]!, o = outOff[x.from] ?? 0, t = x.v * scale;
    bands.set(x, { y0: s.y + o, y1: 0, t }); outOff[x.from] = o + t;
  });
  [...flows].sort((a, b) => left.indexOf(a.from) - left.indexOf(b.from)).forEach((x) => {
    const d = pos[x.to]!, o = inOff[x.to] ?? 0, b = bands.get(x)!;
    b.y1 = d.y + o; inOff[x.to] = o + b.t;
  });
  const x0 = nodeW, x1 = W - nodeW, cx = (x0 + x1) / 2;

  return (
    <div className="net-sankey" ref={box}>
      <div className="ns-head"><span>Enerji kaynağı</span><span className="ns-period">{f.label}</span><span>Enerjinin gittiği yer</span></div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Enerji akışı">
        <defs>
          {flows.map((x, i) => (
            <linearGradient key={i} id={`nsg${i}`} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor={COL[x.from]} />
              <stop offset="1" stopColor={COL[x.to]} />
            </linearGradient>
          ))}
        </defs>
        {flows.map((x, i) => {
          const b = bands.get(x)!;
          const d = `M${x0},${b.y0} C${cx},${b.y0} ${cx},${b.y1} ${x1},${b.y1} L${x1},${b.y1 + b.t} C${cx},${b.y1 + b.t} ${cx},${b.y0 + b.t} ${x0},${b.y0 + b.t} Z`;
          return (
            <path
              key={i} d={d} fill={`url(#nsg${i})`}
              opacity={hover === null ? 0.42 : hover === i ? 0.75 : 0.18}
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
              style={{ transition: 'opacity .15s', cursor: 'default' }}
            />
          );
        })}
        {([...left, ...right] as NodeKey[]).map((k) => {
          const p = pos[k]!, isL = left.includes(k), share = tot(k) / (isL ? sumL : sumR) * 100;
          const tall = p.h >= 44;
          return (
            <g key={k}>
              <rect x={p.x} y={p.y} width={nodeW} height={p.h} rx={4} fill={COL[k]} />
              <text x={p.x + 9} y={p.y + (tall ? 17 : p.h / 2 + 4.5)} className="ns-name">{NAME[k]}{!tall && <tspan className="ns-inline">{'  ' + fmtE(tot(k))}</tspan>}</text>
              {tall && <text x={p.x + 9} y={p.y + 35} className="ns-val">{fmtE(tot(k))}</text>}
              {p.h >= 70 && <text x={p.x + nodeW - 9} y={p.y + p.h - 9} textAnchor="end" className="ns-pct">{pct(share, 1)}</text>}
            </g>
          );
        })}
      </svg>
      <div className="ns-tip" aria-live="polite">
        {hover !== null
          ? <><b>{flows[hover].label}:</b> {fmtE(flows[hover].v)} · kaynağının {pct(flows[hover].v / tot(flows[hover].from) * 100, 1)}&apos;i</>
          : <>Yük kullanımının <b>{pct(f.mah / Math.max(f.cons, 1e-9) * 100, 1)}</b>&apos;i doğrudan güneşten{f.dch > 0 && <>, <b>{pct(f.dch / Math.max(f.cons, 1e-9) * 100, 1)}</b>&apos;i bataryadan</>}, <b>{pct(f.cek / Math.max(f.cons, 1e-9) * 100, 1)}</b>&apos;i şebekeden karşılanıyor. Üretimin <b>{pct(f.faz / Math.max(f.prod, 1e-9) * 100, 1)}</b>&apos;i şebekeye fazla olarak gidiyor. Bantların üzerine gelince ayrıntı görünür.</>}
      </div>
    </div>
  );
}
