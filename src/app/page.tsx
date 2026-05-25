import Link from 'next/link';
import { listProjects, getProject, upsertProject, nowIso, IS_DEMO_MODE } from '@/lib/db';
import { Button } from '@/components/ui/button';
import {
  ArrowRight, FileText, Plus, GitCompareArrows, Building2, Info,
  CheckCircle2, AlertTriangle, Clock, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { DEMO_PROJECTS, ensureCapexComputed } from '@/lib/defaults';
import { ProjectConfig, SimulationResult } from '@/lib/types';
import { formatTl, formatKwh, formatPct, formatUsd } from '@/lib/utils';
import { DisclaimerModal } from '@/components/dashboard/DisclaimerModal';

export const dynamic = 'force-dynamic';

const TYPE_LABELS: Record<string, string> = {
  rooftop_ci: 'C&I',
  ground_mount: 'GM',
  hybrid_bess: 'HY',
};

const TYPE_NAMES: Record<string, string> = {
  rooftop_ci: 'Çatı C&I',
  ground_mount: 'Arazi GES',
  hybrid_bess: 'GES + BESS',
};

// Bank covenants (international PF baseline)
const DSCR_FLOOR = 1.20;
const DSCR_TARGET = 1.30;
const HURDLE_IRR = 0.12;        // WACC proxy
const STRONG_IRR = 0.18;

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
    bankableProjects: withResults.filter((p) => p.result.finance.avgDscr >= DSCR_FLOOR && p.result.finance.npvTl > 0).length,
    underReviewProjects: withResults.filter((p) => p.result.finance.avgDscr < DSCR_FLOOR || p.result.finance.npvTl <= 0).length,
  };
  const usdTry = withResults[0]?.config.fx.usdTry ?? 45.5;
  const totalCapexUsd = totals.totalCapexTl / usdTry;
  const totalNpvUsd = totals.totalNpvTl / usdTry;
  const npvReturnPct = totals.totalCapexTl > 0 ? (totals.totalNpvTl / totals.totalCapexTl) * 100 : 0;
  const irrSpread = totals.avgIrr - HURDLE_IRR;
  const dscrCushion = totals.avgDscr - DSCR_FLOOR;
  const specificYield = totals.totalCapacityKwp > 0 ? totals.totalAnnualGenKwh / totals.totalCapacityKwp : 0;

  const sortedProjects = [...withResults].sort((a, b) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-4">
      {IS_DEMO_MODE && (
        <div className="rounded border border-amber-300/50 bg-amber-50/40 text-amber-900 px-3 py-2 text-[11px] flex items-start gap-2">
          <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <span><strong className="font-semibold">Demo modu.</strong> Vercel ortamında değişiklikler kalıcı değildir.</span>
        </div>
      )}

      {/* ============================================================
           HERO PANEL — colored (navy gradient + dot pattern)
           Status bar üstte, hero altta — hepsi tek koyu panel
         ============================================================ */}
      <div className="relative rounded-lg overflow-hidden border border-navy/30 shadow-lg shadow-navy/10 text-white" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 45%, #0c4a6e 100%)' }}>
        {/* Dot pattern overlay */}
        <div className="absolute inset-0 opacity-[0.08] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '22px 22px' }} />
        {/* Soft color blobs */}
        <div className="absolute -top-24 -right-20 w-80 h-80 rounded-full bg-amber-400/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 left-1/4 w-96 h-96 rounded-full bg-emerald-400/12 blur-3xl pointer-events-none" />

        {/* Status bar (üst şerit) */}
        <div className="relative flex items-stretch divide-x divide-white/10 bg-white/[0.04] backdrop-blur text-[10px] uppercase tracking-[1.4px] font-semibold text-white/70 border-b border-white/10">
          <div className="flex-1 px-3.5 py-2 flex items-center gap-2 min-w-0">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
            <span>FY26 Portfolio · Live</span>
          </div>
          <div className="px-3.5 py-2 hidden sm:flex items-center gap-3 font-mono normal-case tracking-normal text-[10px]">
            <span>{dateStr}</span>
            <span className="text-white/30">·</span>
            <span>{timeStr}</span>
          </div>
          <div className="px-3.5 py-2 hidden md:flex items-center gap-1.5 font-mono normal-case tracking-normal text-[10px]">
            <span className="text-white/50">USD/TRY</span>
            <span className="font-semibold text-amber-300">{usdTry.toFixed(2)}</span>
          </div>
          <div className="px-3.5 py-2 hidden md:flex items-center gap-1.5 normal-case tracking-normal text-[10px]">
            <span className="text-white/50">Reg.</span>
            <span className="font-mono font-semibold text-white">EPDK 14531</span>
          </div>
        </div>

        {/* Hero içerik */}
        <div className="relative grid lg:grid-cols-[1fr_auto] gap-6 px-5 sm:px-7 py-6 sm:py-8">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 border border-amber-400/30 px-2.5 py-0.5 text-[10px] uppercase tracking-[1.5px] font-bold text-amber-300">
              Hoş Geldiniz
            </div>
            <h1 className="text-[26px] sm:text-[32px] font-bold tracking-tight leading-none mt-2.5 text-white">
              Ozan Seyfi
            </h1>
            <div className="flex items-center gap-1.5 text-[12px] text-white/70 mt-2">
              <Building2 className="h-3 w-3" />
              <span>Kontrolmatik · Investment &amp; Project Finance</span>
            </div>

            {/* Highlights */}
            <div className="mt-5 pt-4 border-t border-white/10">
              <div className="text-[10px] uppercase tracking-[1.5px] font-bold text-white/60 mb-2.5 flex items-center gap-1.5">
                <span className="text-amber-300">★</span>
                Portföy Özeti
              </div>
              <ul className="space-y-1.5 text-[13px] text-white/90">
                {totals.total > 0 ? (
                  <>
                    <li className="flex items-start gap-2.5">
                      <span className="text-sky-400 mt-1 text-[8px]">●</span>
                      <span>
                        <strong className="font-semibold tabular-nums text-white">{totals.total}</strong> proje portföyde
                        — <strong className="font-semibold tabular-nums text-white">{totals.completed}</strong> simüle edilmiş,{' '}
                        <strong className="font-semibold tabular-nums text-white">{totals.drafts}</strong> taslak
                      </span>
                    </li>
                    {totals.completed > 0 && (
                      <li className="flex items-start gap-2.5">
                        <span className={`mt-1 text-[8px] ${totals.avgDscr >= DSCR_TARGET ? 'text-emerald-400' : totals.avgDscr >= DSCR_FLOOR ? 'text-amber-400' : 'text-rose-400'}`}>●</span>
                        <span>
                          Ortalama DSCR <strong className="font-semibold tabular-nums text-white">{totals.avgDscr.toFixed(2)}x</strong>
                          {' '}— bank floor <strong className="font-semibold tabular-nums text-white">{DSCR_FLOOR.toFixed(2)}x</strong> üzerinde{' '}
                          <strong className={`font-semibold tabular-nums ${dscrCushion >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{dscrCushion >= 0 ? '+' : ''}{(dscrCushion * 100).toFixed(0)} bps</strong> cushion
                        </span>
                      </li>
                    )}
                    {totals.completed > 0 && (
                      <li className="flex items-start gap-2.5">
                        <span className={`mt-1 text-[8px] ${totals.avgIrr >= STRONG_IRR ? 'text-emerald-400' : totals.avgIrr >= HURDLE_IRR ? 'text-amber-400' : 'text-rose-400'}`}>●</span>
                        <span>
                          IRR ortalaması <strong className="font-semibold tabular-nums text-white">{formatPct(totals.avgIrr)}</strong>
                          {' · '} hurdle <strong className="font-semibold tabular-nums text-white">{formatPct(HURDLE_IRR)}</strong>
                          {' · '} spread <strong className={`font-semibold tabular-nums ${irrSpread >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{irrSpread >= 0 ? '+' : ''}{(irrSpread * 100).toFixed(0)} bps</strong>
                        </span>
                      </li>
                    )}
                    {totals.bankableProjects > 0 && (
                      <li className="flex items-start gap-2.5">
                        <span className="text-sky-400 mt-1 text-[8px]">●</span>
                        <span>
                          <strong className="font-semibold tabular-nums text-white">{totals.bankableProjects}</strong> proje bankalanabilir durumda
                          {totals.underReviewProjects > 0 && <> · <strong className="font-semibold tabular-nums text-white">{totals.underReviewProjects}</strong> review gerekli</>}
                        </span>
                      </li>
                    )}
                  </>
                ) : (
                  <li className="text-white/70 text-[13px]">
                    Portföyde henüz proje yok. EPDK 14531 saatlik mahsuplaşma rejimi altında ilk fizibilitenizi başlatın.
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* Action stack */}
          <div className="flex lg:flex-col items-start gap-2 flex-wrap lg:items-stretch lg:min-w-[200px]">
            <Button asChild size="sm" className="w-full justify-center bg-amber-400 text-navy hover:bg-amber-300 shadow-md shadow-amber-500/20 font-semibold">
              <Link href="/projects/new"><Plus className="h-3.5 w-3.5 mr-1.5" /> Yeni Proje</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="w-full justify-center bg-white/5 border-white/20 text-white hover:bg-white/10 hover:text-white backdrop-blur">
              <Link href="/projects"><FileText className="h-3.5 w-3.5 mr-1.5" /> Tüm Projeler</Link>
            </Button>
            {withResults.length >= 2 && (
              <Button asChild variant="outline" size="sm" className="w-full justify-center bg-white/5 border-white/20 text-white hover:bg-white/10 hover:text-white backdrop-blur">
                <Link href="/projects/compare"><GitCompareArrows className="h-3.5 w-3.5 mr-1.5" /> Karşılaştır</Link>
              </Button>
            )}
            <div className="hidden lg:block w-full pt-2 mt-1 border-t border-white/10">
              <DisclaimerSlotDark />
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================
           PRIMARY KPIs — 4 lender-grade tiles with threshold bars
         ============================================================ */}
      <section>
        <SectionHeading title="Anahtar Metrikler" meta={totals.completed > 0 ? `${totals.completed} simüle edilmiş proje üzerinden agrega` : 'Simülasyon bekleniyor'} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiTile
            label="Kümülâtif NPV"
            value={totals.completed > 0 ? `${totals.totalNpvTl >= 0 ? '+' : ''}${formatTl(totals.totalNpvTl, { compact: true })}` : '—'}
            valueTone={totals.completed > 0 ? (totals.totalNpvTl >= 0 ? 'positive' : 'negative') : undefined}
            secondary={totals.completed > 0 ? `${formatUsd(totalNpvUsd, { compact: true })} USD` : ''}
            footer={totals.completed > 0 ? <>NPV / CAPEX <strong className={`tabular-nums ${npvReturnPct >= 0 ? 'text-eco-dark' : 'text-destructive'}`}>{npvReturnPct >= 0 ? '+' : ''}{npvReturnPct.toFixed(1)}%</strong></> : 'Henüz hesaplanmadı'}
            trend={totals.completed > 0 ? (totals.totalNpvTl >= 0 ? 'up' : 'down') : undefined}
          />
          <KpiTile
            label="Ortalama IRR"
            value={totals.completed > 0 ? formatPct(totals.avgIrr) : '—'}
            valueTone={totals.completed > 0 ? (totals.avgIrr >= STRONG_IRR ? 'positive' : totals.avgIrr < HURDLE_IRR ? 'negative' : 'neutral') : undefined}
            secondary={totals.completed > 0 ? `vs hurdle ${formatPct(HURDLE_IRR)}` : ''}
            bar={totals.completed > 0 ? { value: totals.avgIrr, min: 0, max: 0.30, threshold: HURDLE_IRR, label: `${irrSpread >= 0 ? '+' : ''}${(irrSpread * 100).toFixed(0)} bps spread` } : undefined}
            footer={totals.completed > 0 ? <>WACC proxy <span className="tabular-nums">{formatPct(HURDLE_IRR)}</span></> : ''}
            trend={totals.completed > 0 ? (totals.avgIrr >= HURDLE_IRR ? 'up' : 'down') : undefined}
          />
          <KpiTile
            label="Ortalama DSCR"
            value={totals.completed > 0 ? `${totals.avgDscr.toFixed(2)}x` : '—'}
            valueTone={totals.completed > 0 ? (totals.avgDscr >= DSCR_TARGET ? 'positive' : totals.avgDscr < DSCR_FLOOR ? 'negative' : 'neutral') : undefined}
            secondary={totals.completed > 0 ? `Floor ${DSCR_FLOOR.toFixed(2)}x · Target ${DSCR_TARGET.toFixed(2)}x` : ''}
            bar={totals.completed > 0 ? { value: totals.avgDscr, min: 1.0, max: 2.0, threshold: DSCR_FLOOR, label: `${dscrCushion >= 0 ? '+' : ''}${(dscrCushion * 100).toFixed(0)} bps cushion` } : undefined}
            footer={totals.completed > 0
              ? (totals.avgDscr >= DSCR_TARGET ? <span className="text-eco-dark inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Covenant rahat</span>
                 : totals.avgDscr >= DSCR_FLOOR ? <span className="text-amber-600 inline-flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Floor üstünde</span>
                 : <span className="text-destructive inline-flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Floor altında — cure</span>)
              : ''}
          />
          <KpiTile
            label="Toplam CAPEX"
            value={totals.completed > 0 ? formatTl(totals.totalCapexTl, { compact: true }) : '—'}
            secondary={totals.completed > 0 ? `${formatUsd(totalCapexUsd, { compact: true })} USD @ ₺${usdTry.toFixed(2)}` : ''}
            footer={totals.completed > 0 ? <><span className="tabular-nums">{totals.completed}</span> proje · ortalama <span className="tabular-nums">{formatTl(totals.totalCapexTl / totals.completed, { compact: true })}</span></> : ''}
          />
        </div>
      </section>

      {/* ============================================================
           SECONDARY KPIs — technical/environmental
         ============================================================ */}
      {totals.completed > 0 && (
        <section>
          <SectionHeading title="Teknik & Çevresel" meta="Operasyonel & sürdürülebilirlik metrikleri" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <KpiTile
              label="Kurulu Kapasite"
              value={totals.totalCapacityKwp.toLocaleString('tr-TR')}
              valueUnit="kWp"
              secondary={`Yıllık üretim ${formatKwh(totals.totalAnnualGenKwh, { compact: true })}`}
              footer={<>Specific yield <strong className="tabular-nums">{specificYield.toFixed(0)}</strong> kWh/kWp/yıl</>}
              compact
            />
            <KpiTile
              label="CO₂ Tasarrufu (25y)"
              value={totals.totalCo2Tons.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
              valueUnit="ton"
              secondary={`~${(totals.totalCo2Tons / 22).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ağaç eşdeğeri`}
              footer={<>Yıllık ortalama <strong className="tabular-nums">{(totals.totalCo2Tons / 25).toFixed(0)}</strong> ton/yıl</>}
              compact
            />
            <KpiTile
              label="Bankalanabilirlik"
              value={`${totals.bankableProjects}/${totals.completed}`}
              valueTone={totals.bankableProjects === totals.completed ? 'positive' : 'neutral'}
              secondary={totals.underReviewProjects > 0 ? `${totals.underReviewProjects} proje review` : 'Tümü kriterlere uygun'}
              footer={<>DSCR ≥ <span className="tabular-nums">{DSCR_FLOOR.toFixed(2)}x</span> &amp; NPV &gt; 0</>}
              compact
            />
          </div>
        </section>
      )}

      {/* ============================================================
           PIPELINE TABLE
         ============================================================ */}
      <section>
        <div className="flex items-end justify-between pb-2 mb-3 border-b border-border/70">
          <div>
            <h2 className="text-[11px] uppercase tracking-[1.5px] font-bold text-foreground">Proje Pipeline</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Tüm simüle edilmiş projeler · status &amp; key metrics</p>
          </div>
          {sortedProjects.length > 0 && (
            <Link href="/projects" className="text-[11px] uppercase tracking-[1.2px] font-semibold text-primary hover:underline inline-flex items-center gap-1">
              Tüm Projeler <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>

        {sortedProjects.length === 0 ? (
          <div className="border border-border rounded-md bg-card py-12 text-center">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground mb-3">Simüle edilmiş proje bulunmamaktadır.</p>
            <Button asChild size="sm">
              <Link href="/projects/new"><Plus className="h-4 w-4 mr-1" /> Yeni Proje</Link>
            </Button>
          </div>
        ) : (
          <div className="border border-border rounded-md bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/40 text-[10px] uppercase tracking-[1.3px] text-muted-foreground">
                    <th className="px-3 py-2 text-left font-semibold w-8 font-mono">#</th>
                    <th className="px-3 py-2 text-left font-semibold">Proje</th>
                    <th className="px-2 py-2 text-left font-semibold hidden sm:table-cell">Tip</th>
                    <th className="px-3 py-2 text-right font-semibold hidden md:table-cell">kWp</th>
                    <th className="px-3 py-2 text-right font-semibold hidden lg:table-cell">CAPEX</th>
                    <th className="px-3 py-2 text-right font-semibold">IRR</th>
                    <th className="px-3 py-2 text-right font-semibold">NPV</th>
                    <th className="px-3 py-2 text-right font-semibold">DSCR</th>
                    <th className="px-3 py-2 text-right font-semibold hidden md:table-cell">Payback</th>
                    <th className="px-3 py-2 text-center font-semibold">Status</th>
                    <th className="px-2 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedProjects.map((p, idx) => {
                    const positive = p.result.finance.npvTl > 0;
                    const dscrOk = p.result.finance.avgDscr >= DSCR_FLOOR;
                    const irrOk = p.result.finance.irrPct >= HURDLE_IRR;
                    const status: 'ready' | 'review' | 'risk' =
                      dscrOk && positive && irrOk ? 'ready' :
                      dscrOk && positive ? 'review' : 'risk';
                    return (
                      <tr key={p.id} className="border-b border-border/40 last:border-b-0 hover:bg-secondary/30 transition-colors group">
                        <td className="px-3 py-2.5 text-[11px] font-mono tabular-nums text-muted-foreground">
                          {String(idx + 1).padStart(2, '0')}
                        </td>
                        <td className="px-3 py-2.5">
                          <Link href={`/projects/${p.id}`} className="font-medium text-foreground group-hover:text-primary transition-colors block leading-tight text-[13px]">
                            {p.name}
                          </Link>
                          <div className="text-[10.5px] text-muted-foreground mt-0.5">
                            <span className="sm:hidden">{TYPE_NAMES[p.projectType] ?? p.projectType} · </span>
                            {p.config.location.city ?? '—'}
                            {p.config.battery.enabled && ` · ${p.config.battery.nominalCapacityKwh.toLocaleString('tr-TR')} kWh BESS`}
                          </div>
                        </td>
                        <td className="px-2 py-2.5 hidden sm:table-cell">
                          <span className="inline-flex items-center justify-center h-5 px-1.5 rounded text-[10px] font-mono font-semibold bg-secondary text-foreground/70 border border-border">
                            {TYPE_LABELS[p.projectType] ?? '?'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right text-[12px] tabular-nums hidden md:table-cell whitespace-nowrap font-medium">
                          {p.config.pv.peakPowerKwp.toLocaleString('tr-TR')}
                        </td>
                        <td className="px-3 py-2.5 text-right text-[12px] tabular-nums hidden lg:table-cell whitespace-nowrap text-muted-foreground">
                          {formatTl(p.result.finance.totalCapexTl, { compact: true })}
                        </td>
                        <td className={`px-3 py-2.5 text-right text-[12.5px] font-semibold tabular-nums whitespace-nowrap ${irrOk ? 'text-eco-dark' : 'text-destructive'}`}>
                          {formatPct(p.result.finance.irrPct)}
                        </td>
                        <td className={`px-3 py-2.5 text-right text-[12.5px] font-semibold tabular-nums whitespace-nowrap ${positive ? 'text-eco-dark' : 'text-destructive'}`}>
                          {positive ? '+' : ''}{formatTl(p.result.finance.npvTl, { compact: true })}
                        </td>
                        <td className={`px-3 py-2.5 text-right text-[12.5px] font-semibold tabular-nums whitespace-nowrap ${dscrOk ? 'text-foreground' : 'text-destructive'}`}>
                          {p.result.finance.avgDscr.toFixed(2)}x
                        </td>
                        <td className="px-3 py-2.5 text-right text-[11.5px] tabular-nums hidden md:table-cell whitespace-nowrap text-muted-foreground">
                          {Number.isFinite(p.result.finance.fcfcPaybackYears) ? `${p.result.finance.fcfcPaybackYears.toFixed(1)}y` : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-center whitespace-nowrap">
                          <StatusPill kind={status} />
                        </td>
                        <td className="px-2 py-2.5 text-right">
                          <Link href={`/projects/${p.id}`} className="inline-flex items-center justify-center h-6 w-6 rounded text-muted-foreground/60 hover:bg-primary/10 hover:text-primary transition-colors" aria-label="Aç">
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-secondary/20 text-[11px]">
                    <td colSpan={2} className="px-3 py-2 font-semibold text-foreground uppercase tracking-wider text-[10px]">
                      Toplam · {sortedProjects.length} proje
                    </td>
                    <td className="px-2 py-2 hidden sm:table-cell"></td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums hidden md:table-cell">
                      {totals.totalCapacityKwp.toLocaleString('tr-TR')}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums hidden lg:table-cell">
                      {formatTl(totals.totalCapexTl, { compact: true })}
                    </td>
                    <td className={`px-3 py-2 text-right font-bold tabular-nums ${totals.avgIrr >= HURDLE_IRR ? 'text-eco-dark' : 'text-destructive'}`}>
                      {formatPct(totals.avgIrr)}
                    </td>
                    <td className={`px-3 py-2 text-right font-bold tabular-nums ${totals.totalNpvTl >= 0 ? 'text-eco-dark' : 'text-destructive'}`}>
                      {totals.totalNpvTl >= 0 ? '+' : ''}{formatTl(totals.totalNpvTl, { compact: true })}
                    </td>
                    <td className={`px-3 py-2 text-right font-bold tabular-nums ${totals.avgDscr >= DSCR_FLOOR ? 'text-foreground' : 'text-destructive'}`}>
                      {totals.avgDscr.toFixed(2)}x
                    </td>
                    <td className="px-3 py-2 hidden md:table-cell"></td>
                    <td className="px-3 py-2 text-center text-[10px] uppercase tracking-wider text-muted-foreground">
                      AGG
                    </td>
                    <td className="px-2 py-2"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Mobile-only disclaimer slot */}
      <div className="lg:hidden flex justify-end">
        <DisclaimerSlot />
      </div>

      {/* Footnote */}
      <div className="text-[10px] text-muted-foreground/70 font-mono border-t border-border/40 pt-3 mt-2 flex flex-wrap items-center justify-between gap-2">
        <span>Bank covenants: DSCR floor {DSCR_FLOOR.toFixed(2)}x · IRR hurdle {formatPct(HURDLE_IRR)} · NPV &gt; 0</span>
        <span>Source: PVGIS-SARAH3 · EPDK 14531 (04.04.2026) · TCMB FX</span>
      </div>
    </div>
  );
}

// ====================================================================
// SECTION HEADING
// ====================================================================
function SectionHeading({ title, meta }: { title: string; meta?: string }) {
  return (
    <div className="flex items-end justify-between pb-2 mb-3 border-b border-border/70">
      <h2 className="text-[11px] uppercase tracking-[1.5px] font-bold text-foreground">{title}</h2>
      {meta && <span className="text-[10px] uppercase tracking-[1.2px] text-muted-foreground font-medium">{meta}</span>}
    </div>
  );
}

// ====================================================================
// KPI TILE — primary metric with optional threshold bar + trend
// ====================================================================
function KpiTile({
  label,
  value,
  valueUnit,
  valueTone,
  secondary,
  bar,
  footer,
  trend,
  compact,
}: {
  label: string;
  value: string;
  valueUnit?: string;
  valueTone?: 'positive' | 'negative' | 'neutral';
  secondary?: string;
  bar?: { value: number; min: number; max: number; threshold: number; label?: string };
  footer?: React.ReactNode;
  trend?: 'up' | 'down';
  compact?: boolean;
}) {
  const toneClass =
    valueTone === 'positive' ? 'text-eco-dark' :
    valueTone === 'negative' ? 'text-destructive' : 'text-foreground';

  return (
    <div className="border border-border rounded-md bg-card overflow-hidden hover:border-foreground/20 transition-colors">
      <div className={compact ? 'px-4 py-3' : 'px-4 py-3.5'}>
        <div className="flex items-start justify-between gap-2">
          <div className="text-[10px] uppercase tracking-[1.4px] font-bold text-muted-foreground leading-tight">
            {label}
          </div>
          {trend === 'up' && <ArrowUpRight className="h-3.5 w-3.5 text-eco-dark flex-shrink-0" />}
          {trend === 'down' && <ArrowDownRight className="h-3.5 w-3.5 text-destructive flex-shrink-0" />}
        </div>

        <div className={`mt-1.5 font-bold tabular-nums tracking-tight leading-none ${compact ? 'text-xl' : 'text-[26px]'} ${toneClass}`}>
          {value}
          {valueUnit && <span className="text-muted-foreground font-medium text-sm ml-1">{valueUnit}</span>}
        </div>

        {secondary && (
          <div className={`text-muted-foreground mt-1.5 leading-tight ${compact ? 'text-[10.5px]' : 'text-[11px]'}`}>
            {secondary}
          </div>
        )}

        {bar && <ThresholdBar {...bar} />}
      </div>

      {footer && (
        <div className="px-4 py-2 border-t border-border/60 bg-secondary/20 text-[10.5px] text-muted-foreground leading-tight">
          {footer}
        </div>
      )}
    </div>
  );
}

// ====================================================================
// THRESHOLD BAR — visual indicator with floor/target marker
// ====================================================================
function ThresholdBar({ value, min, max, threshold, label }: { value: number; min: number; max: number; threshold: number; label?: string }) {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const thresholdPct = Math.max(0, Math.min(100, ((threshold - min) / (max - min)) * 100));
  const above = value >= threshold;
  return (
    <div className="mt-3 space-y-1">
      <div className="relative h-1.5 rounded-full bg-secondary overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 ${above ? 'bg-eco-dark' : 'bg-destructive'} transition-all`}
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute inset-y-0 w-0.5 bg-foreground/70"
          style={{ left: `${thresholdPct}%` }}
          title={`Threshold: ${threshold}`}
        />
      </div>
      {label && (
        <div className={`text-[10px] font-mono tabular-nums ${above ? 'text-eco-dark' : 'text-destructive'}`}>
          {label}
        </div>
      )}
    </div>
  );
}

// ====================================================================
// STATUS PILL — project pipeline status
// ====================================================================
function StatusPill({ kind }: { kind: 'ready' | 'review' | 'risk' }) {
  if (kind === 'ready') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-eco/10 text-eco-dark border border-eco/30">
        <CheckCircle2 className="h-2.5 w-2.5" />
        Ready
      </span>
    );
  }
  if (kind === 'review') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-300">
        <Clock className="h-2.5 w-2.5" />
        Review
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-red-50 text-red-700 border border-red-300">
      <AlertTriangle className="h-2.5 w-2.5" />
      Risk
    </span>
  );
}

// ====================================================================
// DISCLAIMER SLOTS — neutral (mobile) + dark (hero panel)
// ====================================================================
function DisclaimerSlot() {
  return (
    <div className="[&>button]:!border-border [&>button]:!bg-transparent [&>button]:!text-muted-foreground [&>button]:!backdrop-blur-0 [&>button]:!w-full [&>button]:!justify-center hover:[&>button]:!bg-secondary hover:[&>button]:!text-foreground">
      <DisclaimerModal />
    </div>
  );
}

function DisclaimerSlotDark() {
  return (
    <div className="[&>button]:!border-white/20 [&>button]:!bg-white/5 [&>button]:!text-white/70 [&>button]:!w-full [&>button]:!justify-center hover:[&>button]:!bg-white/10 hover:[&>button]:!text-white">
      <DisclaimerModal />
    </div>
  );
}
