import Link from 'next/link';
import { listProjects, IS_DEMO_MODE } from '@/lib/db';
import { autoSeedIfEmpty } from '@/lib/seed';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Plus, Info, FolderOpen, Building2, Home } from 'lucide-react';
import type { ProjectSummary } from '@/lib/models/types';
import { formatUsd, formatPct } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface Row { id: string; name: string; kind: string; summary: ProjectSummary; updatedAt: string; }

export default function ProjectsPage() {
  if (IS_DEMO_MODE) autoSeedIfEmpty();
  const rows: Row[] = listProjects()
    .filter((p) => p.resultsJson)
    .map((p) => ({ id: p.id, name: p.name, kind: p.projectType, summary: JSON.parse(p.resultsJson!) as ProjectSummary, updatedAt: p.updatedAt }));

  return (
    <div className="space-y-6">
      {IS_DEMO_MODE && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 text-amber-900 p-3 text-xs flex items-start gap-2">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div><strong>Demo modu:</strong> Vercel ortamında değişiklikler kalıcı değil; demo projeler her cold start&apos;ta yenilenir.</div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary shrink-0"><FolderOpen className="h-5 w-5" /></span>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight leading-tight">Projeler</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{rows.length > 0 ? `${rows.length} proje` : 'Henüz proje yok'}</p>
          </div>
        </div>
        <Button asChild><Link href="/projects/new"><Plus className="h-4 w-4 mr-1" /> Yeni Proje</Link></Button>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <h3 className="text-lg font-medium mb-1">Henüz proje yok</h3>
            <p className="text-sm text-muted-foreground mb-4">Utility veya C&amp;I / Mesken model türüyle yeni bir fizibilite başlatın.</p>
            <Button asChild><Link href="/projects/new"><Plus className="h-4 w-4 mr-1" /> Yeni Proje</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {rows.map((r) => <ProjectCard key={r.id} r={r} />)}
        </div>
      )}
    </div>
  );
}

function ProjectCard({ r }: { r: Row }) {
  const positive = r.summary.npvUsd > 0;
  const isUtil = r.kind === 'utility';
  return (
    <Link href={`/projects/${r.id}`}>
      <Card className="hover:shadow-lg hover:border-primary/40 transition-all h-full border-t-2 border-t-transparent hover:border-t-primary">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2 mb-1">
            <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${isUtil ? 'bg-navy/10 text-navy' : 'bg-eco/10 text-eco-dark'}`}>
              {isUtil ? <Building2 className="h-3 w-3" /> : <Home className="h-3 w-3" />}
              {isUtil ? 'Utility' : 'C&I / Mesken'}
            </span>
            <span className="text-[10px] text-muted-foreground">{new Date(r.updatedAt).toLocaleDateString('tr-TR')}</span>
          </div>
          <CardTitle className="text-base leading-snug">{r.name}</CardTitle>
          <CardDescription className="text-xs">{r.summary.capacityLabel}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <MiniKpi label="IRR" value={formatPct(r.summary.irrPct * 100)} accent={positive ? 'eco' : 'red'} />
            <MiniKpi label="NPV" value={formatUsd(r.summary.npvUsd, { compact: true })} accent={positive ? 'eco' : 'red'} />
            <MiniKpi label="Geri Ödeme" value={Number.isFinite(r.summary.paybackYears) ? `${r.summary.paybackYears.toFixed(1)}y` : '—'} />
            <MiniKpi label={isUtil ? 'LCOE' : 'Öz Tük.'} value={isUtil ? `${(r.summary.lcoe ?? 0).toFixed(1)} $` : formatPct((r.summary.selfConsumption ?? 0) * 100)} />
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[10px] text-muted-foreground">
            <span>CAPEX: {formatUsd(r.summary.capexUsd, { compact: true })}</span>
            {isUtil && r.summary.minDscr !== undefined && Number.isFinite(r.summary.minDscr) && <span>min DSCR: {r.summary.minDscr.toFixed(2)}</span>}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function MiniKpi({ label, value, accent }: { label: string; value: string; accent?: 'eco' | 'red' }) {
  const c = accent === 'eco' ? 'text-eco-dark' : accent === 'red' ? 'text-destructive' : 'text-foreground';
  return (
    <div className="bg-secondary/40 rounded p-2">
      <div className="text-[10px] text-muted-foreground whitespace-nowrap">{label}</div>
      <div className={`text-sm font-bold tabular-nums whitespace-nowrap ${c}`}>{value}</div>
    </div>
  );
}
