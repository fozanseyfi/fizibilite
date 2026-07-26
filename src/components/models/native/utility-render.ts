// Utility modeli — görüntü katmanı (HTML calcAll string üreticilerinin TS portu).
// Hesap motoru: @/lib/models/utility/engine (computeUtility). Buradaki fonksiyonlar
// yalnızca gösterim (rich-text/tablo) üretir; sonuçlar dangerouslySetInnerHTML ile basılır.

import { computeUtility, normalizeUtility, type UtilityInputs, type UtilityModel, type HuaweiResult } from '@/lib/models/utility/engine';
import { nf as fmt, usd, musd, pct } from '@/lib/models/fmt';

type P = ReturnType<typeof normalizeUtility>;

export function paramsOf(i: UtilityInputs): P { return normalizeUtility(i); }

// ---------------- ADIM formül kartları ----------------
export function sCapex(p: P, m: UtilityModel): string {
  return `PV EPC CAPEX = ${fmt(p.mw * 1000)} kWp × ${fmt(p.capexUnit, 1)} $/kWp = <b>${musd(p.pvCapex)}</b>`
    + (p.bessOn ? ` · BESS CAPEX = ${fmt(p.bMWh * 1000)} kWh × ${fmt(p.bCapexU)} $ = <b>${musd(m.bessCapex)}</b>` : '');
}
export function sEnergy(p: P, m: UtilityModel): string {
  const scenTxt = p.scen === 'p90' ? `P90 (${fmt(p.p90r * 100, 1)}%)` : 'P50';
  return `E₁ = ${fmt(p.mw * 1000)} kWp × ${fmt(p.spec)} × ${scenTxt} × ${fmt(p.avail * 100, 1)}% avail × (1−${fmt(p.curt * 100, 1)}% kısıntı) = <b>${fmt(m.E1)} MWh</b><br>`
    + `Ömür sonu (${p.life}. yıl): <b>${fmt(m.yrs[p.life - 1].E)} MWh</b>`;
}
export function sOpex(p: P, m: UtilityModel): string {
  const tl = p.cur === 'tl';
  return (tl
    ? `1. yıl OPEX = ${fmt(p.mw)} MWp × ${fmt(p.opexUnit)} $ = <b>${musd(p.mw * p.opexUnit)}</b> (TL payı %${fmt(p.opexShare * 100, 0)} → TÜFE ile, USD payı %${fmt((1 - p.opexShare) * 100, 0)} → USD enfl. ile)<br>10. yıl OPEX = <b>${musd(m.yrs[Math.min(9, p.life - 1)].opexPV)}</b> · ${p.life}. yıl = <b>${musd(m.yrs[p.life - 1].opexPV)}</b> (SAGP altında → USD enflasyonuyla büyür)`
    : `1. yıl OPEX = ${fmt(p.mw)} MWp × ${fmt(p.opexUnit)} $ = <b>${musd(p.mw * p.opexUnit)}</b><br>${p.life}. yıl = ${musd(p.mw * p.opexUnit)} × (1+${fmt(p.opexEsc * 100, 1)}%)<sup>${p.life - 1}</sup> = <b>${musd(m.yrs[p.life - 1].opexPV)}</b>`)
    + (p.replYear > 0 ? `<br>Yenileme (${p.replYear}. yıl) = ${fmt(p.mw * 1000)} kWp × ${fmt(p.replCost)} $ = <b>${musd(p.mw * 1000 * p.replCost)}</b>` : '');
}
export function sCash(p: P, m: UtilityModel): string {
  const tl = p.cur === 'tl';
  const y1 = m.yrs[0];
  const regime = p.pmode === 'two'
    ? `<b>Gelir rejimi:</b> 1–${p.ppaY}. yıl PPA/YEKDEM (${p.ppaCur === 'usd' ? fmt(p.ppaUSD) + ' $/MWh, eskalasyon %' + fmt(p.ppaEsc * 100, 1) : fmt(p.ppaTL) + ' TL/MWh, TÜFE endeksli'}) → ${p.ppaY + 1}. yıldan itibaren merchant<br>`
    : '';
  if (tl) {
    return regime
      + `1. yıl fiyat: ${fmt(p.priceTL)} TL / ${fmt(p.fx0, 2)} kur = <b>${fmt(y1.priceT, 1)} $/MWh</b> → gelir ${fmt(y1.E)} MWh × ${fmt(y1.priceT, 1)} $ = ${musd(y1.revPV)}${p.bessOn ? ` · BESS marjı ${musd(y1.revB)}` : ''} − OPEX ${musd(y1.opexPV + y1.opexB)} = <b>${musd(y1.ebitda)} EBITDA</b><br>`
      + `Kur patikası: ${fmt(p.fx0, 2)} → ${fmt(m.yrs[Math.min(9, p.life - 1)].fx ?? 0, 1)} (10. yıl) → ${fmt(m.yrs[p.life - 1].fx ?? 0, 1)} (${p.life}. yıl) TL/$ · SAGP altında USD fiyat yıllık ~%${fmt(p.piUS * 100, 1)} büyür`
      + (p.replYear > 0 ? `<br>${p.replYear}. yıl inverter yenileme: <b>${musd(p.mw * 1000 * p.replCost)}</b>` : '');
  }
  return regime
    + `1. yıl PV: ${fmt(y1.E)} MWh × ${fmt(y1.revPV / Math.max(y1.E, 1), 1)} $ = ${musd(y1.revPV)}${p.bessOn ? ` · BESS marjı ${musd(y1.revB)}` : ''} − OPEX ${musd(y1.opexPV + y1.opexB)} = <b>${musd(y1.ebitda)} EBITDA</b>`
    + (p.replYear > 0 ? `<br>${p.replYear}. yıl inverter yenileme: <b>${musd(p.mw * 1000 * p.replCost)}</b>` : '');
}
export function sBess(p: P, m: UtilityModel): string {
  if (!p.bessOn) return 'BESS kapalı — kutuyu işaretleyerek modele dahil et.';
  const tl = p.cur === 'tl';
  const y1 = m.yrs[0];
  const pd1 = tl ? p.bPdTL / p.fx0 : p.bPd, pc1 = tl ? p.bPcTL / p.fx0 : p.bPc;
  const marg = pd1 - pc1 / p.bRTE;
  return (tl ? `1. yıl: deşarj ${fmt(p.bPdTL)} TL, şarj ${fmt(p.bPcTL)} TL → USD karşılığı ${fmt(pd1, 1)} / ${fmt(pc1, 1)} $ · ` : '')
    + `Marj = ${fmt(pd1, 1)} − ${fmt(pc1, 1)}/${fmt(p.bRTE * 100, 0)}% = <b>${fmt(marg, 1)} $/MWh</b><br>`
    + `1. yıl deşarj = ${fmt(p.bMWh)} MWh × ${fmt(p.bCyc, 1)} × 365 × ${fmt(p.bAvail * 100, 0)}% = <b>${fmt(y1.disch)} MWh</b> → gelir ${musd(y1.revB)}<br>`
    + `LCOS (şarj dahil) = <b>${fmt(m.lcos, 1)} $/MWh</b> ${m.lcos < pd1 ? '&lt; deşarj fiyatı → BESS değer katıyor' : '≥ deşarj fiyatı → BESS marjinal'}`;
}
export function sTax(p: P, m: UtilityModel): string {
  const y1 = m.yrs[0];
  const taxRate1 = p.holiday > 0 ? 0 : p.tax;
  const kdvAmt = p.vat * m.baseCost;
  return `1) Matrah = ${musd(m.baseCost)} (CAPEX) + ${usd(m.fee)} (ücret) + ${usd(m.idc)} (IDC) = <b>${musd(m.depBasis)}</b><br>`
    + `2) Yıllık amortisman = ${musd(m.depBasis)} ÷ ${p.depY} = <b>${musd(m.depBasis / p.depY)}</b> (ilk ${p.depY} yıl)<br>`
    + `3) 1. yıl vergi matrahı (kaldıraçsız) = ${musd(y1.ebitda)} − ${musd(y1.dept)} = <b>${musd(Math.max(0, y1.ebitda - y1.dept))}</b><br>`
    + `4) 1. yıl vergi = %${fmt(taxRate1 * 100)} × ${musd(Math.max(0, y1.ebitda - y1.dept))} = <b>${musd(y1.taxU)}</b>`
    + (p.holiday > 0 ? ` <span style="color:var(--green)">(vergi tatili: ilk ${p.holiday} yıl %0)</span>` : '')
    + (p.vat > 0
      ? `<br>5) KDV tutarı = %${fmt(p.vat * 100)} × ${musd(m.baseCost)} = <b>${musd(kdvAmt)}</b> → iade alınır, kalıcı maliyet değil<br>6) KDV taşıma = ${musd(kdvAmt)} × %${fmt(p.kd * 100, 1)} × ${fmt(p.vatM)}/12 = <b>${usd(m.vatC)}</b>`
      : `<br>5-6) KDV: %0 (muaf/kapsam dışı) → taşıma maliyeti yok`);
}
export function sCons(p: P, m: UtilityModel): string {
  const spendC = m.baseCost + m.fee, msM = spendC / p.consM;
  const eqCons = Math.max(0, spendC - m.debt);
  const rows: { i: number; avg: number; fi: number }[] = [];
  const eqAmt = p.order === 'pro' ? 0 : Math.max(0, spendC - m.debt);
  const share = p.order === 'pro' ? Math.min(1, spendC > 0 ? m.debt / spendC : 0) : 1;
  for (let i = 1; i <= p.consM; i++) {
    let dS: number, dE: number;
    if (p.order === 'pro') { dS = share * msM * (i - 1); dE = share * msM * i; }
    else { dS = Math.max(0, msM * (i - 1) - eqAmt); dE = Math.max(0, msM * i - eqAmt); }
    rows.push({ i, avg: (dS + dE) / 2, fi: ((dS + dE) / 2) * (p.kd / 12) });
  }
  const mrows = rows.filter((r) => r.fi > 0);
  const pick = [mrows[0], mrows[Math.floor(mrows.length / 2)], mrows[mrows.length - 1]].filter((v, ix, a) => v && a.indexOf(v) === ix);
  return `1) Aylık harcama = (${musd(m.baseCost)} CAPEX + ${usd(m.fee)} ücret) ÷ ${p.consM} ay = <b>${usd(msM)}/ay</b><br>`
    + (p.order === 'eq'
      ? `2) Önce özkaynak: inşaat harcamasının ilk ${musd(eqCons)}'lık kısmı sermayeyle ödenir (≈ ${fmt(eqCons / msM, 1)} ay); kredi ${fmt(eqCons / msM + 1, 0)}. aydan itibaren çekilir<br>`
      : `2) Pro-rata: her ayın harcamasının %${fmt(p.debtR * 100)}'i krediyle, %${fmt((1 - p.debtR) * 100)}'i özkaynakla ödenir<br>`)
    + `3) Aylık faiz oranı = %${fmt(p.kd * 100, 2)} ÷ 12 = <b>%${fmt(p.kd * 100 / 12, 3)}</b><br>`
    + `4) Örnek aylar → ortalama çekilmiş bakiye × aylık faiz:<br>`
    + pick.map((r) => `&nbsp;&nbsp;&nbsp;${r.i}. ay: ${usd(r.avg)} × %${fmt(p.kd * 100 / 12, 3)} = <b>${usd(r.fi)}</b>`).join('<br>')
    + `<br>5) IDC = ${mrows.length} ayın faiz toplamı = <b>${usd(m.idc)}</b> → krediyle aktifleştirilir, amortisman matrahına girer`;
}
export function sFin(p: P, m: UtilityModel): string {
  const ds1v = m.yrs.find((y) => y.ds > 0)?.ds || 0;
  return `1) Toplam kullanım = ${musd(m.baseCost)} (CAPEX) + ${usd(m.idc)} (IDC) + ${usd(m.fee)} (ücret) + ${usd(m.dsra)} (DSRA)` + (m.vatC > 0 ? ` + ${usd(m.vatC)} (KDV taşıma)` : '') + ` = <b>${musd(m.totalUses)}</b><br>`
    + `2) Kredi = %${fmt(p.debtR * 100)} × ${musd(m.totalUses)} = <b>${musd(m.debt)}</b> → iteratif çözüm: kredi büyüdükçe IDC ve DSRA büyür, model dengeye gelene kadar döner<br>`
    + `3) Özkaynak = ${musd(m.totalUses)} − ${musd(m.debt)} = <b>${musd(m.equity)}</b><br>`
    + `4) DSRA = ${fmt(p.dsraM)} ay ÷ 12 × ilk yıl taksiti ${usd(ds1v)} = <b>${usd(m.dsra)}</b> (kredi kapanınca özkaynağa iade)<br>`
    + `5) Ödeme planı: toplam <b>${p.tenor} yıl (${p.tenor * 12} ay)</b> = ilk ${p.grace} yıl yalnız faiz (grace) + ${p.tenor - p.grace} yıl faiz+anapara · yöntem: <b>${p.style === 'sculpt' ? 'DSCR-sculpted, hedef ' + fmt(p.target, 2) : p.style === 'ann' ? 'anüite (eşit taksit)' : 'eşit anapara (azalan taksit)'}</b> · ilk taksit ${usd(ds1v)}/yıl → ${usd(ds1v / 12)}/ay<br>`
    + `6) WACC = %${fmt(p.debtR * 100)}×%${fmt(p.kd * 100, 2)} + %${fmt((1 - p.debtR) * 100)}×%${fmt(p.ke * 100, 1)} = <b>${pct(p.wacc * 100, 2)}</b>${p.useW ? ' → iskonto oranı' : ''}`
    + (m.residual > 1 ? `<br><b style="color:#C7000B">⚠ Sculpting ile vade sonunda ${usd(m.residual)} bakiye kalıyor — gearing'i düşür veya vadeyi uzat.</b>` : '');
}
export function sRes(p: P, m: UtilityModel): string {
  const r = p.r;
  const pvFCF = m.npv + m.baseCost;
  const pvCost = m.lcoe * m.pvE - m.baseCost;
  const f1 = m.fcfs[0], f10 = m.fcfs[Math.min(9, p.life - 1)], fL = m.fcfs[p.life - 1];
  const d1 = f1 / (1 + r), d10 = f10 / Math.pow(1 + r, Math.min(10, p.life)), dL = fL / Math.pow(1 + r, p.life);
  const irrChk = m.fcfs.reduce((s, v, i) => s + v / Math.pow(1 + m.irr, i + 1), 0);
  const price1 = m.yrs[0].priceT;
  const eqSum = m.moic * m.equity;
  const llcrNum = m.llcr * m.debt, plcrNum = m.plcr * m.debt;
  return `<b>NPV — Net Bugünkü Değer</b><br>`
    + `1) Serbest nakit akışları (FCF = EBITDA − vergi − bakım CAPEX): 1. yıl ${musd(f1)} · 10. yıl ${musd(f10)} · ${p.life}. yıl ${musd(fL)}<br>`
    + `2) Her yıl bugüne indirgenir: ${musd(f1)}/(1+${fmt(r * 100, 2)}%)<sup>1</sup> = ${musd(d1)} · ${musd(f10)}/(1+${fmt(r * 100, 2)}%)<sup>10</sup> = ${musd(d10)} · ${p.life}. yıl ≈ ${musd(dL)}<br>`
    + `3) ${p.life} yılın BD toplamı = <b>${musd(pvFCF)}</b><br>`
    + `4) NPV = ${musd(pvFCF)} − ${musd(m.baseCost)} (CAPEX) = <b>${musd(m.npv)}</b><br>`
    + `<b>IRR — İç Verim Oranı</b><br>`
    + `5) NPV'yi sıfırlayan oran: r = <b>${pct(m.irr * 100, 2)}</b> → kontrol: Σ FCF/(1+${fmt(m.irr * 100, 2)}%)<sup>t</sup> = ${musd(irrChk)} ≈ ${musd(m.baseCost)} CAPEX ✓<br>`
    + `<b>LCOE — Birim Enerji Maliyeti</b><br>`
    + `6) Maliyetlerin BD'si = Σ (OPEX + bakım CAPEX)/(1+r)<sup>t</sup> = <b>${musd(pvCost)}</b><br>`
    + `7) Üretimin BD'si = Σ Eₜ/(1+r)<sup>t</sup> = <b>${fmt(m.pvE)} MWh</b><br>`
    + `8) LCOE = (${musd(m.baseCost)} + ${musd(pvCost)}) ÷ ${fmt(m.pvE)} = <b>${fmt(m.lcoe, 1)} $/MWh</b> ${m.lcoe < price1 ? '&lt;' : '&gt;'} 1. yıl satış fiyatı ${fmt(price1, 1)} $/MWh ${m.lcoe < price1 ? '→ her MWh değer yaratıyor' : '→ fiyat maliyeti karşılamıyor'}<br>`
    + `<b>LLCR / PLCR — Borç Karşılama</b><br>`
    + `9) BD(CFADS, yıl 1–${Math.min(p.tenor, p.life)}, %${fmt(p.kd * 100, 2)} kredi faiziyle) = ${musd(llcrNum)} → ÷ ${musd(m.debt)} kredi = LLCR <b>${fmt(m.llcr, 2)}</b><br>`
    + `10) Aynı hesap tüm ömür (1–${p.life}) = ${musd(plcrNum)} → ÷ ${musd(m.debt)} = PLCR <b>${fmt(m.plcr, 2)}</b><br>`
    + `<b>Özkaynak Getirisi</b><br>`
    + `11) Yıllık özkaynak nakdi = CFADS − taksit; ${p.tenor}. yılda + DSRA iadesi ${usd(m.dsra)}; ${p.life} yılın nominal toplamı = <b>${musd(eqSum)}</b><br>`
    + `12) MOIC = ${musd(eqSum)} ÷ ${musd(m.equity)} yatırılan = <b>${fmt(m.moic, 2)}x</b> <span style="color:var(--ink-soft)">(equity IRR ${pct(m.eIRR * 100, 1)} ile birlikte okunmalı)</span>`;
}

