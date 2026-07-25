'use client';

import { useMemo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Kpi, KpiGrid, CumulativeChart, MonthlyStacked, ChartLegend } from '@/components/models/charts';
import { Section, DataTable } from '@/components/models/table';
import { Glossary, CI_TERMS } from '@/components/models/glossary';
import { computeCi, ciDayDetail, ciMonthCons, ciCompareYear1 } from '@/lib/models/ci/engine';
import type { CiInputs } from '@/lib/models/ci/engine';
import { MONTHS } from '@/lib/models/ci/presets';
import { usd, pct, nf, mwh } from '@/lib/models/fmt';

export function CiDashboard({ inputs }: { inputs: CiInputs }) {
  const m = useMemo(() => computeCi(inputs), [inputs]);
  const cmp = useMemo(() => ciCompareYear1(inputs), [inputs]);
  const y1 = m.years[0];
  const s = y1.s, L = y1.L;
  const selfC = s.prod > 0 ? (s.mah + s.shift) / s.prod : 0;
  const autonomy = inputs.consY > 0 ? (s.mah + s.shift) / inputs.consY : 0;

  const cumPoints = useMemo(() => {
    const pts = [-m.capex];
    let cum = -m.capex;
    m.cfs.forEach((cf, i) => { cum += cf / Math.pow(1 + inputs.r / 100, i + 1); pts.push(cum); });
    return pts;
  }, [m, inputs.r]);

  const [mi, setMi] = useState(5);
  const [dt, setDt] = useState<'wd' | 'we'>('wd');

  return (
    <Tabs defaultValue="fiz">
      <TabsList>
        <TabsTrigger value="fiz">1 · Fizibilite</TabsTrigger>
        <TabsTrigger value="hours">2 · Saatlik Veri</TabsTrigger>
        <TabsTrigger value="bill">3 · Fatura</TabsTrigger>
        <TabsTrigger value="cmp">4 · Saatlik vs Aylık</TabsTrigger>
        <TabsTrigger value="gloss">5 · Sözlük</TabsTrigger>
      </TabsList>

      {/* ============ FIZIBILITE ============ */}
      <TabsContent value="fiz" className="space-y-5">
        <KpiGrid>
          <Kpi label="NPV" value={usd(m.npv)} tone={m.npv >= 0 ? 'good' : 'bad'} hint={`r=%${nf(inputs.r, 0)} · ${inputs.life} yıl`} />
          <Kpi label="Proje IRR" value={pct(m.irr * 100, 1)} tone="navy" hint="USD" />
          <Kpi label="Payback" value={`${nf(m.pb, 2)} yıl`} tone="navy" hint={`iskontolu ${nf(m.pbD, 2)} yıl`} />
          <Kpi label="Equity IRR" value={inputs.lOn ? pct(m.eIRR * 100, 1) : '—'} tone="navy" hint={inputs.lOn ? '' : 'kredi kapalı'} />
          <Kpi label="1. Yıl Net Fayda" value={usd(y1.cf)} tone="good" hint="tasarruf + satış − OPEX" />
          <Kpi label="Öz Tüketim Oranı" value={pct(selfC * 100, 1)} tone="navy" hint="mahsup ÷ üretim" />
          <Kpi label="Otonomi" value={pct(autonomy * 100, 1)} tone="navy" hint="karşılanan tüketim" />
          <Kpi label="Bedelsiz Kayıp (Y1)" value={mwh(L.bedelsiz, 1)} tone={L.bedelsiz > 0 ? 'bad' : 'neutral'} hint={L.bedelsiz > 0 ? 'limit üstü' : 'limit içinde ✔'} />
        </KpiGrid>

        <div className={`rounded-lg px-4 py-3 text-sm font-medium ${m.npv >= 0 && m.irr > inputs.r / 100 ? 'bg-eco/10 text-eco-dark' : 'bg-destructive/10 text-destructive'}`}>
          {m.npv >= 0 && m.irr > inputs.r / 100
            ? `✔ Yatırım USD bazında değer yaratıyor: IRR ${pct(m.irr * 100, 1)} > iskonto ${pct(inputs.r, 1)}, geri ödeme ${nf(m.pb, 2)} yıl. Öz tüketim oranı ${pct(selfC * 100, 0)}.`
            : `⚠ Bu varsayımlarla NPV ${usd(m.npv)}: sistem boyutunu tüketim profiline yaklaştır, BESS ile öz tüketimi artır veya varsayımları gözden geçir.`}
        </div>

        <Section title="Yıl-1 Enerji Dengesi" sub="saatlik motor çıktısı">
          <DataTable
            head={['Kalem', 'MWh', 'TL fiyat', 'TL/yıl', 'USD/yıl']}
            rows={[
              ['Üretim (yıl-1)', mwh(s.prod), '—', '—', '—'],
              ['Tüketim', mwh(inputs.consY), '—', '—', '—'],
              [`Mahsuplaşan${inputs.bessOn ? ' (+BESS)' : ''}`, mwh(s.mah + s.shift), `${nf(y1.buy, 2)} ₺`, `+${nf(y1.sav, 0)}`, `+${nf(y1.sav / y1.fx, 0)}`],
              ['Bedelli fazla satış', mwh(L.bedelli), `${nf(y1.sell, 2)} ₺`, `+${nf(y1.rev, 0)}`, `+${nf(y1.rev / y1.fx, 0)}`],
              ['Bedelsiz (limit üstü)', mwh(L.bedelsiz), '0 ₺', y1.cost > 0 ? `−${nf(y1.cost, 0)}` : '0', y1.cost > 0 ? `−${nf(y1.cost / y1.fx, 0)}` : '0'],
              ['Şebekeden çekiş', mwh(s.cek), `${nf(y1.buy, 2)} ₺`, 'fatura tarafı', '—'],
              ['OPEX', '—', '—', `−${nf(y1.opexTL, 0)}`, `−${nf(y1.opexTL / y1.fx, 0)}`],
            ]}
            totalRow={[`Net yıllık fayda (kur ${nf(y1.fx, 1)})`, '—', '—', nf(y1.cfTL, 0), nf(y1.cf, 0)]}
          />
        </Section>

        <Section title="Aylık Dağılım — Mahsup / Bedelli Satış / Şebekeden Çekiş" sub="MWh, yıl-1">
          <MonthlyStacked
            months={MONTHS}
            stacks={[
              { label: 'Mahsuplaşan', color: '#1E7F4F', data: s.monthly.map((d) => d.mah / 1000) },
              { label: 'Fazla (bedelli)', color: '#E8A020', data: s.monthly.map((d) => d.faz / 1000) },
            ]}
            side={{ label: 'Şebekeden çekiş', color: '#C9D3E4', data: s.monthly.map((d) => d.cek / 1000) }}
          />
          <ChartLegend items={[
            { label: 'Mahsuplaşan', color: '#1E7F4F' },
            { label: 'Fazla üretim (bedelli)', color: '#E8A020' },
            { label: 'Şebekeden çekiş', color: '#C9D3E4' },
          ]} />
        </Section>

        <Section title="Kümülatif İskontolu Nakit Akışı" sub="USD · sıfırı geçtiği an iskontolu geri ödeme">
          <CumulativeChart points={cumPoints} unit="$" color="#18428F" />
        </Section>
      </TabsContent>

      {/* ============ SAATLİK VERİ ============ */}
      <TabsContent value="hours" className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <select value={mi} onChange={(e) => setMi(parseInt(e.target.value))} className="font-mono text-sm px-3 py-2 rounded-md border border-input bg-background">
            {MONTHS.map((mo, i) => <option key={i} value={i}>{mo}</option>)}
          </select>
          <div className="inline-flex rounded-md border border-border overflow-hidden">
            <button onClick={() => setDt('wd')} className={`px-3 py-2 text-sm ${dt === 'wd' ? 'bg-primary text-primary-foreground' : 'bg-card'}`}>Hafta içi</button>
            <button onClick={() => setDt('we')} className={`px-3 py-2 text-sm ${dt === 'we' ? 'bg-primary text-primary-foreground' : 'bg-card'}`}>Hafta sonu</button>
          </div>
        </div>
        <Section title={`${MONTHS[mi]} · ${dt === 'wd' ? 'Hafta içi' : 'Hafta sonu'} temsili günü — saat saat (kWh)`}>
          <HourTable inputs={inputs} mi={mi} dt={dt} />
        </Section>
      </TabsContent>

      {/* ============ FATURA ============ */}
      <TabsContent value="bill" className="space-y-5">
        <BillSummary inputs={inputs} y1={y1} />
        <MonthlyBill inputs={inputs} y1={y1} />
      </TabsContent>

      {/* ============ SAATLİK vs AYLIK ============ */}
      <TabsContent value="cmp" className="space-y-4">
        <div className="rounded-lg bg-amber-50/60 border-l-4 border-amber-400 px-4 py-3 text-[13.5px] text-foreground/80">
          <b>Özet:</b> Aylık rejimde ay toplamı üzerinden net mahsup yapılırdı. Saatlik rejimde sadece o saatin tüketimi kadar mahsup edilir —
          öğle saatinde fazla üretim ucuz satış fiyatından satılır. C&I yatırımcısı için yıllık gelir azalır.
        </div>
        <Section title="Senin Projen: Saatlik vs Aylık (yıl-1)">
          <DataTable
            head={['Kalem', '⏰ Saatlik', '📅 Aylık', 'Fark']}
            rows={[
              ['Üretim', mwh(cmp.h.prod), mwh(cmp.mo.prod), mwh(cmp.h.prod - cmp.mo.prod)],
              ['Mahsuplaşan', mwh(cmp.h.mah + cmp.h.shift), mwh(cmp.mo.mah), mwh(cmp.h.mah + cmp.h.shift - cmp.mo.mah)],
              ['Fazla üretim', mwh(cmp.h.faz), mwh(cmp.mo.faz), mwh(cmp.h.faz - cmp.mo.faz)],
              ['Şebekeden çekiş', mwh(cmp.h.cek), mwh(cmp.mo.cek), mwh(cmp.h.cek - cmp.mo.cek)],
              ['Bedelli satış', mwh(cmp.Lh.bedelli), mwh(cmp.Lm.bedelli), mwh(cmp.Lh.bedelli - cmp.Lm.bedelli)],
              ['Tasarruf + satış (USD, yıl-1)', nf(cmp.benH, 0), nf(cmp.benM, 0), nf(cmp.benH - cmp.benM, 0)],
            ]}
            totalRow={['Saatlik rejimin maliyeti', `${usd(cmp.benM - cmp.benH)} / yıl`, `%${nf(cmp.benM > 0 ? ((cmp.benM - cmp.benH) / cmp.benM) * 100 : 0, 1)} azalma`, '']}
          />
        </Section>
      </TabsContent>

      {/* ============ SÖZLÜK ============ */}
      <TabsContent value="gloss">
        <p className="text-sm text-muted-foreground mb-3">Saatlik mahsuplaşma rejiminin temel kavramları — tanım ve formülleriyle.</p>
        <Glossary items={CI_TERMS} />
      </TabsContent>
    </Tabs>
  );
}

