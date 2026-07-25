import Link from 'next/link';
import { listProjects, IS_DEMO_MODE } from '@/lib/db';
import { autoSeedIfEmpty } from '@/lib/seed';
import { Button } from '@/components/ui/button';
import { ArrowRight, FileText, Plus, Building2, Home, Info } from 'lucide-react';
import type { ProjectSummary } from '@/lib/models/types';
import { formatUsd, formatPct } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface Row { id: string; name: string; kind: string; summary: ProjectSummary; updatedAt: string; }

const HURDLE = 0.12;

export default function DashboardPage() {
  if (IS_DEMO_MODE) autoSeedIfEmpty();
  const rows: Row[] = listProjects()
    .filter((p) => p.resultsJson)
    .map((p) => ({ id: p.id, name: p.name, kind: p.projectType, summary: JSON.parse(p.resultsJson!) as ProjectSummary, updatedAt: p.updatedAt }));

  const totalNpv = rows.reduce((a, r) => a + r.summary.npvUsd, 0);
  const totalCapex = rows.reduce((a, r) => a + r.summary.capexUsd, 0);
  const avgIrr = rows.length ? rows.reduce((a, r) => a + r.summary.irrPct, 0) / rows.length : 0;
  const utilityCount = rows.filter((r) => r.kind === 'utility').length;
  const ciCount = rows.filter((r) => r.kind === 'ci').length;
  const npvReturn = totalCapex > 0 ? (totalNpv / totalCapex) * 100 : 0;

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="space-y-4">
      {IS_DEMO_MODE && (
        <div className="rounded border border-amber-300/50 bg-amber-50/40 text-amber-900 px-3 py-2 text-[11px] flex items-start gap-2">
          <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <span><strong className="font-semibold">Demo modu.</strong> Vercel ortamında değişiklikler kalıcı değildir.</span>
        </div>
      )}

      {/* Hero */}
      <div className="relative rounded-lg overflow-hidden border border-navy/30 shadow-lg text-white" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 45%, #0c4a6e 100%)' }}>
        <div className="absolute inset-0 opacity-[0.08] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '22px 22px' }} />
        <div className="relative flex items-stretch divide-x divide-white/10 bg-white/[0.04] backdrop-blur text-[10px] uppercase tracking-[1.4px] font-semibold text-white/70 border-b border-white/10">
          <div className="flex-1 px-3.5 py-2 flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Portföy · Canlı</span>
          </div>
          <div className="px-3.5 py-2 hidden sm:flex items-center gap-3 font-mono normal-case text-[10px]"><span>{dateStr}</span></div>
          <div className="px-3.5 py-2 hidden md:flex items-center gap-1.5 normal-case text-[10px]"><span className="text-white/50">Reg.</span><span className="font-mono font-semibold">EPDK 14531</span></div>
        </div>
        <div className="relative grid lg:grid-cols-[1fr_auto] gap-6 px-5 sm:px-7 py-6 sm:py-8">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 border border-amber-400/30 px-2.5 py-0.5 text-[10px] uppercase tracking-[1.5px] font-bold text-amber-300">Hoş Geldiniz</div>
            <h1 className="text-[26px] sm:text-[32px] font-bold tracking-tight leading-none mt-2.5">Ozan Seyfi</h1>
            <div className="flex items-center gap-1.5 text-[12px] text-white/70 mt-2"><Building2 className="h-3 w-3" /><span>Kontrolmatik · Investment &amp; Project Finance</span></div>
            <div className="mt-5 pt-4 border-t border-white/10">
              <div className="text-[10px] uppercase tracking-[1.5px] font-bold text-white/60 mb-2.5">Portföy Özeti</div>
              <ul className="space-y-1.5 text-[13px] text-white/90">
                {rows.length > 0 ? (
                  <>
                    <li className="flex items-start gap-2.5"><span className="text-sky-400 mt-1 text-[8px]">●</span><span><b className="text-white">{rows.length}</b> proje — <b className="text-white">{utilityCount}</b> Utility, <b className="text-white">{ciCount}</b> C&amp;I/Mesken</span></li>
                    <li className="flex items-start gap-2.5"><span className={`mt-1 text-[8px] ${totalNpv >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>●</span><span>Toplam NPV <b className="text-white">{formatUsd(totalNpv, { compact: true })}</b> · NPV/CAPEX <b className="text-white">{npvReturn >= 0 ? '+' : ''}{npvReturn.toFixed(1)}%</b></span></li>
                    <li className="flex items-start gap-2.5"><span className={`mt-1 text-[8px] ${avgIrr >= HURDLE ? 'text-emerald-400' : 'text-amber-400'}`}>●</span><span>Ortalama IRR <b className="text-white">{formatPct(avgIrr * 100)}</b></span></li>
                  </>
                ) : (
                  <li className="text-white/70">Portföyde henüz proje yok. Utility veya C&amp;I model türüyle ilk fizibilitenizi başlatın.</li>
                )}
              </ul>
            </div>
          </div>
          <div className="flex lg:flex-col items-start gap-2 flex-wrap lg:min-w-[200px]">
            <Button asChild size="sm" className="w-full justify-center bg-amber-400 text-navy hover:bg-amber-300 font-semibold"><Link href="/projects/new"><Plus className="h-3.5 w-3.5 mr-1.5" /> Yeni Proje</Link></Button>
            <Button asChild variant="outline" size="sm" className="w-full justify-center bg-white/5 border-white/20 text-white hover:bg-white/10 hover:text-white"><Link href="/projects"><FileText className="h-3.5 w-3.5 mr-1.5" /> Tüm Projeler</Link></Button>
          </div>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile label="Kümülatif NPV" value={rows.length ? formatUsd(totalNpv, { compact: true }) : '—'} tone={totalNpv >= 0 ? 'good' : 'bad'} sub={rows.length ? `NPV/CAPEX ${npvReturn >= 0 ? '+' : ''}${npvReturn.toFixed(1)}%` : ''} />
        <Tile label="Ortalama IRR" value={rows.length ? formatPct(avgIrr * 100) : '—'} sub={rows.length ? `hurdle ${formatPct(HURDLE * 100)}` : ''} />
        <Tile label="Toplam CAPEX" value={rows.length ? formatUsd(totalCapex, { compact: true }) : '—'} sub={rows.length ? `${rows.length} proje` : ''} />
        <Tile label="Model Dağılımı" value={`${utilityCount} / ${ciCount}`} sub="Utility / C&I" />
      </div>

      {/* Pipeline */}
      <section>
        <div className="flex items-end justify-between pb-2 mb-3 border-b border-border/70">
          <h2 className="text-[11px] uppercase tracking-[1.5px] font-bold">Proje Pipeline</h2>
          {rows.length > 0 && <Link href="/projects" className="text-[11px] uppercase tracking-[1.2px] font-semibold text-primary hover:underline inline-flex items-center gap-1">Tümü <ArrowRight className="h-3 w-3" /></Link>}
        </div>
        {rows.length === 0 ? (
          <div className="border border-border rounded-md bg-card py-12 text-center">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground mb-3">Henüz proje yok.</p>
            <Button asChild size="sm"><Link href="/projects/new"><Plus className="h-4 w-4 mr-1" /> Yeni Proje</Link></Button>
          </div>
        ) : (
          <div className="border border-border rounded-md bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/40 text-[10px] uppercase tracking-[1.3px] text-muted-foreground">
                  <th className="px-3 py-2 text-left font-semibold">Proje</th>
                  <th className="px-2 py-2 text-left font-semibold">Tip</th>
                  <th className="px-3 py-2 text-right font-semibold hidden md:table-cell">Kapasite</th>
                  <th className="px-3 py-2 text-right font-semibold hidden lg:table-cell">CAPEX</th>
                  <th className="px-3 py-2 text-right font-semibold">IRR</th>
                  <th className="px-3 py-2 text-right font-semibold">NPV</th>
                  <th className="px-3 py-2 text-right font-semibold hidden md:table-cell">Payback</th>
                  <th className="px-2 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/40 last:border-b-0 hover:bg-secondary/30 group">
                    <td className="px-3 py-2.5"><Link href={`/projects/${r.id}`} className="font-medium group-hover:text-primary text-[13px]">{r.name}</Link><div className="text-[10.5px] text-muted-foreground">{r.summary.capacityLabel}</div></td>
                    <td className="px-2 py-2.5"><span className="inline-flex items-center gap-1 h-5 px-1.5 rounded text-[10px] font-mono font-semibold bg-secondary border border-border">{r.kind === 'utility' ? <Building2 className="h-2.5 w-2.5" /> : <Home className="h-2.5 w-2.5" />}{r.kind === 'utility' ? 'UTIL' : 'C&I'}</span></td>
                    <td className="px-3 py-2.5 text-right text-[12px] tabular-nums hidden md:table-cell">{r.summary.capacityLabel}</td>
                    <td className="px-3 py-2.5 text-right text-[12px] tabular-nums hidden lg:table-cell text-muted-foreground">{formatUsd(r.summary.capexUsd, { compact: true })}</td>
                    <td className={`px-3 py-2.5 text-right text-[12.5px] font-semibold tabular-nums ${r.summary.irrPct >= HURDLE ? 'text-eco-dark' : 'text-destructive'}`}>{formatPct(r.summary.irrPct * 100)}</td>
                    <td className={`px-3 py-2.5 text-right text-[12.5px] font-semibold tabular-nums ${r.summary.npvUsd >= 0 ? 'text-eco-dark' : 'text-destructive'}`}>{r.summary.npvUsd >= 0 ? '+' : ''}{formatUsd(r.summary.npvUsd, { compact: true })}</td>
                    <td className="px-3 py-2.5 text-right text-[11.5px] tabular-nums hidden md:table-cell text-muted-foreground">{Number.isFinite(r.summary.paybackYears) ? `${r.summary.paybackYears.toFixed(1)}y` : '—'}</td>
                    <td className="px-2 py-2.5 text-right"><Link href={`/projects/${r.id}`} className="inline-flex items-center justify-center h-6 w-6 rounded text-muted-foreground/60 hover:bg-primary/10 hover:text-primary"><ArrowRight className="h-3 w-3" /></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Tile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'good' | 'bad' }) {
  const color = tone === 'good' ? 'text-eco-dark' : tone === 'bad' ? 'text-destructive' : 'text-foreground';
  return (
    <div className="border border-border rounded-md bg-card px-4 py-3.5">
      <div className="text-[10px] uppercase tracking-[1.4px] font-bold text-muted-foreground">{label}</div>
      <div className={`mt-1.5 text-[26px] font-bold tabular-nums tracking-tight leading-none ${color}`}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-1.5">{sub}</div>}
    </div>
  );
}
