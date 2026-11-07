'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, FolderPlus, BookOpen, FlaskConical,
  ChevronRight, ChevronsLeft, ChevronsRight,
  User, Users, History, Share2, HelpCircle, MessageSquare, Boxes, X, Menu, Plus, BookText, LogOut,
} from 'lucide-react';
import { useAuthStore, useSession } from '@/lib/auth-store';
import { BrandMark } from '@/components/layout/BrandMark';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LocaleToggle } from '@/components/LocaleToggle';
import { cn } from '@/lib/utils';
import { useStore } from '@/lib/admin-store';

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  match?: (path: string) => boolean;
}

const NAV: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, match: (p) => p === '/' },
  { href: '/projects', label: 'Projeler', icon: FolderPlus, match: (p) => p === '/projects' || (p.startsWith('/projects/') && !p.startsWith('/projects/new')) },
  { href: '/projects/new', label: 'Yeni Proje', icon: Plus, match: (p) => p === '/projects/new' },
];

const ADMIN_NAV: NavItem[] = [
  { href: '/admin/account', label: 'Hesabım', icon: User },
  { href: '/admin/users', label: 'Kullanıcılar', icon: Users },
  { href: '/admin/share', label: 'Paylaşım', icon: Share2 },
  { href: '/admin/audit', label: 'Aktivite', icon: History },
  { href: '/admin/platforms', label: 'Diğer Platformlar', icon: Boxes },
];

// Destek grubu (Mahsuplaşma 101 + Saatlik vs Aylık + Finansal Terimler + Nasıl Çalışır + İletişim)
const SUPPORT_NAV: NavItem[] = [
  { href: '/about/netting-methodology', label: 'Mahsuplaşma 101', icon: BookOpen },
  { href: '/about/netting-comparison', label: 'Saatlik vs Aylık', icon: FlaskConical },
  { href: '/admin/financial-terms', label: 'Finansal Terimler', icon: BookText },
  { href: '/admin/how-it-works', label: 'Nasıl Çalışır', icon: HelpCircle },
  { href: '/admin/contact', label: 'İletişim', icon: MessageSquare },
];

/** Sol sidebar — masaüstü (geniş/daraltılmış) + mobil drawer hepsi tek komponentte. */
export function AppSidebar() {
  const pathname = usePathname();
  const collapsed = useStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const mobileOpen = useStore((s) => s.mobileDrawerOpen);
  const closeMobileDrawer = useStore((s) => s.closeMobileDrawer);

  // Mobil drawer açıkken route değişince otomatik kapansın
  useEffect(() => {
    if (mobileOpen) closeMobileDrawer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Mobil drawer açıkken ESC ile kapansın + body scroll lock
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeMobileDrawer(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [mobileOpen, closeMobileDrawer]);

  return (
    <>
      {/* ---------- MOBİL DRAWER + BACKDROP ---------- */}
      {mobileOpen && (
        <div
          onClick={closeMobileDrawer}
          className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-fade-in"
          aria-hidden
        />
      )}

      {/* ---------- SIDEBAR (3 mod: desktop full, desktop collapsed, mobile drawer) ---------- */}
      <aside
        className={cn(
          'bg-card border-r border-border/60 flex flex-col z-50 transition-[width,transform] duration-200 ease-out',
          'lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:flex',
          collapsed ? 'lg:w-[60px]' : 'lg:w-60',
          'fixed inset-y-0 left-0 w-60 h-screen',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Mobil kapatma butonu */}
        {mobileOpen && (
          <button
            onClick={closeMobileDrawer}
            className="lg:hidden absolute top-3 right-3 z-10 p-1.5 rounded-md text-foreground/60 hover:bg-secondary hover:text-foreground transition-colors"
            aria-label="Menüyü kapat"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Logo */}
        <Link
          href="/"
          className={cn(
            'flex items-center border-b border-border/40 hover:bg-secondary/40 transition-colors flex-shrink-0',
            collapsed ? 'justify-center px-2 py-4' : 'gap-3 px-5 py-5'
          )}
          title={collapsed ? 'Fizibilite Platformu' : undefined}
        >
          <BrandMark className="h-10 w-10 flex-shrink-0 drop-shadow-sm" />
          {!collapsed && (
            <div className="min-w-0">
              <div className="font-bold text-sm leading-tight whitespace-nowrap">
                Fizibilite <span className="text-solar">Platformu</span>
              </div>
            </div>
          )}
        </Link>

        {/* Primary nav */}
        <nav className={cn('flex-1 py-2 overflow-y-auto overflow-x-hidden', collapsed ? 'px-2' : 'px-2.5')}>
          {!collapsed && (
            <div className="px-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Ana Menü
            </div>
          )}
          {NAV.map((item) => (
            <SidebarLink key={item.href} item={item} pathname={pathname} collapsed={collapsed} />
          ))}

          {/* Destek */}
          {!collapsed && (
            <div className="px-2 pt-4 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Destek
            </div>
          )}
          {collapsed && <div className="my-2 border-t border-border/40 mx-1" />}
          {SUPPORT_NAV.map((item) => (
            <SidebarLink key={item.href} item={item} pathname={pathname} collapsed={collapsed} />
          ))}

          {/* Yönetim */}
          {!collapsed && (
            <div className="px-2 pt-4 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Yönetim
            </div>
          )}
          {collapsed && <div className="my-2 border-t border-border/40 mx-1" />}
          {ADMIN_NAV.map((item) => (
            <SidebarLink key={item.href} item={item} pathname={pathname} collapsed={collapsed} />
          ))}
        </nav>

        {/* Footer */}
        <div className={cn('border-t border-border/40 flex-shrink-0', collapsed ? 'p-2' : 'px-3 py-3 space-y-2')}>
          <SessionBox collapsed={collapsed} />
          <div className={cn('flex items-center', collapsed ? 'flex-col gap-1' : 'gap-1.5')}>
            <LocaleToggle />
            <ThemeToggle />
          </div>
          {!collapsed && (
            <div className="text-[10px] text-muted-foreground px-2">
              v0.3.0 · Karar 14531
            </div>
          )}
        </div>

        {/* Desktop daralt/genişlet toggle */}
        <button
          type="button"
          onClick={toggleSidebar}
          className="hidden lg:flex absolute -right-3 top-20 h-6 w-6 items-center justify-center rounded-full border border-border bg-card shadow-soft text-foreground/60 hover:text-foreground hover:bg-secondary transition-colors z-10"
          aria-label={collapsed ? 'Sidebarı genişlet' : 'Sidebarı daralt'}
          title={collapsed ? 'Genişlet' : 'Daralt'}
        >
          {collapsed ? <ChevronsRight className="h-3 w-3" /> : <ChevronsLeft className="h-3 w-3" />}
        </button>
      </aside>
    </>
  );
}

/** Oturumdaki kullanıcı + çıkış butonu */
function SessionBox({ collapsed }: { collapsed: boolean }) {
  const session = useSession();
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  if (!session) return null;
  const onLogout = () => {
    logout();
    router.replace('/login');
  };
  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onLogout}
        className="mb-1 flex w-full justify-center rounded-md py-2 text-foreground/60 hover:bg-secondary hover:text-destructive transition-colors"
        title={`Çıkış yap (${session.email})`}
        aria-label="Çıkış yap"
      >
        <LogOut className="h-3.5 w-3.5" />
      </button>
    );
  }
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 rounded-md bg-secondary/50 px-2 py-1.5">
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
          {session.fullName.charAt(0).toLocaleUpperCase('tr')}
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-[12px] font-semibold">{session.fullName}</div>
          <div className="truncate text-[10.5px] text-muted-foreground">{session.email}</div>
        </div>
      </div>
      <button
        type="button"
        onClick={onLogout}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-border/70 px-2.5 py-1.5 text-[12.5px] font-semibold text-foreground/75 transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
      >
        <LogOut className="h-3.5 w-3.5" />
        Çıkış Yap
      </button>
    </div>
  );
}

