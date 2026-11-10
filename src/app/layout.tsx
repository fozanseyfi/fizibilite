import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import '@/styles/model.css';
import '@/styles/classic.css';
import { cookies } from 'next/headers';
import { Locale } from '@/lib/i18n';
import { I18nRoot } from '@/components/I18nRoot';
import { AppShell } from '@/components/layout/AppShell';
import { Toaster } from '@/components/admin/toast';
import { ConfirmRoot } from '@/components/admin/confirm';

export const dynamic = 'force-dynamic';

// Teklif platformuyla aynı font. latin-ext: ğ, ş, İ gibi Türkçe harfler için.
const inter = Inter({ subsets: ['latin', 'latin-ext'], variable: '--font-inter', display: 'swap' });

export function generateMetadata(): Metadata {
  const en = cookies().get('locale')?.value === 'en';
  return en
    ? {
        title: 'Feasibility Platform — Utility & C&I Hourly Netting',
        description: 'Utility (PV + BESS project finance) and C&I / Residential (EPDK 14531 hourly netting) feasibility models.',
      }
    : {
        title: 'Fizibilite Platformu — Utility & C&I Saatlik Mahsuplaşma',
        description:
          'Utility (GES + BESS proje finansmanı) ve C&I / Mesken (EPDK 14531 saatlik mahsuplaşma) fizibilite modelleri.',
      };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const localeCookie = cookies().get('locale')?.value;
  const locale: Locale = localeCookie === 'en' ? 'en' : 'tr';
  // İstemci bileşenlerinin sunucu render'ında sayı/tarih biçimi (lib/i18n appLocale)
  (globalThis as { __APP_LOCALE?: Locale }).__APP_LOCALE = locale;
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Gece modu: ilk boyamadan önce uygulanır (yanıp sönme olmaz, tüm sayfalarda geçerli) */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}if(/(^|; )locale=en/.test(document.cookie)){document.documentElement.classList.add('i18n-pending');setTimeout(function(){document.documentElement.classList.remove('i18n-pending')},2500)}",
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800&family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.variable} min-h-screen bg-background font-sans antialiased`}>
        <I18nRoot locale={locale} />
        <AppShell>{children}</AppShell>
        <Toaster />
        <ConfirmRoot />
      </body>
    </html>
  );
}
