"use client";

import { TrendingUp, Clock, Zap, Coins } from "lucide-react";

/**
 * Login sağ paneli — platformun ne ürettiğini gösteren örnek önizleme.
 * (Teklif platformundaki LoginDemo'nun Fizibilite karşılığı.)
 * Değerler ÖRNEK'tir; gerçek bir projeye ait değildir.
 */

// 24 saatlik örnek profil (kWh) — öğlen üretim fazlası, akşam tüketim fazlası
const PROD = [0, 0, 0, 0, 0, 2, 12, 34, 58, 78, 92, 98, 100, 96, 86, 70, 48, 24, 6, 0, 0, 0, 0, 0];
const CONS = [22, 20, 19, 19, 20, 24, 34, 52, 64, 68, 70, 72, 66, 70, 72, 70, 66, 62, 58, 52, 44, 36, 30, 25];

const KPIS = [
  { label: "NPV", value: "₺48,6 Mn", icon: Coins },
  { label: "IRR", value: "%21,4", icon: TrendingUp },
  { label: "Geri Ödeme", value: "4,2 yıl", icon: Clock },
  { label: "Öz Tüketim", value: "%71", icon: Zap },
];

function NettingChart() {
  const W = 480;
  const H = 150;
  const max = 100;
  const bw = W / 24;
  const y = (v: number) => H - (v / max) * (H - 8);
  const consPath = CONS.map((v, i) => `${i === 0 ? "M" : "L"}${i * bw + bw / 2},${y(v)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H + 18}`} className="w-full" role="img" aria-label="Saatlik üretim ve tüketim örneği">
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={0} x2={W} y1={H - f * (H - 8)} y2={H - f * (H - 8)} className="stroke-border" strokeDasharray="3 4" />
      ))}
      {PROD.map((p, i) => {
        const self = Math.min(p, CONS[i]);
        const excess = Math.max(0, p - CONS[i]);
        return (
          <g key={i}>
            <rect x={i * bw + 3} width={bw - 6} y={y(self)} height={H - y(self)} rx={2} fill="#f59e0b" />
            {excess > 0 && (
              <rect x={i * bw + 3} width={bw - 6} y={y(p)} height={y(self) - y(p)} rx={2} fill="#10b981" />
            )}
          </g>
        );
      })}
      <path d={consPath} fill="none" stroke="#1A4A94" strokeWidth={2.5} strokeLinejoin="round" className="dark:stroke-sky-400" />
      {[0, 6, 12, 18, 23].map((h) => (
        <text
          key={h}
          x={h === 0 ? 0 : h === 23 ? W : h * bw + bw / 2}
          y={H + 14}
          textAnchor={h === 0 ? "start" : h === 23 ? "end" : "middle"}
          className="fill-muted-foreground"
          fontSize={10}
        >
          {String(h).padStart(2, "0")}:00
        </text>
      ))}
    </svg>
  );
}

export function LoginShowcase() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-large animate-in-up">
      <div className="flex items-center justify-between border-b border-border/60 bg-secondary/40 px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-red/70" />
          <span className="size-2.5 rounded-full bg-yellow/70" />
          <span className="size-2.5 rounded-full bg-green/70" />
        </div>
        <span className="text-[11px] font-medium text-muted-foreground">
          Örnek proje · 1 MWp Çatı GES · Sanayi OG
        </span>
      </div>

      <div className="space-y-4 p-5">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {KPIS.map((k) => (
            <div key={k.label} className="rounded-xl border border-border/60 bg-background p-3">
              <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                <k.icon className="size-3 text-primary" />
                {k.label}
              </div>
              <div className="mt-1 text-lg font-semibold tabular-nums text-foreground">{k.value}</div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border/60 bg-background p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[13px] font-bold text-foreground">Saatlik mahsuplaşma — tipik yaz günü</p>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="size-2.5 rounded-sm bg-[#f59e0b]" />Öz tüketim</span>
              <span className="flex items-center gap-1"><span className="size-2.5 rounded-sm bg-[#10b981]" />Fazla üretim</span>
              <span className="flex items-center gap-1"><span className="h-0.5 w-3 bg-[#1A4A94] dark:bg-sky-400" />Tüketim</span>
            </div>
          </div>
          <NettingChart />
        </div>

        <p className="text-[12px] leading-relaxed text-muted-foreground">
          EPDK 14531 sayılı karar kapsamında <strong className="text-foreground">8760 saatlik</strong>{" "}
          üretim–tüketim eşleştirmesi, tarife bazlı gelir ve tam finansal model (NPV, IRR, LCOE, DSCR) tek
          ekranda.
        </p>
      </div>
    </div>
  );
}