// ---------------- KPI + verdict + sources/uses ----------------
export interface Kpi { cls: string; label: string; val: string; hint: string; }
export function kpis(p: P, m: UtilityModel): Kpi[] {
  const list: Kpi[] = [
    { cls: m.npv >= 0 ? 'good' : 'bad', label: 'NPV', val: musd(m.npv), hint: 'Vergi sonrası, kaldıraçsız' },
    { cls: 'navy', label: 'Proje IRR', val: pct(m.irr * 100, 1), hint: 'Kaldıraçsız, vergi sonrası' },
    { cls: 'navy', label: 'Equity IRR', val: pct(m.eIRR * 100, 1), hint: 'DSRA iadesi dahil' },
    { cls: 'navy', label: 'LCOE', val: fmt(m.lcoe, 1), hint: '$/MWh' },
    { cls: 'navy', label: 'Min / Ort DSCR', val: Number.isFinite(m.minDSCR) ? `${fmt(m.minDSCR, 2)} / ${fmt(m.avgDSCR, 2)}` : '—', hint: 'Banka eşiği ≥ 1,20–1,30' },
    { cls: 'navy', label: 'LLCR', val: fmt(m.llcr, 2), hint: 'Kredi ömrü karşılama' },
    { cls: 'navy', label: 'PLCR', val: fmt(m.plcr, 2), hint: 'Proje ömrü karşılama' },
    { cls: 'navy', label: 'Payback / MOIC', val: Number.isFinite(m.pbS) ? `${fmt(m.pbS, 2)} yıl` : '—', hint: `iskontolu ${fmt(m.pbD, 2)} yıl · MOIC ${fmt(m.moic, 2)}x` },
  ];
  if (p.bessOn) list.push({ cls: 'navy', label: 'LCOS', val: fmt(m.lcos, 1), hint: '$/MWh deşarj, şarj dahil' });
  return list;
}
export function verdict(p: P, m: UtilityModel): { cls: string; text: string } {
  const r = p.r;
  const bankOK = Number.isFinite(m.minDSCR) && m.minDSCR >= 1.2 && m.llcr >= 1.2 && m.residual <= 1;
  if (m.npv >= 0 && bankOK) return { cls: 'good', text: `✔ Model finanse edilebilir görünüyor: NPV pozitif, proje IRR ${pct(m.irr * 100, 1)} &gt; r ${pct(r * 100, 1)}, min. DSCR ${fmt(m.minDSCR, 2)}, LLCR ${fmt(m.llcr, 2)}, equity IRR ${pct(m.eIRR * 100, 1)}.` };
  if (m.npv >= 0) return { cls: 'bad', text: `⚠ NPV pozitif ama borç tarafı zayıf: min. DSCR ${fmt(m.minDSCR, 2)}, LLCR ${fmt(m.llcr, 2)}${m.residual > 1 ? ', sculpting bakiyesi ' + usd(m.residual) : ''}. Gearing'i düşür, vadeyi uzat veya hedef DSCR'ı gözden geçir.` };
  return { cls: 'bad', text: `✖ NPV negatif: proje, beklenen ${pct(r * 100, 1)} getiriyi karşılamıyor. Fiyat, üretim veya CAPEX varsayımlarını gözden geçir.` };
}
export function usesRows(p: P, m: UtilityModel): [string, string][] {
  const rows: [string, string][] = [['PV EPC CAPEX', musd(p.pvCapex)]];
  if (p.bessOn) rows.push(['BESS CAPEX', musd(m.bessCapex)]);
  rows.push(['IDC (inşaat faizi)', usd(m.idc)]);
  rows.push(['Kredi düzenleme ücreti', usd(m.fee)]);
  rows.push(['DSRA fonlaması', usd(m.dsra)]);
  if (m.vatC > 0) rows.push(['KDV taşıma maliyeti', usd(m.vatC)]);
  return rows;
}
export function sourcesRows(p: P, m: UtilityModel): [string, string][] {
  return [[`Kıdemli kredi (${fmt(p.debtR * 100)}%)`, musd(m.debt)], [`Özkaynak (${fmt((1 - p.debtR) * 100)}%)`, musd(m.equity)]];
}