/** Tek nav linki — desktop geniş + dar + mobil drawer 3 modunda da çalışır. */
function SidebarLink({
  item,
  pathname,
  collapsed,
}: {
  item: NavItem;
  pathname: string;
  collapsed: boolean;
}) {
  const active = item.match ? item.match(pathname) : pathname === item.href;
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        'group relative flex items-center rounded-md text-[13px] transition-colors',
        collapsed ? 'justify-center px-0 py-2' : 'gap-2.5 px-2.5 py-1.5',
        active
          ? 'bg-primary/10 text-primary font-semibold'
          : 'text-foreground/70 hover:bg-secondary hover:text-foreground',
        !collapsed && active && 'border-l-2 border-l-primary'
      )}
      title={collapsed ? item.label : undefined}
    >
      <Icon className={cn('h-3.5 w-3.5 flex-shrink-0', active && 'text-primary')} />
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {active && <ChevronRight className="h-3 w-3 flex-shrink-0" />}
        </>
      )}
      {collapsed && (
        <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 rounded-md bg-foreground text-background text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
          {item.label}
        </span>
      )}
    </Link>
  );
}

/** Mobil/dar ekran için üst nav — sidebar gizliyken hamburger açar */
export function MobileTopNav() {
  const openMobileDrawer = useStore((s) => s.openMobileDrawer);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  return (
    <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border/60 bg-background sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={openMobileDrawer}
          className="p-1.5 -ml-1 rounded-md text-foreground/70 hover:bg-secondary hover:text-foreground transition-colors"
          aria-label="Menüyü aç"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/" className="flex items-center gap-2 min-w-0">
          <BrandMark className="h-8 w-8 flex-shrink-0" />
          <span className="font-bold text-sm truncate">
            Fizibilite <span className="text-solar">Platformu</span>
          </span>
        </Link>
      </div>
      <div className="flex items-center gap-1">
        <LocaleToggle />
        <ThemeToggle />
        <button
          type="button"
          onClick={() => {
            logout();
            router.replace('/login');
          }}
          className="p-1.5 rounded-md text-foreground/70 hover:bg-destructive/10 hover:text-destructive transition-colors"
          aria-label="Çıkış yap"
          title="Çıkış yap"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
