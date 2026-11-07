'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Globe, Mail } from 'lucide-react';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { BrandMark } from '@/components/layout/BrandMark';
import { useAuthHydrated, useSession } from '@/lib/auth-store';
import { siteConfig } from '@/lib/site-config';

/** Sidebar'sız, oturum gerektirmeyen sayfalar */
const AUTH_ROUTES = ['/login', '/register', '/forgot-password'];

const isAuthRoute = (p: string) => AUTH_ROUTES.some((r) => p === r || p.startsWith(`${r}/`));

/**
 * Uygulama kabuğu + istemci tarafı oturum koruması.
 * - Auth sayfaları: sadece içerik (oturum varsa ana sayfaya atar).
 * - Diğer sayfalar: oturum yoksa /login?next=... ; varsa sidebar + içerik + footer.
 *
 * Supabase'e geçince koruma middleware.ts'e taşınacak; bu bileşen sadece layout kalır.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const hydrated = useAuthHydrated();
  const session = useSession();
  const authPage = isAuthRoute(pathname);

  useEffect(() => {
    if (!hydrated) return;
    if (!session && !authPage) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    } else if (session && authPage) {
      // Giriş/kayıt sonrası: ?next= ile gelinen sayfaya dön (yalnızca site içi yol)
      const next = new URLSearchParams(window.location.search).get('next');
      router.replace(next && next.startsWith('/') && !next.startsWith('//') ? next : '/');
    }
  }, [hydrated, session, authPage, pathname, router]);

  if (authPage) return <>{children}</>;

  if (!hydrated || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <BrandMark className="h-12 w-12 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <div className="sidebar-aware flex min-h-screen flex-col pt-14">
        <main className="mx-auto w-full max-w-[1600px] flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        <AppFooter />
      </div>
    </div>
  );
}

export function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14ZM8.5 18V10H6v8h2.5Zm-1.25-9.1c.83 0 1.5-.67 1.5-1.5S8.08 5.9 7.25 5.9 5.75 6.57 5.75 7.4s.67 1.5 1.5 1.5ZM18 18v-4.6c0-2.16-1.16-3.16-2.7-3.16-1.25 0-1.81.69-2.13 1.18V10H10.7c.03.71 0 8 0 8h2.47v-4.47c0-.22.02-.44.08-.6.18-.44.59-.9 1.27-.9.9 0 1.26.69 1.26 1.7V18H18Z" />
    </svg>
  );
}

export function SocialLinks({ className = 'size-4' }: { className?: string }) {
  const { developer } = siteConfig;
  const cls = 'text-muted-foreground transition-colors hover:text-primary';
  return (
    <>
      <a href={developer.linkedin.href} target="_blank" rel="noreferrer" aria-label="LinkedIn" className={cls}>
        <LinkedInIcon className={className} />
      </a>
      <a href={developer.website.href} target="_blank" rel="noreferrer" aria-label="Web sitesi" className={cls}>
        <Globe className={className} />
      </a>
      <a href={`mailto:${developer.email}`} aria-label="E-posta" className={cls}>
        <Mail className={className} />
      </a>
    </>
  );
}

export function AppFooter({ wide = false }: { wide?: boolean }) {
  const { developer, name } = siteConfig;
  return (
    <footer className={`border-t bg-background/40 no-print ${wide ? '' : 'mt-12'}`}>
      <div className={`mx-auto flex flex-col items-center justify-between gap-3 px-6 py-5 text-xs text-muted-foreground sm:flex-row ${wide ? 'max-w-[1400px] lg:px-10' : 'max-w-6xl'}`}>
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <span>© {new Date().getFullYear()}</span>
          <span className="font-medium text-foreground">{name}</span>
          <span className="text-muted-foreground/60">·</span>
          <span>
            Tasarım &amp; Geliştirme:{' '}
            <a href={developer.website.href} target="_blank" rel="noreferrer" className="font-medium text-foreground hover:text-primary">
              {developer.name}
            </a>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <SocialLinks />
        </div>
      </div>
    </footer>
  );
}
