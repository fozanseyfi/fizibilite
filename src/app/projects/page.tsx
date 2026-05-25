import Link from 'next/link';
import { listProjects, getProject, IS_DEMO_MODE } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Plus, Info, FolderOpen } from 'lucide-react';
import { ProjectConfig, SimulationResult } from '@/lib/types';
import { formatTl, formatPct } from '@/lib/utils';

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

export default function ProjectsPage() {
  const projects = listProjects();
  const hasProjects = projects.length > 0;

  const withResults = projects
    .map((p) => {
      const full = getProject(p.id);
      if (!full?.resultsJson) return null;
      const config = JSON.parse(full.configJson) as ProjectConfig;
      const result = JSON.parse(full.resultsJson) as SimulationResult;
      return { id: p.id, name: p.name, projectType: p.projectType, config, result, updatedAt: p.updatedAt, status: p.status };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const completedIds = new Set(withResults.map((p) => p.id));
  const drafts = projects.filter((p) => !completedIds.has(p.id));

  return (
    <div className="space-y-6">
      {IS_DEMO_MODE && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 text-amber-900 p-3 text-xs flex items-start gap-2">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <strong>Demo modu:</strong> Vercel ortamında değişiklikler kalıcı değil; demo projeler her cold start&apos;ta yenilenir.
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary shrink-0">
            <FolderOpen className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight leading-tight">Projeler</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {hasProjects
                ? `${projects.length} proje · ${withResults.length} tamamlandı · ${drafts.length} taslak`
                : 'Henüz proje yok'}
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href="/projects/new"><Plus className="h-4 w-4 mr-1" /> Yeni Proje</Link>
        </Button>
      </div>

      {/* Empty state */}
      {!hasProjects ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <h3 className="text-lg font-medium mb-1">Henüz proje yok</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Sıfırdan başlayın veya hazır şablonlardan birini klonlayın.
            </p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <Button asChild>
                <Link href="/projects/new"><Plus className="h-4 w-4 mr-1" /> Yeni Proje</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/templates">Şablonlardan Başla</Link>
              </Button>
              <form action="/api/seed" method="POST">
                <Button type="submit" variant="ghost">Demo Yükle</Button>
              </form>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {withResults.map((p) => <ProjectCard key={p.id} p={p} />)}
          {drafts.map((p) => <DraftCard key={p.id} project={p} />)}
        </div>
      )}
    </div>
  );
}

function ProjectCard({ p }: { p: { id: string; name: string; projectType: string; config: ProjectConfig; result: SimulationResult; updatedAt: string } }) {
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
