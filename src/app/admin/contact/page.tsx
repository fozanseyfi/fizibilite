import type { Metadata } from "next";
import { ArrowUpRight, Globe, ShieldCheck, TriangleAlert } from "lucide-react";
import { ContactForm } from "@/components/shared/contact-form";
import { LegalDisclaimerCard } from "@/components/shared/legal-disclaimer";
import { CopyChip } from "@/components/shared/copy-chip";
import { PlatformGrid } from "@/components/auth/other-platforms";
import { LinkedInIcon } from "@/components/layout/AppShell";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "İletişime Geç — Fizibilite Platformu",
};

const chipCls =
  "inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-2 text-[12.5px] text-white transition-colors hover:border-white/35 hover:bg-white/10";

export default function ContactPage() {
  const d = siteConfig.developer;
  const parts = d.name.split(" ");
  const first = parts[0];
  const last = parts[parts.length - 1];
  const middle = parts.slice(1, -1).join(" ");

  const facts: [string, string][] = [
    ["Şu an", `${d.position} · ${d.company}`],
    ["Eğitim", `${d.education} · ${d.role}`],
    ["Uzmanlık", d.expertise],
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      {/* Kişi + form */}
      <section className="grid overflow-hidden rounded-2xl border lg:grid-cols-2">
        <div className="relative flex flex-col gap-6 overflow-hidden bg-[#0c1e35] p-7 text-[#eef3fa] sm:p-9">
          <div className="pointer-events-none absolute -bottom-32 -right-10 size-80 rounded-full bg-[radial-gradient(circle,rgba(56,189,248,.35),transparent_65%)]" />
          <div className="pointer-events-none absolute -left-24 -top-24 size-64 rounded-full bg-[radial-gradient(circle,rgba(251,191,36,.18),transparent_65%)]" />

          <div className="relative space-y-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-sky-300">Geliştirici</p>
            <h1 className="text-[40px] font-black leading-[1] tracking-tight text-white sm:text-[48px]" data-no-i18n>
              {first}
              <br />
              {middle} <span className="text-amber-400">{last}</span>
            </h1>
            <p className="max-w-md text-sm leading-relaxed text-[#b3c2d6]">{d.bio}</p>
          </div>

          <dl className="relative">
            {facts.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[92px_minmax(0,1fr)] gap-3 border-t border-white/15 py-2.5 text-[13.5px]">
                <dt className="pt-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#b3c2d6]">{k}</dt>
                <dd className="font-medium text-white">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="relative flex flex-wrap gap-2">
            <CopyChip icon="mail" value={d.email} label="E-postayı" />
            <CopyChip icon="phone" value={d.phone} label="Telefonu" />
            <a href={d.linkedin.href} target="_blank" rel="noreferrer" className={chipCls}>
              <LinkedInIcon className="size-3.5 text-sky-300" /> LinkedIn <ArrowUpRight className="size-3.5 opacity-60" />
            </a>
            <a href={d.website.href} target="_blank" rel="noreferrer" className={chipCls}>
              <Globe className="size-3.5 text-sky-300" /> {d.website.label} <ArrowUpRight className="size-3.5 opacity-60" />
            </a>
          </div>
        </div>

        <div className="flex flex-col gap-5 bg-card p-7 sm:p-9">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Bana yazın</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Hata, öneri ya da soru; mesajınız e-posta uygulamanız üzerinden iletilir.
            </p>
          </div>
          <ContactForm recipientEmail={d.email} />
        </div>
      </section>

      {/* Veri gizliliği + sorumluluk reddi */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-start gap-3.5 rounded-2xl border bg-card p-5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="size-5" />
          </div>
          <div className="space-y-1">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-400">Veri gizliliği</p>
            <p className="text-sm font-semibold">Verileriniz size aittir</p>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Geliştirici dahil hiçbir üçüncü taraf modellerinizi görmez veya indiremez.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3.5 rounded-2xl border bg-card p-5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <TriangleAlert className="size-5" />
          </div>
          <div className="space-y-1">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-amber-600 dark:text-amber-400">Sorumluluk reddi</p>
            <p className="text-sm font-semibold">Tahmin aracıdır, yatırım tavsiyesi değildir</p>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Tüm hesaplamalar bilgilendirme amaçlıdır; sonuçların doğruluğu ve kullanımı kullanıcının sorumluluğundadır.
            </p>
          </div>
        </div>
      </section>

      <LegalDisclaimerCard />

      {/* Diğer platformlar */}
      <section className="rounded-2xl border bg-card p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-sky-600 dark:text-sky-400">Aynı geliştiriciden</p>
            <h2 className="text-lg font-bold tracking-tight">Geliştirdiğim diğer platformlar</h2>
          </div>
          <p className="text-xs text-muted-foreground">Karta tıklayarak ilgili platforma geçebilirsiniz.</p>
        </div>
        <PlatformGrid />
      </section>
    </div>
  );
}