function HourTable({ inputs, mi, dt }: { inputs: CiInputs; mi: number; dt: 'wd' | 'we' }) {
  const T = ciDayDetail(inputs, mi, dt);
  const rows: (string | number)[][] = [];
  let tp = 0, tc = 0, tm = 0, tf = 0, tk = 0;
  for (let h = 0; h < 24; h++) {
    tp += T.prod[h]; tc += T.cons[h]; tm += T.mah[h]; tf += T.faz[h]; tk += T.cek[h];
    rows.push([`${h}:00`, nf(T.prod[h], 1), nf(T.cons[h], 1), nf(T.mah[h], 1),
      ...(inputs.bessOn ? [nf(T.ch[h], 1), nf(T.dch[h], 1)] : []), nf(T.faz[h], 1), nf(T.cek[h], 1)]);
  }
  return (
    <DataTable
      head={['Saat', 'Üretim', 'Tüketim', 'Mahsup', ...(inputs.bessOn ? ['BESS Şarj', 'BESS Deşarj'] : []), 'Fazla', 'Çekiş']}
      rows={rows}
      totalRow={['Σ Gün', nf(tp, 0), nf(tc, 0), nf(tm, 0), ...(inputs.bessOn ? ['—', '—'] : []), nf(tf, 0), nf(tk, 0)]}
    />
  );
}

