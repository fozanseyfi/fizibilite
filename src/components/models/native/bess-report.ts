// Sadece-batarya modellerinin PDF raporu (mevcut #mdl-report stilleriyle).

import type { BessCiInputs, BessCiModel } from '@/lib/models/bess/ci';
import type { BessUtilityInputs, BessUtilityModel } from '@/lib/models/bess/utility';
import { nf, pct, tl, usd, yearsFmt } from '@/lib/models/fmt';
import { daySvg } from './bess-kit';
import type { SohCheck } from '@/lib/models/bess/common';
import { sohStrategiesUtility, type StratRow } from '@/lib/models/bess/soh-strategy';

export interface BessReportMeta { title: string; prep?: string; firm?: string; loc?: string; date: string }

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

function cover(eyebrow: string, meta: BessReportMeta, sub: string, facts: [string, string][], stats: [string, string][]): string {
  const f = [
    meta.firm ? ['Firma', meta.firm] : null,
    meta.loc ? ['Lokasyon', meta.loc] : null,
    ['Tarih', meta.date],
    meta.prep ? ['Hazırlayan', meta.prep] : null,
    ...facts,
  ].filter(Boolean) as [string, string][];
  return `<div class="r-cover"><div class="r-eyebrow">${eyebrow}</div><h1>${esc(meta.title)}</h1><div class="r-sub">${sub}</div>`
    + `<div class="r-facts">${f.map(([k, v]) => `<div class="r-fact"><b>${k}</b><span>${esc(v)}</span></div>`).join('')}</div>`
    + `<div class="r-stats">${stats.map(([k, v]) => `<div class="r-stat"><div class="l">${k}</div><div class="v">${v}</div></div>`).join('')}</div></div>`;
}

const kpis = (items: [string, string][]) =>
  `<div class="r-kpis">${items.map(([l, v]) => `<div class="r-kpi"><div class="l">${l}</div><div class="v">${v}</div></div>`).join('')}</div>`;

const table = (head: string[], rows: string[][], totalLast = false) =>
  `<table><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows
    .map((r, i) => `<tr${totalLast && i === rows.length - 1 ? ' class="tot"' : ''}>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`)
    .join('')}</tbody></table>`;

const h2 = (n: string, t: string) => `<h2><span class="rn">${n}</span>${t}</h2>`;

function verdict(npv: number, irr: number, disc: number, payback: number, life: number): string {
  if (Number.isFinite(npv) && npv > 0) {
    return `Batarya bu varsayımlarla değer yaratıyor: IRR ${pct(irr * 100)} iskonto oranını (${pct(disc)}) aşıyor, geri ödeme ${yearsFmt(payback)}.`;
  }
  return `Batarya bu varsayımlarla ${life} yıllık ömründe yatırımını geri ödemiyor (NPV negatif). Kazancı artıran kullanım şekillerini, tarife/fiyat varsayımlarını ve batarya maliyetini gözden geçirin.`;
}

/** Batarya sağlığı bölümü — yıl sonu SOH tablosu + şart kontrolü */
function sohSection(n: string, soh: SohCheck, degr: number): string {
  const checks = soh.rows.filter((r) => r.req !== undefined);
  const summary = checks.length === 0
    ? 'Kontrol noktası tanımlı değil.'
    : (soh.ok ? 'Şart sağlanıyor. ' : 'Şart sağlanmıyor. ')
      + checks.map((r) => `${r.y}. yıl ${pct(r.soh * 100)} (şart ≥ ${pct((r.req ?? 0) * 100, 0)})`).join(' · ')
      + ` — kapasite eklemeden ve fazlası olmadan sağlamak için yıllık kayıp en fazla ${pct(soh.maxDegr * 100, 2)} (girilen ${pct(degr, 1)}).`;
  return h2(n, 'Batarya Sağlığı (SOH) ve Kapasite Şartı')
    + `<div class="r-verdict">${summary}</div>`
    + table(['Yıl', 'SOH (yıl sonu)', 'Şart', 'Durum'],
      soh.rows.map((r) => [String(r.y), pct(r.soh * 100), r.req !== undefined ? `≥ ${pct(r.req * 100, 0)}` : '', r.req !== undefined ? (r.ok ? 'Uygun' : 'Uygun değil') : '']));
}

