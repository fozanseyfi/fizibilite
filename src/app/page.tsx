import Link from 'next/link';
import { listProjects, upsertProject, nowIso, IS_DEMO_MODE } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, FileText, Sun, Battery, FlaskConical, Info, TrendingUp, Zap, DollarSign, Activity, Plus, Sparkles, GitCompareArrows } from 'lucide-react';
import { DEMO_PROJECTS, ensureCapexComputed } from '@/lib/defaults';
import { ProjectConfig, SimulationResult } from '@/lib/types';
import { formatTl, formatKwh, formatPct, formatUsd } from '@/lib/utils';
import { getProject } from '@/lib/db';

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

export default function HomePage() {
  if (IS_DEMO_MODE) autoSeedIfEmpty();
  const projects = listProjects();
  const hasProjects = projects.length > 0;

  // Aggregate KPIs (sadece simüle edilmiş projeler)
  const withResults = projects
    .map((p) => {
      const full = getProject(p.id);
      if (!full?.resultsJson) return null;
      const config = JSON.parse(full.configJson) as ProjectConfig;
      const result = JSON.parse(full.resultsJson) as SimulationResult;
      return { id: p.id, name: p.name, projectType: p.projectType, config, result, updatedAt: p.updatedAt, status: p.status };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const totals = {
    completed: withResults.length,
    drafts: projects.length - withResults.length,
    totalCapexTl: withResults.reduce((a, p) => a + p.result.finance.totalCapexTl, 0),
    totalNpvTl: withResults.reduce((a, p) => a + p.result.finance.npvTl, 0),
    avgIrr: withResults.length > 0 ? withResults.reduce((a, p) => a + p.result.finance.irrPct, 0) / withResults.length : 0,
    totalCapacityKwp: withResults.reduce((a, p) => a + p.config.pv.peakPowerKwp, 0),
    totalAnnualGenKwh: withResults.reduce((a, p) => a + p.result.generationByYear[0].reduce((s, v) => s + v, 0), 0),
    totalCo2Tons: withResults.reduce((a, p) => a + p.result.finance.totalCo2Tons, 0),
  };
  const usdTry = withResults[0]?.config.fx.usdTry ?? 45.5;

  return (
    <div className="space-y-8">
      {IS_DEMO_MODE && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 text-amber-900 p-3 text-xs flex items-start gap-2">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <strong>Demo modu:</strong> Bu Vercel ortamında yapılan değişiklikler kalıcı değildir.
            Demo projeler her cold start&apos;ta yenilenir. Üretim için Vercel KV / Postgres entegrasyonu önerilir.
          </div>
        </div>
      )}

      {/* Karşılama */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl gradient-navy text-white p-7 lg:p-10 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium mb-4 backdrop-blur">
              <Sparkles className="h-3 w-3" />
              EPDK 14531 · 04.04.2026 Tarifeleri
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold mb-3 leading-tight">
              Hoş geldin Ozan 👋
            </h1>
            <p className="text-white/80 text-sm lg:text-base mb-5 max-w-2xl">
              Türkiye&apos;deki C&amp;I + arazi GES + BESS hibrit projeleri için banka kredi başvurusuna uygun fizibilite üret.
              {hasProjects && ` Şu an portföyünde ${withResults.length} tamamlanmış · ${totals.drafts} taslak proje var.`}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="lg" className="bg-white text-navy hover:bg-white/90">
                <Link href="/projects/new"><Plus className="h-4 w-4 mr-2" /> Yeni Proje</Link>
              </Button>
              {withResults.length >= 2 && (
                <Button asChild size="lg" variant="outline" className="bg-transparent border-white/30 text-white hover:bg-white/10">
                  <Link href="/projects/compare"><GitCompareArrows className="h-4 w-4 mr-2" /> Senaryoları Karşılaştır</Link>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Hızlı eğitim kartı */}
        <Card className="border-l-4 border-l-amber-400">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              📚 Saatlik vs Aylık
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-2">
            <p className="text-muted-foreground leading-relaxed">
              EPDK Karar 14531 ile <strong className="text-foreground">aylık → saatlik</strong> mahsuplaşma değişti.
              C&amp;I yatırımcı için yıllık gelir %20-35 azaldı.
            </p>
            <Link href="/about/netting-comparison" className="text-primary text-xs hover:underline inline-flex items-center gap-1">
              Detaylı karşılaştırma → <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Aggregate KPI bar — sadece simüle edilmiş projeler varsa */}
      {totals.completed > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-semibold">Portföy Özeti</h2>
              <p className="text-xs text-muted-foreground">{totals.completed} tamamlanmış proje üzerinden agrega</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <AggKpi icon={DollarSign} label="Toplam CAPEX" value={formatTl(totals.totalCapexTl, { compact: true })} sub={formatUsd(totals.totalCapexTl / usdTry, { compact: true })} color="solar" />
            <AggKpi icon={TrendingUp} label="Toplam NPV" value={formatTl(totals.totalNpvTl, { compact: true })} sub={`${totals.totalNpvTl >= 0 ? '+' : ''}${formatUsd(totals.totalNpvTl / usdTry, { compact: true })}`} color="eco" />
            <AggKpi icon={Zap} label="Toplam Kapasite" value={`${totals.totalCapacityKwp.toLocaleString('tr-TR')} kWp`} sub={`Yıllık ${formatKwh(totals.totalAnnualGenKwh, { compact: true })}`} color="solar" />
            <AggKpi icon={Activity} label="Ort. IRR" value={formatPct(totals.avgIrr)} sub={`${totals.totalCo2Tons.toFixed(0)} ton CO₂/25y`} color="eco" />
          </div>
        </section>
      )}

      {/* Projeler */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Projeler</h2>
            <p className="text-sm text-muted-foreground">{projects.length} proje · {totals.completed} tamamlandı · {totals.drafts} taslak</p>
          </div>
          <div className="flex gap-2">
            {!hasProjects && (
              <form action="/api/seed" method="POST">
                <Button type="submit" variant="outline">Demo projeleri ekle</Button>
              </form>
            )}
            <Button asChild>
              <Link href="/projects/new"><Plus className="h-4 w-4 mr-1" /> Yeni</Link>
            </Button>
          </div>
        </div>

        {!hasProjects ? (
          <Card>
            <CardContent className="py-16 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="text-lg font-medium mb-1">Henüz proje yok</h3>
              <p className="text-sm text-muted-foreground mb-4">{DEMO_PROJECTS.length} hazır demo projesi yükleyip başlayabilirsin.</p>
              <form action="/api/seed" method="POST">
                <Button type="submit">Demo Projeleri Yükle</Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {withResults.map((p) => <ProjectCard key={p.id} p={p} usdTry={usdTry} />)}
            {projects
              .filter((p) => !withResults.find((wr) => wr.id === p.id))
              .map((p) => (
                <DraftCard key={p.id} project={p} />
              ))}
          </div>
        )}
      </section>

      {/* Capability cards (alt) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FeatureCard icon={Sun} accent="solar" title="8760 Saatlik Tam Simülasyon" desc="PVGIS-SARAH3 API ile gerçek meteorolojik veri, lokasyon bazlı üretim profili." />
        <FeatureCard icon={Battery} accent="eco" title="BESS Dispatch Motoru" desc="Öz tüketim + bedelli limit koruması + peak shaving + arbitraj. Augmentation planı." />
        <FeatureCard icon={FlaskConical} accent="navy" title="Monte Carlo + Senaryo Matrisi" desc="1000+ iterasyon risk analizi + 150 senaryolu deterministik karşılaştırma." />
      </section>
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

function ProjectCard({ p, usdTry }: { p: { id: string; name: string; projectType: string; config: ProjectConfig; result: SimulationResult; updatedAt: string }; usdTry: number }) {
  const positive = p.result.finance.npvTl > 0;
  return (
    <Link href={`/projects/${p.id}`}>
      <Card className="hover:shadow-lg hover:border-primary/40 transition-all h-full border-t-2 border-t-transparent hover:border-t-primary">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2 mb-1">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[p.projectType] ?? 'bg-secondary'}`}>
              {TYPE_LABELS[p.projectType] ?? p.projectType}
            </span>
            <span className="text-[10px] text-muted-foreground">{new Date(p.updatedAt).toLocaleDateString('tr-TR')}</span>
          </div>
          <CardTitle className="text-base leading-snug">{p.name}</CardTitle>
          <CardDescription className="text-xs">
            {p.config.location.city ?? ''} · {p.config.pv.peakPowerKwp.toLocaleString('tr-TR')} kWp
            {p.config.battery.enabled && ` + ${p.config.battery.nominalCapacityKwh.toLocaleString('tr-TR')} kWh BESS`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <MiniKpi label="IRR" value={formatPct(p.result.finance.irrPct)} accent={positive ? 'eco' : 'red'} />
            <MiniKpi label="NPV" value={formatTl(p.result.finance.npvTl, { compact: true })} accent={positive ? 'eco' : 'red'} />
            <MiniKpi label="Geri Ödeme" value={Number.isFinite(p.result.finance.fcfcPaybackYears) ? `${p.result.finance.fcfcPaybackYears.toFixed(1)}y` : '—'} />
            <MiniKpi label="LCOE" value={`${(p.result.finance.lcoeTlKwh ?? 0).toFixed(2)} ₺`} />
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[10px] text-muted-foreground">
            <span>CAPEX: {formatTl(p.result.finance.totalCapexTl, { compact: true })}</span>
            <span>DSCR ort: {p.result.finance.avgDscr.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function MiniKpi({ label, value, accent }: { label: string; value: string; accent?: 'eco' | 'red' }) {
  const valColor = accent === 'eco' ? 'text-eco-dark' : accent === 'red' ? 'text-destructive' : 'text-foreground';
  return (
    <div className="bg-secondary/40 rounded p-2">
      <div className="text-[10px] text-muted-foreground whitespace-nowrap">{label}</div>
      <div className={`text-sm font-bold tabular-nums whitespace-nowrap ${valColor}`}>{value}</div>
    </div>
  );
}

function DraftCard({ project }: { project: ReturnType<typeof listProjects>[number] }) {
  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="hover:border-primary/40 transition-all h-full border-dashed">
        <CardHeader>
          <div className="flex items-start justify-between gap-2 mb-1">
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-secondary text-muted-foreground">
              Taslak — simüle edilmedi
            </span>
            <span className="text-[10px] text-muted-foreground">{new Date(project.updatedAt).toLocaleDateString('tr-TR')}</span>
          </div>
          <CardTitle className="text-base">{project.name}</CardTitle>
          <CardDescription className="text-xs">{project.description || '—'}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button size="sm" variant="outline" className="w-full">Simülasyonu Başlat →</Button>
        </CardContent>
      </Card>
    </Link>
  );
}

function FeatureCard({ icon: Icon, accent, title, desc }: { icon: typeof Sun; accent: 'solar' | 'eco' | 'navy'; title: string; desc: string }) {
  const colorClass = accent === 'solar' ? 'gradient-solar' : accent === 'eco' ? 'gradient-eco' : 'gradient-navy';
  return (
    <Card>
      <CardHeader>
        <div className={`h-10 w-10 rounded-lg ${colorClass} flex items-center justify-center mb-2`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription className="text-xs">{desc}</CardDescription>
      </CardHeader>
    </Card>
  );
}
