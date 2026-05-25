import Link from 'next/link';
import { listProjects, getProject, upsertProject, nowIso, IS_DEMO_MODE } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowRight, FileText, Sun, Battery, FlaskConical, Info, Plus, GitCompareArrows,
  Briefcase, Banknote, TrendingUp, Zap, Activity, Leaf, ShieldCheck,
} from 'lucide-react';
import { DEMO_PROJECTS, ensureCapexComputed } from '@/lib/defaults';
import { ProjectConfig, SimulationResult } from '@/lib/types';
import { formatTl, formatKwh, formatPct, formatUsd } from '@/lib/utils';
import { DisclaimerModal } from '@/components/dashboard/DisclaimerModal';

export const dynamic = 'force-dynamic';

const TYPE_LABELS: Record<string, string> = {
  rooftop_ci: 'Çatı C&I',
  ground_mount: 'Arazi GES',
  hybrid_bess: 'GES + BESS',
};

const TYPE_COLORS: Record<string, string> = {
  rooftop_ci: 'bg-solar/10 text-solar-dark border-solar/30',
  ground_mount: 'bg-eco/10 text-eco-dark border-eco/30',
  hybrid_bess: 'bg-navy/10 text-navy border-navy/30',
};

function autoSeedIfEmpty() {
  const existing = listProjects();
  if (existing.length > 0) return;
  for (const demo of DEMO_PROJECTS) {
    const config = ensureCapexComputed(demo.config);
    const now = nowIso();
    upsertProject({
      id: demo.id,
      name: config.name,
      description: config.description,
      projectType: config.projectType,
      status: 'draft',
      configJson: JSON.stringify(config),
      createdAt: now,
      updatedAt: now,
    });
  }
}

