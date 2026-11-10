'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, FolderOpen, Plus, BookOpen, FlaskConical, BookText, HelpCircle,
  MessageCircle, Users, Share2, UserCircle2, Boxes,
  ChevronLeft, ChevronRight, ChevronDown, Menu, X, LogOut,
} from 'lucide-react';
import { BrandMark } from '@/components/layout/BrandMark';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LocaleToggle } from '@/components/LocaleToggle';
import { cn } from '@/lib/utils';
import { useStore } from '@/lib/admin-store';
import { ROLE_LABELS, initials, useAuthStore, useSession } from '@/lib/auth-store';
import { useRequestLeave } from '@/lib/unsaved-changes';

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  /** Varsayılan: href ile tam eşleşme veya alt yol */
  match?: (path: string) => boolean;
}

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Ana Menü',
    items: [
      { href: '/', icon: LayoutDashboard, label: 'Dashboard', match: (p) => p === '/' },
      {
        href: '/projects',
        icon: FolderOpen,
        label: 'Projeler',
        match: (p) => p === '/projects' || (p.startsWith('/projects/') && !p.startsWith('/projects/new')),
      },
      { href: '/projects/new', icon: Plus, label: 'Yeni Proje', match: (p) => p.startsWith('/projects/new') },
    ],
  },
  {
    label: 'Yönetim',
    items: [
      { href: '/admin/users', icon: Users, label: 'Kullanıcılar' },
      { href: '/admin/share', icon: Share2, label: 'Paylaşım Linkleri' },
      { href: '/admin/account', icon: UserCircle2, label: 'Hesabım' },
    ],
  },
  {
    label: 'Destek',
    items: [
      { href: '/about/netting-methodology', icon: BookOpen, label: 'Mahsuplaşma 101' },
      { href: '/about/netting-comparison', icon: FlaskConical, label: 'Saatlik vs Aylık' },
      { href: '/admin/financial-terms', icon: BookText, label: 'Finansal Terimler' },
      { href: '/admin/how-it-works', icon: HelpCircle, label: 'Nasıl Çalışır' },
      { href: '/admin/contact', icon: MessageCircle, label: 'İletişime Geç' },
    ],
  },
  {
    label: 'Diğer Platformlar',
    items: [{ href: '/admin/platforms', icon: Boxes, label: 'Diğer Platformlar' }],
  },
];

const W_OPEN = '14rem';
const W_COLLAPSED = '4rem';