// ---------------- tablolar (HTML string) ----------------
function opRow(y: UtilityModel['yrs'][number], bess: boolean, tl: boolean): string {
  return `<td>${y.t}</td>` + (tl ? `<td>${fmt(y.fx ?? 0, 1)}</td>` : '') + `<td>${fmt(y.E)}</td>` + (bess ? `<td>${fmt(y.disch)}</td>` : '')
    + `<td>${fmt(y.revPV + y.revB)}</td><td>${fmt(y.opexPV + y.opexB)}</td><td>${fmt(y.ebitda)}</td><td>${fmt(y.taxU)}</td><td>${y.capexM ? fmt(y.capexM) : '—'}</td><td>${fmt(y.fcf)}</td><td>${Number.isFinite(y.dscr) ? fmt(y.dscr, 2) : '—'}</td>`;
}
export function cfTableHtml(p: P, m: UtilityModel): string {
  const bess = p.bessOn, tl = p.cur === 'tl', pbRow = Math.ceil(m.pbS);
  const nCol = (bess ? 10 : 9) + (tl ? 1 : 0) + 1;
  let cum = -m.baseCost;
  let h = `<thead><tr><th>Yıl</th>${tl ? '<th>Kur (TL/$)</th>' : ''}<th>PV (MWh)</th>${bess ? '<th>BESS deşarj (MWh)</th>' : ''}<th>Gelir ($)</th><th>OPEX ($)</th><th>EBITDA ($)</th><th>Vergi ($)</th><th>Bakım CAPEX ($)</th><th>FCF ($)</th><th>DSCR</th><th>Kümülatif ($)</th></tr></thead><tbody>`;
  h += `<tr><td>0</td>${tl ? '<td>' + fmt(p.fx0, 1) + '</td>' : ''}<td>—</td>${bess ? '<td>—</td>' : ''}<td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>${usd(-m.baseCost)}</td><td>—</td><td>${usd(-m.baseCost)}</td></tr>`;
  m.yrs.forEach((y) => {
    cum += y.fcf;
    if (y.t <= 12 || y.t === p.life) h += `<tr${y.t === pbRow ? ' class="pb"' : ''}>${opRow(y, bess, tl)}<td>${fmt(cum)}</td></tr>`;
    else if (y.t === 13) h += `<tr><td colspan="${nCol}" style="text-align:center;color:#98A2B6">⋮ (${p.life - 13} yıl gizlendi — PDF raporda tamamı)</td></tr>`;
  });
  const S = m.yrs.reduce((a, y) => { a.E += y.E; a.d += y.disch; a.rev += y.revPV + y.revB; a.op += y.opexPV + y.opexB; a.eb += y.ebitda; a.tx += y.taxU; a.cx += y.capexM; a.f += y.fcf; return a; }, { E: 0, d: 0, rev: 0, op: 0, eb: 0, tx: 0, cx: 0, f: 0 });
  h += `<tr class="tot"><td>Σ ${p.life} yıl</td>${tl ? '<td>—</td>' : ''}<td>${fmt(S.E)}</td>${bess ? `<td>${fmt(S.d)}</td>` : ''}<td>${fmt(S.rev)}</td><td>${fmt(S.op)}</td><td>${fmt(S.eb)}</td><td>${fmt(S.tx)}</td><td>${fmt(S.cx)}</td><td>${fmt(S.f)}</td><td>—</td><td>${fmt(-m.baseCost + S.f)}</td></tr>`;
  return h + '</tbody>';
}
export function debtTableHtml(p: P, m: UtilityModel): string {
  let h = '<thead><tr><th>Yıl</th><th>Açılış ($)</th><th>Faiz ($)</th><th>Anapara ($)</th><th>Taksit ($)</th><th>Kapanış ($)</th><th>CFADS ($)</th><th>DSCR</th></tr></thead><tbody>';
  let open = m.debt, dI = 0, dP = 0, dD = 0, dC = 0;
  m.yrs.forEach((y) => {
    if (y.t <= p.tenor && open > 1e-6) {
      dI += y.interest; dP += y.principal; dD += y.ds; dC += y.cfads;
      h += `<tr><td>${y.t}${y.t <= p.grace ? ' (grace)' : ''}</td><td>${fmt(open)}</td><td>${fmt(y.interest)}</td><td>${fmt(y.principal)}</td><td>${fmt(y.ds)}</td><td>${fmt(y.balEnd)}</td><td>${fmt(y.cfads)}</td><td>${Number.isFinite(y.dscr) ? fmt(y.dscr, 2) : '—'}</td></tr>`;
      open = y.balEnd;
    }
  });
  h += `<tr class="tot"><td>Σ</td><td>—</td><td>${fmt(dI)}</td><td>${fmt(dP)}</td><td>${fmt(dD)}</td><td>—</td><td>${fmt(dC)}</td><td>—</td></tr>`;
  return h + '</tbody>';
}

