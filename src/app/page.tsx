import Link from 'next/link';
import { listProjects, getProject, upsertProject, nowIso, IS_DEMO_MODE } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowRight, FileText, Sun, Battery, FlaskConical, Info, TrendingUp, Zap, DollarSign,
  Activity, Plus, Sparkles, GitCompareArrows, LayoutTemplate, BarChart3,
} from 'lucide-react';
import { DEMO_PROJECTS, ensureCapexComputed } from '@/lib/defaults';
import { ProjectConfig, SimulationResult } from '@/lib/types';
import { formatTl, formatKwh, formatPct, formatUsd } from '@/lib/utils';
import { DisclaimerModal } from '@/components/dashboard/DisclaimerModal';

export const dynamic = 'force-dynamic';

const TYPE_LABELS: Record<string, string> = {
  rooftop_ci: 'Çatı C&I',
  ground_mount: 'Arazi GES',
  hybrid_bess: 'GES + BESS Hibrit',
};

const TYPE_COLORS: Record<string, string> = {
  rooftop_ci: 'bg-solar/10 text-solar-dark',
  ground_mount: 'bg-eco/10 text-eco-dark',
  hybrid_bess: 'bg-navy/10 text-navy',
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

  // Sadece simüle edilmiş projeler — KPI + tablo için
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
    totalCapacityKwp: withResults.reduce((a, p) => a + p.config.pv.peakPowerKwp, 0),
    totalAnnualGenKwh: withResults.reduce((a, p) => a + p.result.generationByYear[0].reduce((s, v) => s + v, 0), 0),
    totalCo2Tons: withResults.reduce((a, p) => a + p.result.finance.totalCo2Tons, 0),
  };
  const usdTry = withResults[0]?.config.fx.usdTry ?? 45.5;

  // Son 5 proje
  const recentProjects = [...withResults]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6 lg:space-y-8">
      {IS_DEMO_MODE && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 text-amber-900 p-3 text-xs flex items-start gap-2">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <strong>Demo modu:</strong> Bu Vercel ortamında yapılan değişiklikler kalıcı değildir.
            Demo projeler her cold start&apos;ta yenilenir. Üretim için Vercel KV / Postgres entegrasyonu önerilir.
          </div>
        </div>
      )}

      {/* ---------- KARŞILAMA ---------- */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="lg:col-span-2 rounded-2xl gradient-navy text-white p-6 lg:p-10 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
          <div className="relative">
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
                <Sparkles className="h-3 w-3" />
                EPDK 14531 · 04.04.2026 Tarifeleri
              </div>
              <DisclaimerModal />
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 leading-tight">
              Hoş geldin Ozan 👋
            </h1>
            <p className="text-white/80 text-sm lg:text-base mb-5 max-w-2xl leading-relaxed">
              Türkiye&apos;deki C&amp;I + arazi GES + BESS hibrit projeleri için banka kredi başvurusuna uygun fizibilite üret.
              {totals.total > 0 && ` Portföyünde ${totals.completed} tamamlanmış · ${totals.drafts} taslak proje var.`}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="lg" className="bg-white text-navy hover:bg-white/90">
                <Link href="/projects/new"><Plus className="h-4 w-4 mr-2" /> Yeni Proje</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-transparent border-white/30 text-white hover:bg-white/10">
                <Link href="/projects"><FileText className="h-4 w-4 mr-2" /> Projelerim</Link>
              </Button>
              {withResults.length >= 2 && (
                <Button asChild size="lg" variant="outline" className="bg-transparent border-white/30 text-white hover:bg-white/10">
                  <Link href="/projects/compare"><GitCompareArrows className="h-4 w-4 mr-2" /> Karşılaştır</Link>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Şablon shortcut */}
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-5 flex flex-col h-full">
            <div className="flex items-center gap-2 text-sm font-semibold mb-2">
              <LayoutTemplate className="h-4 w-4 text-primary" />
              {DEMO_PROJECTS.length} Hazır Şablon
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed flex-1">
              Çatı C&amp;I, arazi GES ve hibrit BESS şablonlarından klonla, parametreleri değiştir, anında simüle et.
            </p>
            <Link href="/templates" className="text-primary text-xs hover:underline inline-flex items-center gap-1 mt-3 self-start">
              Şablonları gör <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* ---------- ÖZELLİK REKLAM KARTLARI (üstte) ---------- */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3 lg:gap-4">
        <FeatureCard
          icon={Sun}
          accent="solar"
          title="8760 Saatlik Tam Simülasyon"
          desc="PVGIS-SARAH3 API ile gerçek meteorolojik veri, lokasyon bazlı saatlik üretim profili."
        />
        <FeatureCard
          icon={Battery}
          accent="eco"
          title="BESS Dispatch Motoru"
          desc="Öz tüketim + bedelli limit koruması + peak shaving + arbitraj. Augmentation planı dahil."
        />
        <FeatureCard
          icon={FlaskConical}
          accent="navy"
          title="Monte Carlo + Senaryo Matrisi"
          desc="1000+ iterasyon risk analizi + 150 senaryolu deterministik karşılaştırma."
        />
      </section>

      {/* ---------- AGGREGATE KPI BAR ---------- */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Portföy Özeti
            </h2>
            <p className="text-xs text-muted-foreground">
              {totals.completed > 0
                ? `${totals.completed} tamamlanmış proje üzerinden agrega`
                : 'Simülasyon çalıştırılınca metrikler doldurulacak'}
            </p>
          </div>
        </div>
        {totals.completed > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <AggKpi icon={DollarSign} label="Toplam CAPEX" value={formatTl(totals.totalCapexTl, { compact: true })} sub={formatUsd(totals.totalCapexTl / usdTry, { compact: true })} color="solar" />
            <AggKpi icon={TrendingUp} label="Toplam NPV" value={formatTl(totals.totalNpvTl, { compact: true })} sub={`${totals.totalNpvTl >= 0 ? '+' : ''}${formatUsd(totals.totalNpvTl / usdTry, { compact: true })}`} color="eco" />
            <AggKpi icon={Zap} label="Toplam Kapasite" value={`${totals.totalCapacityKwp.toLocaleString('tr-TR')} kWp`} sub={`Yıllık ${formatKwh(totals.totalAnnualGenKwh, { compact: true })}`} color="solar" />
            <AggKpi icon={Activity} label="Ort. IRR" value={formatPct(totals.avgIrr)} sub={`${totals.totalCo2Tons.toFixed(0)} ton CO₂/25y`} color="eco" />
          </div>
        ) : (
          <Card>
            <CardContent className="py-10 text-center">
              <BarChart3 className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground mb-3">Henüz simüle edilmiş proje yok.</p>
              <Button asChild size="sm">
                <Link href="/projects/new"><Plus className="h-4 w-4 mr-1" /> İlk Projeni Aç</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </section>

      {/* ---------- SON PROJELER (TABLO) ---------- */}
      {recentProjects.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Son Projeler</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/projects" className="text-primary">Tümünü Gör <ArrowRight className="h-3 w-3 ml-1" /></Link>
            </Button>
          </div>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-2.5 text-left font-semibold">Proje</th>
                    <th className="px-3 py-2.5 text-left font-semibold hidden sm:table-cell">Tip</th>
                    <th className="px-3 py-2.5 text-right font-semibold hidden md:table-cell">Güç</th>
                    <th className="px-3 py-2.5 text-right font-semibold">IRR</th>
                    <th className="px-3 py-2.5 text-right font-semibold">NPV</th>
                    <th className="px-3 py-2.5 text-right font-semibold hidden md:table-cell">Payback</th>
                    <th className="px-3 py-2.5 text-right font-semibold hidden lg:table-cell">DSCR</th>
                    <th className="px-3 py-2.5 text-right font-semibold hidden xl:table-cell">Tarih</th>
                    <th className="px-3 py-2.5 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {recentProjects.map((p, i) => {
                    const positive = p.result.finance.npvTl > 0;
                    return (
                      <tr
                        key={p.id}
                        className={`border-b border-border/40 last:border-b-0 hover:bg-secondary/40 transition-colors ${i % 2 === 1 ? 'bg-secondary/15' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <Link href={`/projects/${p.id}`} className="font-semibold text-foreground hover:text-primary transition-colors block leading-tight">
                            {p.name}
                          </Link>
                          <div className="text-[10px] text-muted-foreground mt-0.5 sm:hidden">
                            {TYPE_LABELS[p.projectType] ?? p.projectType} · {p.config.pv.peakPowerKwp.toLocaleString('tr-TR')} kWp
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5 hidden sm:block">
                            {p.config.location.city ?? '—'}
                          </div>
                        </td>
                        <td className="px-3 py-3 hidden sm:table-cell">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${TYPE_COLORS[p.projectType] ?? 'bg-secondary'}`}>
                            {TYPE_LABELS[p.projectType] ?? p.projectType}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right text-xs tabular-nums hidden md:table-cell whitespace-nowrap">
                          {p.config.pv.peakPowerKwp.toLocaleString('tr-TR')} <span className="text-muted-foreground">kWp</span>
                        </td>
                        <td className={`px-3 py-3 text-right font-bold tabular-nums whitespace-nowrap ${positive ? 'text-eco-dark' : 'text-destructive'}`}>
                          {formatPct(p.result.finance.irrPct)}
                        </td>
                        <td className={`px-3 py-3 text-right font-bold tabular-nums whitespace-nowrap ${positive ? 'text-eco-dark' : 'text-destructive'}`}>
                          {formatTl(p.result.finance.npvTl, { compact: true })}
                        </td>
                        <td className="px-3 py-3 text-right text-xs tabular-nums hidden md:table-cell whitespace-nowrap">
                          {Number.isFinite(p.result.finance.fcfcPaybackYears) ? `${p.result.finance.fcfcPaybackYears.toFixed(1)}y` : '—'}
                        </td>
                        <td className="px-3 py-3 text-right text-xs tabular-nums hidden lg:table-cell whitespace-nowrap">
                          {p.result.finance.avgDscr.toFixed(2)}
                        </td>
                        <td className="px-3 py-3 text-right text-[11px] text-muted-foreground hidden xl:table-cell whitespace-nowrap">
                          {new Date(p.updatedAt).toLocaleDateString('tr-TR')}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <Link href={`/projects/${p.id}`} className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors" aria-label="Aç">
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
        </section>
      )}
    </div>
  );
}

function AggKpi({ icon: Icon, label, value, sub, color }: { icon: typeof DollarSign; label: string; value: string; sub: string; color: 'solar' | 'eco' | 'navy' }) {
  const colorClass = color === 'solar' ? 'gradient-solar' : color === 'eco' ? 'gradient-eco' : 'gradient-navy';
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className={`h-9 w-9 rounded-lg ${colorClass} flex items-center justify-center`}>
            <Icon className="h-4 w-4 text-white" />
          </div>
        </div>
        <div className="text-[11px] text-muted-foreground uppercase tracking-wider whitespace-nowrap">{label}</div>
        <div className="text-xl font-bold tabular-nums whitespace-nowrap overflow-hidden text-ellipsis">{value}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">{sub}</div>
      </CardContent>
    </Card>
  );
}

function FeatureCard({ icon: Icon, accent, title, desc }: { icon: typeof Sun; accent: 'solar' | 'eco' | 'navy'; title: string; desc: string }) {
  const colorClass = accent === 'solar' ? 'gradient-solar' : accent === 'eco' ? 'gradient-eco' : 'gradient-navy';
  return (
    <Card>
      <CardContent className="p-4">
        <div className={`h-10 w-10 rounded-lg ${colorClass} flex items-center justify-center mb-2`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="font-semibold text-sm leading-tight mb-1">{title}</div>
        <div className="text-xs text-muted-foreground leading-relaxed">{desc}</div>
      </CardContent>
    </Card>
  );
}
