'use client';

import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Zap, Activity, Battery as BatteryIcon, Table2,
  Receipt, DollarSign, Droplet, ShieldCheck, Grid3x3, FlaskConical, TrendingDown, Leaf, FileCheck,
} from 'lucide-react';

interface SectionDef {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
  group?: 'analytics' | 'financial' | 'risk' | 'reports';
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

const GROUP_LABELS: Record<string, string> = {
  analytics: 'Enerji & Mahsuplaşma',
  financial: 'Finansal Tablolar',
  risk: 'Risk & Senaryolar',
  reports: 'Raporlar',
};

export function ProjectSubSidebar({ active, onChange }: { active: string; onChange: (id: string) => void }) {
  const groups: Record<string, SectionDef[]> = {};
  for (const s of SECTIONS) {
    const g = s.group ?? 'analytics';
    if (!groups[g]) groups[g] = [];
    groups[g].push(s);
  }

  return (
    <nav className="w-56 flex-shrink-0 space-y-4 sticky top-4 self-start max-h-[calc(100vh-2rem)] overflow-y-auto pr-1">
      {Object.entries(groups).map(([g, items]) => (
        <div key={g} className="space-y-0.5">
          <div className="px-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{GROUP_LABELS[g]}</div>
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
                <Icon className={cn('h-3.5 w-3.5 flex-shrink-0', isActive && 'text-primary')} />
                <span className="truncate">{s.label}</span>
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
