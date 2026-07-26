import type { Metadata } from 'next';
import './globals.css';
import '@/styles/model.css';
import { cookies } from 'next/headers';
import { Locale } from '@/lib/i18n';
import { AppSidebar, MobileTopNav } from '@/components/layout/AppSidebar';
import { Toaster } from '@/components/admin/toast';
import { ConfirmRoot } from '@/components/admin/confirm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Fizibilite Platformu — Utility & C&I Saatlik Mahsuplaşma',
  description:
    'Utility (GES + BESS proje finansmanı) ve C&I / Mesken (EPDK 14531 saatlik mahsuplaşma) fizibilite modelleri.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const localeCookie = cookies().get('locale')?.value;
  const locale: Locale = localeCookie === 'en' ? 'en' : 'tr';
  return (
    <html lang={locale}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800&family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-background antialiased">
        <div className="flex">
          <AppSidebar />
          <div className="flex-1 min-w-0">
            <MobileTopNav />
            <main className="px-4 lg:px-8 py-6 lg:py-8 max-w-[1600px] mx-auto">
              {children}
            </main>
            <footer className="border-t border-border/60 mt-12 py-4 no-print">
              <div className="px-4 lg:px-8 max-w-[1600px] mx-auto flex items-center flex-wrap gap-x-2 gap-y-1 text-[13.5px] text-muted-foreground">
                <span>© 2026 <b className="text-foreground font-semibold">Fizibilite Platformu</b></span>
                <span className="text-border">·</span>
                <span>Tasarım &amp; Geliştirme: <b className="text-foreground font-semibold">Furkan Ozan Seyfi</b></span>
                <span className="ml-auto flex items-center gap-4">
                  <a href="https://www.linkedin.com/in/fozanseyfi" target="_blank" rel="noopener" aria-label="LinkedIn" title="LinkedIn" className="text-muted-foreground hover:text-primary transition-colors">
                    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M8 11v5M8 8v.01M12 16v-3a2 2 0 0 1 4 0v3" /></svg>
                  </a>
                  <a href="https://fizibilite.fozanseyfi.com/" target="_blank" rel="noopener" aria-label="Web" title="Web" className="text-muted-foreground hover:text-primary transition-colors">
                    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3z" /></svg>
                  </a>
                  <a href="mailto:fozanseyfi@gmail.com" aria-label="E-posta" title="E-posta" className="text-muted-foreground hover:text-primary transition-colors">
                    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
                  </a>
                </span>
              </div>
            </footer>
          </div>
        </div>
        <Toaster />
        <ConfirmRoot />
      </body>
    </html>
  );
}
