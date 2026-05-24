import type { Metadata } from 'next';
import './globals.css';
import { cookies } from 'next/headers';
import { Locale } from '@/lib/i18n';
import { AppSidebar, MobileTopNav } from '@/components/layout/AppSidebar';

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
        <div className="flex">
          <AppSidebar />
          <div className="flex-1 min-w-0">
            <MobileTopNav />
            <main className="px-4 lg:px-8 py-6 lg:py-8 max-w-[1600px] mx-auto">
              {children}
            </main>
            <footer className="border-t border-border/60 mt-12 py-5">
              <div className="px-4 lg:px-8 max-w-[1600px] mx-auto text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-2">
                <div>
                  © 2026 GES-Fizibilite Pro · EPDK Karar No: 14531 (30.04.2026) ·{' '}
                  <span className="text-foreground/60">Bu rapor öneri niteliğindedir, yatırım kararı için yetkili uzman görüşü alınız.</span>
                </div>
                <div className="text-foreground/60">v0.2.0</div>
              </div>
            </footer>
          </div>
        </div>
      </body>
    </html>
  );
}
