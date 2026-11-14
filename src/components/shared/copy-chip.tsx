"use client";

import { useState } from "react";
import { ArrowUpRight, Check, Copy, Globe, Mail, Phone } from "lucide-react";
import { LinkedInIcon } from "@/components/layout/AppShell";

type Row = { kind: "mail" | "phone" | "linkedin" | "web"; label: string; value: string; href?: string };

const ICONS = { mail: Mail, phone: Phone, linkedin: LinkedInIcon, web: Globe };

/** İletişim kanalları — tek hizalı satırlar (koyu zemin için). E-posta/telefon kopyalanır, bağlantılar yeni sekmede açılır. */
export function ContactRows({ rows }: { rows: Row[] }) {
  const [copied, setCopied] = useState<string | null>(null);
  return (
    <ul className="relative">
      {rows.map((r) => {
        const Icon = ICONS[r.kind];
        const inner = (
          <>
            <span className="flex size-7 items-center justify-center rounded-lg bg-white/10 text-sky-300">
              <Icon className="size-3.5" />
            </span>
            <span className="hidden text-[11px] font-semibold uppercase tracking-[0.1em] text-[#b3c2d6] sm:block">{r.label}</span>
            <span className="truncate text-[13.5px] font-medium text-white">{r.value}</span>
            <span className="flex items-center gap-1 justify-self-end text-[11.5px] text-[#b3c2d6] transition-colors group-hover:text-white">
              {r.href ? (
                <><span className="hidden sm:inline">Aç</span> <ArrowUpRight className="size-3.5" /></>
              ) : copied === r.value ? (
                <><span className="hidden sm:inline">Kopyalandı</span> <Check className="size-3.5 text-emerald-300" /></>
              ) : (
                <><span className="hidden sm:inline">Kopyala</span> <Copy className="size-3.5" /></>
              )}
            </span>
          </>
        );
        const cls =
          "group grid w-full grid-cols-[28px_minmax(0,1fr)_auto] sm:grid-cols-[28px_76px_minmax(0,1fr)_auto] items-center gap-3 border-t border-white/15 py-2 text-left transition-colors hover:bg-white/[0.04]";
        return (
          <li key={r.kind}>
            {r.href ? (
              <a href={r.href} target="_blank" rel="noreferrer" className={cls}>
                {inner}
              </a>
            ) : (
              <button
                type="button"
                className={cls}
                title={`${r.label} kopyala`}
                onClick={() =>
                  navigator.clipboard?.writeText(r.value).then(
                    () => {
                      setCopied(r.value);
                      setTimeout(() => setCopied(null), 1500);
                    },
                    () => {}
                  )
                }
              >
                {inner}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