// ---------------- duyarlılık + breakeven ----------------
export function sensHtml(i: UtilityInputs, p: P): string {
  const pMults = [0.9, 1, 1.1], eMults = [1.05, 1, 0.95];
  const tl = p.cur === 'tl';
  let h = '<table class="senstable"><tbody><tr><th>IRR / min DSCR</th>';
  pMults.forEach((pm) => h += `<th>Fiyat ${pm === 1 ? 'baz' : pm > 1 ? '+10%' : '−10%'}<br>${tl ? fmt(p.priceTL * pm) + ' TL' : fmt(p.price * pm, 1) + ' $'}/MWh</th>`);
  h += '</tr>';
  eMults.forEach((em) => {
    h += `<tr><th>Üretim ${em === 1 ? 'baz' : em > 1 ? '+5%' : '−5%'}</th>`;
    pMults.forEach((pm) => {
      const s = computeUtility(i, { prodMult: em, priceMult: pm });
      const ok = s.irr >= p.r && s.minDSCR >= 1.2;
      const cls = em === 1 && pm === 1 ? 'base' : ok ? 'g' : 'b';
      h += `<td class="${cls}">${pct(s.irr * 100, 1)} / ${fmt(s.minDSCR, 2)}</td>`;
    });
    h += '</tr>';
  });
  h += '</tbody></table>';
  const up = computeUtility(i, { dCapex: p.pvCapex * 0.1 }), dn = computeUtility(i, { dCapex: -p.pvCapex * 0.1 });
  h += `<p class="tsub" style="margin:10px 2px 0">CAPEX duyarlılığı: +%10 → IRR ${pct(up.irr * 100, 1)} / DSCR ${fmt(up.minDSCR, 2)} · −%10 → IRR ${pct(dn.irr * 100, 1)} / DSCR ${fmt(dn.minDSCR, 2)}</p>`;
  return h;
}
function solveMult(fn: (x: number) => number, target: number, lo: number, hi: number): number {
  let flo = fn(lo) - target, fhi = fn(hi) - target;
  if (!isFinite(flo) || !isFinite(fhi) || flo * fhi > 0) return NaN;
  for (let k = 0; k < 55; k++) { const mid = (lo + hi) / 2, fm = fn(mid) - target; if (flo * fm <= 0) { hi = mid; fhi = fm; } else { lo = mid; flo = fm; } }
  return (lo + hi) / 2;
}
export function beHtml(i: UtilityInputs, p: P, m: UtilityModel): string {
  const mP = solveMult((x) => computeUtility(i, { priceMult: x }).npv, 0, 0.05, 3);
  const mE = solveMult((x) => computeUtility(i, { prodMult: x }).npv, 0, 0.05, 3);
  const mC = solveMult((x) => computeUtility(i, { dCapex: (x - 1) * m.baseCost }).npv, 0, 0.05, 6);
  const rowNPV = (lab: string, mm: number, abs: (mm: number) => string): string => isFinite(mm)
    ? `<tr><td>${lab}</td><td>Bazın %${fmt(mm * 100, 1)}'i → ${abs(mm)}</td><td>${fmt(Math.abs(1 - mm) * 100, 1)} puan ${mm < 1 ? 'düşüş' : 'artış'} marjı</td></tr>`
    : `<tr><td>${lab}</td><td colspan="2">Aralıkta (%5–%300) kırılma yok</td></tr>`;
  let debtRows = '';
  if (p.style === 'sculpt') {
    const dP = solveMult((x) => computeUtility(i, { priceMult: x }).residual, 1000, 0.05, 1.5);
    const dE = solveMult((x) => computeUtility(i, { prodMult: x }).residual, 1000, 0.05, 1.5);
    const mk = (lab: string, mm: number) => isFinite(mm)
      ? `<tr><td>${lab}</td><td>Bazın %${fmt(mm * 100, 1)}'i</td><td>${fmt((1 - mm) * 100, 1)} puan düşüş marjı</td></tr>`
      : (m.residual > 1 ? `<tr><td>${lab}</td><td colspan="2" style="color:var(--red)">Baz senaryoda dahi borç vadede kapanmıyor</td></tr>` : `<tr><td>${lab}</td><td colspan="2">%5'e kadar düşüşte bile kapanıyor</td></tr>`);
    debtRows = mk('Borcun vadede kapandığı min. fiyat seviyesi', dP) + mk('Borcun vadede kapandığı min. üretim seviyesi', dE);
  }
  return `<table class="senstable" style="width:100%"><tbody><tr><th style="text-align:left">Kırılma noktası</th><th>Seviye</th><th>Güvenlik marjı</th></tr>`
    + rowNPV('NPV = 0 · elektrik fiyatı', mP, (mm) => p.cur === 'tl' ? fmt(p.priceTL * mm) + ' TL/MWh' : fmt(p.price * mm, 1) + ' $/MWh')
    + rowNPV('NPV = 0 · üretim', mE, (mm) => fmt(p.spec * mm) + ' kWh/kWp')
    + rowNPV('NPV = 0 · CAPEX', mC, (mm) => fmt(p.capexUnit * mm, 1) + ' $/kWp')
    + debtRows + `</tbody></table>`;
}