/** Sağlık şartını karşılama stratejileri (baştan fazla kapasite / N. yılda ekleme) */
function strategySection(n: string, rows: StratRow[]): string {
  const best = rows.find((r) => r.sohOk);
  if (!best) return '';
  const pick = [rows.find((r) => r.augYear === 0), rows.find((r) => r.augYear === 5), rows.find((r) => r.augYear === 10)].filter(Boolean) as StratRow[];
  const list = [best, ...pick.filter((p) => p !== best)];
  return h2(n, 'Sağlık Şartını Karşılama Stratejileri')
    + `<div class="r-verdict">Şartı sağlayan en iyi strateji: ${best.label} — NPV ${usd(best.npv)}.</div>`
    + table(['Strateji', 'Kapasite fazlası', 'Başlangıç yatırımı', 'Ekleme harcaması', 'NPV', 'En iyiye göre'],
      list.map((r) => [r.label, `%${nf(r.oversizePct, 1)}`, usd(r.capex), r.augUsd > 0 ? usd(r.augUsd) : '—', usd(r.npv), r === best ? 'en iyi' : usd(r.npv - best.npv)]))
    + '<div class="tsub">Kapasite ekleme: o yıla kadar kaybolan kapasite kadar modül eklenir. Her ekleme yılı için şartı sağlayan en küçük kapasite fazlası kullanılmıştır.</div>';
}

const cRateTxt = (c: number) => (c > 0 ? ` · ${String(c).replace('.', ',')}C` : '');

const foot = (meta: BessReportMeta) =>
  `<div class="r-foot"><span><b>Fizibilite Platformu</b> · Ön fizibilite — yatırım tavsiyesi değildir</span><span>${esc(meta.date)}</span></div>`;

// ----------------------------------------------------------------------------------------------

export const CI_USE_LABELS = {
  self: 'Güneş fazlasını akşama kaydırma',
  arb: 'Tarife arbitrajı (gece şarj → puant)',
  peak: 'Zirve tıraşlama (güç bedeli)',
  backup: 'Kesinti yedekleme',
} as const;