function BillSummary({ inputs, y1 }: { inputs: CiInputs; y1: ReturnType<typeof computeCi>['years'][number] }) {
  const buy = y1.buy, fx = y1.fx;
  const s = y1.s, L = y1.L;
  const cekA = s.cek;
  const billNo = inputs.consY * buy;
  const billYes = cekA * buy;
  const netYes = billYes - y1.rev + y1.cost;
  const savTL = billNo - netYes;
  return (
    <Section title="Yıl-1 Özet — Aktif Enerji Faturası" sub="saatlik rejim, girdiğin tarifeyle">
      <DataTable
        head={['Kalem', "GES'siz", "GES'li", 'Fark']}
        rows={[
          ['Yıllık tüketim (kWh)', nf(inputs.consY, 0), nf(inputs.consY, 0), '0'],
          ['GES üretimi (kWh)', '—', nf(s.prod, 0), `+${nf(s.prod, 0)}`],
          ['Öz tüketilen (mahsup, kWh)', '—', nf(s.mah + s.shift, 0), `+${nf(s.mah + s.shift, 0)}`],
          ['Şebekeye satılan fazla (kWh)', '—', nf(L.bedelli + L.bedelsiz, 0), '—'],
          ['Şebekeden alınan (kWh)', nf(inputs.consY, 0), nf(cekA, 0), `−${nf(inputs.consY - cekA, 0)}`],
          ['Aktif enerji faturası (TL/yıl)', nf(billNo, 0), nf(billYes, 0), `−${nf(billNo - billYes, 0)}`],
          ['Fazla satış geliri (TL/yıl)', '—', `+${nf(y1.rev, 0)}`, `+${nf(y1.rev, 0)}`],
        ]}
        totalRow={['Net yıllık fatura (TL, OPEX hariç)', nf(billNo, 0), nf(netYes, 0), `−${nf(savTL, 0)} (−%${nf(savTL / billNo * 100, 1)})`]}
      />
      <p className="text-[11px] text-muted-foreground mt-2">USD karşılığı (kur {nf(fx, 1)}): GES&apos;siz {usd(billNo / fx)} · GES&apos;li {usd(netYes / fx)} · tasarruf {usd(savTL / fx)}.</p>
    </Section>
  );
}