// ---------------- kümülatif grafik noktaları ----------------
export function cumPoints(m: UtilityModel): number[] {
  const pts = [-m.baseCost]; let cum = -m.baseCost;
  m.yrs.forEach((y) => { cum += y.fcf / Math.pow(1 + m.r, y.t); pts.push(cum); });
  return pts;
}
export function hwPoints(hw: HuaweiResult, r: number): number[] {
  const pts = [-hw.dCapex]; let cum = -hw.dCapex;
  hw.dFCFs.forEach((cf, idx) => { cum += cf / Math.pow(1 + r, idx + 1); pts.push(cum); });
  return pts;
}

// ---------------- Huawei ----------------
export function sHw(p: P, base: UtilityModel, hw: HuaweiResult): string {
  const r = p.r;
  return `ΔCAPEX = ${fmt(hw.count)} × ${fmt(hw.diff)} $ = <b>${usd(hw.dCapex)}</b> (toplam CAPEX'in ${pct(hw.dCapex / base.baseCost * 100, 2)}'i)<br>`
    + `1. yıl: ek üretim ${fmt(hw.extraMWh1)} MWh × ${fmt(base.yrs[0].priceT, 1)} $ = ${usd(hw.extraMWh1 * base.yrs[0].priceT)} + OPEX tasarrufu ${usd(hw.opexSave1)} = <b>${usd(hw.annual1)}</b> ek EBITDA<br>`
    + `ΔNPV = −${usd(hw.dCapex)} + Σ ΔFCF/(1+${fmt(r * 100, 1)}%)<sup>t</sup> = <b>${usd(hw.dNPV)}</b> · Artımlı IRR = <b>${isFinite(hw.dIRR) ? pct(hw.dIRR * 100, 1) : '—'}</b> · ${p.style === 'sculpt' ? `LLCR ${fmt(base.llcr, 2)} → <b>${fmt(hw.hwModel.llcr, 2)}</b>` : `Min DSCR ${fmt(base.minDSCR, 2)} → <b>${fmt(hw.hwModel.minDSCR, 2)}</b>`}`;
}
export function pitchText(p: P, base: UtilityModel, hw: HuaweiResult): string {
  const projIRR = pct(base.irr * 100, 1);
  if (hw.dCapex > 0 && isFinite(hw.dIRR) && hw.dNPV > 0) {
    const cov = p.style === 'sculpt'
      ? `LLCR'da ${fmt(base.llcr, 2)} → <b>${fmt(hw.hwModel.llcr, 2)}</b> iyileşme — yani bankanızın göreceği ek borç kapasitesi`
      : `min. DSCR'da ${fmt(base.minDSCR, 2)} → <b>${fmt(hw.hwModel.minDSCR, 2)}</b> iyileşme`;
    return `Huawei çözümü için inverter başına ${fmt(hw.diff)} $, toplamda <b>${usd(hw.dCapex)}</b> fark ödüyorsunuz; bu fark ilk yıldan itibaren yılda <b>${usd(hw.annual1)}</b> ek değer üretiyor. Fark yatırımının kendi getirisi <b>${pct(hw.dIRR * 100, 1)} IRR</b> — projenizin geri kalanının getirisinden (${projIRR}) yüksek. Santral ömrü boyunca vergi sonrası <b>${usd(hw.dNPV)}</b> net bugünkü kazanç, LCOE'de ${fmt(base.lcoe, 1)} → <b>${fmt(hw.hwModel.lcoe, 1)} $/MWh</b> ve ${cov} demek.`;
  }
  if (hw.dCapex <= 0) return `Bu senaryoda Huawei ek CAPEX gerektirmiyor ve yılda <b>${usd(hw.annual1)}</b> ek değer üretiyor — ömür boyu <b>${usd(hw.dNPV)}</b> net kazanç.`;
  return `Bu varsayımlarla fark yatırımı kendini amorti etmiyor (ΔNPV ${usd(hw.dNPV)}). Üretim avantajı ve OPEX tasarrufu varsayımları yeniden değerlendirilmelidir.`;
}
export function hwKpis(base: UtilityModel, hw: HuaweiResult, style: string): Kpi[] {
  return [
    { cls: '', label: 'Ek yatırım (ΔCAPEX)', val: usd(hw.dCapex), hint: `${fmt(hw.count)} adet × ${fmt(hw.diff)} $` },
    { cls: 'good', label: 'Yıllık ek değer', val: usd(hw.annual1), hint: '1. yıl, vergi öncesi' },
    { cls: 'good', label: 'ΔNPV · net kazanç', val: usd(hw.dNPV), hint: 'Vergi sonrası, bugünkü değer' },
    { cls: 'good', label: 'Artımlı IRR', val: isFinite(hw.dIRR) ? pct(hw.dIRR * 100, 1) : '—', hint: '"Fark yatırımının" getirisi' },
    { cls: 'navy', label: 'Fark geri ödeme', val: isFinite(hw.dPB) ? fmt(hw.dPB, 1) + ' yıl' : '—', hint: 'ΔCAPEX kaç yılda döner' },
    { cls: 'navy', label: 'LCOE · Baz → Huawei', val: `${fmt(base.lcoe, 1)} → ${fmt(hw.hwModel.lcoe, 1)}`, hint: '$/MWh' },
    { cls: 'navy', label: style === 'sculpt' ? 'LLCR · Baz → Huawei' : 'Min DSCR · Baz → Huawei', val: style === 'sculpt' ? `${fmt(base.llcr, 2)} → ${fmt(hw.hwModel.llcr, 2)}` : `${fmt(base.minDSCR, 2)} → ${fmt(hw.hwModel.minDSCR, 2)}`, hint: 'Borç tarafındaki iyileşme' },
  ];
}

