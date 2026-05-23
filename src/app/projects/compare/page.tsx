import Link from 'next/link';
import { listProjects, getProject } from '@/lib/db';
import { ProjectConfig, SimulationResult } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatMoney, formatPct, formatYears, formatKwh, Currency } from '@/lib/utils';
import { ArrowLeft, TrendingUp, AlertTriangle, GitCompareArrows } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function ComparePage({
  searchParams,
}: {
  searchParams: { ids?: string; currency?: string };
}) {
  const ids = (searchParams.ids ?? '').split(',').filter(Boolean);
  const projects = listProjects();
  const currency: Currency = searchParams.currency === 'TL' ? 'TL' : 'USD';

  // Eğer id seçimi yoksa tümünü listele
  if (ids.length === 0) {
    return <ProjectPicker projects={projects} />;
  }

  const selectedRaw = ids.map((id) => getProject(id)).filter(Boolean) as ReturnType<typeof getProject>[];
  const selected = selectedRaw.map((row) => {
    if (!row) return null;
    const config = JSON.parse(row.configJson) as ProjectConfig;
    const result = row.resultsJson ? (JSON.parse(row.resultsJson) as SimulationResult) : null;
    return { id: row.id, name: row.name, config, result };
  }).filter((s) => s && s.result) as Array<{ id: string; name: string; config: ProjectConfig; result: SimulationResult }>;

  if (selected.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-lg font-medium mb-1">Seçilen projelerde simülasyon sonucu yok</h3>
            <p className="text-sm text-muted-foreground mb-4">Karşılaştırmak için önce projeleri çalıştırın.</p>
            <Button asChild><Link href="/projects/compare">Geri</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get USD/TL ratio (use first project's)
  const usdTry = selected[0].config.fx.usdTry;
  const m = (tl: number) => formatMoney(tl, currency, usdTry, { compact: true });

  // Karşılaştırma metrikleri
  const metrics = [
    { key: 'totalCapexTl', label: 'CAPEX', fmt: m, lowerBetter: true },
    { key: 'npvTl', label: 'NPV', fmt: m, lowerBetter: false },
    { key: 'irrPct', label: 'IRR', fmt: (v: number) => formatPct(v), lowerBetter: false },
    { key: 'mirrPct', label: 'MIRR', fmt: (v: number) => formatPct(v), lowerBetter: false },
    { key: 'lcoeTlKwh', label: 'LCOE (TL/kWh)', fmt: (v: number) => v.toFixed(2), lowerBetter: true },
    { key: 'fcfcPaybackYears', label: 'FCFC Payback', fmt: formatYears, lowerBetter: true },
    { key: 'fcfePaybackYears', label: 'FCFE Payback', fmt: formatYears, lowerBetter: true },
    { key: 'roiPct', label: 'ROI', fmt: (v: number) => formatPct(v), lowerBetter: false },
    { key: 'roePct', label: 'ROE', fmt: (v: number) => formatPct(v), lowerBetter: false },
    { key: 'avgDscr', label: 'Ort. DSCR', fmt: (v: number) => v.toFixed(2), lowerBetter: false },
    { key: 'totalCo2Tons', label: 'CO₂ (ton, 25y)', fmt: (v: number) => v.toFixed(0), lowerBetter: false },
  ] as const;

  // Her metrik için en iyi senaryoyu bul
  function isBest(key: string, value: number, lowerBetter: boolean): boolean {
    const all = selected.map((s) => Number((s.result.finance as unknown as Record<string, number>)[key]));
    if (lowerBetter) return value === Math.min(...all);
    return value === Math.max(...all);
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2">
            <Link href="/projects/compare"><ArrowLeft className="h-4 w-4 mr-1" /> Proje Seçimine Dön</Link>
          </Button>
          <h1 className="text-2xl font-bold">Senaryo Karşılaştırma</h1>
          <p className="text-sm text-muted-foreground">{selected.length} senaryo · Para birimi: {currency}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`?ids=${ids.join(',')}&currency=${currency === 'USD' ? 'TL' : 'USD'}`} className="px-3 py-1.5 text-xs rounded bg-secondary border border-border/40 hover:bg-secondary/80">
            {currency === 'USD' ? '₺ TL\'ye geç' : '$ USD\'ye geç'}
          </Link>
        </div>
      </div>

      {/* Genel kart karşılaştırma */}
      <div className={`grid gap-4 ${selected.length === 2 ? 'grid-cols-2' : selected.length === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
        {selected.map((s) => {
          const positive = s.result.finance.npvTl > 0;
          return (
            <Card key={s.id} className={`border-t-4 ${positive ? 'border-t-eco' : 'border-t-destructive'}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base leading-tight">{s.name}</CardTitle>
                <CardDescription className="text-xs">
                  {s.config.location.city ?? ''} · {s.config.pv.peakPowerKwp} kWp
                  {s.config.battery.enabled && ` · ${s.config.battery.nominalCapacityKwh} kWh BESS`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-xs">
                <Pair label="IRR" value={formatPct(s.result.finance.irrPct)} highlight={positive} />
                <Pair label="NPV" value={m(s.result.finance.npvTl)} highlight={positive} />
                <Pair label="LCOE" value={`${s.result.finance.lcoeTlKwh.toFixed(2)} TL/kWh`} />
                <Pair label="FCFC Pay." value={formatYears(s.result.finance.fcfcPaybackYears)} />
                <Pair label="DSCR" value={s.result.finance.avgDscr.toFixed(2)} />
                <div className="pt-2 mt-2 border-t border-border/40">
                  <Link href={`/projects/${s.id}`} className="text-primary text-xs hover:underline">Detay →</Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detaylı karşılaştırma tablosu */}
      <Card>
        <CardHeader>
          <CardTitle>Detaylı Metrik Karşılaştırma</CardTitle>
          <CardDescription>Her satırda en iyi değer <span className="px-1.5 py-0.5 rounded bg-eco/15 text-eco-dark font-medium">yeşil</span> ile işaretli.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-secondary">
              <tr>
                <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">Metrik</th>
                {selected.map((s) => (
                  <th key={s.id} className="text-right px-3 py-2 font-semibold whitespace-nowrap">{s.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric) => (
                <tr key={metric.key} className="border-b border-border/40">
                  <td className="px-3 py-2 font-medium whitespace-nowrap">{metric.label}</td>
                  {selected.map((s) => {
                    const v = Number((s.result.finance as unknown as Record<string, number>)[metric.key]);
                    const best = isBest(metric.key, v, metric.lowerBetter);
                    return (
                      <td key={s.id} className={`px-3 py-2 text-right tabular-nums whitespace-nowrap ${best ? 'bg-eco/10 text-eco-dark font-bold' : ''}`}>
                        {metric.fmt(v)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Konfigürasyon farkları */}
      <Card>
        <CardHeader>
          <CardTitle>Konfigürasyon Farkları</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-secondary">
              <tr>
                <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">Parametre</th>
                {selected.map((s) => <th key={s.id} className="text-right px-3 py-2 font-semibold whitespace-nowrap">{s.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Lokasyon', get: (s: typeof selected[number]) => s.config.location.city ?? '—' },
                { label: 'Kurulu Güç', get: (s: typeof selected[number]) => `${s.config.pv.peakPowerKwp} kWp` },
                { label: 'Eğim / Azimut', get: (s: typeof selected[number]) => `${s.config.pv.angle}° / ${s.config.pv.aspect}°` },
                { label: 'Yıllık Tüketim', get: (s: typeof selected[number]) => formatKwh(s.config.consumption.annualKwh) },
                { label: 'Abone Grubu', get: (s: typeof selected[number]) => s.config.tariff.consumerGroup },
                { label: 'Batarya', get: (s: typeof selected[number]) => s.config.battery.enabled ? `${s.config.battery.nominalCapacityKwh} kWh / ${s.config.battery.nominalPowerKw} kW` : 'Yok' },
                { label: 'Finansman', get: (s: typeof selected[number]) => s.config.financing.type },
                { label: 'WACC', get: (s: typeof selected[number]) => `%${s.config.financing.discountRatePct}` },
                { label: 'Discount/Faiz', get: (s: typeof selected[number]) => s.config.financing.type === 'loan' ? `%${s.config.financing.interestRatePctTl}` : '—' },
                { label: 'PPA', get: (s: typeof selected[number]) => s.config.ppa?.enabled ? `${s.config.ppa.ppaPriceTlKwh} TL/kWh × ${s.config.ppa.ppaTermYears}y` : 'Yok' },
                { label: 'Karbon Kredisi', get: (s: typeof selected[number]) => s.config.carbonCredit?.enabled ? `${s.config.carbonCredit.standard} $${s.config.carbonCredit.pricePerTonUsd}/t` : 'Yok' },
              ].map((row) => (
                <tr key={row.label} className="border-b border-border/30">
                  <td className="px-3 py-1.5 font-medium whitespace-nowrap text-muted-foreground">{row.label}</td>
                  {selected.map((s) => <td key={s.id} className="px-3 py-1.5 text-right whitespace-nowrap">{row.get(s)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function ProjectPicker({ projects }: { projects: ReturnType<typeof listProjects> }) {
  const withResults = projects.filter((p) => p.status === 'completed');
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><GitCompareArrows className="h-6 w-6 text-primary" /> Senaryo Karşılaştırma</h1>
        <p className="text-sm text-muted-foreground mt-1">Karşılaştırmak istediğin 2-4 projeyi işaretle, "Karşılaştır" tıkla.</p>
      </div>

      {withResults.length < 2 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-lg font-medium mb-1">En az 2 simüle edilmiş proje gerekli</h3>
            <p className="text-sm text-muted-foreground">Şu an {withResults.length} tamamlanmış proje var. Daha fazla proje çalıştır.</p>
          </CardContent>
        </Card>
      ) : (
        <form action="/projects/compare" method="GET">
          <Card>
            <CardContent className="pt-6 space-y-2">
              {withResults.map((p) => (
                <label key={p.id} className="flex items-center gap-3 p-3 rounded-md border border-border/40 hover:bg-secondary cursor-pointer">
                  <input type="checkbox" name="ids" value={p.id} className="h-4 w-4" />
                  <div className="flex-1">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.projectType} · {new Date(p.updatedAt).toLocaleDateString('tr-TR')}</div>
                  </div>
                </label>
              ))}
              <Button type="submit" size="lg" className="w-full mt-4">
                <GitCompareArrows className="h-4 w-4 mr-2" /> Seçilenleri Karşılaştır
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Form sonrası URL: <code>/projects/compare?ids=ID1,ID2,...</code>
              </p>
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  );
}

function Pair({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium tabular-nums whitespace-nowrap ${highlight ? 'text-eco-dark' : ''}`}>{value}</span>
    </div>
  );
}
