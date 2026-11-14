"use client";

import { useState } from "react";
import { Check, Copy, Mail, Phone } from "lucide-react";

const ICONS = { mail: Mail, phone: Phone };

/** Değeri gösterir; tıklayınca panoya kopyalar (koyu zemin için). */
export function CopyChip({ icon, value, label }: { icon: keyof typeof ICONS; value: string; label: string }) {
  const Icon = ICONS[icon];
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      title={`${label} kopyala`}
      onClick={() => {
        navigator.clipboard?.writeText(value).then(
          () => {
            setDone(true);
            setTimeout(() => setDone(false), 1500);
          },
          () => {}
        );
      }}
      className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-2 text-[12.5px] text-white transition-colors hover:border-white/35 hover:bg-white/10"
    >
      <Icon className="size-3.5 shrink-0 text-sky-300" />
      <span className="truncate">{value}</span>
      {done ? <Check className="size-3.5 shrink-0 text-emerald-300" /> : <Copy className="size-3.5 shrink-0 opacity-50" />}
    </button>
  );
}
