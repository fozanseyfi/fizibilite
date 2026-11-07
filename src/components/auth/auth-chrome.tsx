"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { BrandMark } from "@/components/layout/BrandMark";
import { AppFooter, SocialLinks } from "@/components/layout/AppShell";
import { OtherPlatforms } from "@/components/auth/other-platforms";

/**
 * Auth sayfalarının ortak çerçevesi (header + diğer platformlar + footer).
 * Teklif / Proje Yönetim platformlarındaki login şablonunun Fizibilite uyarlaması.
 */
export function AuthChrome({
  children,
  cta = "register",
}: {
  children: React.ReactNode;
  /** Header sağındaki buton: kayıt sayfasında "Giriş Yap"a döner */
  cta?: "register" | "login";
}) {
  return (
    <div className="min-h-screen bg-soft-gradient">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-2 px-4 py-2.5 sm:gap-4 sm:px-6 sm:py-3 lg:px-10">
          <Link href="/login" className="flex items-center gap-2 sm:gap-2.5">
            <BrandMark className="size-8 shadow-sm sm:size-9 rounded-xl" />
            <div className="leading-tight">
              <p className="text-[13px] font-bold tracking-tight text-foreground sm:text-sm">
                Fizibilite <span className="text-solar">Platformu</span>
              </p>
              <p className="hidden text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:block">
                GES Yatırım Fizibilitesi
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="hidden items-center gap-3 sm:flex">
              <SocialLinks />
            </div>
            <Link
              href={cta === "register" ? "/register" : "/login"}
              className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#0B2350] px-2.5 text-[11px] font-semibold text-white shadow-sm transition-colors hover:bg-[#0B2350]/90 sm:ml-2 sm:h-9 sm:gap-1.5 sm:px-3.5 sm:text-xs"
            >
              <Sparkles className="size-3 sm:size-3.5" />
              {cta === "register" ? "Hesap Oluştur" : "Giriş Yap"}
            </Link>
          </div>
        </div>
      </header>

      {children}

      <OtherPlatforms />
      <AppFooter wide />
    </div>
  );
}

/** Form başlığı: rozet + büyük başlık + açıklama */
export function AuthHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <>
      <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-solar-dark dark:text-solar-light sm:px-3 sm:py-1 sm:text-[10px]">
        <Sparkles className="size-2.5 sm:size-3" />
        Bağımsız bir inisiyatif
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-[2.4rem] lg:leading-tight">
        {title}
      </h1>
      <p className="mt-1.5 text-[13px] text-muted-foreground sm:mt-2 sm:text-sm">{subtitle}</p>
    </>
  );
}

export function AuthAlert({ tone, children }: { tone: "error" | "success" | "info"; children: React.ReactNode }) {
  const cls =
    tone === "error"
      ? "border-destructive/30 bg-destructive/10 text-destructive"
      : tone === "success"
        ? "border-eco/30 bg-eco/10 text-eco-dark dark:text-eco-light"
        : "border-blue/30 bg-blue/10 text-blue2 dark:text-blue";
  return <div className={`rounded-lg border px-3 py-2.5 text-sm ${cls}`}>{children}</div>;
}
