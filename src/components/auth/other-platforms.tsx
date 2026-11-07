"use client";

import { Sun, Workflow, Trophy, TrendingUp, Wrench, Sparkles, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Platform {
  name: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Marka rengi (hex) — diğer platformlarla aynı */
  color: string;
  softColor: string;
  href?: string;
  current?: boolean;
}

/** Diğer platformlardaki listeyle aynı sıra ve renkler; "current" bu platform. */
const PLATFORMS: Platform[] = [
  {
    name: "Solar Teklif Platformu",
    subtitle: "Solar EPC fiyatlandırma & kapsam yönetimi",
    icon: Sun,
    color: "#059669",
    softColor: "#ecfdf5",
    href: "https://teklif.fozanseyfi.com",
  },
  {
    name: "Proje Yönetim Platformu",
    subtitle: "Çoklu proje, ekip ve ilerleme takibi",
    icon: Workflow,
    color: "#4f46e5",
    softColor: "#eef2ff",
    href: "https://proje.fozanseyfi.com",
  },
  {
    name: "Satınalma Karar Destek Platformu",
    subtitle: "Çoklu kriterli skor ile en doğru tedarikçi",
    icon: Trophy,
    color: "#f59e0b",
    softColor: "#fffbeb",
    href: "https://karardestek.fozanseyfi.com/",
  },
  {
    name: "Solar Fizibilite Platformu",
    subtitle: "GES yatırım & geri ödeme analizi",
    icon: TrendingUp,
    color: "#0891b2",
    softColor: "#ecfeff",
    current: true,
  },
  {
    name: "GES Mühendislik Platformu",
    subtitle: "Tasarım, hesap ve teknik dokümantasyon",
    icon: Wrench,
    color: "#e11d48",
    softColor: "#fff1f2",
  },
];

export function OtherPlatforms({ variant = "ribbon" }: { variant?: "ribbon" | "compact" }) {
  const compact = variant === "compact";
  return (
    <section
      className={
        compact
          ? "rounded-xl border bg-card shadow-sm"
          : "border-t border-border/60 bg-gradient-to-b from-primary/[0.05] to-background"
      }
    >
      <div className={compact ? "p-5 sm:p-6" : "mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10"}>
        <div className="mb-5 sm:mb-6">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-solar-dark dark:text-solar-light">
            <Sparkles className="size-3" />
            Geliştirdiğim diğer platformlar
          </div>
          <p className="mt-2.5 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
            Sahadaki ihtiyaçlardan doğan <strong className="text-foreground">bireysel inisiyatif</strong>{" "}
            projeleri. Kart üzerine tıklayarak ilgili platforma geçebilirsiniz.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {PLATFORMS.map((p) => {
            const isComing = !p.href && !p.current;
            const Inner = (
              <>
                <div className="flex items-start justify-between gap-2">
                  <div
                    className="flex size-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm transition-transform group-hover:scale-105 sm:size-12"
                    style={{ backgroundColor: p.color }}
                  >
                    <p.icon className="size-5 sm:size-6" />
                  </div>
                  {p.current && (
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                      style={{ backgroundColor: p.softColor, color: p.color }}
                    >
                      Buradasın
                    </span>
                  )}
                  {isComing && (
                    <span className="shrink-0 rounded-full border border-yellow/30 bg-yellow/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-solar-dark dark:text-solar-light">
                      Yakında
                    </span>
                  )}
                  {!p.current && p.href && (
                    <ArrowUpRight
                      className="size-4 shrink-0 opacity-30 transition-all group-hover:translate-x-0.5 group-hover:opacity-100"
                      style={{ color: p.color }}
                    />
                  )}
                </div>
                <div className="mt-3 min-w-0">
                  <p className="text-[13px] font-bold leading-tight tracking-tight text-foreground sm:text-[13.5px]">
                    {p.name}
                  </p>
                  <p className="mt-1 line-clamp-2 text-[11.5px] leading-snug text-muted-foreground">
                    {p.subtitle}
                  </p>
                </div>
              </>
            );

            const base = "group flex h-full flex-col rounded-2xl border bg-card p-3.5 shadow-sm transition-all sm:p-4";

            if (p.current) {
              return (
                <div
                  key={p.name}
                  className={base}
                  style={{ borderColor: p.color, boxShadow: `0 0 0 1px ${p.color}22` }}
                  title="Bu platformdasın"
                >
                  {Inner}
                </div>
              );
            }
            if (p.href) {
              return (
                <a
                  key={p.name}
                  href={p.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(base, "border-border/60 hover:-translate-y-0.5 hover:shadow-md")}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = p.color)}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "")}
                  title={p.name}
                >
                  {Inner}
                </a>
              );
            }
            return (
              <div
                key={p.name}
                className={cn(base, "cursor-not-allowed border-dashed border-border/60 opacity-80")}
                title="Yakında"
              >
                {Inner}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
