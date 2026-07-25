'use client';

import { useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Kpi, KpiGrid, CumulativeChart } from '@/components/models/charts';
import { Glossary, UTILITY_TERMS } from '@/components/models/glossary';
import { computeUtility, computeUtilityHuawei } from '@/lib/models/utility/engine';
import type { UtilityInputs, UtilityModel } from '@/lib/models/utility/engine';
import { musd, usd, pct, nf } from '@/lib/models/fmt';

function solveMult(fn: (x: number) => number, target: number, lo: number, hi: number): number {
  let flo = fn(lo) - target, fhi = fn(hi) - target;
  if (!isFinite(flo) || !isFinite(fhi) || flo * fhi > 0) return NaN;
  for (let i = 0; i < 55; i++) {
    const m = (lo + hi) / 2, fm = fn(m) - target;
    if (flo * fm <= 0) { hi = m; fhi = fm; } else { lo = m; flo = fm; }
  }
  return (lo + hi) / 2;
}

export function UtilityDashboard({ inputs }: { inputs: UtilityInputs }) {
  const m = useMemo(() => computeUtility(inputs), [inputs]);
  const hw = useMemo(() => computeUtilityHuawei(inputs, m), [inputs, m]);
  const tlMode = inputs.cur === 'tl';
  const pvCapex = inputs.mw * 1000 * inputs.capexUnit;

  const cumPoints = useMemo(() => {
    const pts = [-m.baseCost];
    let cum = -m.baseCost;
    m.yrs.forEach((y) => { cum += y.fcf / Math.pow(1 + m.r, y.t); pts.push(cum); });
    return pts;
  }, [m]);

  const hwPoints = useMemo(() => {
    const pts = [-hw.dCapex];
    let cum = -hw.dCapex;
    hw.dFCFs.forEach((cf, i) => { cum += cf / Math.pow(1 + m.r, i + 1); pts.push(cum); });
    return pts;
  }, [hw, m.r]);

  const sens = useMemo(() => {
    const pMults = [0.9, 1, 1.1], eMults = [1.05, 1, 0.95];
    const rows = eMults.map((em) => pMults.map((pm) => computeUtility(inputs, { prodMult: em, priceMult: pm })));
    const up = computeUtility(inputs, { dCapex: pvCapex * 0.1 });
    const dn = computeUtility(inputs, { dCapex: -pvCapex * 0.1 });
    return { rows, pMults, eMults, up, dn };
  }, [inputs, pvCapex]);

  const be = useMemo(() => {
    const mP = solveMult((x) => computeUtility(inputs, { priceMult: x }).npv, 0, 0.05, 3);
    const mE = solveMult((x) => computeUtility(inputs, { prodMult: x }).npv, 0, 0.05, 3);
    const mC = solveMult((x) => computeUtility(inputs, { dCapex: (x - 1) * m.baseCost }).npv, 0, 0.05, 6);
    return { mP, mE, mC };
  }, [inputs, m.baseCost]);

  const bankOk = Number.isFinite(m.minDSCR) ? m.minDSCR >= 1.2 && m.llcr >= 1.2 && m.residual <= 1 : true;

  return (
    <Tabs defaultValue="fiz">
      <TabsList>
        <TabsTrigger value="fiz">1 · Fizibilite Modeli</TabsTrigger>
        <TabsTrigger value="hw">2 · Huawei Değer Analizi</TabsTrigger>
        <TabsTrigger value="gloss">3 · Finansal Sözlük</TabsTrigger>
      </TabsList>

      {/* ============ FIZIBILITE ============ */}
      <TabsContent value="fiz" className="space-y-5">
        {/* Kaynak-Kullanım */}
        <div className="grid md:grid-cols-2 gap-3">
          <SuTable title="Kullanımlar (Uses)" rows={[
            ['PV EPC CAPEX', musd(pvCapex)],
            ...(inputs.bessOn ? [['BESS CAPEX', musd(m.bessCapex)]] as [string, string][] : []),
            ['IDC (inşaat faizi)', usd(m.idc)],
            ['Kredi düzenleme ücreti', usd(m.fee)],
            ['DSRA fonlaması', usd(m.dsra)],
            ...(m.vatC > 0 ? [['KDV taşıma maliyeti', usd(m.vatC)]] as [string, string][] : []),
          ]} total={['Toplam kullanım', musd(m.totalUses)]} />
          <SuTable title="Kaynaklar (Sources)" rows={[
            [`Kıdemli kredi (%${nf(inputs.debt, 0)})`, musd(m.debt)],
            [`Özkaynak (%${nf(100 - inputs.debt, 0)})`, musd(m.equity)],
          ]} total={['Toplam kaynak', musd(m.totalUses)]} />
        </div>

        {/* KPI */}
        <KpiGrid>
          <Kpi label="NPV" value={musd(m.npv)} tone={m.npv >= 0 ? 'good' : 'bad'} hint="Vergi sonrası, kaldıraçsız" />
          <Kpi label="Proje IRR" value={pct(m.irr * 100, 1)} tone="navy" hint="Kaldıraçsız" />
          <Kpi label="Equity IRR" value={pct(m.eIRR * 100, 1)} tone="navy" hint="DSRA iadesi dahil" />
          <Kpi label="LCOE" value={`${nf(m.lcoe, 1)}`} tone="navy" hint="$/MWh" />
          <Kpi label="Min / Ort DSCR" value={Number.isFinite(m.minDSCR) ? `${nf(m.minDSCR, 2)} / ${nf(m.avgDSCR, 2)}` : '—'} tone="navy" hint="Eşik ≥ 1,20-1,30" />
          <Kpi label="LLCR" value={nf(m.llcr, 2)} tone="navy" hint="Kredi ömrü karşılama" />
          <Kpi label="PLCR" value={nf(m.plcr, 2)} tone="navy" hint="Proje ömrü karşılama" />
          <Kpi label="Payback / MOIC" value={`${nf(m.pbS, 2)}y`} tone="navy" hint={`iskontolu ${nf(m.pbD, 2)}y · MOIC ${nf(m.moic, 2)}x`} />
          {inputs.bessOn && <Kpi label="LCOS" value={nf(m.lcos, 1)} tone="navy" hint="$/MWh deşarj" />}
        </KpiGrid>

        <div className={`rounded-lg px-4 py-3 text-sm font-medium ${m.npv >= 0 && bankOk ? 'bg-eco/10 text-eco-dark' : 'bg-destructive/10 text-destructive'}`}>
          {m.npv >= 0 && bankOk
            ? `✔ Model finanse edilebilir görünüyor: NPV pozitif, proje IRR ${pct(m.irr * 100, 1)} > r ${pct(m.r * 100, 1)}, min DSCR ${nf(m.minDSCR, 2)}, LLCR ${nf(m.llcr, 2)}, equity IRR ${pct(m.eIRR * 100, 1)}.`
            : m.residual > 1 ? `⚠ Sculpting ile vade sonunda ${usd(m.residual)} bakiye kalıyor — gearing'i düşür veya vadeyi uzat.`
            : `⚠ NPV negatif veya borç tarafı zayıf: fiyat, üretim veya CAPEX varsayımlarını gözden geçir.`}
        </div>

        {/* Kümülatif grafik */}
        <Section title="Kümülatif İskontolu Serbest Nakit Akışı (kaldıraçsız)">
          <CumulativeChart points={cumPoints} unit="$" />
        </Section>

        {/* Nakit akış tablosu */}
        <Section title="İşletme Dönemi Nakit Akışı">
          <ScrollTable
            head={['Yıl', ...(tlMode ? ['Kur (TL/$)'] : []), 'PV (MWh)', 'Gelir ($)', 'OPEX ($)', 'EBITDA ($)', 'Vergi ($)', 'Bakım CAPEX ($)', 'FCF ($)', 'DSCR']}
            rows={cashRows(m, tlMode)}
          />
        </Section>

        {/* Borç takvimi */}
        <Section title="Borç Takvimi">
          <ScrollTable
            head={['Yıl', 'Açılış ($)', 'Faiz ($)', 'Anapara ($)', 'Taksit ($)', 'Kapanış ($)', 'CFADS ($)', 'DSCR']}
            rows={debtRows(m, inputs.grace, inputs.tenor)}
          />
        </Section>

        {/* Duyarlılık */}
        <Section title="Duyarlılık — Proje IRR / Min. DSCR">
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-[12px] font-mono text-center">
              <tbody>
                <tr className="bg-secondary/50">
                  <th className="p-2 text-left font-semibold">IRR / min DSCR</th>
                  {sens.pMults.map((pm, i) => (
                    <th key={i} className="p-2 font-semibold">Fiyat {pm === 1 ? 'baz' : pm > 1 ? '+10%' : '−10%'}</th>
                  ))}
                </tr>
                {sens.eMults.map((em, ri) => (
                  <tr key={ri} className="border-t border-border">
                    <th className="p-2 text-left font-semibold">Üretim {em === 1 ? 'baz' : em > 1 ? '+5%' : '−5%'}</th>
                    {sens.rows[ri].map((s, ci) => {
                      const ok = s.irr >= m.r && s.minDSCR >= 1.2;
                      const base = em === 1 && sens.pMults[ci] === 1;
                      return (
                        <td key={ci} className={`p-2 ${base ? 'font-semibold text-amber-700' : ok ? 'text-eco-dark' : 'text-destructive'}`} style={base ? { background: 'rgba(232,160,32,0.12)' } : undefined}>
                          {pct(s.irr * 100, 1)} / {nf(s.minDSCR, 2)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            CAPEX duyarlılığı: +%10 → IRR {pct(sens.up.irr * 100, 1)} / DSCR {nf(sens.up.minDSCR, 2)} · −%10 → IRR {pct(sens.dn.irr * 100, 1)} / DSCR {nf(sens.dn.minDSCR, 2)}
          </p>
        </Section>

        {/* Kırılma noktası */}
        <Section title="Kırılma Noktası (Breakeven) — NPV = 0">
          <ScrollTable
            head={['Kırılma noktası', 'Seviye', 'Güvenlik marjı']}
            align="left"
            rows={[
              ['Elektrik fiyatı', beLevel(be.mP, tlMode ? `${nf(inputs.priceTL * (be.mP || 0), 0)} TL/MWh` : `${nf(inputs.price * (be.mP || 0), 1)} $/MWh`), beMargin(be.mP)],
              ['Üretim', beLevel(be.mE, `${nf(inputs.spec * (be.mE || 0), 0)} kWh/kWp`), beMargin(be.mE)],
              ['CAPEX', beLevel(be.mC, `${nf(inputs.capexUnit * (be.mC || 0), 1)} $/kWp`), beMargin(be.mC, true)],
            ]}
          />
          <p className="text-[11px] text-muted-foreground mt-2">
            NPV = 0 satırları: projenin beklenen getiriyi tam karşıladığı sınır. Marj = bazdan kırılmaya uzaklık.
          </p>
        </Section>
      </TabsContent>

      {/* ============ HUAWEI ============ */}
      <TabsContent value="hw" className="space-y-5">
        <div className="rounded-lg bg-primary text-primary-foreground p-5" style={{ background: 'linear-gradient(135deg,#0E2A5E,#18428F)' }}>
          <div className="text-[11px] uppercase tracking-[0.16em] text-amber-300 font-mono mb-2">Özet değerlendirme</div>
          <p className="text-[15px] leading-relaxed text-white">
            Huawei çözümü için inverter başına {nf(hw.diff, 0)} $, toplamda <b className="text-amber-300">{usd(hw.dCapex)}</b> fark ödüyorsunuz;
            bu fark ilk yıldan itibaren yılda <b className="text-amber-300">{usd(hw.annual1)}</b> ek değer üretiyor.
            Fark yatırımının kendi getirisi <b className="text-amber-300">{pct(hw.dIRR * 100, 1)} IRR</b> — projenin geri kalanının getirisinden (%{nf(m.irr * 100, 1)}) yüksek.
            Santral ömrü boyunca vergi sonrası <b className="text-amber-300">{usd(hw.dNPV)}</b> net bugünkü kazanç, LCOE'de {nf(m.lcoe, 1)} → <b className="text-amber-300">{nf(hw.hwModel.lcoe, 1)} $/MWh</b> iyileşme.
          </p>
        </div>

        <KpiGrid>
          <Kpi label="Ek yatırım (ΔCAPEX)" value={usd(hw.dCapex)} tone="bad" hint={`${nf(hw.count, 0)} adet × ${nf(hw.diff, 0)} $`} />
          <Kpi label="Yıllık ek değer" value={usd(hw.annual1)} tone="good" hint="1. yıl, vergi öncesi" />
          <Kpi label="ΔNPV · net kazanç" value={usd(hw.dNPV)} tone="good" hint="Vergi sonrası" />
          <Kpi label="Artımlı IRR" value={pct(hw.dIRR * 100, 1)} tone="good" hint="Fark yatırımının getirisi" />
          <Kpi label="Fark geri ödeme" value={`${nf(hw.dPB, 1)}y`} tone="navy" />
          <Kpi label="LCOE · Baz → Huawei" value={`${nf(m.lcoe, 1)} → ${nf(hw.hwModel.lcoe, 1)}`} tone="navy" hint="$/MWh" />
          <Kpi label="LLCR · Baz → Huawei" value={`${nf(m.llcr, 2)} → ${nf(hw.hwModel.llcr, 2)}`} tone="navy" />
          <Kpi label="Ek üretim (1. yıl)" value={`${nf(hw.extraMWh1, 0)} MWh`} tone="navy" />
        </KpiGrid>

        <Section title="Huawei Farkının Kümülatif Net Değeri (iskontolu, vergi sonrası)">
          <CumulativeChart points={hwPoints} color="#C7000B" unit="$" />
        </Section>
      </TabsContent>

      {/* ============ SÖZLÜK ============ */}
      <TabsContent value="gloss">
        <p className="text-sm text-muted-foreground mb-3">Proje finansmanı sürecinde karşılaşılan temel terimler — tanım ve formülleriyle.</p>
        <Glossary items={UTILITY_TERMS} />
      </TabsContent>
    </Tabs>
  );
}

// ---------- helpers ----------
function beLevel(mult: number, abs: string): string {
  return Number.isFinite(mult) ? `Bazın %${nf(mult * 100, 1)}'i → ${abs}` : 'Aralıkta kırılma yok';
}
function beMargin(mult: number, up = false): string {
  if (!Number.isFinite(mult)) return '—';
  return `${nf(Math.abs(1 - mult) * 100, 1)} puan ${mult < 1 ? 'düşüş' : 'artış'} marjı`;
}

function cashRows(m: UtilityModel, tl: boolean): (string | JSX.Element)[][] {
  let cum = -m.baseCost;
  const rows: string[][] = [];
  rows.push(['0', ...(tl ? [nf(m.yrs[0].fx ?? 0, 1)] : []), '—', '—', '—', '—', '—', '—', usd(-m.baseCost), '—']);
  m.yrs.forEach((y) => {
    cum += y.fcf;
    rows.push([
      String(y.t),
      ...(tl ? [nf(y.fx ?? 0, 1)] : []),
      nf(y.E, 0),
      nf(y.revPV + y.revB, 0),
      nf(y.opexPV + y.opexB, 0),
      nf(y.ebitda, 0),
      nf(y.taxU, 0),
      y.capexM ? nf(y.capexM, 0) : '—',
      nf(y.fcf, 0),
      Number.isFinite(y.dscr) ? nf(y.dscr, 2) : '—',
    ]);
  });
  return rows;
}

function debtRows(m: UtilityModel, grace: number, tenor: number): string[][] {
  const rows: string[][] = [];
  let open = m.debt;
  m.yrs.forEach((y) => {
    if (y.t <= tenor && open > 1e-6) {
      rows.push([
        `${y.t}${y.t <= grace ? ' (grace)' : ''}`,
        nf(open, 0), nf(y.interest, 0), nf(y.principal, 0), nf(y.ds, 0), nf(y.balEnd, 0), nf(y.cfads, 0),
        Number.isFinite(y.dscr) ? nf(y.dscr, 2) : '—',
      ]);
      open = y.balEnd;
    }
  });
  return rows;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[13px] font-bold mb-2">{title}</h3>
      <Card className="p-4">{children}</Card>
    </div>
  );
}

function SuTable({ title, rows, total }: { title: string; rows: [string, string][]; total: [string, string] }) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="px-4 py-2 bg-secondary/50 text-[11px] font-mono uppercase tracking-wider text-primary font-semibold">{title}</div>
      <table className="w-full text-[12.5px] font-mono">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} className="border-t border-border/50"><td className="px-4 py-1.5">{k}</td><td className="px-4 py-1.5 text-right">{v}</td></tr>
          ))}
          <tr className="border-t-2 border-amber-400/60 font-semibold" style={{ background: 'rgba(232,160,32,0.1)' }}>
            <td className="px-4 py-2">{total[0]}</td><td className="px-4 py-2 text-right">{total[1]}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function ScrollTable({ head, rows, align = 'right' }: { head: string[]; rows: (string | JSX.Element)[][]; align?: 'left' | 'right' }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-[11.5px] font-mono whitespace-nowrap">
        <thead>
          <tr className="bg-secondary/50 text-primary">
            {head.map((h, i) => (
              <th key={i} className={`px-2.5 py-2 font-semibold ${i === 0 ? 'text-left' : align === 'right' ? 'text-right' : 'text-left'}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className="border-t border-border/50">
              {r.map((c, ci) => (
                <td key={ci} className={`px-2.5 py-1.5 ${ci === 0 ? 'text-left' : align === 'right' ? 'text-right' : 'text-left'}`}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