export function reportBessCi(i: BessCiInputs, m: BessCiModel, meta: BessReportMeta): string {
  const uses = [i.useSelf && CI_USE_LABELS.self, i.useArb && CI_USE_LABELS.arb, i.usePeak && CI_USE_LABELS.peak, i.useBackup && CI_USE_LABELS.backup].filter(Boolean).join(' · ') || '—';
  const total = m.y1.self + m.y1.arb + m.y1.peak + m.y1.backup;
  const legend = `<div class="r-legend"><span><i style="background:#F4C76B"></i>GES üretimi</span><span><i style="background:#1E3A6E"></i>Deşarj</span><span><i style="background:#3D8B5F"></i>Güneşten şarj</span><span><i style="background:#D9822B"></i>Şebekeden şarj</span><span><i style="background:#C0392B"></i>Tüketim</span></div>`;
  const svgOpts = { unit: 'kWh', lineLabel: 'Tüketim', chargeLabel2: 'Şebekeden şarj (gece)' };
  return cover(
    'Batarya Ekleme · C&I / Mesken · Ön Fizibilite Raporu', meta,
    `${nf(i.bKwh)} kWh / ${nf(m.bKw)} kW${cRateTxt(i.cRate)} batarya · mevcut ${nf(i.kwp)} kWp GES · ${nf(i.consY / 1000)} MWh/yıl tüketim · ${i.life} yıl analiz`,
    [['Abone', i.abone === 'mesken' ? 'Mesken (aylık mahsup)' : 'C&I (saatlik mahsup)'], ['Tarife', i.tariff === 'uc' ? 'Üç zamanlı' : 'Tek zamanlı'], ['Kullanım', uses]],
    [['Yatırım', usd(m.capex)], ['NPV', usd(m.npv)], ['IRR', pct(m.irr * 100)], ['Geri ödeme', yearsFmt(m.payback, 1)], ['1. yıl kazanç', tl(total)]],
  )
    + h2('01', 'Yönetici Özeti')
    + kpis([['Yatırım (CAPEX)', usd(m.capex)], ['NPV', usd(m.npv)], ['IRR', pct(m.irr * 100)], ['Geri ödeme', yearsFmt(m.payback, 1)],
      ['1. yıl kazanç', tl(total)], ['Yıllık deşarj', `${nf(m.y1Stats.disKwh / 1000, 1)} MWh`], ['Eşdeğer tam döngü', nf(m.y1Stats.cycles)], ['LCOS', `${nf(m.lcos, 3)} $/kWh`]])
    + `<div class="r-verdict">${verdict(m.npv, m.irr, i.disc, m.payback, i.life)}</div>`
    + h2('02', 'Kullanım Şekilleri ve Kazanç Kırılımı (1. yıl, bugünkü fiyatlar)')
    + table(['Kullanım şekli', 'Kazanç (TL/yıl)'], [
      ...(i.useSelf ? [[CI_USE_LABELS.self, tl(m.y1.self)]] : []),
      ...(i.useArb ? [[CI_USE_LABELS.arb, tl(m.y1.arb)]] : []),
      ...(i.usePeak ? [[CI_USE_LABELS.peak, tl(m.y1.peak)]] : []),
      ...(i.useBackup ? [[CI_USE_LABELS.backup, tl(m.y1.backup)]] : []),
      ['Toplam', tl(total)],
    ], true)
    + `<div class="tsub">Enerji kazancı = bataryasız fatura − bataryalı fatura (aynı yıl, saatlik simülasyon). Bataryasız fatura ${tl(m.y1Stats.baseBillTL)}, bataryalı ${tl(m.y1Stats.bessBillTL)}.</div>`
    + `<div class="r-block">${h2('03', 'Tipik Gün — Temmuz ve Ocak (hafta içi)')}`
    + `<div class="r-chart"><div class="r-cap">Temmuz</div>${daySvg(m.summer, svgOpts)}${legend}</div>`
    + `<div class="r-chart"><div class="r-cap">Ocak</div>${daySvg(m.winter, svgOpts)}</div></div>`
    + h2('04', 'Girdiler ve Varsayımlar')
    + `<table class="r-assume"><tbody>`
    + `<tr><td>Batarya</td><td>${nf(i.bKwh)} kWh · ${nf(m.bKw)} kW${cRateTxt(i.cRate)} · verim ${pct(i.rte, 0)} · kullanılabilir ${pct(i.dod, 0)} · yıllık kayıp ${pct(i.bDegr)} · ${i.life} yıl</td><td>Maliyet</td><td>${usd(i.capexKwh)}/kWh${(i.capexKw ?? 0) > 0 ? ` + ${usd(i.capexKw)}/kW` : ''} (toplam ${usd(m.capex)}) · bakım ${pct(i.opexPct)} CAPEX/yıl${i.augYear ? ` · ${i.augYear}. yıl kapasite ekleme ${usd(i.augCost)}/kWh eklenen` : ''}</td></tr>`
    + `<tr><td>Mevcut GES</td><td>${nf(i.kwp)} kWp · ${nf(i.spec)} kWh/kWp</td><td>Tüketim</td><td>${nf(i.consY)} kWh/yıl · profil ${esc(i.profileId)}</td></tr>`
    + `<tr><td>Tarife</td><td>${i.tariff === 'uc' ? `gündüz ${nf(i.pGunduz, 2)} · puant ${nf(i.pPuant, 2)} · gece ${nf(i.pGece, 2)} TL/kWh` : `${nf(i.pTek, 2)} TL/kWh`}</td><td>Fazla satış</td><td>${nf(i.pSell, 2)} TL/kWh</td></tr>`
    + (i.usePeak ? `<tr><td>Güç bedeli</td><td>${nf(i.demandFee)} TL/kW-ay · hedef ${nf(i.peakCutKw)} kW · ${nf(i.peakHours, 1)} saat</td><td>Sağlanan</td><td>${nf(m.y1Stats.peakCutKw)} kW</td></tr>` : '')
    + (i.useBackup ? `<tr><td>Yedekleme</td><td>${nf(i.outageH)} saat/yıl · ${tl(i.outageCost)}/saat · kritik yük ${nf(i.criticalKw)} kW</td><td>Karşılama</td><td>${pct(m.y1Stats.backupCoverage * 100, 0)} · ayrılan pay ${pct(i.backupReserve, 0)}</td></tr>` : '')
    + `<tr><td>Finans</td><td>kur ${nf(i.fx0, 2)} TL/$ · kur artışı ${pct(i.fxEsc)} · TL fiyat artışı ${pct(i.tlEsc)}</td><td>İskonto</td><td>${pct(i.disc)} (USD)</td></tr>`
    + `</tbody></table>`
    + h2('05', 'Yıllık Nakit Akışı (USD)')
    + table(['Yıl', 'Kapasite (kWh)', 'Kazanç', 'Bakım', 'Ekleme', 'Net', 'Kümülatif'],
      m.years.map((y) => [String(y.y), nf(y.capKwh), usd(y.savingUsd), usd(-y.opexUsd), y.augUsd ? usd(-y.augUsd) : '—', usd(y.cfUsd), usd(y.cumUsd)]))
    + h2('06', 'Mevzuat Notu ve Uyarılar')
    + `<div class="r-note">1 Ocak 2026'da yürürlüğe giren depolama yönetmeliği değişikliğine göre tüketim tesisine ve lisanssız üretim tesisine bütünleşik depolama yalnızca tesisin kendi ihtiyacı için kurulur; depodan şebekeye verilen enerjiye ödeme yapılmaz. Bu yüzden model bataryayı gelir değil fatura tasarrufu olarak değerlendirir. Tarife, güç bedeli ve satış fiyatları kullanıcı girdisidir; güncel EPDK tarife tablosu ve faturanızla doğrulayın.${m.warnings.length ? '<br/><br/>' + m.warnings.map(esc).join('<br/>') : ''}</div>`
    + foot(meta);
}