// ---------------- PDF RAPOR ----------------
function esc(s: string): string {
  return String(s).replace(/[&<>]/g, (c) => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'));
}
/** İşletme nakit akışı — tüm yıllar (rapor için, kısaltmasız). */
export function cfTableFull(p: P, m: UtilityModel): string {
  const bess = p.bessOn, tl = p.cur === 'tl';
  let cum = -m.baseCost;
  let h = `<thead><tr><th>Yıl</th>${tl ? '<th>Kur</th>' : ''}<th>PV MWh</th>${bess ? '<th>BESS MWh</th>' : ''}<th>Gelir $</th><th>OPEX $</th><th>EBITDA $</th><th>Vergi $</th><th>Bakım $</th><th>FCF $</th><th>DSCR</th><th>Kümülatif $</th></tr></thead><tbody>`;
  h += `<tr><td>0</td>${tl ? '<td>' + fmt(p.fx0, 1) + '</td>' : ''}<td>—</td>${bess ? '<td>—</td>' : ''}<td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>${usd(-m.baseCost)}</td><td>—</td><td>${usd(-m.baseCost)}</td></tr>`;
  m.yrs.forEach((y) => { cum += y.fcf; h += `<tr>${opRow(y, bess, tl)}<td>${fmt(cum)}</td></tr>`; });
  const S = m.yrs.reduce((a, y) => { a.E += y.E; a.d += y.disch; a.rev += y.revPV + y.revB; a.op += y.opexPV + y.opexB; a.eb += y.ebitda; a.tx += y.taxU; a.cx += y.capexM; a.f += y.fcf; return a; }, { E: 0, d: 0, rev: 0, op: 0, eb: 0, tx: 0, cx: 0, f: 0 });
  h += `<tr class="tot"><td>Σ ${p.life}</td>${tl ? '<td>—</td>' : ''}<td>${fmt(S.E)}</td>${bess ? `<td>${fmt(S.d)}</td>` : ''}<td>${fmt(S.rev)}</td><td>${fmt(S.op)}</td><td>${fmt(S.eb)}</td><td>${fmt(S.tx)}</td><td>${fmt(S.cx)}</td><td>${fmt(S.f)}</td><td>—</td><td>${fmt(-m.baseCost + S.f)}</td></tr>`;
  return h + '</tbody>';
}
/** Temel varsayımlar tablosu (etiket–değer, 2 sütunlu). */
function assumpTable(p: P): string {
  const tl = p.cur === 'tl';
  const rows: [string, string][] = [
    ['Kurulu güç', `${fmt(p.mw)} MWp`],
    ['EPC CAPEX', `${fmt(p.capexUnit, 1)} $/kWp`],
    ['Spesifik üretim', `${fmt(p.spec)} kWh/kWp`],
    ['Üretim senaryosu', p.scen === 'p90' ? `P90 (%${fmt(p.p90r * 100, 1)})` : 'P50'],
    ['Availability', `%${fmt(p.avail * 100, 1)}`],
    ['Kısıntı', `%${fmt(p.curt * 100, 1)}`],
    ['Degradasyon', `%${fmt(p.degr * 100, 2)}/yıl`],
    ['Santral ömrü', `${p.life} yıl`],
    ['OPEX', `${fmt(p.opexUnit)} $/MWp/yıl`],
    ['Elektrik fiyatı', tl ? `${fmt(p.priceTL)} TL/MWh` : `${fmt(p.price, 1)} $/MWh`],
    ['Kaldıraç (gearing)', `%${fmt(p.debtR * 100)}`],
    ['Kredi faizi', `%${fmt(p.kd * 100, 2)}`],
    ['Vade / grace', `${p.tenor} / ${p.grace} yıl`],
    ['Geri ödeme', p.style === 'sculpt' ? `DSCR-sculpted (hedef ${fmt(p.target, 2)})` : p.style === 'ann' ? 'Anüite' : 'Eşit anapara'],
    ['Kurumlar vergisi', `%${fmt(p.tax * 100)}${p.holiday > 0 ? ` (tatil ${p.holiday} yıl)` : ''}`],
    ['Özkaynak beklentisi', `%${fmt(p.ke * 100, 1)}`],
    ['İskonto oranı (r)', `${pct(p.r * 100, 2)}${p.useW ? ' = WACC' : ''}`],
  ];
  let h = '<table><tbody>';
  for (let i = 0; i < rows.length; i += 2) {
    const a = rows[i], b = rows[i + 1];
    h += `<tr><td>${a[0]}</td><td>${a[1]}</td><td>${b ? b[0] : ''}</td><td>${b ? b[1] : ''}</td></tr>`;
  }
  return h + '</tbody></table>';
}

export interface ReportMeta { title: string; prep: string; date: string; }
/** #mdl-report gövdesi — PDF raporun tüm içeriği (tek HTML string). */
export function reportUtility(p: P, m: UtilityModel, hw: HuaweiResult, meta: ReportMeta): string {
  const tl = p.cur === 'tl';
  const vd = verdict(p, m);
  const capacity = p.bessOn ? `${fmt(p.mw)} MWp + ${fmt(p.bMWh)} MWh` : `${fmt(p.mw)} MWp`;
  const kpiRow = (list: Kpi[]) => `<div class="r-kpis">${list.map((k) => `<div class="r-kpi"><div class="l">${k.label}</div><div class="v">${k.val}</div></div>`).join('')}</div>`;
  const cover = `<div class="r-cover"><div class="r-eyebrow">Solar + Storage · Proje Finansmanı Fizibilite Raporu</div><h1>${esc(meta.title)}</h1>`
    + `<div class="r-facts">`
    + `<div class="r-fact"><b>Kurulu Güç</b><span>${capacity}</span></div>`
    + `<div class="r-fact"><b>Hazırlayan</b><span>${esc(meta.prep || '—')}</span></div>`
    + `<div class="r-fact"><b>Tarih</b><span>${esc(meta.date)}</span></div>`
    + `<div class="r-fact"><b>Para birimi</b><span>${tl ? 'TL gelir + kur' : 'USD'}</span></div>`
    + `<div class="r-fact"><b>İskonto oranı</b><span>${pct(p.r * 100, 2)}</span></div>`
    + `</div></div>`;
  const results = `<h2>Temel Sonuçlar</h2>${kpiRow(kpis(p, m))}<div class="r-verdict">${vd.text}</div>`;
  const su = `<h2>Kaynak–Kullanım</h2><div class="r-su">`
    + `<table><thead><tr><th>Kullanımlar</th><th>Tutar</th></tr></thead><tbody>${usesRows(p, m).map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}<tr class="tot"><td>Toplam</td><td>${musd(m.totalUses)}</td></tr></tbody></table>`
    + `<table><thead><tr><th>Kaynaklar</th><th>Tutar</th></tr></thead><tbody>${sourcesRows(p, m).map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}<tr class="tot"><td>Toplam</td><td>${musd(m.totalUses)}</td></tr></tbody></table>`
    + `</div>`;
  const assum = `<h2>Temel Varsayımlar</h2>${assumpTable(p)}`;
  const cf = `<div class="pagebreak"></div><h2>İşletme Dönemi Nakit Akışı — ${p.life} yıl</h2><table>${cfTableFull(p, m)}</table>`;
  const debt = `<h2>Borç Takvimi</h2><table>${debtTableHtml(p, m)}</table>`;
  const hwSec = hw.dCapex > 0
    ? `<div class="pagebreak"></div><h2>Huawei Değer Analizi</h2><div class="r-pitch">${pitchText(p, m, hw)}</div>${kpiRow(hwKpis(m, hw, p.style))}`
    : '';
  const foot = `<p class="r-note">Bu rapor Fizibilite Platformu tarafından otomatik üretilmiştir. Sonuçlar girilen varsayımlara dayanır ve bağlayıcı yatırım tavsiyesi değildir. · ${esc(meta.date)}</p>`;
  return cover + results + su + assum + cf + debt + hwSec + foot;
}
