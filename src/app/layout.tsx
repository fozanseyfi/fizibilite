import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import '@/styles/model.css';
import '@/styles/classic.css';
import { cookies } from 'next/headers';
import { Locale } from '@/lib/i18n';
import { AppShell } from '@/components/layout/AppShell';
import { Toaster } from '@/components/admin/toast';
import { ConfirmRoot } from '@/components/admin/confirm';

export const dynamic = 'force-dynamic';

// Teklif platformuyla aynı font. latin-ext: ğ, ş, İ gibi Türkçe harfler için.
const inter = Inter({ subsets: ['latin', 'latin-ext'], variable: '--font-inter', display: 'swap' });

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
      <body className={`${inter.variable} min-h-screen bg-background font-sans antialiased`}>
        <AppShell>{children}</AppShell>
        <Toaster />
        <ConfirmRoot />
      </body>
    </html>
  );
}
