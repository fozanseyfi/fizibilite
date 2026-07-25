'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sun, LayoutDashboard, FolderPlus, BookOpen, FlaskConical,
  ChevronRight, ChevronsLeft, ChevronsRight,
  User, Users, History, Share2, HelpCircle, MessageSquare, Boxes, X, Menu, Plus, BookText,
} from 'lucide-react';
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
          <div className="h-10 w-10 rounded-xl gradient-solar flex items-center justify-center shadow-sm flex-shrink-0">
            <Sun className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="font-bold text-sm leading-tight whitespace-nowrap">
                Fizibilite <span className="text-solar">Platformu</span>
              </div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                EPDK 14531
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
          <div className="h-8 w-8 rounded-lg gradient-solar flex items-center justify-center flex-shrink-0">
            <Sun className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-sm truncate">
            Fizibilite <span className="text-solar">Platformu</span>
          </span>
        </Link>
      </div>
      <div className="flex items-center gap-1">
        <LocaleToggle />
        <ThemeToggle />
      </div>
    </div>
  );
}
