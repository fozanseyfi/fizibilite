import type { Metadata } from "next";
import Link from "next/link";
import { TourView } from "@/components/tanitim/tour-view";

export const metadata: Metadata = {
  title: "Platform Tanıtımı — Fizibilite Platformu",
  description: "Fizibilite Platformunun bütün modelleri, gerçek ekranlar üzerinden adım adım.",
};

/** Herkese açık tanıtım sayfası (giriş gerektirmez). Platform içindeki kopyası: /platform-tanitimi */
export default function TanitimPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card">
        <div className="mx-auto flex h-12 max-w-[1280px] items-center justify-between px-4 text-[13px]">
          <Link href="/login" className="font-semibold text-foreground">
            Fizibilite Platformu <span className="font-normal text-muted-foreground">· Platform Tanıtımı</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/register" className="hidden rounded-md border border-border px-3 py-1 text-foreground hover:bg-secondary sm:inline-block">
              Kayıt Ol
            </Link>
            <Link href="/login" className="rounded-md bg-[#0B2350] px-3 py-1 font-medium text-white hover:opacity-90">
              Giriş Yap
            </Link>
          </nav>
        </div>
      </header>
      <main className="px-4 py-4">
        <TourView top={48 + 16} />
      </main>
    </div>
  );
}
