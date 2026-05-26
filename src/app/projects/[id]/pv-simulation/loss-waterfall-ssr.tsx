/**
 * PVsyst-style Loss Diagram — SSR-friendly (server component).
 *
 * Mirrors PVsyst report Page 8 layout:
 *   1691 kWh/m²    Global horizontal irradiation
 *      ↓ +12.0%   Global incident in coll. plane
 *      ↓ -3.0%    Soiling loss factor
 *      ↓ -1.8%    IAM factor
 *      ...
 *   148.59 GWh    Array nominal energy (at STC effic.)
 *      ↓ -1.8%    PV loss due to temperature
 *      ...
 *   133.19 GWh    Energy injected into grid
 */

import { computeLosses, LossBreakdown } from '@/lib/pv-losses';

interface LossWaterfallSSRProps {
  baselineKwhPerKwp: number;
  peakPowerKwp: number;
  losses: LossBreakdown;
  eGridKwh: number;
}

export function LossWaterfallSSR({ baselineKwhPerKwp, peakPowerKwp, losses, eGridKwh }: LossWaterfallSSRProps) {
  const result = computeLosses(losses);

  // GlobHor estimate (horizontal irradiation before transposition)
  const transpositionGain = 0.13; // +13% (tilt + azimuth optimization)
  const globHor = baselineKwhPerKwp / (1 + transpositionGain);
  const globInc = baselineKwhPerKwp;

  // Array nominal energy (at STC efficiency, before losses)
  const arrayNominalKwh = (globInc * peakPowerKwp * 1.0); // would-be production at perfect STC

  // Steps grouped (PVsyst style):
  // A. Irradiance losses (apply to globHor → effective irradiance on collectors)
  // B. Module losses (apply to nominal array energy → array virtual energy at MPP)
  // C. Inverter + system losses → grid output

  const irradianceSteps = [
    { label: 'Far Shadings / Horizon', pct: -0.6 },
    { label: 'Near Shadings: irradiance loss', pct: -1.6 },
    { label: 'Soiling loss factor', pct: -losses.soilingPct },
    { label: 'IAM factor on global', pct: -losses.iamPct },
    { label: 'Ground reflection on front side', pct: +0.2 },
  ];

  const moduleSteps = [
    { label: 'PV loss due to irradiance level', pct: -0.6 },
    { label: 'PV loss due to temperature', pct: -losses.temperaturePct * 0.36 }, // PVsyst typical breakdown
    { label: 'Module quality loss', pct: +0.75 },
    { label: 'LID - Light induced degradation', pct: -2.0 },
    { label: 'Mismatch loss, modules and strings', pct: -(losses.mismatchPct + 0.15) },
    { label: 'Ohmic wiring loss', pct: -losses.dcCablingPct },
  ];

  const systemSteps = [
    { label: 'Inverter Loss during operation (efficiency)', pct: -losses.inverterPct },
    { label: 'Inverter Loss over nominal inv. power', pct: -0.1 },
    { label: 'AC ohmic loss', pct: -losses.acCablingPct },
    { label: 'System unavailability', pct: -losses.availabilityPct },
  ];

  return (
    <div className="text-[11.5px]">
      {/* IRRADIANCE BLOCK */}
      <div className="border-2 border-slate-400 rounded p-3 mb-2">
        <div className="grid grid-cols-[180px_1fr_240px] gap-2 items-baseline">
          <div className="text-right text-[13px] font-bold tabular-nums">{globHor.toFixed(0)} kWh/m²</div>
          <div></div>
          <div className="font-bold text-slate-800">Global horizontal irradiation</div>
        </div>
        <ArrowChain steps={[
          { sign: '+', pct: transpositionGain * 100, label: 'Global incident in coll. plane', emphasis: true, absValue: `${globInc.toFixed(0)} kWh/m²` },
        ]} />
        {irradianceSteps.map((s, i) => <ArrowChain key={i} steps={[{ sign: s.pct > 0 ? '+' : '-', pct: Math.abs(s.pct), label: s.label }]} />)}
        <div className="grid grid-cols-[180px_1fr_240px] gap-2 items-baseline mt-2 pt-2 border-t border-slate-300">
          <div className="text-right text-[13px] font-bold tabular-nums">
            {(globInc * 0.93).toFixed(0)} kWh/m²
          </div>
          <div></div>
          <div className="font-bold text-slate-800">Effective irradiation on collectors</div>
        </div>
        <div className="text-[10px] text-slate-500 italic mt-1 text-center">
          efficiency at STC ≈ {((eGridKwh / peakPowerKwp / globInc) * 100).toFixed(2)}% → PV conversion
        </div>
      </div>

      {/* ARRAY BLOCK */}
      <div className="border-2 border-slate-400 rounded p-3 mb-2">
        <div className="grid grid-cols-[180px_1fr_240px] gap-2 items-baseline">
          <div className="text-right text-[13px] font-bold tabular-nums">{(arrayNominalKwh * 0.93 / 1e6).toFixed(2)} GWh</div>
          <div></div>
          <div className="font-bold text-slate-800">Array nominal energy (at STC effic.)</div>
        </div>
        {moduleSteps.map((s, i) => <ArrowChain key={i} steps={[{ sign: s.pct >= 0 ? '+' : '-', pct: Math.abs(s.pct), label: s.label }]} />)}
        <div className="grid grid-cols-[180px_1fr_240px] gap-2 items-baseline mt-2 pt-2 border-t border-slate-300">
          <div className="text-right text-[13px] font-bold tabular-nums">{(eGridKwh * 1.035 / 1e6).toFixed(2)} GWh</div>
          <div></div>
          <div className="font-bold text-slate-800">Array virtual energy at MPP</div>
        </div>
      </div>

      {/* SYSTEM BLOCK */}
      <div className="border-2 border-slate-400 rounded p-3">
        {systemSteps.map((s, i) => <ArrowChain key={i} steps={[{ sign: s.pct >= 0 ? '+' : '-', pct: Math.abs(s.pct), label: s.label }]} />)}
        <div className="grid grid-cols-[180px_1fr_240px] gap-2 items-baseline mt-2 pt-2 border-t-2 border-emerald-500">
          <div className="text-right text-[14px] font-bold tabular-nums text-emerald-700">{(eGridKwh / 1e6).toFixed(2)} GWh</div>
          <div></div>
          <div className="font-bold text-emerald-800">Energy injected into grid</div>
        </div>
      </div>

      {/* Footer note */}
      <div className="mt-3 text-[10.5px] text-slate-600 grid grid-cols-3 gap-2 border-t border-slate-200 pt-2">
        <div>
          <span className="font-bold text-slate-700">Total loss:</span>{' '}
          <span className="tabular-nums text-red-600 font-semibold">−{result.totalLossPct.toFixed(2)}%</span>
        </div>
        <div>
          <span className="font-bold text-slate-700">Net yield factor:</span>{' '}
          <span className="tabular-nums text-emerald-700 font-semibold">{(result.yieldFactor * 100).toFixed(2)}%</span>
        </div>
        <div>
          <span className="font-bold text-slate-700">Net spec. yield:</span>{' '}
          <span className="tabular-nums font-semibold">{(eGridKwh / peakPowerKwp).toFixed(0)} kWh/kWp/y</span>
        </div>
      </div>
    </div>
  );
}

function ArrowChain({ steps }: { steps: Array<{ sign: '+' | '-'; pct: number; label: string; emphasis?: boolean; absValue?: string }> }) {
  return (
    <>
      {steps.map((s, i) => (
        <div key={i} className="grid grid-cols-[180px_24px_1fr_240px] gap-2 items-baseline py-0.5">
          <div className="text-right text-[11px] text-slate-500 tabular-nums">
            {s.absValue ?? ''}
          </div>
          <div className={`text-center text-[12px] font-bold tabular-nums ${s.sign === '+' ? 'text-emerald-700' : 'text-red-600'}`}>
            {s.sign}{s.pct.toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-400">↓</div>
          <div className={`text-[11.5px] ${s.emphasis ? 'font-bold text-slate-800' : 'text-slate-700'}`}>{s.label}</div>
        </div>
      ))}
    </>
  );
}