function MonthlyBill({ inputs, y1 }: { inputs: CiInputs; y1: ReturnType<typeof computeCi>['years'][number] }) {
  const buy = y1.buy, sell = y1.sell;
  const fazTot = y1.s.faz || 1, bedTot = y1.L.bedelli;
  const rows: (string | number)[][] = [];
  let tN = 0, tY = 0, tR = 0, tF = 0;
  for (let i = 0; i < 12; i++) {
    const consM = ciMonthCons(inputs, i);
    const d = y1.s.monthly[i];
    const bN = consM * buy, bY = d.cek * buy;
    const revM = (d.faz / fazTot) * bedTot * sell;
    const fayda = bN - bY + revM;
    tN += bN; tY += bY; tR += revM; tF += fayda;
    rows.push([MONTHS[i], nf(d.prod, 0), nf(consM, 0), nf(d.cek, 0), nf(bN, 0), nf(bY, 0), `+${nf(revM, 0)}`, `−${nf(fayda, 0)}`]);
  }
  return (
    <Section title="Aylık Kırılım" sub="12 ay, yıl-1">
      <DataTable
        head={['Ay', 'Üretim (kWh)', 'Tüketim (kWh)', 'Çekiş (kWh)', "GES'siz (TL)", "GES'li (TL)", 'Satış (TL)', 'Fayda (TL)']}
        rows={rows}
        totalRow={['Σ Yıl', nf(y1.s.prod, 0), nf(inputs.consY, 0), nf(y1.s.cek, 0), nf(tN, 0), nf(tY, 0), `+${nf(tR, 0)}`, `−${nf(tF, 0)}`]}
      />
    </Section>
  );
}
