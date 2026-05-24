'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sun, LayoutDashboard, FolderPlus, GitCompareArrows, BookOpen, FlaskConical, ChevronRight } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LocaleToggle } from '@/components/LocaleToggle';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  match?: (path: string) => boolean;
}

const NAV: NavItem[] = [
  { href: '/', label: 'Projeler', icon: LayoutDashboard, match: (p) => p === '/' },
  { href: '/projects/new', label: 'Yeni Proje', icon: FolderPlus, match: (p) => p === '/projects/new' },
  { href: '/projects/compare', label: 'Karşılaştır', icon: GitCompareArrows, match: (p) => p.startsWith('/projects/compare') },
  { href: '/about', label: 'EPDK & Metodoloji', icon: BookOpen, match: (p) => p.startsWith('/about') },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-60 bg-card border-r border-border/60 sticky top-0 h-screen z-30">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-3 px-5 py-5 border-b border-border/40 hover:bg-secondary/40 transition-colors">
        <div className="h-10 w-10 rounded-xl gradient-solar flex items-center justify-center shadow-sm flex-shrink-0">
          <Sun className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0">
          <div className="font-bold text-sm leading-tight whitespace-nowrap">GES-Fizibilite <span className="text-solar">Pro</span></div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider whitespace-nowrap">EPDK 14531</div>
        </div>
      </Link>

      {/* Primary nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <div className="px-2 pb-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Ana Menü</div>
        {NAV.map((item) => {
          const active = item.match ? item.match(pathname) : pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors',
                active
                  ? 'bg-primary/10 text-primary font-semibold border-l-2 border-l-primary'
                  : 'text-foreground/70 hover:bg-secondary hover:text-foreground'
              )}
            >
              <Icon className={cn('h-4 w-4', active && 'text-primary')} />
              {item.label}
              {active && <ChevronRight className="h-3 w-3 ml-auto" />}
            </Link>
          );
        })}

        {/* Secondary */}
        <div className="px-2 pt-6 pb-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Eğitim</div>
        <Link
          href="/about/netting-comparison"
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors',
            pathname === '/about/netting-comparison'
              ? 'bg-primary/10 text-primary font-semibold border-l-2 border-l-primary'
              : 'text-foreground/70 hover:bg-secondary hover:text-foreground'
          )}
        >
          <FlaskConical className="h-4 w-4" />
          <span className="truncate">Saatlik vs Aylık</span>
        </Link>
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-border/40 space-y-2">
        <div className="flex items-center gap-1.5">
          <LocaleToggle />
          <ThemeToggle />
        </div>
        <div className="text-[10px] text-muted-foreground px-2">
          v0.2.0 · Karar 14531
        </div>
      </div>
    </aside>
  );
}

/** Mobil/dar ekran için üst nav (sidebar gizli olduğunda) */
export function MobileTopNav() {
  const pathname = usePathname();
  return (
    <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border/60 bg-background sticky top-0 z-30">
      <Link href="/" className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg gradient-solar flex items-center justify-center">
          <Sun className="h-4 w-4 text-white" />
        </div>
        <span className="font-bold text-sm">GES-Fizibilite <span className="text-solar">Pro</span></span>
      </Link>
      <div className="flex items-center gap-1.5">
        {NAV.map((item) => {
          const active = item.match ? item.match(pathname) : pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn('p-2 rounded-md', active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary')}
              aria-label={item.label}
            >
              <Icon className="h-4 w-4" />
            </Link>
          );
        })}
        <LocaleToggle />
        <ThemeToggle />
      </div>
    </div>
  );
}
