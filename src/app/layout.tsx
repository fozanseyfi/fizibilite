import type { Metadata } from 'next';
import './globals.css';
import { Sun } from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LocaleToggle } from '@/components/LocaleToggle';
import { cookies } from 'next/headers';
import { t, Locale } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'GES-Fizibilite Pro — EPDK Saatlik Mahsuplaşma Fizibilitesi',
  description:
    'EPDK Karar 14531 saatlik mahsuplaşma rejimi altında C&I çatı, arazi ve GES+BESS hibrit projeler için profesyonel finansal fizibilite.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const localeCookie = cookies().get('locale')?.value;
  const locale: Locale = localeCookie === 'en' ? 'en' : 'tr';
  return (
    <html lang={locale}>
      <body className="min-h-screen bg-background antialiased">
        <header className="border-b border-border/60 bg-background/95 backdrop-blur sticky top-0 z-40">
          <div className="container flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg gradient-solar flex items-center justify-center shadow-sm">
                <Sun className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="font-semibold text-base leading-tight">GES-Fizibilite <span className="text-solar">Pro</span></div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">EPDK 14531 · Saatlik Mahsuplaşma</div>
              </div>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link href="/" className="px-3 py-2 rounded-md hover:bg-secondary text-foreground/80 hover:text-foreground">{t('nav.projects', locale)}</Link>
              <Link href="/projects/new" className="px-3 py-2 rounded-md hover:bg-secondary text-foreground/80 hover:text-foreground">{t('nav.newProject', locale)}</Link>
              <Link href="/projects/compare" className="px-3 py-2 rounded-md hover:bg-secondary text-foreground/80 hover:text-foreground">{t('nav.compare', locale)}</Link>
              <Link href="/about" className="px-3 py-2 rounded-md hover:bg-secondary text-foreground/80 hover:text-foreground">{t('nav.about', locale)}</Link>
              <div className="ml-2 flex items-center gap-1.5">
                <LocaleToggle />
                <ThemeToggle />
              </div>
            </nav>
          </div>
        </header>
        <main className="container py-8">{children}</main>
        <footer className="border-t border-border/60 mt-16 py-6">
          <div className="container text-xs text-muted-foreground flex items-center justify-between">
            <div>
              © 2026 GES-Fizibilite Pro · EPDK Karar No: 14531 (30.04.2026) ·{' '}
              <span className="text-foreground/60">Bu rapor öneri niteliğindedir, yatırım kararı için yetkili uzman görüşü alınız.</span>
            </div>
            <div className="text-foreground/60">v0.1.0</div>
          </div>
        </footer>
      </body>
    </html>
  );
}
