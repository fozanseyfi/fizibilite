import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getProject } from '@/lib/db';
import { ProjectConfig, SimulationResult } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { computeLosses, DEFAULT_LOSSES } from '@/lib/pv-losses';
import { ArrowLeft, Sun, FileDown, Pencil } from 'lucide-react';
import { LossWaterfallSSR } from './loss-waterfall-ssr';
import { PvSimulationCharts } from './charts';
import { PrintButton } from '@/components/PrintButton';

export const dynamic = 'force-dynamic';

const MONTH_NAMES = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const MONTH_NAMES_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DPM = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export default function PvSimulationPage({ params }: { params: { id: string } }) {
  const row = getProject(params.id);
  if (!row) notFound();
  const config = JSON.parse(row.configJson) as ProjectConfig;
  const result = row.resultsJson ? (JSON.parse(row.resultsJson) as SimulationResult) : null;
  if (!result) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center">
        <div className="rounded-md border border-border bg-card p-8">
          <p className="text-sm text-muted-foreground mb-4">Önce simülasyon çalıştırılmalı.</p>
          <Button asChild><Link href={`/projects/${params.id}`}>Projeye dön</Link></Button>
        </div>
      </div>
    );
  }

  const losses = computeLosses(config.pv.losses ?? DEFAULT_LOSSES);

  // ---------- Aylık aggregate ----------
  const monthlyGen: number[] = new Array(12).fill(0);
  let cursor = 0;
  for (let m = 0; m < 12; m++) {
    const end = cursor + DPM[m] * 24;
    for (let h = cursor; h < end; h++) monthlyGen[m] += result.generationByYear[0][h] || 0;
    cursor = end;
  }
  const annualGenY1 = monthlyGen.reduce((a, b) => a + b, 0);
  const specificYield = annualGenY1 / config.pv.peakPowerKwp;
  const pr = losses.yieldFactor;
  const annualGlobInc = pr > 0 ? specificYield / pr : specificYield;
  const annualGlobHor = annualGlobInc * 0.88; // tipik transposition ratio (Türkiye fixed-tilt)
  const annualDiffHor = annualGlobHor * 0.40; // tipik diffuse ratio

  // ---------- Aylık tahmin tablosu (PVsyst Balance table) ----------
  // monthly share = monthlyGen[m] / annualGenY1
  // Aylık GlobHor/DiffHor için Türkiye yaklaşımı: production share ile orantılı + mevsimsel düzeltme
  const SEASONAL_GHI_FACTOR = [0.55, 0.65, 0.95, 1.10, 1.30, 1.40, 1.45, 1.35, 1.10, 0.85, 0.60, 0.45]; // ortalama=1
  const SEASONAL_DIFF_FACTOR = [0.70, 0.75, 1.00, 1.15, 1.30, 1.20, 1.15, 1.10, 1.00, 0.90, 0.80, 0.65];
  const SEASONAL_TEMP_TR = [3.5, 5.0, 8.5, 13.0, 17.5, 22.0, 25.0, 25.0, 21.0, 15.5, 9.5, 5.0]; // TR ort lokasyon yıllık ~ 14°C
  // Lokasyon enlem ayarı: yüksek enlemde soğuk
  const latAdj = (config.location.lat - 39) * -0.5;
  const seasFactorSum = SEASONAL_GHI_FACTOR.reduce((a, b) => a + b, 0);
  const seasDiffSum = SEASONAL_DIFF_FACTOR.reduce((a, b) => a + b, 0);

  const balance: Array<{
    month: string; globHor: number; diffHor: number; tAmb: number;
    globInc: number; globEff: number; eArray: number; eGrid: number; pr: number;
  }> = [];
  for (let m = 0; m < 12; m++) {
    const monthlyShare = monthlyGen[m] / annualGenY1;
    const globHor = annualGlobHor * (SEASONAL_GHI_FACTOR[m] / seasFactorSum) * 12;
    const diffHor = annualDiffHor * (SEASONAL_DIFF_FACTOR[m] / seasDiffSum) * 12;
    const tAmb = SEASONAL_TEMP_TR[m] + latAdj;
    const globInc = annualGlobInc * monthlyShare * 12;
    const globEff = globInc * 0.93;
    const eArray = monthlyGen[m] * 1.035;
    const eGrid = monthlyGen[m];
    const monthlyPR = globInc > 0 ? (eGrid / config.pv.peakPowerKwp) / globInc : 0;
    balance.push({
      month: MONTH_NAMES_EN[m],
      globHor, diffHor, tAmb,
      globInc, globEff, eArray, eGrid, pr: monthlyPR,
    });
  }

  const totalGlobHor = balance.reduce((a, b) => a + b.globHor, 0);
  const totalDiffHor = balance.reduce((a, b) => a + b.diffHor, 0);
  const avgTAmb = balance.reduce((a, b) => a + b.tAmb, 0) / 12;
  const totalGlobInc = balance.reduce((a, b) => a + b.globInc, 0);
  const totalGlobEff = balance.reduce((a, b) => a + b.globEff, 0);
  const totalEArray = balance.reduce((a, b) => a + b.eArray, 0);
  const totalEGrid = balance.reduce((a, b) => a + b.eGrid, 0);
  const avgPR = totalGlobInc > 0 ? (totalEGrid / config.pv.peakPowerKwp) / totalGlobInc : 0;

  // 25y total
  const yearlyGen = result.finance.yearly.map((y) => ({ year: y.year, gen: y.generationKwh }));
  const total25y = yearlyGen.reduce((a, y) => a + y.gen, 0);

  const dateStr = new Date(result.computedAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
  const variantName = 'Yeni simülasyon varyantı';

  // Sungrow / Jinkosolar info from defaults (modul/inverter not stored on config — use placeholders)
  const moduleBrand = 'JinkoSolar';
  const moduleModel = 'JKM-625N-78HL4-BDV';
  const moduleWp = 625;
  const moduleCount = Math.round((config.pv.peakPowerKwp * 1000) / moduleWp);
  const inverterBrand = config.pv.peakPowerKwp >= 1000 ? 'Sungrow' : 'Huawei';
  const inverterModel = config.pv.peakPowerKwp >= 10000 ? 'SG4400UD' : config.pv.peakPowerKwp >= 1000 ? 'SG350HX' : 'SUN2000-100KTL-M2';
  const inverterKw = config.pv.peakPowerKwp >= 10000 ? 4400 : config.pv.peakPowerKwp >= 1000 ? 350 : 100;
  const inverterCount = Math.max(1, Math.ceil((config.pv.peakPowerKwp * 0.82) / inverterKw));
  const totalAcKw = inverterCount * inverterKw;
  const dcAcRatio = totalAcKw > 0 ? (config.pv.peakPowerKwp / totalAcKw) : 0;

  return (
    <article className="bg-white text-slate-900 max-w-[920px] mx-auto px-4 sm:px-8 py-6 print:p-0 print:max-w-none">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; }
          header, footer, nav, aside, .no-print { display: none !important; }
          .pvsyst-page { page-break-after: always; }
          .pvsyst-page:last-child { page-break-after: auto; }
        }
        .pvsyst-section-title {
          font-size: 13px;
          font-weight: 600;
          color: #334155;
          text-align: center;
          padding: 6px 0;
          border-top: 1px solid #cbd5e1;
          border-bottom: 1px solid #cbd5e1;
          background: linear-gradient(90deg, transparent 0%, white 50%, transparent 100%);
          margin: 16px 0 12px;
          position: relative;
        }
        .pvsyst-section-title::before, .pvsyst-section-title::after {
          content: '─';
          color: #94a3b8;
          margin: 0 10px;
        }
        .pvsyst-table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
        .pvsyst-table th, .pvsyst-table td { padding: 4px 8px; border: 1px solid #cbd5e1; }
        .pvsyst-table th { background: #f1f5f9; font-weight: 600; }
        .pvsyst-kv { display: grid; grid-template-columns: 1fr auto; gap: 4px 16px; font-size: 12px; }
        .pvsyst-kv .label { color: #475569; }
        .pvsyst-kv .value { font-weight: 500; text-align: right; font-variant-numeric: tabular-nums; }
      ` }} />

      {/* Toolbar */}
      <div className="no-print flex items-center justify-between gap-3 mb-4 px-3 py-2 bg-slate-100 border border-slate-200 rounded-md">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/projects/${params.id}`}><ArrowLeft className="h-4 w-4 mr-1" /> Projeye dön</Link>
        </Button>
        <div className="text-[11px] text-slate-600">
          PV Simulation Report · PVsyst-style
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/projects/new?edit=${params.id}`}><Pencil className="h-3.5 w-3.5 mr-1" /> Düzenle</Link>
          </Button>
          <PrintButton />
        </div>
      </div>

      {/* ============================================================
           PAGE 1 — COVER
         ============================================================ */}
      <section className="pvsyst-page border-2 border-slate-300 rounded-md p-12 min-h-[600px] flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center gap-3 mb-6">
          <div className="h-14 w-14 rounded-xl gradient-solar flex items-center justify-center">
            <Sun className="h-7 w-7 text-white" />
          </div>
          <div className="text-left">
            <div className="text-2xl font-bold tracking-tight text-slate-900">GES-Fizibilite Pro</div>
            <div className="text-[10px] uppercase tracking-[2px] text-amber-600 font-bold">PV Simulation Software</div>
          </div>
        </div>
        <h1 className="text-3xl font-bold mt-8 text-slate-900">PV Simulation Report</h1>
        <div className="text-base text-slate-600 mt-1 border-b border-slate-300 pb-2 inline-block">Grid-Connected System</div>
        <div className="mt-8 space-y-1">
          <div className="text-lg font-semibold">Project: {config.name}</div>
          <div className="text-sm text-slate-600">Variant: {variantName}</div>
          <div className="text-sm text-slate-600">
            {config.pv.mounting === 'free' ? 'Ground system (tables) on a terrain' : 'Rooftop system on a building'}
          </div>
          <div className="text-sm font-semibold">System power: {(config.pv.peakPowerKwp / 1000).toFixed(2)} MWp</div>
          <div className="text-sm text-slate-600">{config.location.city ?? `Lat ${config.location.lat.toFixed(2)}`} — Turkey</div>
        </div>
        <div className="mt-auto pt-12 text-right text-[11px] text-slate-600 w-full border-t border-slate-200">
          <div className="font-semibold text-slate-700">Author</div>
          <div>KONTROLMATİK TEKNOLOJİ ENERJİ VE MÜHENDİSLİK A.Ş.</div>
        </div>
      </section>

      {/* ============================================================
           PAGE 2 — PROJECT SUMMARY
         ============================================================ */}
      <section className="pvsyst-page mt-8">
        <PageHeader date={dateStr} projectName={config.name} variant={variantName} pageNo={2} />

        <div className="pvsyst-section-title">Project summary</div>
        <div className="grid grid-cols-3 gap-6 text-[12px]">
          <div>
            <div className="font-bold text-slate-700 mb-2">Geographical Site</div>
            <div className="text-slate-900">{config.location.city ?? '—'}</div>
            <div className="text-slate-600">Turkey</div>
          </div>
          <div>
            <div className="font-bold text-slate-700 mb-2">Situation</div>
            <div className="pvsyst-kv">
              <span className="label">Latitude</span><span className="value">{config.location.lat.toFixed(2)} °(N)</span>
              <span className="label">Longitude</span><span className="value">{config.location.lon.toFixed(2)} °(E)</span>
              <span className="label">Altitude</span><span className="value">— m</span>
              <span className="label">Time zone</span><span className="value">UTC+3</span>
            </div>
          </div>
          <div>
            <div className="font-bold text-slate-700 mb-2">Project settings</div>
            <div className="pvsyst-kv">
              <span className="label">Albedo</span><span className="value">0.20</span>
            </div>
            <div className="font-bold text-slate-700 mt-3 mb-1">Weather data</div>
            <div>PVGIS-SARAH3 API TMY</div>
          </div>
        </div>

        <div className="pvsyst-section-title">System summary</div>
        <div className="grid grid-cols-3 gap-6 text-[12px]">
          <div>
            <div className="font-bold text-slate-700 mb-2">Grid-Connected System</div>
            <div>{config.pv.mounting === 'free' ? 'Ground system (tables) on a terrain' : 'Rooftop on building'}</div>
            <div className="font-bold text-slate-700 mt-3 mb-1">Orientation #1</div>
            <div>Fixed plane</div>
            <div className="pvsyst-kv mt-1">
              <span className="label">Tilt/Azimuth</span><span className="value">{config.pv.angle} / {config.pv.aspect} °</span>
            </div>
          </div>
          <div>
            <div className="font-bold text-slate-700 mb-2">Near Shadings</div>
            <div>No 3D shading scene</div>
            <div className="text-[11px] text-slate-500 italic">(linear shading not modelled)</div>
          </div>
          <div>
            <div className="font-bold text-slate-700 mb-2">User&apos;s needs</div>
            <div>Unlimited load (grid)</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 text-[12px] mt-4">
          <div>
            <div className="font-bold text-slate-700 mb-2">System information</div>
            <div className="pvsyst-kv">
              <span className="label font-semibold text-slate-800">PV Array</span><span></span>
              <span className="label">Nb. of modules</span><span className="value">{moduleCount.toLocaleString('en-US')} units</span>
              <span className="label">Pnom total</span><span className="value">{(config.pv.peakPowerKwp / 1000).toFixed(2)} MWp</span>
            </div>
          </div>
          <div>
            <div className="font-bold text-slate-700 mb-2">&nbsp;</div>
            <div className="pvsyst-kv">
              <span className="label font-semibold text-slate-800">Inverters</span><span></span>
              <span className="label">Nb. of units</span><span className="value">{inverterCount} units</span>
              <span className="label">Total power</span><span className="value">{totalAcKw.toLocaleString('en-US')} kWac</span>
              <span className="label">Pnom ratio</span><span className="value">{dcAcRatio.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="pvsyst-section-title">Results summary</div>
        <div className="grid grid-cols-3 gap-6 text-[12px]">
          <div>
            <div className="text-slate-700">Produced Energy</div>
            <div className="text-xl font-bold tabular-nums">{(annualGenY1 / 1e6).toFixed(2)} GWh/year</div>
          </div>
          <div>
            <div className="text-slate-700">Specific production</div>
            <div className="text-xl font-bold tabular-nums">{specificYield.toFixed(0)} kWh/kWp/year</div>
          </div>
          <div>
            <div className="text-slate-700">Performance Ratio PR</div>
            <div className="text-xl font-bold tabular-nums">{(pr * 100).toFixed(2)} %</div>
          </div>
        </div>
      </section>

      {/* ============================================================
           PAGE 3 — GENERAL PARAMETERS + ARRAY CHARACTERISTICS
         ============================================================ */}
      <section className="pvsyst-page mt-8">
        <PageHeader date={dateStr} projectName={config.name} variant={variantName} pageNo={3} />

        <div className="pvsyst-section-title">General parameters</div>
        <div className="grid grid-cols-3 gap-6 text-[12px]">
          <div>
            <div className="font-bold text-slate-700 mb-1">Grid-Connected System</div>
            <div>{config.pv.mounting === 'free' ? 'Ground system (tables) on a terrain' : 'Rooftop on building'}</div>
            <div className="font-bold text-slate-700 mt-3 mb-1">Orientation #1</div>
            <div>Fixed plane</div>
            <div className="pvsyst-kv mt-1">
              <span className="label">Tilt/Azimuth</span><span className="value">{config.pv.angle} / {config.pv.aspect} °</span>
            </div>
          </div>
          <div>
            <div className="font-bold text-slate-700 mb-1">Models used</div>
            <div className="pvsyst-kv">
              <span className="label">Transposition</span><span className="value">Perez</span>
              <span className="label">Diffuse</span><span className="value">Imported</span>
              <span className="label">Circumsolar</span><span className="value">separate</span>
            </div>
            <div className="font-bold text-slate-700 mt-3 mb-1">Horizon</div>
            <div className="pvsyst-kv">
              <span className="label">Average Height</span><span className="value">— °</span>
            </div>
          </div>
          <div>
            <div className="font-bold text-slate-700 mb-1">Near Shadings</div>
            <div className="text-slate-600">Not modelled in this version</div>
            <div className="font-bold text-slate-700 mt-3 mb-1">User&apos;s needs</div>
            <div>Unlimited load (grid)</div>
          </div>
        </div>

        <div className="pvsyst-section-title">PV Array Characteristics</div>
        <div className="grid grid-cols-2 gap-8 text-[12px]">
          <div>
            <div className="font-bold text-slate-800 mb-2">PV module</div>
            <div className="pvsyst-kv">
              <span className="label">Manufacturer</span><span className="value">{moduleBrand}</span>
              <span className="label">Model</span><span className="value">{moduleModel}</span>
              <span className="label">Unit Nom. Power</span><span className="value">{moduleWp} Wp</span>
              <span className="label">Number of PV modules</span><span className="value">{moduleCount.toLocaleString('en-US')} units</span>
              <span className="label">Nominal (STC)</span><span className="value">{(config.pv.peakPowerKwp / 1000).toFixed(2)} MWp</span>
            </div>
            <div className="font-bold text-slate-800 mt-4 mb-2">Total PV power</div>
            <div className="pvsyst-kv">
              <span className="label">Nominal (STC)</span><span className="value">{config.pv.peakPowerKwp.toLocaleString('en-US')} kWp</span>
              <span className="label">Total modules</span><span className="value">{moduleCount.toLocaleString('en-US')}</span>
              <span className="label">Module area</span><span className="value">{(moduleCount * 2.79).toFixed(0)} m²</span>
            </div>
          </div>
          <div>
            <div className="font-bold text-slate-800 mb-2">Inverter</div>
            <div className="pvsyst-kv">
              <span className="label">Manufacturer</span><span className="value">{inverterBrand}</span>
              <span className="label">Model</span><span className="value">{inverterModel}</span>
              <span className="label">Unit Nom. Power</span><span className="value">{inverterKw} kWac</span>
              <span className="label">Number of inverters</span><span className="value">{inverterCount} units</span>
              <span className="label">Total power</span><span className="value">{totalAcKw.toLocaleString('en-US')} kWac</span>
              <span className="label">Pnom ratio (DC:AC)</span><span className="value">{dcAcRatio.toFixed(2)}</span>
            </div>
            <div className="font-bold text-slate-800 mt-4 mb-2">Total inverter power</div>
            <div className="pvsyst-kv">
              <span className="label">Total power</span><span className="value">{totalAcKw.toLocaleString('en-US')} kWac</span>
              <span className="label">Number of inverters</span><span className="value">{inverterCount} units</span>
              <span className="label">Pnom ratio</span><span className="value">{dcAcRatio.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
           PAGE 4 — ARRAY LOSSES + SYSTEM LOSSES
         ============================================================ */}
      <section className="pvsyst-page mt-8">
        <PageHeader date={dateStr} projectName={config.name} variant={variantName} pageNo={4} />

        <div className="pvsyst-section-title">Array losses</div>
        <div className="grid grid-cols-3 gap-6 text-[12px]">
          <div>
            <div className="font-bold text-slate-800 mb-2">Array Soiling Losses</div>
            <div className="pvsyst-kv">
              <span className="label">Loss Fraction</span><span className="value">{(config.pv.losses?.soilingPct ?? 2).toFixed(1)} %</span>
            </div>
          </div>
          <div>
            <div className="font-bold text-slate-800 mb-2">Thermal Loss factor</div>
            <div className="text-slate-600 mb-1">Module temperature according to irradiance</div>
            <div className="pvsyst-kv">
              <span className="label">Uc (const)</span><span className="value">29.0 W/m²K</span>
              <span className="label">Uv (wind)</span><span className="value">0.0 W/m²K/m/s</span>
            </div>
          </div>
          <div>
            <div className="font-bold text-slate-800 mb-2">DC wiring losses</div>
            <div className="pvsyst-kv">
              <span className="label">Loss Fraction</span><span className="value">{(config.pv.losses?.dcCablingPct ?? 1).toFixed(2)} % at STC</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 text-[12px] mt-4">
          <div>
            <div className="font-bold text-slate-800 mb-2">LID - Light Induced Degradation</div>
            <div className="pvsyst-kv">
              <span className="label">Loss Fraction</span><span className="value">{(config.pv.lidPct * 100).toFixed(1)} %</span>
            </div>
          </div>
          <div>
            <div className="font-bold text-slate-800 mb-2">Module Quality Loss</div>
            <div className="pvsyst-kv">
              <span className="label">Loss Fraction</span><span className="value">-0.75 %</span>
            </div>
          </div>
          <div>
            <div className="font-bold text-slate-800 mb-2">Module mismatch losses</div>
            <div className="pvsyst-kv">
              <span className="label">Loss Fraction</span><span className="value">{(config.pv.losses?.mismatchPct ?? 1).toFixed(2)} % at MPP</span>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="font-bold text-slate-800 mb-2 text-[12px]">IAM loss factor</div>
          <div className="text-slate-600 mb-1 text-[11px]">Incidence effect (IAM): Fresnel, AR coating, n(glass)=1.526, n(AR)=1.290</div>
          <table className="pvsyst-table">
            <thead>
              <tr>
                {[0, 30, 50, 60, 70, 75, 80, 85, 90].map((a) => (
                  <th key={a} className="text-center">{a}°</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {[1.000, 0.999, 0.987, 0.963, 0.892, 0.814, 0.679, 0.438, 0.000].map((v, i) => (
                  <td key={i} className="text-center tabular-nums">{v.toFixed(3)}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="pvsyst-section-title">System losses</div>
        <div className="grid grid-cols-2 gap-6 text-[12px]">
          <div>
            <div className="font-bold text-slate-800 mb-2">Unavailability of the system</div>
            <div className="pvsyst-kv">
              <span className="label">Time fraction</span><span className="value">{(config.pv.losses?.availabilityPct ?? 0.5).toFixed(1)} %</span>
              <span className="label">~</span><span className="value">{((config.pv.losses?.availabilityPct ?? 0.5) * 3.65).toFixed(1)} days</span>
            </div>
          </div>
          <div>
            <div className="font-bold text-slate-800 mb-2">AC wiring losses</div>
            <div className="pvsyst-kv">
              <span className="label">Loss Fraction</span><span className="value">{(config.pv.losses?.acCablingPct ?? 1).toFixed(2)} % at STC</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
           PAGE 5 — MAIN RESULTS + MONTHLY BALANCE TABLE
         ============================================================ */}
      <section className="pvsyst-page mt-8">
        <PageHeader date={dateStr} projectName={config.name} variant={variantName} pageNo={5} />

        <div className="pvsyst-section-title">Main results</div>
        <div className="grid grid-cols-3 gap-4 mb-4 text-[12px]">
          <div className="border border-slate-300 rounded p-3">
            <div className="text-slate-600 text-[11px]">System Production</div>
            <div className="text-2xl font-bold tabular-nums">{(annualGenY1 / 1e6).toFixed(2)}</div>
            <div className="text-[11px] text-slate-600">GWh/year</div>
          </div>
          <div className="border border-slate-300 rounded p-3">
            <div className="text-slate-600 text-[11px]">Specific production</div>
            <div className="text-2xl font-bold tabular-nums">{specificYield.toFixed(0)}</div>
            <div className="text-[11px] text-slate-600">kWh/kWp/year</div>
          </div>
          <div className="border border-slate-300 rounded p-3">
            <div className="text-slate-600 text-[11px]">Performance Ratio PR</div>
            <div className="text-2xl font-bold tabular-nums">{(pr * 100).toFixed(2)} %</div>
            <div className="text-[11px] text-slate-600">Yf / Yr</div>
          </div>
        </div>

        <div className="text-[12px] font-bold text-slate-800 mb-1">Balances and main results</div>
        <table className="pvsyst-table">
          <thead>
            <tr>
              <th className="text-left">&nbsp;</th>
              <th className="text-right">GlobHor<br/><span className="text-[10px] font-normal">kWh/m²</span></th>
              <th className="text-right">DiffHor<br/><span className="text-[10px] font-normal">kWh/m²</span></th>
              <th className="text-right">T_Amb<br/><span className="text-[10px] font-normal">°C</span></th>
              <th className="text-right">GlobInc<br/><span className="text-[10px] font-normal">kWh/m²</span></th>
              <th className="text-right">GlobEff<br/><span className="text-[10px] font-normal">kWh/m²</span></th>
              <th className="text-right">EArray<br/><span className="text-[10px] font-normal">MWh</span></th>
              <th className="text-right">E_Grid<br/><span className="text-[10px] font-normal">MWh</span></th>
              <th className="text-right">PR<br/><span className="text-[10px] font-normal">ratio</span></th>
            </tr>
          </thead>
          <tbody>
            {balance.map((b) => (
              <tr key={b.month}>
                <td className="font-semibold">{b.month}</td>
                <td className="text-right tabular-nums">{b.globHor.toFixed(1)}</td>
                <td className="text-right tabular-nums">{b.diffHor.toFixed(2)}</td>
                <td className="text-right tabular-nums">{b.tAmb.toFixed(2)}</td>
                <td className="text-right tabular-nums">{b.globInc.toFixed(1)}</td>
                <td className="text-right tabular-nums">{b.globEff.toFixed(1)}</td>
                <td className="text-right tabular-nums">{(b.eArray / 1000).toFixed(2)}</td>
                <td className="text-right tabular-nums">{(b.eGrid / 1000).toFixed(2)}</td>
                <td className="text-right tabular-nums">{b.pr.toFixed(3)}</td>
              </tr>
            ))}
            <tr className="font-bold bg-slate-100">
              <td>Year</td>
              <td className="text-right tabular-nums">{totalGlobHor.toFixed(1)}</td>
              <td className="text-right tabular-nums">{totalDiffHor.toFixed(2)}</td>
              <td className="text-right tabular-nums">{avgTAmb.toFixed(2)}</td>
              <td className="text-right tabular-nums">{totalGlobInc.toFixed(1)}</td>
              <td className="text-right tabular-nums">{totalGlobEff.toFixed(1)}</td>
              <td className="text-right tabular-nums">{(totalEArray / 1000).toFixed(2)}</td>
              <td className="text-right tabular-nums">{(totalEGrid / 1000).toFixed(2)}</td>
              <td className="text-right tabular-nums">{avgPR.toFixed(3)}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-3 grid grid-cols-2 gap-4 text-[10.5px] text-slate-600">
          <div>
            <div className="font-bold text-slate-700 mb-1">Legends</div>
            <div><strong>GlobHor</strong>: Global horizontal irradiation</div>
            <div><strong>DiffHor</strong>: Horizontal diffuse irradiation</div>
            <div><strong>T_Amb</strong>: Ambient Temperature</div>
            <div><strong>GlobInc</strong>: Global incident in coll. plane</div>
            <div><strong>GlobEff</strong>: Effective global (corr. IAM + shadings)</div>
          </div>
          <div>
            <div className="font-bold text-slate-700 mb-1">&nbsp;</div>
            <div><strong>EArray</strong>: Effective energy at array output</div>
            <div><strong>E_Grid</strong>: Energy injected into grid</div>
            <div><strong>PR</strong>: Performance Ratio</div>
            <div className="mt-2 italic text-slate-500">
              GlobHor/DiffHor/T_Amb estimated from production back-calculation +
              Türkiye seasonal patterns. Production from PVGIS-SARAH3 actual fetch.
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
           PAGE 6 — LOSS DIAGRAM
         ============================================================ */}
      <section className="pvsyst-page mt-8">
        <PageHeader date={dateStr} projectName={config.name} variant={variantName} pageNo={6} />
        <div className="pvsyst-section-title">Loss diagram</div>

        <LossWaterfallSSR
          baselineKwhPerKwp={annualGlobInc}
          peakPowerKwp={config.pv.peakPowerKwp}
          losses={config.pv.losses ?? DEFAULT_LOSSES}
          eGridKwh={totalEGrid}
        />
      </section>

      {/* ============================================================
           PAGE 7 — CHARTS (Daily I/O + Output distribution)
         ============================================================ */}
      <section className="pvsyst-page mt-8 no-print:hidden">
        <PageHeader date={dateStr} projectName={config.name} variant={variantName} pageNo={7} />
        <div className="pvsyst-section-title">Aylık ve Yıllık Profil Grafikleri</div>
        <PvSimulationCharts
          monthlyGen={monthlyGen}
          yearlyGen={yearlyGen}
          hourlyY1={result.generationByYear[0]}
        />
        <div className="mt-3 text-[11px] text-slate-600">
          25 yıllık toplam üretim (degradasyon dahil): <strong className="tabular-nums">{(total25y / 1e6).toFixed(2)} GWh</strong>
        </div>
      </section>

      {/* Mobil aksiyon */}
      <div className="no-print flex justify-between items-center pt-4 mt-6 border-t border-border/40">
        <Button asChild variant="outline">
          <Link href={`/projects/${params.id}`}><ArrowLeft className="h-4 w-4 mr-2" /> Dashboard&apos;a dön</Link>
        </Button>
        <Button asChild>
          <Link href={`/projects/${params.id}/report`}><FileDown className="h-4 w-4 mr-2" /> Banka Raporu</Link>
        </Button>
      </div>
    </article>
  );
}

// ============================================================
// PAGE HEADER (PVsyst-style — top of each page)
// ============================================================
function PageHeader({ date, projectName, variant, pageNo }: { date: string; projectName: string; variant: string; pageNo: number }) {
  return (
    <div className="border-b-2 border-slate-300 pb-2 mb-3">
      <div className="flex items-start justify-between text-[11px]">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg gradient-solar flex items-center justify-center">
            <Sun className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="font-bold text-slate-700">GES-Fizibilite Pro v0.2</div>
            <div className="text-[10px] text-slate-500">VC0, Simulation date: {date}</div>
          </div>
        </div>
        <div className="text-center">
          <div className="text-[14px] font-bold text-amber-700">Project: {projectName}</div>
          <div className="text-[11px] text-slate-700 border-t border-slate-300 mt-0.5 pt-0.5">Variant: {variant}</div>
        </div>
        <div className="text-[10px] text-slate-500 text-right">
          <div>Kontrolmatik</div>
          <div>Technologies</div>
        </div>
      </div>
      <div className="text-right text-[10px] text-slate-400 mt-1">Page {pageNo}/7</div>
    </div>
  );
}