/** Üst bar + sol sidebar (masaüstünde sabit, mobilde drawer). */
export function AppSidebar() {
  const pathname = usePathname();
  const collapsed = useStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const mobileOpen = useStore((s) => s.mobileDrawerOpen);
  const openMobile = useStore((s) => s.openMobileDrawer);
  const closeMobile = useStore((s) => s.closeMobileDrawer);

  // İçerik alanının sol boşluğu (.sidebar-aware) bu değişkeni kullanır
  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-w', collapsed ? W_COLLAPSED : W_OPEN);
  }, [collapsed]);

  // Rota değişince mobil menüyü kapat
  useEffect(() => {
    closeMobile();
  }, [pathname, closeMobile]);

  // Mobil menü açıkken: ESC ile kapat + sayfa kaymasın
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeMobile();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [mobileOpen, closeMobile]);

  return (
    <>
      {/* ÜST BAR — solda hesap, sağda dil/tema */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/90 px-3 backdrop-blur-md sm:px-4 lg:px-6">
        {/* Mobil: hamburger + marka */}
        <div className="contents lg:hidden">
          <button
            type="button"
            onClick={openMobile}
            aria-label="Menüyü aç"
            className="flex size-10 shrink-0 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-secondary"
          >
            <Menu className="size-5" />
          </button>
          <Link href="/" className="flex min-w-0 items-center gap-2">
            <BrandMark className="size-8 shrink-0" />
            <span className="truncate text-sm font-semibold">Fizibilite Platformu</span>
          </Link>
        </div>

        {/* Masaüstü: hesap menüsü sidebar'ın hemen sağında */}
        <div
          className="hidden min-w-0 items-center lg:flex"
          style={{ marginLeft: 'var(--sidebar-w, 14rem)', transition: 'margin-left 200ms' }}
        >
          <UserMenu />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1">
          <LocaleToggle />
          <ThemeToggle />
          <div className="lg:hidden">
            <UserMenu compact />
          </div>
        </div>
      </header>

      {/* Mobil arka plan */}
      {mobileOpen && (
        <button
          type="button"
          onClick={closeMobile}
          aria-label="Menüyü kapat"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-[transform,width] duration-200',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0 lg:[width:var(--sidebar-w,14rem)]'
        )}
      >
        <button
          type="button"
          onClick={closeMobile}
          aria-label="Menüyü kapat"
          className="absolute right-3 top-3 z-40 flex size-9 items-center justify-center rounded-lg text-sidebar-muted transition-colors hover:bg-sidebar-border/40 hover:text-white lg:hidden"
        >
          <X className="size-5" />
        </button>

        {/* Marka + daraltma */}
        <div
          className={cn(
            'flex h-16 items-center border-b border-sidebar-border',
            'max-lg:gap-3 max-lg:px-5',
            collapsed ? 'lg:justify-center lg:px-2' : 'lg:gap-3 lg:pl-5 lg:pr-2'
          )}
        >
          <Link
            href="/"
            className={cn(
              'flex min-w-0 items-center gap-3 rounded-lg transition-opacity hover:opacity-80',
              collapsed ? 'lg:flex-none lg:gap-0' : 'flex-1'
            )}
          >
            <BrandMark className="size-9 shrink-0" />
            <div className={cn('min-w-0 flex-1', collapsed && 'lg:hidden')}>
              <p className="text-sm font-semibold leading-tight tracking-tight text-white">Fizibilite Platformu</p>
            </div>
          </Link>
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Menüyü daralt"
            title="Menüyü daralt"
            className={cn(
              'hidden size-7 shrink-0 items-center justify-center rounded-md text-sidebar-muted transition-colors hover:bg-sidebar-border/50 hover:text-white lg:flex',
              collapsed && 'lg:hidden'
            )}
          >
            <ChevronLeft className="size-4" />
          </button>
        </div>
        {collapsed && (
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Menüyü aç"
            title="Menüyü aç"
            className="mx-auto mt-2 hidden size-7 shrink-0 items-center justify-center rounded-md text-sidebar-muted transition-colors hover:bg-sidebar-border/50 hover:text-white lg:flex"
          >
            <ChevronRight className="size-4" />
          </button>
        )}

        <nav className={cn('flex-1 overflow-y-auto py-4 max-lg:px-3', collapsed ? 'lg:px-2' : 'lg:px-3')}>
          {NAV_GROUPS.map((group, gi) => (
            <div key={group.label} className={gi > 0 ? 'mt-5' : ''}>
              <p
                className={cn(
                  'mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-muted/80',
                  collapsed && 'lg:hidden'
                )}
              >
                {group.label}
              </p>
              {collapsed && gi > 0 && <div className="mx-2 mb-2 hidden h-px bg-sidebar-border lg:block" />}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    active={item.match ? item.match(pathname) : pathname === item.href || pathname.startsWith(`${item.href}/`)}
                    collapsed={collapsed}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}

function NavLink({ item, active, collapsed }: { item: NavItem; active: boolean; collapsed: boolean }) {
  // Daraltılmışken hover tooltip — portal ile body'ye, sidebar overflow'una takılmasın
  const [tip, setTip] = useState<{ top: number; left: number } | null>(null);
  const Icon = item.icon;

  return (
    <>
      <Link
        href={item.href}
        onClick={() => setTip(null)}
        onMouseEnter={(e) => {
          if (!collapsed || window.innerWidth < 1024) return;
          const r = e.currentTarget.getBoundingClientRect();
          setTip({ top: r.top + r.height / 2, left: r.right + 10 });
        }}
        onMouseLeave={() => setTip(null)}
        className={cn(
          'group flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors',
          collapsed && 'lg:justify-center lg:gap-0 lg:px-2 lg:py-2',
          active
            ? 'bg-sidebar-accent/20 text-sidebar-accent-foreground'
            : 'text-sidebar-foreground hover:bg-sidebar-border/40 hover:text-sidebar-accent-foreground'
        )}
      >
        <Icon
          className={cn(
            'size-4 shrink-0 transition-colors',
            active ? 'text-sidebar-accent-foreground' : 'text-sidebar-muted group-hover:text-sidebar-foreground'
          )}
        />
        <span className={cn('truncate', collapsed && 'lg:hidden')}>{item.label}</span>
        {active && <span className={cn('ml-auto size-1.5 rounded-full bg-sidebar-accent-foreground', collapsed && 'lg:hidden')} />}
      </Link>
      {tip &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[100] hidden select-none nav-tooltip-enter lg:block"
            style={{ top: tip.top, left: tip.left }}
          >
            <div className="relative rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg ring-1 ring-white/10">
              {item.label}
              <span className="absolute right-full top-1/2 -translate-y-1/2 border-y-[5px] border-r-[5px] border-y-transparent border-r-slate-900" />
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

/** Hesap menüsü: avatar + ad + e-posta; açılır listede Hesabım ve Çıkış Yap. */
function UserMenu({ compact = false }: { compact?: boolean }) {
  const session = useSession();
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  const requestLeave = useRequestLeave();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  if (!session) return null;

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex min-w-0 items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-secondary"
        aria-label="Hesap menüsü"
      >
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar text-[11px] font-semibold text-white">
          {initials(session.fullName)}
        </div>
        {!compact && (
          <>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[13px] font-semibold text-foreground" data-no-i18n>{session.fullName}</p>
              <p className="truncate text-[11px] text-muted-foreground">{session.email}</p>
            </div>
            <ChevronDown className={cn('size-3.5 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
          </>
        )}
      </button>
      {open && (
        <div
          className={cn(
            'absolute top-full z-50 mt-1 w-56 overflow-hidden rounded-lg border bg-card shadow-lg',
            compact ? 'right-0' : 'left-0'
          )}
        >
          <div className="border-b bg-secondary/40 px-3 py-2">
            <p className="truncate text-sm font-semibold text-foreground" data-no-i18n>{session.fullName}</p>
            <p className="truncate text-xs text-muted-foreground">
              {session.email} · {ROLE_LABELS[session.role]}
            </p>
          </div>
          <Link
            href="/admin/account"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
          >
            <UserCircle2 className="size-4 text-muted-foreground" />
            Hesabım
          </Link>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              requestLeave(() => {
                logout();
                router.replace('/login');
              });
            }}
            className="flex w-full items-center gap-2 border-t px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
          >
            <LogOut className="size-4 text-muted-foreground" />
            Çıkış Yap
          </button>
        </div>
      )}
    </div>
  );
}
