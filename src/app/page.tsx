import Link from 'next/link';
import { listProjects, getProject, upsertProject, nowIso, IS_DEMO_MODE } from '@/lib/db';
import { Button } from '@/components/ui/button';
import {
  ArrowRight, FileText, Sun, Battery, FlaskConical, Info, Plus, GitCompareArrows, Building2,
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
  const npvReturn = totals.totalCapexTl > 0 ? (totals.totalNpvTl / totals.totalCapexTl) * 100 : 0;

  const recentProjects = [...withResults]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const now = new Date();
  const dateStr = now.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-8">
      {IS_DEMO_MODE && (
        <div className="rounded border border-amber-300/50 bg-amber-50/40 text-amber-900 px-3 py-2 text-[11px] flex items-start gap-2">
          <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <span><strong className="font-semibold">Demo modu.</strong> Vercel ortamında değişiklikler kalıcı değildir; her cold start&apos;ta demo projeler yenilenir.</span>
        </div>
      )}

      {/* ========================================================
           KARŞILAMA — kurumsal banner (üst meta + asıl başlık)
         ======================================================== */}
      <header className="border border-border rounded-md bg-card">
        {/* Üst meta şerit */}
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-2 text-[11px] uppercase tracking-[1.4px] text-muted-foreground font-medium">
          <div className="flex items-center gap-3">
            <span>GES-Fizibilite Pro</span>
            <span className="text-muted-foreground/40">/</span>
            <span>Dashboard</span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[10px] normal-case tracking-normal">
            <span>{dateStr}</span>
            <span className="text-muted-foreground/40">·</span>
            <span>{timeStr}</span>
          </div>
        </div>

        {/* Asıl karşılama */}
        <div className="px-5 sm:px-8 py-6 sm:py-8 flex items-start justify-between gap-6 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] uppercase tracking-[1.5px] font-semibold text-muted-foreground">
              Hoş Geldiniz
            </div>
            <h1 className="font-bold text-2xl sm:text-[28px] tracking-tight leading-tight mt-1 text-foreground">
              Ozan Seyfi
            </h1>
            <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground mt-1.5">
              <Building2 className="h-3 w-3" />
              <span>Kontrolmatik · Yatırım & Finansman</span>
            </div>
            <p className="text-sm text-foreground/80 mt-4 max-w-2xl leading-relaxed">
              {totals.total > 0 ? (
                <>
                  Portföyünüzde <strong className="font-semibold text-foreground tabular-nums">{totals.total}</strong> proje
                  bulunuyor — bunların <strong className="font-semibold text-foreground tabular-nums">{totals.completed}</strong> tanesi
                  simüle edilmiş, <strong className="font-semibold text-foreground tabular-nums">{totals.drafts}</strong> tanesi taslak aşamasında.
                  EPDK Karar No. 14531 (saatlik mahsuplaşma) ve 04.04.2026 tarifeleri ile çalışılıyor.
                </>
              ) : (
                <>
                  Portföyünüzde henüz proje yok. Sıfırdan yeni bir fizibilite oluşturabilir veya hazır şablonlardan birini klonlayabilirsiniz.
                  Sistem, EPDK Karar No. 14531 (saatlik mahsuplaşma) ve 04.04.2026 tarifeleri ile çalışmaktadır.
                </>
              )}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <DisclaimerModalAdapter />
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {withResults.length >= 2 && (
                <Button asChild variant="outline" size="sm">
                  <Link href="/projects/compare"><GitCompareArrows className="h-3.5 w-3.5 mr-1.5" /> Karşılaştır</Link>
                </Button>
              )}
              <Button asChild variant="outline" size="sm">
                <Link href="/projects"><FileText className="h-3.5 w-3.5 mr-1.5" /> Projeler</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/projects/new"><Plus className="h-3.5 w-3.5 mr-1.5" /> Yeni Proje</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* ========================================================
           PORTFÖY METRİKLERİ
         ======================================================== */}
      <section>
        <SectionHeading title="Portföy Metrikleri" meta={totals.completed > 0 ? `${totals.completed} simüle edilmiş proje · agrega` : 'Simülasyon bekleniyor'} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-md overflow-hidden border border-border">
          <Metric
            label="Toplam CAPEX"
            value={totals.completed > 0 ? formatTl(totals.totalCapexTl, { compact: true }) : '—'}
            sub={totals.completed > 0 ? `${formatUsd(totals.totalCapexTl / usdTry, { compact: true })} @ ₺${usdTry.toFixed(2)}/USD` : 'Henüz hesaplanmadı'}
          />
          <Metric
            label="Kümülâtif NPV"
            value={totals.completed > 0 ? `${totals.totalNpvTl >= 0 ? '+' : ''}${formatTl(totals.totalNpvTl, { compact: true })}` : '—'}
            sub={totals.completed > 0 ? `${npvReturn >= 0 ? '+' : ''}${npvReturn.toFixed(1)}% CAPEX verimi` : ''}
            tone={totals.completed > 0 ? (totals.totalNpvTl >= 0 ? 'positive' : 'negative') : undefined}
          />
          <Metric
            label="Ortalama IRR"
            value={totals.completed > 0 ? formatPct(totals.avgIrr) : '—'}
            sub={totals.completed > 0 ? `DSCR ortalama ${totals.avgDscr.toFixed(2)}x` : ''}
            tone={totals.completed > 0 ? (totals.avgIrr >= 0.15 ? 'positive' : totals.avgIrr < 0.08 ? 'negative' : undefined) : undefined}
          />
          <Metric
            label="Aktif Proje"
            value={totals.completed > 0 ? `${totals.completed}` : '0'}
            sub={totals.total > 0 ? `${totals.total} toplam · ${totals.drafts} taslak` : 'Yeni proje açın'}
          />
        </div>

        {/* İkincil metrikler */}
        {totals.completed > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-px bg-border rounded-md overflow-hidden border border-border mt-px">
            <Metric
              label="Kurulu Kapasite"
              value={`${totals.totalCapacityKwp.toLocaleString('tr-TR')}`}
              valueUnit="kWp"
              sub={`Yıllık üretim ${formatKwh(totals.totalAnnualGenKwh, { compact: true })}`}
              compact
            />
            <Metric
              label="CO₂ Tasarrufu (25y)"
              value={`${totals.totalCo2Tons.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`}
              valueUnit="ton"
              sub={`~${(totals.totalCo2Tons / 22).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ağaç eşdeğeri`}
              compact
            />
            <Metric
              label="Regülasyon"
              value="EPDK 14531"
              sub="Saatlik mahsuplaşma · 04.04.2026 tarifeleri"
              compact
            />
          </div>
        )}
      </section>

      {/* ========================================================
           SON PROJELER (tablo)
         ======================================================== */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <SectionHeading title="Son Projeler" meta={recentProjects.length > 0 ? `En son güncellenen ${recentProjects.length}` : ''} inline />
          {recentProjects.length > 0 && (
            <Link href="/projects" className="text-[11px] uppercase tracking-[1.2px] font-semibold text-primary hover:underline inline-flex items-center gap-1">
              Tüm Projeler <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>

        {recentProjects.length === 0 ? (
          <div className="border border-border rounded-md bg-card py-16 text-center">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              Simüle edilmiş proje bulunmamaktadır.
            </p>
            <Button asChild size="sm">
              <Link href="/projects/new"><Plus className="h-4 w-4 mr-1" /> Yeni Proje</Link>
            </Button>
          </div>
        ) : (
          <div className="border border-border rounded-md bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30 text-[10px] uppercase tracking-[1.3px] text-muted-foreground">
                    <th className="px-4 py-2.5 text-left font-semibold">Proje</th>
                    <th className="px-3 py-2.5 text-left font-semibold hidden sm:table-cell">Tip</th>
                    <th className="px-3 py-2.5 text-right font-semibold hidden md:table-cell">Güç (kWp)</th>
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
                          <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                            {TYPE_LABELS[p.projectType] ?? p.projectType}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right text-xs tabular-nums hidden md:table-cell whitespace-nowrap font-medium">
                          {p.config.pv.peakPowerKwp.toLocaleString('tr-TR')}
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
                          {p.result.finance.avgDscr.toFixed(2)}x
                        </td>
                        <td className="px-3 py-3 text-right text-[11px] text-muted-foreground hidden xl:table-cell whitespace-nowrap font-mono">
                          {new Date(p.updatedAt).toLocaleDateString('tr-TR')}
                        </td>
                        <td className="px-2 py-3 text-right">
                          <Link href={`/projects/${p.id}`} className="inline-flex items-center justify-center h-7 w-7 rounded text-muted-foreground/60 hover:bg-primary/10 hover:text-primary transition-colors" aria-label="Aç">
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* ========================================================
           YETKİNLİKLER (subtle, alt)
         ======================================================== */}
      <section>
        <SectionHeading title="Yetkinlikler" meta="Platform yetenekleri" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border rounded-md overflow-hidden border border-border">
          <CapabilityRow icon={Sun} title="8760 Saatlik Tam Simülasyon" desc="PVGIS-SARAH3 API ile lokasyon bazlı gerçek meteorolojik veri ve saatlik üretim profili" />
          <CapabilityRow icon={Battery} title="BESS Dispatch Motoru" desc="Öz tüketim, bedelli limit koruması, peak shaving ve enerji arbitrajı + augmentation planlaması" />
          <CapabilityRow icon={FlaskConical} title="Monte Carlo + Senaryo Matrisi" desc="1000+ iterasyon olasılıksal risk analizi ve 150 senaryo deterministik karşılaştırma" />
        </div>
      </section>
    </div>
  );
}

// ---------- SECTION HEADING ----------
function SectionHeading({ title, meta, inline }: { title: string; meta?: string; inline?: boolean }) {
  if (inline) {
    return (
      <div>
        <h2 className="text-[11px] uppercase tracking-[1.5px] font-bold text-foreground">{title}</h2>
        {meta && <p className="text-[11px] text-muted-foreground mt-0.5">{meta}</p>}
      </div>
    );
  }
  return (
    <div className="flex items-end justify-between pb-2 mb-3 border-b border-border/70">
      <h2 className="text-[11px] uppercase tracking-[1.5px] font-bold text-foreground">{title}</h2>
      {meta && <span className="text-[10px] uppercase tracking-[1.2px] text-muted-foreground font-medium">{meta}</span>}
    </div>
  );
}

// ---------- METRIC CELL ----------
function Metric({
  label,
  value,
  valueUnit,
  sub,
  tone,
  compact,
}: {
  label: string;
  value: string;
  valueUnit?: string;
  sub?: string;
  tone?: 'positive' | 'negative';
  compact?: boolean;
}) {
  const toneColor =
    tone === 'positive' ? 'text-eco-dark' :
    tone === 'negative' ? 'text-destructive' : 'text-foreground';
  return (
    <div className={`bg-card ${compact ? 'px-4 py-3' : 'px-5 py-4'}`}>
      <div className="text-[10px] uppercase tracking-[1.4px] font-semibold text-muted-foreground leading-tight">
        {label}
      </div>
      <div className={`mt-1.5 font-bold tabular-nums tracking-tight leading-none ${compact ? 'text-lg' : 'text-2xl'} ${toneColor}`}>
        {value}
        {valueUnit && <span className="text-muted-foreground font-normal text-sm ml-1">{valueUnit}</span>}
      </div>
      {sub && (
        <div className={`text-muted-foreground mt-2 leading-tight ${compact ? 'text-[10.5px]' : 'text-[11.5px]'}`}>
          {sub}
        </div>
      )}
    </div>
  );
}

// ---------- CAPABILITY ROW ----------
function CapabilityRow({ icon: Icon, title, desc }: { icon: typeof Sun; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 px-5 py-4 bg-card">
      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" strokeWidth={1.5} />
      <div className="min-w-0">
        <div className="font-semibold text-[13px] text-foreground leading-tight">{title}</div>
        <div className="text-[11.5px] text-muted-foreground mt-1 leading-snug">{desc}</div>
      </div>
    </div>
  );
}

// ---------- DISCLAIMER MODAL ADAPTER ----------
// Wraps DisclaimerModal which renders a styled button — burada button stilini override etmek için sarmalıyoruz.
function DisclaimerModalAdapter() {
  return (
    <div className="[&>button]:!border-border [&>button]:!bg-transparent [&>button]:!text-muted-foreground [&>button]:!backdrop-blur-0 hover:[&>button]:!bg-secondary hover:[&>button]:!text-foreground">
      <DisclaimerModal />
    </div>
  );
}