export default function DashboardPage() {
  if (IS_DEMO_MODE) autoSeedIfEmpty();
  const projects = listProjects();

  const withResults = projects
    .map((p) => {
      const full = getProject(p.id);
      if (!full?.resultsJson) return null;
      const config = JSON.parse(full.configJson) as ProjectConfig;
      const result = JSON.parse(full.resultsJson) as SimulationResult;
      return { id: p.id, name: p.name, projectType: p.projectType, config, result, updatedAt: p.updatedAt };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const totals = {
    completed: withResults.length,
    drafts: projects.length - withResults.length,
    total: projects.length,
    totalCapexTl: withResults.reduce((a, p) => a + p.result.finance.totalCapexTl, 0),
    totalNpvTl: withResults.reduce((a, p) => a + p.result.finance.npvTl, 0),
    avgIrr: withResults.length > 0 ? withResults.reduce((a, p) => a + p.result.finance.irrPct, 0) / withResults.length : 0,
    avgDscr: withResults.length > 0 ? withResults.reduce((a, p) => a + p.result.finance.avgDscr, 0) / withResults.length : 0,
    totalCapacityKwp: withResults.reduce((a, p) => a + p.config.pv.peakPowerKwp, 0),
    totalAnnualGenKwh: withResults.reduce((a, p) => a + p.result.generationByYear[0].reduce((s, v) => s + v, 0), 0),
    totalCo2Tons: withResults.reduce((a, p) => a + p.result.finance.totalCo2Tons, 0),
  };
  const usdTry = withResults[0]?.config.fx.usdTry ?? 45.5;

  const recentProjects = [...withResults]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const today = new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      {IS_DEMO_MODE && (
        <div className="rounded-lg border border-amber-300/60 bg-amber-50/60 text-amber-900 p-2.5 text-[11px] flex items-start gap-2">
          <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <div>
            <strong>Demo modu:</strong> Vercel ortamında değişiklikler kalıcı değildir; her cold start&apos;ta demo projeler yenilenir.
          </div>
        </div>
      )}

      {/* ---------- HEADER ---------- */}
      <header className="flex items-start justify-between gap-4 flex-wrap pb-4 border-b border-border/60">
        <div>
          <div className="text-[11px] uppercase tracking-[1.4px] font-semibold text-muted-foreground">
            {today}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">
            Hoş geldin, <span className="text-primary">Ozan</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totals.total > 0
              ? `Portföyde ${totals.total} proje · ${totals.completed} tamamlandı · ${totals.drafts} taslak`
              : 'Henüz proje yok — sıfırdan veya hazır şablonla başlayabilirsin'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DisclaimerModal />
          <Button asChild variant="outline" size="sm">
            <Link href="/projects"><FileText className="h-3.5 w-3.5 mr-1.5" /> Projelerim</Link>
          </Button>
          {withResults.length >= 2 && (
            <Button asChild variant="outline" size="sm">
              <Link href="/projects/compare"><GitCompareArrows className="h-3.5 w-3.5 mr-1.5" /> Karşılaştır</Link>
            </Button>
          )}
          <Button asChild size="sm">
            <Link href="/projects/new"><Plus className="h-3.5 w-3.5 mr-1.5" /> Yeni Proje</Link>
          </Button>
        </div>
      </header>

      {/* ---------- KPI GRID (clean professional) ---------- */}
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={Briefcase}
            label="Tamamlanan Proje"
            value={totals.completed.toString()}
            sub={totals.total > 0 ? `${totals.total} toplam · ${totals.drafts} taslak` : 'Henüz yok'}
          />
          <StatCard
            icon={Banknote}
            label="Toplam CAPEX"
            value={totals.completed > 0 ? formatTl(totals.totalCapexTl, { compact: true }) : '—'}
            sub={totals.completed > 0 ? `${formatUsd(totals.totalCapexTl / usdTry, { compact: true })} @ ₺${usdTry.toFixed(2)}` : 'Simülasyon bekleniyor'}
          />
          <StatCard
            icon={TrendingUp}
            label="Net NPV"
            value={totals.completed > 0 ? formatTl(totals.totalNpvTl, { compact: true }) : '—'}
            sub={totals.completed > 0 ? `${totals.totalNpvTl >= 0 ? '+' : ''}${formatUsd(totals.totalNpvTl / usdTry, { compact: true })}` : ''}
            valueTone={totals.completed > 0 ? (totals.totalNpvTl >= 0 ? 'positive' : 'negative') : undefined}
          />
          <StatCard
            icon={Activity}
            label="Ortalama IRR"
            value={totals.completed > 0 ? formatPct(totals.avgIrr) : '—'}
            sub={totals.completed > 0 ? `DSCR ort: ${totals.avgDscr.toFixed(2)}` : ''}
            valueTone={totals.completed > 0 ? (totals.avgIrr > 0.12 ? 'positive' : undefined) : undefined}
          />
        </div>

        {/* İkincil metrikler */}
        {totals.completed > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
            <StatCard
              icon={Zap}
              label="Toplam Kapasite"
              value={`${totals.totalCapacityKwp.toLocaleString('tr-TR')} kWp`}
              sub={`Yıllık üretim ${formatKwh(totals.totalAnnualGenKwh, { compact: true })}`}
              compact
            />
            <StatCard
              icon={Leaf}
              label="CO₂ Tasarrufu (25y)"
              value={`${totals.totalCo2Tons.toFixed(0)} ton`}
              sub={`≈ ${(totals.totalCo2Tons / 22).toFixed(0).toLocaleString()} ağaç eşdeğeri`}
              compact
            />
            <StatCard
              icon={ShieldCheck}
              label="EPDK Uyumu"
              value="14531"
              sub="Saatlik mahsuplaşma · 04.04.2026 tarifeleri"
              compact
            />
          </div>
        )}
      </section>

      {/* ---------- ÖZELLİK STRIP (kompakt tek satır) ---------- */}
      <section>
        <Card>
          <CardContent className="p-0">
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border/60">
              <FeatureRow
                icon={Sun}
                title="8760 Saatlik Tam Simülasyon"
                desc="PVGIS-SARAH3 ile lokasyon bazlı gerçek meteorolojik veri"
              />
              <FeatureRow
                icon={Battery}
                title="BESS Dispatch Motoru"
                desc="Öz tüketim · bedelli limit · peak shaving · arbitraj"
              />
              <FeatureRow
                icon={FlaskConical}
                title="Monte Carlo + Senaryo Matrisi"
                desc="1000+ iterasyon risk + 150 senaryo deterministik"
              />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ---------- SON PROJELER (tablo) ---------- */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-semibold">Son Projeler</h2>
            <p className="text-xs text-muted-foreground">En son güncellenen 5 simülasyon</p>
          </div>
          {recentProjects.length > 0 && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/projects" className="text-primary">Tümünü Gör <ArrowRight className="h-3 w-3 ml-1" /></Link>
            </Button>
          )}
        </div>

        {recentProjects.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                Simüle edilmiş proje yok. İlk fizibiliteni oluştur, sayılar burada toplansın.
              </p>
              <Button asChild size="sm">
                <Link href="/projects/new"><Plus className="h-4 w-4 mr-1" /> Yeni Proje</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/40 text-[10px] uppercase tracking-[1.2px] text-muted-foreground">
                    <th className="px-4 py-2.5 text-left font-semibold">Proje</th>
                    <th className="px-3 py-2.5 text-left font-semibold hidden sm:table-cell">Tip</th>
                    <th className="px-3 py-2.5 text-right font-semibold hidden md:table-cell">Güç</th>
                    <th className="px-3 py-2.5 text-right font-semibold">IRR</th>
                    <th className="px-3 py-2.5 text-right font-semibold">NPV</th>
                    <th className="px-3 py-2.5 text-right font-semibold hidden md:table-cell">Payback</th>
                    <th className="px-3 py-2.5 text-right font-semibold hidden lg:table-cell">DSCR</th>
                    <th className="px-3 py-2.5 text-right font-semibold hidden xl:table-cell">Güncellendi</th>
                    <th className="px-2 py-2.5 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {recentProjects.map((p) => {
                    const positive = p.result.finance.npvTl > 0;
                    return (
                      <tr key={p.id} className="border-b border-border/40 last:border-b-0 hover:bg-secondary/30 transition-colors group">
                        <td className="px-4 py-3">
                          <Link href={`/projects/${p.id}`} className="font-medium text-foreground group-hover:text-primary transition-colors block leading-tight">
                            {p.name}
                          </Link>
                          <div className="text-[11px] text-muted-foreground mt-0.5 sm:hidden">
                            {TYPE_LABELS[p.projectType] ?? p.projectType} · {p.config.pv.peakPowerKwp.toLocaleString('tr-TR')} kWp
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5 hidden sm:block">
                            {p.config.location.city ?? '—'}
                            {p.config.battery.enabled && ` · ${p.config.battery.nominalCapacityKwh.toLocaleString('tr-TR')} kWh BESS`}
                          </div>
                        </td>
                        <td className="px-3 py-3 hidden sm:table-cell">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap border ${TYPE_COLORS[p.projectType] ?? 'bg-secondary border-border'}`}>
                            {TYPE_LABELS[p.projectType] ?? p.projectType}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right text-xs tabular-nums hidden md:table-cell whitespace-nowrap text-muted-foreground">
                          {p.config.pv.peakPowerKwp.toLocaleString('tr-TR')} <span className="text-muted-foreground/60">kWp</span>
                        </td>
                        <td className={`px-3 py-3 text-right font-semibold tabular-nums whitespace-nowrap ${positive ? 'text-eco-dark' : 'text-destructive'}`}>
                          {formatPct(p.result.finance.irrPct)}
                        </td>
                        <td className={`px-3 py-3 text-right font-semibold tabular-nums whitespace-nowrap ${positive ? 'text-eco-dark' : 'text-destructive'}`}>
                          {formatTl(p.result.finance.npvTl, { compact: true })}
                        </td>
                        <td className="px-3 py-3 text-right text-xs tabular-nums hidden md:table-cell whitespace-nowrap text-muted-foreground">
                          {Number.isFinite(p.result.finance.fcfcPaybackYears) ? `${p.result.finance.fcfcPaybackYears.toFixed(1)}y` : '—'}
                        </td>
                        <td className="px-3 py-3 text-right text-xs tabular-nums hidden lg:table-cell whitespace-nowrap text-muted-foreground">
                          {p.result.finance.avgDscr.toFixed(2)}
                        </td>
                        <td className="px-3 py-3 text-right text-[11px] text-muted-foreground hidden xl:table-cell whitespace-nowrap">
                          {new Date(p.updatedAt).toLocaleDateString('tr-TR')}
                        </td>
                        <td className="px-2 py-3 text-right">
                          <Link href={`/projects/${p.id}`} className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground/60 hover:bg-primary/10 hover:text-primary transition-colors" aria-label="Aç">
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  valueTone,
  compact,
}: {
  icon: typeof Briefcase;
  label: string;
  value: string;
  sub?: string;
  valueTone?: 'positive' | 'negative';
  compact?: boolean;
}) {
  const valueColor =
    valueTone === 'positive' ? 'text-eco-dark' :
    valueTone === 'negative' ? 'text-destructive' : 'text-foreground';
  return (
    <div className={`group rounded-lg border border-border bg-card transition-colors hover:border-border ${compact ? 'p-3' : 'p-4'}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="text-[10px] uppercase tracking-[1.3px] font-semibold text-muted-foreground leading-tight">
          {label}
        </div>
        <Icon className={`flex-shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors ${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
      </div>
      <div className={`font-bold tabular-nums tracking-tight leading-none ${compact ? 'text-lg' : 'text-2xl'} ${valueColor}`}>
        {value}
      </div>
      {sub && (
        <div className={`text-muted-foreground mt-1.5 leading-tight ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
          {sub}
        </div>
      )}
    </div>
  );
}

function FeatureRow({ icon: Icon, title, desc }: { icon: typeof Sun; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 p-4">
      <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary flex-shrink-0">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <div className="font-semibold text-sm leading-tight">{title}</div>
        <div className="text-[11.5px] text-muted-foreground mt-1 leading-snug">{desc}</div>
      </div>
    </div>
  );
}
