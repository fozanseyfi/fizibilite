'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AppSidebar, MobileTopNav } from '@/components/layout/AppSidebar';
import { BrandMark } from '@/components/layout/BrandMark';
import { useAuthHydrated, useSession } from '@/lib/auth-store';

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
    <div className="flex">
      <AppSidebar />
      <div className="flex-1 min-w-0">
        <MobileTopNav />
        <main className="px-4 lg:px-8 py-6 lg:py-8 max-w-[1600px] mx-auto">{children}</main>
        <AppFooter />
      </div>
    </div>
  );
}

export function SocialLinks({ size = 19 }: { size?: number }) {
  return (
    <>
      <a href="https://www.linkedin.com/in/fozanseyfi" target="_blank" rel="noopener" aria-label="LinkedIn" title="LinkedIn" className="text-muted-foreground hover:text-primary transition-colors">
        <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M8 11v5M8 8v.01M12 16v-3a2 2 0 0 1 4 0v3" /></svg>
      </a>
      <a href="https://fizibilite.fozanseyfi.com/" target="_blank" rel="noopener" aria-label="Web" title="Web" className="text-muted-foreground hover:text-primary transition-colors">
        <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3z" /></svg>
      </a>
      <a href="mailto:fozanseyfi@gmail.com" aria-label="E-posta" title="E-posta" className="text-muted-foreground hover:text-primary transition-colors">
        <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
      </a>
    </>
  );
}

export function AppFooter({ wide = false }: { wide?: boolean }) {
  return (
    <footer className={`border-t border-border/60 py-4 no-print ${wide ? '' : 'mt-12'}`}>
      <div className={`px-4 lg:px-8 mx-auto flex items-center flex-wrap gap-x-2 gap-y-1 text-[13.5px] text-muted-foreground ${wide ? 'max-w-[1400px] lg:px-10' : 'max-w-[1600px]'}`}>
        <span>© 2026 <b className="text-foreground font-semibold">Fizibilite Platformu</b></span>
        <span className="text-border">·</span>
        <span>Tasarım &amp; Geliştirme: <b className="text-foreground font-semibold">Furkan Ozan Seyfi</b></span>
        <span className="ml-auto flex items-center gap-4">
          <SocialLinks />
        </span>
      </div>
    </footer>
  );
}