// ----------------------------------------------------------------------------------------------

export const UT_USE_LABELS = {
  clip: 'Kırpılan / kısılan üretimi kurtarma',
  arb: 'PTF arbitrajı (öğle → akşam)',
  anc: 'Yan hizmet (PFK / SFK)',
  imb: 'Dengesizlik maliyetini azaltma',
} as const;

export function reportBessUtility(i: BessUtilityInputs, m: BessUtilityModel, meta: BessReportMeta): string {
  const uses = [i.useClip && UT_USE_LABELS.clip, i.useArb && UT_USE_LABELS.arb, i.useAnc && UT_USE_LABELS.anc, i.useImb && UT_USE_LABELS.imb].filter(Boolean).join(' · ') || '—';
  const y1 = m.years[0];
  const firstMerchant = m.years.find((y) => !y.yekdem);
  const svgOpts = { unit: 'MWh', lineLabel: 'Veriş sınırı (AC)', chargeLabel2: 'Arbitraj şarjı (PV ihracatından)' };
  const legend = `<div class="r-legend"><span><i style="background:#F4C76B"></i>GES (DC) üretimi</span><span><i style="background:#1E3A6E"></i>Deşarj</span><span><i style="background:#3D8B5F"></i>Kırpılan/kısılan enerjiyle şarj</span><span><i style="background:#D9822B"></i>Arbitraj şarjı</span><span><i style="background:#C0392B"></i>Veriş sınırı</span></div>`;
  const sum = (k: 'clipUsd' | 'arbUsd' | 'ancUsd' | 'imbUsd') => m.years.reduce((s, y) => s + y[k], 0);
  return cover(
    'Batarya Ekleme · Utility GES · Ön Fizibilite Raporu', meta,
    `${nf(m.bMw, 1)} MW / ${nf(i.bMwh)} MWh${cRateTxt(i.cRate)} batarya · mevcut ${nf(i.dcMwp)} MWp DC / ${nf(i.acMw)} MW AC GES · ${i.life} yıl analiz`,
    [['Gelir rejimi', i.regime === 'yekdem' ? `YEKDEM (${i.yekdemYears} yıl, ${nf(i.yekdemPrice)} $/MWh) → serbest piyasa` : 'Serbest piyasa (PTF)'], ['Kullanım', uses]],
    [['Yatırım', usd(m.capex)], ['NPV', usd(m.npv)], ['IRR', pct(m.irr * 100)], ['Geri ödeme', yearsFmt(m.payback, 1)], ['LCOS', `${nf(m.lcos, 0)} $/MWh`]],
  )
    + h2('01', 'Yönetici Özeti')
    + kpis([['Yatırım (CAPEX)', usd(m.capex)], ['NPV', usd(m.npv)], ['IRR', pct(m.irr * 100)], ['Geri ödeme', yearsFmt(m.payback, 1)],
      ['1. yıl gelir', usd(y1.revUsd)], ['1. yıl deşarj', `${nf(m.y1Stats.disMwh)} MWh`], ['Eşdeğer tam döngü', nf(m.y1Stats.cycles)], ['Kurtarılan enerji', `${nf(m.y1Stats.recoveredMwh)} MWh`]])
    + `<div class="r-verdict">${verdict(m.npv, m.irr, i.disc, m.payback, i.life)}</div>`
    + h2('02', 'Kullanım Şekilleri ve Gelir Kırılımı (USD)')
    + table(['Kullanım şekli', '1. yıl', firstMerchant && firstMerchant.y > 1 ? `${firstMerchant.y}. yıl (serbest piyasa)` : 'Son yıl', `${i.life} yıl toplam`], ([
      [UT_USE_LABELS.clip, usd(y1.clipUsd), usd((firstMerchant ?? m.years[m.years.length - 1]).clipUsd), usd(sum('clipUsd'))],
      [UT_USE_LABELS.arb, usd(y1.arbUsd), usd((firstMerchant ?? m.years[m.years.length - 1]).arbUsd), usd(sum('arbUsd'))],
      [UT_USE_LABELS.anc, usd(y1.ancUsd), usd((firstMerchant ?? m.years[m.years.length - 1]).ancUsd), usd(sum('ancUsd'))],
      [UT_USE_LABELS.imb, usd(y1.imbUsd), usd((firstMerchant ?? m.years[m.years.length - 1]).imbUsd), usd(sum('imbUsd'))],
    ] as string[][]).filter((_, k) => [i.useClip, i.useArb, i.useAnc, i.useImb][k]))
    + `<div class="r-block">${h2('03', 'Tipik Gün — Temmuz ve Ocak (1. yıl)')}`
    + `<div class="r-chart"><div class="r-cap">Temmuz</div>${daySvg(m.summer, svgOpts)}${legend}</div>`
    + `<div class="r-chart"><div class="r-cap">Ocak</div>${daySvg(m.winter, svgOpts)}</div></div>`
    + h2('04', 'Girdiler ve Varsayımlar')
    + `<table class="r-assume"><tbody>`
    + `<tr><td>Batarya</td><td>${nf(m.bMw, 1)} MW · ${nf(i.bMwh)} MWh${cRateTxt(i.cRate)} · verim ${pct(i.rte, 0)} · kullanılabilir ${pct(i.dod, 0)} · yıllık kayıp ${pct(i.bDegr)} · ${i.life} yıl${(i.oversize ?? 0) > 0 ? ` · kapasite fazlası ${pct(i.oversize ?? 0)}` : ''}</td><td>Maliyet</td><td>${usd(i.capexKwh)}/kWh${(i.capexKw ?? 0) > 0 ? ` + ${usd(i.capexKw)}/kW` : ''} (toplam ${usd(m.capex)}) · bakım ${pct(i.opexPct)} CAPEX/yıl${i.augYear ? ` · ${i.augYear}. yıl kapasite ekleme ${usd(i.augCost)}/kWh eklenen` : ''}</td></tr>`
    + `<tr><td>Mevcut GES</td><td>${nf(i.dcMwp)} MWp DC · ${nf(i.acMw)} MW AC · ${nf(i.spec)} kWh/kWp</td><td>Kayıplar</td><td>kırpma ${pct(i.clipPct)} · kısıntı ${pct(i.curtPct)} (öğle saatleri)</td></tr>`
    + `<tr><td>PTF (1. yıl)</td><td>öğle ${nf(i.ptfNoon)} · gündüz ${nf(i.ptfDay)} · puant ${nf(i.ptfPeak)} · gece ${nf(i.ptfNight)} TL/MWh</td><td>Rejim</td><td>${i.regime === 'yekdem' ? `YEKDEM ${nf(i.yekdemPrice)} $/MWh, ${i.yekdemYears} yıl` : 'Serbest piyasa'}</td></tr>`
    + (i.useAnc ? `<tr><td>Yan hizmet</td><td>${i.ancType.toUpperCase()} · ${nf(i.ancMw)} MW · ${nf(i.ancPrice)} TL/MW-saat · katılım ${pct(i.ancAvail, 0)} · yıllık fiyat değişimi ${pct(i.ancEsc ?? 0)}</td><td>Ayrılan enerji</td><td>${nf(i.ancHours, 2)} saat × ${nf(i.ancMw)} MW</td></tr>` : '')
    + (i.useImb ? `<tr><td>Dengesizlik</td><td>sapma ${pct(i.devPct)} · ${nf(i.imbCost)} TL/MWh</td><td>Azaltma</td><td>${pct(i.imbReduce, 0)}</td></tr>` : '')
    + `<tr><td>Finans</td><td>kur ${nf(i.fx0, 2)} TL/$ · kur artışı ${pct(i.fxEsc)} · TL fiyat artışı ${pct(i.tlEsc)}</td><td>İskonto</td><td>${pct(i.disc)} (USD)</td></tr>`
    + `</tbody></table>`
    + sohSection('05', m.soh, i.bDegr)
    + strategySection('06', sohStrategiesUtility(i))
    + h2('07', 'Yıllık Nakit Akışı (USD)')
    + table(['Yıl', 'Rejim', 'Kurtarma', 'Arbitraj', 'Yan hizmet', 'Dengesizlik', 'Bakım+Ekleme', 'Net', 'Kümülatif'],
      m.years.map((y) => [String(y.y), y.yekdem ? 'YEKDEM' : 'PTF', usd(y.clipUsd), usd(y.arbUsd), usd(y.ancUsd), usd(y.imbUsd), usd(-(y.opexUsd + y.augUsd)), usd(y.cfUsd), usd(y.cumUsd)]))
    + h2('08', 'Mevzuat Notu ve Uyarılar')
    + `<div class="r-note">Üretim tesisine bütünleşik depolamada santralin saatlik verişi lisanstaki kurulu güçle sınırlı kalır. YEKDEM'li santralde fiyat her saat aynıdır; şebekeden çekilip depolanan enerji YEKDEM dışında sayıldığından model şebekeden şarj etmez. Yan hizmet katılımı TEİAŞ testleri ve anlaşmasına bağlıdır. PTF, YEKDEM ve yan hizmet fiyatları kullanıcı girdisidir.${m.warnings.length ? '<br/><br/>' + m.warnings.map(esc).join('<br/>') : ''}</div>`
    + foot(meta);
}
