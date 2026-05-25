'use client';

import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useStore } from '@/lib/admin-store';
import {
  LayoutDashboard, Zap, Activity, Battery as BatteryIcon, Table2,
  Receipt, DollarSign, Droplet, ShieldCheck, Grid3x3, FlaskConical, TrendingDown, Leaf, FileCheck,
  ChevronDown,
} from 'lucide-react';

interface SectionDef {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
  group: 'analytics' | 'financial' | 'risk' | 'reports';
}

const SECTIONS: SectionDef[] = [
  { id: 'overview', label: 'Genel Bakış', icon: LayoutDashboard, group: 'analytics' },
  { id: 'energy', label: 'Enerji', icon: Zap, group: 'analytics' },
  { id: 'netting', label: 'Mahsuplaşma', icon: Activity, group: 'analytics' },
  { id: 'hourly', label: 'Saatlik Veri', icon: Table2, group: 'analytics' },
  { id: 'battery', label: 'Batarya', icon: BatteryIcon, group: 'analytics' },
  { id: 'pnl', label: 'P&L (Kar/Zarar)', icon: Receipt, group: 'financial' },
  { id: 'cf', label: 'Cash Flow', icon: DollarSign, group: 'financial' },
  { id: 'waterfall', label: 'Cash Waterfall', icon: Droplet, group: 'financial' },
  { id: 'coverage', label: 'Borç Karşılama', icon: ShieldCheck, group: 'financial' },
  { id: 'scenarios', label: 'Senaryo Matrisi', icon: Grid3x3, group: 'risk' },
  { id: 'risk', label: 'Monte Carlo', icon: FlaskConical, group: 'risk' },
  { id: 'sensitivity', label: 'Duyarlılık', icon: TrendingDown, group: 'risk' },
  { id: 'esg', label: 'ESG Raporu', icon: Leaf, group: 'reports' },
  { id: 'assumptions', label: 'Varsayımlar', icon: FileCheck, group: 'reports' },
];

const GROUP_DEFS: { id: SectionDef['group']; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'analytics', label: 'Enerji & Mahsuplaşma', icon: Zap },
  { id: 'financial', label: 'Finansal Tablolar', icon: DollarSign },
  { id: 'risk', label: 'Risk & Senaryolar', icon: FlaskConical },
  { id: 'reports', label: 'Raporlar', icon: FileCheck },
];

const SECTIONS_BY_GROUP: Record<SectionDef['group'], SectionDef[]> = SECTIONS.reduce(
  (acc, s) => {
    (acc[s.group] ||= []).push(s);
    return acc;
  },
  {} as Record<SectionDef['group'], SectionDef[]>
);

export function ProjectSubSidebar({ active, onChange }: { active: string; onChange: (id: string) => void }) {
  const groupOpen = useStore((s) => s.projectGroupOpen);
  const toggleGroup = useStore((s) => s.toggleProjectGroup);
  const setGroupOpen = useStore((s) => s.setProjectGroupOpen);

  // Aktif sekmenin grubunu otomatik aç (kullanıcı manuel kapadıysa zorla açma — sadece kapalıyken aç)
  const activeSection = SECTIONS.find((s) => s.id === active);
  const activeGroup = activeSection?.group;
  useEffect(() => {
    if (activeGroup && !groupOpen[activeGroup]) {
      setGroupOpen(activeGroup, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroup]);

  const activeGroupLabel = activeGroup ? GROUP_DEFS.find((g) => g.id === activeGroup)?.label : '';

  return (
    <>
      {/* ---------- MASAÜSTÜ: sol dikey sub-sidebar ---------- */}
      <nav className="hidden md:flex w-56 flex-shrink-0 flex-col gap-1 sticky top-4 self-start max-h-[calc(100vh-2rem)] overflow-y-auto pr-1">
        {/* Sticky breadcrumb (aktif sekme özeti) */}
        {activeSection && (
          <div className="mb-2 px-3 py-2.5 rounded-lg border border-primary/20 bg-primary/5">
            <div className="text-[9px] uppercase tracking-[1.4px] font-bold text-muted-foreground">
              {activeGroupLabel}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <activeSection.icon className="h-3.5 w-3.5 text-primary flex-shrink-0" />
              <span className="text-[13px] font-bold text-foreground truncate">
                {activeSection.label}
              </span>
            </div>
          </div>
        )}

        {GROUP_DEFS.map((group) => {
          const items = SECTIONS_BY_GROUP[group.id] || [];
          const isOpen = groupOpen[group.id] ?? true;
          const hasActiveItem = items.some((s) => s.id === active);
          const GroupIcon = group.icon;
          return (
            <div key={group.id} className="space-y-0.5">
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[10px] uppercase tracking-wider font-bold transition-colors',
                  hasActiveItem
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                )}
                aria-expanded={isOpen}
              >
                <GroupIcon className="h-3 w-3 flex-shrink-0" />
                <span className="flex-1 text-left truncate">{group.label}</span>
                <ChevronDown
                  className={cn(
                    'h-3 w-3 flex-shrink-0 transition-transform',
                    isOpen ? 'rotate-0' : '-rotate-90'
                  )}
                />
              </button>

              {isOpen && (
                <div className="space-y-0.5">
                  {items.map((s) => {
                    const Icon = s.icon;
                    const isActive = active === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => onChange(s.id)}
                        className={cn(
                          'w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors text-left',
                          isActive
                            ? 'bg-primary/10 text-primary font-semibold border-l-2 border-l-primary'
                            : 'text-foreground/70 hover:bg-secondary hover:text-foreground'
                        )}
                      >
                        <Icon
                          className={cn(
                            'h-3.5 w-3.5 flex-shrink-0',
                            isActive && 'text-primary'
                          )}
                        />
                        <span className="truncate">{s.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* ---------- MOBİL: sticky select ---------- */}
      <div className="md:hidden sticky top-[57px] z-20 -mx-4 mb-3 px-4 py-2.5 bg-background/95 backdrop-blur border-b border-border/60">
        <label className="block text-[9px] uppercase tracking-[1.4px] font-bold text-muted-foreground mb-1">
          {activeGroupLabel || 'Sekme'}
        </label>
        <div className="relative">
          <select
            value={active}
            onChange={(e) => onChange(e.target.value)}
            className="w-full appearance-none rounded-md border border-border bg-card px-3 py-2 pr-9 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            {GROUP_DEFS.map((g) => (
              <optgroup key={g.id} label={g.label}>
                {SECTIONS_BY_GROUP[g.id]?.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <ChevronDown className="h-4 w-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
      </div>
    </>
  );
}
