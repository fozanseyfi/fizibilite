// C&I / Mesken modeli — görüntü katmanı (HTML kokpitinin JS view fonksiyonlarının TS portu).
// Hesap motoru: @/lib/models/ci/engine (computeCi). Buradaki fonksiyonlar yalnızca gösterim
// (rich-text/tablo/SVG string) üretir; sonuçlar dangerouslySetInnerHTML ile basılır.

import {
  computeCi, ciMonthCons, ciDayDetail, ciDayCons, ciDayFactor, ciCompareYear1,
  type CiInputs, type CiModel,
} from '@/lib/models/ci/engine';
import { SOLAR_M, DAYS, MONTHS } from '@/lib/models/ci/presets';
import { nf as fmt, usd, pct } from '@/lib/models/fmt';

const tlAmt = (x: number, d = 0): string => (Number.isFinite(x) ? `${fmt(x, d)} TL` : '–');

// ============================ TOOLTIPS ============================
export const CI_TIPS: Record<string, string> = {
  i_abone: 'Rejimi belirler: Ticarethane/Sanayi (C&I) 01.05.2026 itibarıyla SAATLİK mahsuplaşmaya tabidir; Mesken aylık rejimde kalır ve bedelli üretim limiti uygulanmaz. Seçim, motorun tüm hesap mantığını değiştirir.',
  i_cons: 'Tesisin yıllık toplam elektrik tüketimi. 24 saatlik profil şekilleri ve mevsimsellik bu toplama ölçeklenir — faturalarından son 12 ayın toplamını gir.',
  i_consPrev: 'Bedelli üretim limitinin bazı: limit = bu değer × 2. Yeni tesislerde/devirde şebeke işletmecisinin LÜM’e kaydettiği değer esas alınır — teyit et. Mesken için anlamsızdır (limitsiz).',
  i_profile: 'Hazır arketip seçince aşağıdaki 24 saatlik şekiller dolar; her hücre elle düzenlenebilir. Ofis: gündüz pik, GES ile iyi uyum. Fabrika 3 vardiya: düz yük. Otel: akşam pik, saatlik rejimde en zor profil.',
  i_season: 'Aylık tüketim ağırlıkları. Yaz pik (klima/soğutma) GES üretim tepesiyle örtüştüğü için öz tüketimi yükseltir; kış pik tersine çalışır.',
  i_kwp: 'Panel tarafının DC kurulu gücü. Saatlik rejimde “çatıyı doldur” yerine “profiline boyutlan” geçerlidir — fazla kapasite bedelsize kaçar.',
  i_spec: 'Yıllık birim üretim (kWh/kWp). Türkiye çatılarında tipik 1.400–1.650; sahaya, eğime ve gölgelenmeye bağlıdır. PVsyst/PVGIS değerini gir.',
  i_orient: 'Güney: öğle tepeli klasik eğri, toplam üretim en yüksek. Doğu-Batı: sabah-akşam yayvan eğri, toplam ~%2-4 düşük ama tüketim profiliyle örtüşme (öz tüketim) genelde daha iyi.',
  i_degr: 'Panel performansının yıllık azalması. Modern modüllerde %0,4–0,6 tipiktir; motor her yılı bu katsayıyla ayrıca simüle eder.',
  i_life: 'Ekonomik analiz süresi. Çatı GES için 25 yıl standart; inverter yenilemesi OPEX içinde kabul edilir.',
  i_skb: 'MADDE 7(5): limit üstü ihtiyaç fazlası “sistem kullanım bedeli ödemeli” miktardır — gelir getirmediği gibi SKB maliyeti doğabilir. Dağıtım bölgenin birim SKB’sini gir; 0 bırakılırsa yalnız gelir kaybı olarak modellenir.',
  i_tarpre: 'Ticarethane AG (4,28/3,95) yalnız referanstır. Kendi faturandaki aktif enerji tek zamanlı birim fiyatını “Elle gir” ile kullan — tarife sınıfına göre fark büyüktür.',
  i_pBuy: 'Aktif enerji tek zamanlı ALIŞ fiyatı (vergisiz-fonsuz enerji bedeli). Mahsuplaşan her kWh ve BESS kaydırması bu fiyattan değerlenir; şebekeden çekiş de bu fiyattan ödenir.',
  i_pSell: 'Bedelli fazla üretimin SATIŞ fiyatı — mevzuatta gruptaki en düşük ilgili tarife fiyatı. Alıştan düşük olması, öz tüketimin satıştan daha değerli olmasının sebebidir.',
  i_esc1: 'İlk 5 yılın yıllık tarife zam varsayımı. Tarife zamları uzun vadede TÜFE’yi izler; TCMB beklenti patikasına paralel %20–25 makul başlangıçtır.',
  i_esc2: '5. yıldan sonraki kalıcı zam varsayımı — enflasyonun hedefe yakınsadığı dönem: %10–15 bandı savunulabilir.',
  b_on: 'Bataryayı modele dahil eder: gündüz fazlası depolanır, akşam çekişi karşılanır. CAPEX/OPEX ve degradasyon dahil tüm etkiler yıllık simülasyona girer.',
  b_kwh: 'Enerji kapasitesi. Kaba boyutlama: tipik günün akşam çekişi kadar (fazla üretim × RTE sınırında).',
  b_kw: 'Güç (şarj/deşarj hızı). Kapasite/güç oranı 2 saat civarı C&I için dengelidir.',
  b_rte: 'Round-trip verim: depolanan enerjinin geri alınabilen payı. LFP sistemlerde %86–90 tipik; kayıp, deşarjda düşülür.',
  b_degr: 'Kullanılabilir kapasitenin yıllık azalması. Günlük tek döngüde %1,5–2,5 tipik; motor her yıl kapasiteyi küçülterek simüle eder.',
  b_capex: 'Batarya sistemi anahtar teslim birim maliyeti (PCS + BMS + montaj dahil). 2026 itibarıyla ~10.000–14.000 TL/kWh bandı.',
  b_opex: 'Yıllık bakım/garanti bedeli; OPEX artış oranıyla eskale edilir.',
  i_capex: 'GES anahtar teslim birim maliyeti (panel, inverter, konstrüksiyon, AG/OG bağlantı, proje-izin dahil). 2026 çatı bandı ~25.000–32.000 TL/kWp.',
  i_opex: 'Yıllık işletme-bakım: temizlik, izleme, sigorta, küçük onarımlar. İnverter yenileme karşılığını da içerecek şekilde seçilebilir.',
  i_r: 'USD nominal iskonto oranı — model TL faydayı her yıl kurla USD’ye çevirir ve nakit akışları USD olarak bu oranla indirgenir. USD proje getiri beklentin / alternatif USD getiri (~%8–12). Dikkat: TL faiziyle (%30–45) karıştırma; buraya USD oranı gir.',
  l_on: 'Yatırımın bir kısmının TL krediyle finanse edilmesi. Equity IRR ve özkaynak geri dönüşü buna göre hesaplanır.',
  l_ratio: 'Kredinin toplam CAPEX içindeki payı. C&I çatı projelerinde %50–70 tipik.',
  l_rate: 'TL ticari kredi faizi (yıllık). Temmuz 2026 ortamında %35–45 bandı; leasing alternatifi ayrıca değerlendirilebilir.',
  l_term: 'Anüite vadesi. Kısa vade taksiti büyütür, ilk yıllarda equity nakit akışını bastırır — payback ile birlikte oku.',
};

// ============================ SUBST + TABLO STRINGLERI ============================
export function sProd(i: CiInputs): string {
  return `Yıllık üretim = ${fmt(i.kwp)} kWp × ${fmt(i.spec)} = <b>${fmt(i.kwp * i.spec / 1000, 1)} MWh</b> · Haziran payı %${SOLAR_M[5]} → günlük ${fmt(i.kwp * i.spec * SOLAR_M[5] / 100 / 30)} kWh · yerleşim: ${i.orient === 'ew' ? 'doğu-batı (yayvan eğri)' : 'güney (öğle tepeli)'}`;
}
export function sLimit(i: CiInputs, m: CiModel): string {
  const y1 = m.years[0], s1 = y1.s, L1 = y1.L;
  return `1) Limit = ${fmt(i.consPrev / 1000)} MWh × 2 = <b>${i.abone === 'mesken' ? '∞ (mesken)' : fmt(L1.limit / 1000) + ' MWh'}</b><br>`
    + `2) Mahsup = <b>${fmt(s1.mah / 1000, 1)} MWh</b> · Yıllık fazla = <b>${fmt(s1.faz / 1000, 1)} MWh</b><br>`
    + `3) Bedelli satış = min(${fmt(s1.faz / 1000, 1)}, ${i.abone === 'mesken' ? '∞' : fmt(Math.max(0, L1.limit - s1.mah) / 1000, 1)}) = <b>${fmt(L1.bedelli / 1000, 1)} MWh</b><br>`
    + `4) Bedelsiz = <b>${fmt(L1.bedelsiz / 1000, 1)} MWh</b>${L1.bedelsiz > 0 ? ' → yıl-1 kaybı ≈ ' + usd(L1.bedelsiz * y1.sell / y1.fx) : ''}`;
}
export function sTar(i: CiInputs, m: CiModel): string {
  const y1 = m.years[0], y10 = m.years[Math.min(9, m.years.length - 1)];
  const s1 = y1.s;
  return `Yıl-1: tasarruf ${fmt((s1.mah + s1.shift) / 1000, 1)} MWh × ${fmt(y1.buy, 2)} ₺ = <b>${tlAmt(y1.sav)}</b> ÷ kur ${fmt(y1.fx, 1)} = <b>${usd(y1.sav / y1.fx)}</b><br>`
    + `Yıl-10: alış fiyatı ${fmt(y10.buy, 2)} ₺ · kur ${fmt(y10.fx, 1)} → USD fiyat ${fmt(y10.buy / y10.fx * 100, 2)} ¢/kWh (yıl-1: ${fmt(i.pBuy / i.fx0 * 100, 2)} ¢)`
    + (i.fxMode === 'ppp' ? ` — SAGP altında USD fiyat yalnız USD enflasyonu${i.preal ? '+reel artış' : ''} kadar büyür` : '');
}
export function sBess(i: CiInputs, m: CiModel): string {
  if (!i.bessOn) return 'BESS kapalı — kutuyu işaretleyerek dahil et.';
  const y1 = m.years[0], s1 = y1.s;
  return `Yıl-1 kaydırma = <b>${fmt(s1.shift / 1000, 1)} MWh</b> → ek değer = ${fmt(s1.shift / 1000, 1)} × (${fmt(y1.buy, 2)} − ${fmt(y1.sell, 2)}) = <b>${usd(s1.shift * (y1.buy - y1.sell) / y1.fx)}</b>/yıl fiyat terfisi + satılamayan bedelsizden kurtarma etkisi · BESS CAPEX = ${usd(i.bKwh * i.bCapex)}`;
}
export function sBess2(i: CiInputs, m: CiModel): string {
  if (!i.bessOn) return '';
  const y1 = m.years[0], s1 = y1.s, rte = i.bRte / 100;
  const uplift = s1.shift * (y1.buy - y1.sell);
  return `Yıl-1 kaydırma = <b>${fmt(s1.shift / 1000, 1)} MWh</b> (şarj ${fmt(s1.shift / rte / 1000, 1)} MWh × RTE %${fmt(i.bRte, 0)})<br>`
    + `Fiyat terfisi = ${fmt(s1.shift / 1000, 1)} MWh × (${fmt(y1.buy, 2)} − ${fmt(y1.sell, 2)}) ₺ = <b>${tlAmt(uplift)}</b> ≈ ${usd(uplift / y1.fx)}/yıl · öz tüketim %${fmt(s1.mah / s1.prod * 100, 1)} → %${fmt((s1.mah + s1.shift) / s1.prod * 100, 1)}`;
}
export function sFin(i: CiInputs, m: CiModel): string {
  const y1 = m.years[0], eq = m.capex - m.loan;
  return `CAPEX = ${fmt(i.kwp)} kWp × ${fmt(i.capexU)} $${i.bessOn ? ' + ' + fmt(i.bKwh) + ' kWh × ' + fmt(i.bCapex) + ' $' : ''} = <b>${usd(m.capex)}</b><br>`
    + `Yıl-1 net TL fayda ${fmt(y1.cfTL)} ₺ ÷ kur ${fmt(y1.fx, 1)} = <b>${usd(y1.cf)}</b> USD nakit akışı<br>`
    + (i.lOn ? `Kredi (USD) = %${fmt(i.lRatio)} × ${usd(m.capex)} = <b>${usd(m.loan)}</b> · yıllık taksit (anüite, %${fmt(i.lRate, 1)}, ${i.lTerm} yıl) = <b>${usd(m.pay)}</b> · özkaynak = <b>${usd(eq)}</b><br>` : '')
    + `NPV = −${usd(m.capex)} + Σ CF<sub>USD</sub>/(1+%${fmt(i.r, 1)})<sup>t</sup> = <b>${usd(m.npv)}</b> · IRR = <b>${pct(m.irr * 100, 1)}</b> (USD)`;
}

export function balHtml(i: CiInputs, m: CiModel): string {
  const y1 = m.years[0], s1 = y1.s, L1 = y1.L;
  return `<thead><tr><th>Kalem</th><th>MWh</th><th>TL fiyat</th><th>TL/yıl</th><th>USD/yıl</th></tr></thead><tbody>`
    + `<tr><td>Üretim (yıl-1)</td><td>${fmt(s1.prod / 1000, 1)}</td><td>–</td><td>–</td><td>–</td></tr>`
    + `<tr><td>Tüketim</td><td>${fmt(i.consY / 1000, 1)}</td><td>–</td><td>–</td><td>–</td></tr>`
    + `<tr><td>Mahsuplaşan${i.bessOn ? ' (+BESS ' + fmt(s1.shift / 1000, 1) + ')' : ''}</td><td>${fmt((s1.mah + s1.shift) / 1000, 1)}</td><td>${fmt(y1.buy, 2)} ₺ alış</td><td>+${fmt(y1.sav)}</td><td>+${fmt(y1.sav / y1.fx)}</td></tr>`
    + `<tr><td>Bedelli fazla satış</td><td>${fmt(L1.bedelli / 1000, 1)}</td><td>${fmt(y1.sell, 2)} ₺ satış</td><td>+${fmt(y1.rev)}</td><td>+${fmt(y1.rev / y1.fx)}</td></tr>`
    + `<tr><td>Bedelsiz (limit üstü)</td><td>${fmt(L1.bedelsiz / 1000, 1)}</td><td>0 ₺${i.skb > 0 ? ' − SKB' : ''}</td><td>${y1.cost > 0 ? '−' + fmt(y1.cost) : '0'}</td><td>${y1.cost > 0 ? '−' + fmt(y1.cost / y1.fx) : '0'}</td></tr>`
    + `<tr><td>Şebekeden çekiş (bilgi)</td><td>${fmt(s1.cek / 1000, 1)}</td><td>${fmt(y1.buy, 2)} ₺</td><td colspan="2">fatura tarafı</td></tr>`
    + `<tr><td>OPEX</td><td>–</td><td>–</td><td>−${fmt(y1.opexTL)}</td><td>−${fmt(y1.opexTL / y1.fx)}</td></tr>`
    + `<tr class="tot"><td>Net yıllık fayda (kur ${fmt(y1.fx, 1)})</td><td>–</td><td>–</td><td>${fmt(y1.cfTL)}</td><td>${fmt(y1.cf)}</td></tr></tbody>`;
}

// ============================ KPI + verdict ============================
export interface CiKpi { cls: string; label: string; val: string; hint: string; }
export function ciKpis(i: CiInputs, m: CiModel): CiKpi[] {
  const y1 = m.years[0], s1 = y1.s, L1 = y1.L;
  return [
    { cls: m.npv >= 0 ? 'good' : 'bad', label: 'NPV', val: usd(m.npv), hint: `r=%${fmt(i.r)} · ${i.life} yıl` },
    { cls: 'navy', label: 'Proje IRR', val: pct(m.irr * 100, 1), hint: 'TL, nominal' },
    { cls: 'navy', label: 'Payback', val: Number.isFinite(m.pb) ? fmt(m.pb, 2) + ' yıl' : '–', hint: `basit · iskontolu ${Number.isFinite(m.pbD) ? fmt(m.pbD, 2) + ' yıl' : '–'} (grafik)` },
    { cls: 'navy', label: 'Equity IRR', val: i.lOn ? pct(m.eIRR * 100, 1) : '—', hint: i.lOn ? `özkaynak ${usd(m.capex - m.loan)} · taksit ${usd(m.pay / 12)} /ay` : 'kredi kapalı' },
    { cls: 'good', label: '1. Yıl Net Fayda', val: usd(y1.cf), hint: 'tasarruf + satış − OPEX' },
    { cls: 'navy', label: 'Öz Tüketim Oranı', val: pct(s1.prod > 0 ? (s1.mah + s1.shift) / s1.prod * 100 : 0, 1), hint: 'mahsup ÷ üretim' },
    { cls: 'navy', label: 'Otonomi', val: pct(i.consY > 0 ? (s1.mah + s1.shift) / i.consY * 100 : 0, 1), hint: 'karşılanan tüketim payı' },
    { cls: 'bad', label: 'Bedelsiz Kayıp (Y1)', val: fmt(L1.bedelsiz / 1000, 1) + ' MWh', hint: L1.bedelsiz > 0 ? `≈ ${usd(L1.bedelsiz * y1.sell / y1.fx)} satılamayan değer` : 'limit içinde ✓' },
  ];
}
export function ciVerdict(i: CiInputs, m: CiModel): { cls: string; text: string } {
  const y1 = m.years[0], s1 = y1.s, r = i.r / 100;
  if (m.npv >= 0 && m.irr > r) {
    return { cls: 'good', text: `✓ Yatırım USD bazında değer yaratıyor: IRR ${pct(m.irr * 100, 1)} &gt; iskonto ${pct(i.r)}, geri ödeme ${fmt(m.pb, 2)} yıl${i.lOn ? ', equity IRR ' + pct(m.eIRR * 100, 1) : ''}. Öz tüketim oranı ${pct((s1.mah + s1.shift) / Math.max(s1.prod, 1) * 100, 0)}.` };
  }
  return { cls: 'bad', text: `✗ Bu varsayımlarla NPV ${usd(m.npv)}: sistem boyutunu tüketim profiline yaklaştırmayı, BESS ile öz tüketimi artırmayı veya CAPEX/tarife varsayımlarını gözden geçir.` };
}

// ============================ FATURA (tab 3) ============================
export function billSumHtml(i: CiInputs, m: CiModel): string {
  const y1 = m.years[0], s1 = y1.s, L1 = y1.L, buy = y1.buy, fx = y1.fx;
  const cekA = s1.cek, billNo = i.consY * buy, billYes = cekA * buy;
  const netYes = billYes - y1.rev + y1.cost, savTL = billNo - netYes;
  const r = (lab: string, a: string, b: string, d: string) => `<tr><td>${lab}</td><td>${a}</td><td>${b}</td><td>${d}</td></tr>`;
  return `<thead><tr><th>Kalem</th><th>GES'siz</th><th>GES'li</th><th>Fark</th></tr></thead><tbody>`
    + r('Yıllık tüketim (kWh)', fmt(i.consY), fmt(i.consY), '0 — aynı')
    + r('GES üretimi (kWh)', '—', fmt(s1.prod), `<span style="color:var(--green)">+${fmt(s1.prod)}</span>`)
    + r(`Öz tüketilen (mahsup${i.bessOn ? '+BESS' : ''}, kWh)`, '—', fmt(s1.mah + s1.shift), `<span style="color:var(--green)">+${fmt(s1.mah + s1.shift)}</span>`)
    + r('Şebekeye satılan fazla (kWh)', '—', fmt(L1.bedelli + L1.bedelsiz), '—')
    + r('Şebekeden alınan (kWh)', fmt(i.consY), fmt(cekA), `<span style="color:var(--green)">−${fmt(i.consY - cekA)}</span>`)
    + r('Aktif enerji faturası (TL/yıl)', fmt(billNo), fmt(billYes), `<span style="color:var(--green)">−${fmt(billNo - billYes)}</span>`)
    + r('Fazla satış geliri (TL/yıl)', '—', '+' + fmt(y1.rev), `<span style="color:var(--green)">+${fmt(y1.rev)}</span>`)
    + (y1.cost > 0 ? r('Limit üstü SKB (TL/yıl)', '—', '−' + fmt(y1.cost), `<span style="color:var(--red)">−${fmt(y1.cost)}</span>`) : '')
    + `<tr class="tot"><td>Net yıllık fatura (TL, OPEX hariç)</td><td>${fmt(billNo)}</td><td>${fmt(netYes)}</td><td style="color:var(--green)">−${fmt(savTL)} (−%${fmt(savTL / billNo * 100, 1)})</td></tr>`
    + `<tr class="tot"><td>USD karşılığı (kur ${fmt(fx, 1)})</td><td>${usd(billNo / fx)}</td><td>${usd(netYes / fx)}</td><td style="color:var(--green)">−${usd(savTL / fx)}</td></tr></tbody>`;
}
export function billMonthlyHtml(i: CiInputs, m: CiModel): string {
  const y1 = m.years[0], s1 = y1.s, L1 = y1.L, buy = y1.buy;
  const fazTot = s1.faz || 1, bedTot = L1.bedelli;
  let rows = '', tN = 0, tY = 0, tR = 0;
  for (let mi = 0; mi < 12; mi++) {
    const consM = ciMonthCons(i, mi), d = s1.monthly[mi], cekM = d.cek, prodM = d.prod;
    const bN = consM * buy, bY = cekM * buy, revM = (d.faz / fazTot) * bedTot * y1.sell;
    tN += bN; tY += bY; tR += revM;
    rows += `<tr><td>${MONTHS[mi]}</td><td>${fmt(prodM)}</td><td>${fmt(consM)}</td><td>${fmt(cekM)}</td><td>${fmt(bN)}</td><td>${fmt(bY)}</td><td>+${fmt(revM)}</td><td style="color:var(--green)">−${fmt(bN - bY + revM)}</td></tr>`;
  }
  return `<thead><tr><th>Ay</th><th>Üretim (kWh)</th><th>Tüketim (kWh)</th><th>Çekiş (kWh)</th><th>GES'siz fatura (TL)</th><th>GES'li fatura (TL)</th><th>Satış geliri (TL)</th><th>Aylık fayda (TL)</th></tr></thead><tbody>${rows}`
    + `<tr class="tot"><td>Σ Yıl</td><td>${fmt(s1.prod)}</td><td>${fmt(i.consY)}</td><td>${fmt(s1.cek)}</td><td>${fmt(tN)}</td><td>${fmt(tY)}</td><td>+${fmt(tR)}</td><td style="color:var(--green)">−${fmt(tN - tY + tR)}</td></tr></tbody>`;
}
export function sBill(i: CiInputs, m: CiModel): string {
  const y1 = m.years[0], s1 = y1.s, buy = y1.buy, fx = y1.fx;
  const cekA = s1.cek, billNo = i.consY * buy, billYes = cekA * buy;
  const netYes = billYes - y1.rev + y1.cost, savTL = billNo - netYes;
  return `GES'siz = ${fmt(i.consY)} kWh × ${fmt(buy, 2)} ₺ = <b>${fmt(billNo)} TL</b><br>`
    + `GES'li fatura = ${fmt(cekA)} kWh × ${fmt(buy, 2)} ₺ = <b>${fmt(billYes)} TL</b> → net fatura = ${fmt(billYes)} − ${fmt(y1.rev)} (satış)${y1.cost > 0 ? ' + ' + fmt(y1.cost) + ' (SKB)' : ''} = <b>${fmt(netYes)} TL</b><br>`
    + `Fatura tasarrufu = ${fmt(billNo)} − ${fmt(netYes)} = <b>${fmt(savTL)} TL</b> · USD: <b>${usd(savTL / fx)}</b><br>`
    + `Not: OPEX (${fmt(y1.opexTL)} TL/yıl) fatura kalemi değildir; işletme gideri olarak yalnız Fizibilite sekmesindeki nakit akışına girer. Fatura tasarrufu − OPEX = modelin yıl-1 nakit akışı ${fmt(y1.cfTL)} TL.`;
}

// ============================ KARŞILAŞTIRMA (tab 4) ============================
export function compareHtml(i: CiInputs): string {
  const { h, mo, Lh, Lm, benH, benM } = ciCompareYear1(i);
  const row = (lab: string, a: number, b: number, d = 1, suf = ' MWh') => `<tr><td>${lab}</td><td>${fmt(a, d)}${suf}</td><td>${fmt(b, d)}${suf}</td><td>${fmt(a - b, d)}${suf}</td></tr>`;
  return `<thead><tr><th>Kalem (yıl-1)</th><th>⏰ Saatlik</th><th>📅 Aylık</th><th>Fark</th></tr></thead><tbody>`
    + row('Üretim', h.prod / 1000, mo.prod / 1000)
    + row('Mahsuplaşan', (h.mah + h.shift) / 1000, mo.mah / 1000)
    + row('Fazla üretim', h.faz / 1000, mo.faz / 1000)
    + row('Şebekeden çekiş', h.cek / 1000, mo.cek / 1000)
    + row('Bedelli satış', Lh.bedelli / 1000, Lm.bedelli / 1000)
    + `<tr><td>Tasarruf + satış (USD, yıl-1)</td><td>${fmt(benH)}</td><td>${fmt(benM)}</td><td>${fmt(benH - benM)}</td></tr>`
    + `<tr class="tot"><td>Saatlik rejimin maliyeti</td><td colspan="3">${usd(benM - benH)} / yıl (${pct(benM > 0 ? (benM - benH) / benM * 100 : 0, 1)} azalma)</td></tr></tbody>`;
}
export function compareNote(i: CiInputs): string {
  return i.abone === 'mesken'
    ? 'Mesken abonesisin: fiilen aylık rejimdesin, bu tablo bilgilendirme amaçlıdır.'
    : 'C&I aboneler 01.05.2026 itibarıyla saatlik rejime tabidir; aylık sütun, eski rejimde ne kazanılacağını gösterir. BESS dahilse saatlik sütunda kaydırma etkisi yansıtılmıştır.';
}

// ============================ SAATLİK VERİ (tab 2) ============================
export function hourViewTable(i: CiInputs, m: CiModel, mi: number | 'y', dt: 'wd' | 'we'): string {
  const bess = i.bessOn;
  if (mi === 'y') {
    const y1 = m.years[0].s;
    let rows = '';
    for (let k = 0; k < 12; k++) {
      const d = y1.monthly[k];
      rows += `<tr><td>${MONTHS[k]}</td><td>${fmt(d.prod)}</td><td>${fmt(d.cons)}</td><td>${fmt(d.mah)}</td>${bess ? `<td>${fmt(d.shift / (i.bRte / 100))}</td><td>${fmt(d.shift)}</td>` : ''}<td>${fmt(d.faz)}</td><td>${fmt(d.cek)}</td></tr>`;
    }
    return `<thead><tr><th>Ay</th><th>Üretim</th><th>Tüketim</th><th>Mahsup</th>${bess ? '<th>BESS şarj</th><th>BESS deşarj</th>' : ''}<th>Fazla</th><th>Çekiş</th></tr></thead>`
      + `<tbody>${rows}<tr class="tot"><td>Σ Yıl</td><td>${fmt(y1.prod)}</td><td>${fmt(i.consY)}</td><td>${fmt(y1.mah)}</td>${bess ? `<td>${fmt(y1.shift / (i.bRte / 100))}</td><td>${fmt(y1.shift)}</td>` : ''}<td>${fmt(y1.faz)}</td><td>${fmt(y1.cek)}</td></tr></tbody>`;
  }
  const T = ciDayDetail(i, mi, dt);
  let rows = '', tp = 0, tc = 0, tm = 0, tch = 0, tdc = 0, tf = 0, tk = 0;
  for (let h = 0; h < 24; h++) {
    tp += T.prod[h]; tc += T.cons[h]; tm += T.mah[h]; tch += T.ch[h]; tdc += T.dch[h]; tf += T.faz[h]; tk += T.cek[h];
    rows += `<tr><td>${h}:00</td><td>${fmt(T.prod[h], 1)}</td><td>${fmt(T.cons[h], 1)}</td><td>${fmt(T.mah[h], 1)}</td>${bess ? `<td>${fmt(T.ch[h], 1)}</td><td>${fmt(T.dch[h], 1)}</td>` : ''}<td>${fmt(T.faz[h], 1)}</td><td>${fmt(T.cek[h], 1)}</td></tr>`;
  }
  return `<thead><tr><th>Saat</th><th>Üretim</th><th>Tüketim</th><th>Mahsup</th>${bess ? '<th>BESS şarj</th><th>BESS deşarj</th>' : ''}<th>Fazla</th><th>Çekiş</th></tr></thead>`
    + `<tbody>${rows}<tr class="tot"><td>Σ Gün</td><td>${fmt(tp)}</td><td>${fmt(tc)}</td><td>${fmt(tm)}</td>${bess ? `<td>${fmt(tch)}</td><td>${fmt(tdc)}</td>` : ''}<td>${fmt(tf)}</td><td>${fmt(tk)}</td></tr></tbody>`;
}
export function hourViewTotals(i: CiInputs, m: CiModel, mi: number, dt: 'wd' | 'we'): string {
  const bess = i.bessOn;
  const T = ciDayDetail(i, mi, dt);
  const S = (a: number[]) => a.reduce((x, y) => x + y, 0);
  const wdD = DAYS[mi] * 5 / 7, weD = DAYS[mi] * 2 / 7, dayCnt = dt === 'wd' ? wdD : weD;
  const y1 = m.years[0].s, md = y1.monthly[mi], rte = i.bRte / 100;
  const monMap: Record<string, number> = { prod: md.prod, cons: md.cons, mah: md.mah, ch: md.shift / rte, dch: md.shift, faz: md.faz, cek: md.cek };
  const yearVals: Record<string, number> = { prod: y1.prod, cons: i.consY, mah: y1.mah, ch: y1.shift / rte, dch: y1.shift, faz: y1.faz, cek: y1.cek };
  const cols = bess ? ['prod', 'cons', 'mah', 'ch', 'dch', 'faz', 'cek'] : ['prod', 'cons', 'mah', 'faz', 'cek'];
  const heads = bess ? ['Üretim', 'Tüketim', 'Mahsup', 'BESS şarj', 'BESS deşarj', 'Fazla', 'Çekiş'] : ['Üretim', 'Tüketim', 'Mahsup', 'Fazla', 'Çekiş'];
  const dayVals = cols.map((k) => S((T as unknown as Record<string, number[]>)[k]));
  return `<thead><tr><th>Kapsam</th>${heads.map((h) => '<th>' + h + ' (kWh)</th>').join('')}</tr></thead><tbody>`
    + `<tr><td>Seçili gün (${dt === 'wd' ? 'Hİ' : 'HS'})</td>${dayVals.map((v) => '<td>' + fmt(v) + '</td>').join('')}</tr>`
    + `<tr><td>× ${fmt(dayCnt, 1)} gün</td>${dayVals.map((v) => '<td>' + fmt(v * dayCnt) + '</td>').join('')}</tr>`
    + `<tr><td>${MONTHS[mi]} toplamı (Hİ+HS, motor)</td>${cols.map((k) => '<td>' + fmt(monMap[k]) + '</td>').join('')}</tr>`
    + `<tr class="tot"><td>Yıl toplamı (12 ay)</td>${cols.map((k) => '<td>' + fmt(yearVals[k]) + '</td>').join('')}</tr></tbody>`;
}
export function hourViewTitle(mi: number | 'y', dt: 'wd' | 'we'): string {
  return mi === 'y' ? 'Yıl geneli — ay ay toplamlar (kWh, Hİ + HS birlikte)'
    : `${MONTHS[mi]} · ${dt === 'wd' ? 'Hafta içi' : 'Hafta sonu'} temsili günü — saat saat (kWh)`;
}

// ============================ GRAFİKLER (SVG string) ============================
export interface Bar { lab: string; val: number; c: string; click?: { level: string; mi?: number; dt?: 'wd' | 'we' }; }
export interface ConsChartState { level: 'y' | 'm' | 'd'; mi: number; dt: 'wd' | 'we'; }
export function consChart(i: CiInputs, cg: ConsChartState): { svg: string; hint: string; bars: Bar[] } {
  const W = 900, H = 260, pl = 64, pr = 12, pb = 30, pt = 16;
  let bars: Bar[] = [], hint = '';
  if (cg.level === 'y') {
    bars = MONTHS.map((lab, k) => ({ lab, val: ciMonthCons(i, k) / 1000, c: '#18428F', click: { level: 'm', mi: k } }));
    hint = 'Birim: MWh/ay. Bir ayın çubuğuna tıklayınca o ayın gün gün dağılımı açılır.';
  } else if (cg.level === 'm') {
    const mi = cg.mi, nd = DAYS[mi];
    const dw = ciDayCons(i, mi, 'wd').reduce((a, b) => a + b, 0), de = ciDayCons(i, mi, 'we').reduce((a, b) => a + b, 0);
    for (let d = 0; d < nd; d++) {
      const we = d % 7 >= 5;
      bars.push({ lab: (d + 1) % 5 === 0 || d === 0 ? String(d + 1) : '', val: (we ? de : dw) / 1000, c: we ? '#E8A020' : '#18428F', click: { level: 'd', mi, dt: we ? 'we' : 'wd' } });
    }
    hint = `${MONTHS[mi]}: hafta içi günlük ${fmt(dw)} kWh (lacivert), hafta sonu ${fmt(de)} kWh (altın). Ay pazartesi başlar varsayılır. Bir güne tıklayınca 24 saatlik profil açılır. Birim: MWh/gün.`;
  } else {
    const cd = ciDayCons(i, cg.mi, cg.dt);
    bars = cd.map((v, h) => ({ lab: h % 3 === 0 ? h + ':00' : '', val: v, c: cg.dt === 'we' ? '#E8A020' : '#18428F' }));
    hint = `${MONTHS[cg.mi]} · ${cg.dt === 'wd' ? 'hafta içi' : 'hafta sonu'} temsili günü, saat saat tüketim (kWh). Gün toplamı ${fmt(cd.reduce((a, b) => a + b, 0))} kWh.`;
  }
  const mx = Math.max(...bars.map((b) => b.val), 1e-9);
  const x = (k: number) => pl + (W - pl - pr) * (k + 0.5) / bars.length, bw = Math.max(3, (W - pl - pr) / bars.length * 0.62);
  const y = (v: number) => pt + (H - pt - pb) * (1 - v / mx);
  let s = '';
  for (let g = 0; g <= 4; g++) { const v = mx * g / 4; s += `<line x1="${pl}" y1="${y(v)}" x2="${W - pr}" y2="${y(v)}" stroke="#E2E7EF"/><text x="${pl - 6}" y="${y(v) + 3}" text-anchor="end">${fmt(v, cg.level === 'd' ? 0 : 1)}</text>`; }
  bars.forEach((b, k) => {
    s += `<rect data-i="${k}" x="${x(k) - bw / 2}" y="${y(b.val)}" width="${bw}" height="${H - pb - y(b.val)}" fill="${b.c}" rx="2"${b.click ? ' style="cursor:pointer"' : ''}/>`;
    if (b.lab) s += `<text x="${x(k)}" y="${H - 9}" text-anchor="middle">${b.lab}</text>`;
  });
  return { svg: s, hint, bars };
}

export interface NetChartState { mi: number | 'y'; view: 'm' | 'd'; wd: boolean; we: boolean; }
export function netChart(i: CiInputs, nv: NetChartState): { svg: string; hint: string } {
  const W = 900, H = 300, pl = 64, pr = 12, pt = 16, pb = 34;
  const S = (a: number[]) => a.reduce((x, y) => x + y, 0);
  const yearMode = nv.mi === 'y';
  interface Col { lab: string; mah: number; sh: number; fz: number; ck: number; pr: number; cn: number; dim?: boolean; group?: string; gsep?: boolean; }
  let cols: Col[] = [], unit = 'kWh', hint = '';
  if (yearMode) {
    for (let mi = 0; mi < 12; mi++) {
      const wdD = DAYS[mi] * 5 / 7, weD = DAYS[mi] * 2 / 7;
      let mah = 0, sh = 0, fz = 0, ck = 0, pr_ = 0, cn = 0;
      ([['wd', wdD], ['we', weD]] as const).forEach(([dt, days]) => {
        if (!nv[dt]) return;
        const T = ciDayDetail(i, mi, dt);
        mah += S(T.mah) * days; sh += S(T.dch) * days; fz += S(T.faz) * days; ck += S(T.cek) * days; pr_ += S(T.prod) * days; cn += S(T.cons) * days;
      });
      cols.push({ lab: MONTHS[mi], mah: mah / 1e3, sh: sh / 1e3, fz: fz / 1e3, ck: ck / 1e3, pr: pr_ / 1e3, cn: cn / 1e3 });
    }
    unit = 'MWh';
    hint = 'Yıllık görünüm: her ay için seçili gün tiplerinin toplamı. Çubuk = üretimin bileşenleri (mahsup + BESS kaydırma + fazla); gri çubuk = şebekeden çekiş. Çizgiler: lacivert üretim, koyu tüketim.';
  } else if (nv.view === 'm') {
    const mi = nv.mi as number, nd = DAYS[mi];
    for (let d = 0; d < nd; d++) {
      const we = d % 7 >= 5, on = nv[we ? 'we' : 'wd'];
      const T = ciDayDetail(i, mi, we ? 'we' : 'wd', ciDayFactor(mi, d));
      cols.push({ lab: (d + 1) % 5 === 0 || d === 0 ? String(d + 1) : '', dim: !on, mah: S(T.mah), sh: S(T.dch), fz: S(T.faz), ck: S(T.cek), pr: S(T.prod), cn: S(T.cons) });
    }
    hint = `${MONTHS[mi]} · gün gün (pazartesi başlar varsayılır): üretim, ay içi mevsim eğimiyle gün gün değişir (aylık ortalamalar arası interpolasyon; ay toplamı korunur). Birim: kWh/gün.`;
  } else {
    const mi = nv.mi as number;
    const types = ([['wd', 'Hafta içi'], ['we', 'Hafta sonu']] as const).filter(([k]) => nv[k]);
    types.forEach(([dt, lab], ti) => {
      const T = ciDayDetail(i, mi, dt);
      for (let h = 0; h < 24; h++) {
        cols.push({ lab: h % 4 === 0 ? h + ':00' : '', group: types.length > 1 ? lab : '', gsep: ti > 0 && h === 0, mah: T.mah[h], sh: T.dch[h], fz: T.faz[h], ck: T.cek[h], pr: T.prod[h], cn: T.cons[h] });
      }
    });
    hint = `${MONTHS[mi]} ay-ortalaması temsili günü, saat saat.${types.length > 1 ? ' Sol blok hafta içi, sağ blok hafta sonu.' : ''} Birim: kWh/saat.`;
  }
  const mx = Math.max(...cols.map((c) => Math.max(c.mah + c.sh + c.fz, c.ck, c.pr, c.cn)), 1e-9);
  const n = cols.length;
  const x = (k: number) => pl + (W - pl - pr) * (k + 0.5) / n, bwFull = (W - pl - pr) / n, bw = Math.max(2.5, bwFull * 0.6);
  const y = (v: number) => pt + (H - pt - pb) * (1 - v / mx);
  let s = '';
  for (let g = 0; g <= 4; g++) { const v = mx * g / 4; s += `<line x1="${pl}" y1="${y(v)}" x2="${W - pr}" y2="${y(v)}" stroke="#E2E7EF"/><text x="${pl - 6}" y="${y(v) + 3}" text-anchor="end">${fmt(v, mx < 20 ? 1 : 0)}</text>`; }
  cols.forEach((c, k) => {
    const op = c.dim ? ' opacity=".22"' : '';
    if (c.gsep) s += `<line x1="${x(k) - bwFull / 2}" y1="${pt}" x2="${x(k) - bwFull / 2}" y2="${H - pb}" stroke="#98A2B6" stroke-dasharray="4 3"/>`;
    let base = 0;
    ([[c.mah, '#2F6B4F'], [c.sh, '#5D7FA3'], [c.fz, '#C9922A']] as const).forEach(([v, col]) => {
      if (v > 0) { s += `<rect x="${x(k) - bw / 2}" y="${y(base + v)}" width="${bw * 0.55}" height="${y(base) - y(base + v)}" fill="${col}"${op}/>`; base += v; }
    });
    if (c.ck > 0) s += `<rect x="${x(k) - bw / 2 + bw * 0.6}" y="${y(c.ck)}" width="${bw * 0.4}" height="${H - pb - y(c.ck)}" fill="#9E3A3F"${op}/>`;
    if (c.lab) s += `<text x="${x(k)}" y="${H - 9}" text-anchor="middle">${c.lab}</text>`;
    if (c.group && c.lab === '0:00') s += `<text x="${x(k + 11)}" y="${pt - 2}" text-anchor="middle" style="font-weight:600;fill:#00A651">${c.group}</text>`;
  });
  const line = (key: keyof Col, col: string) => {
    const pts = cols.map((c, k) => x(k) + ',' + y(c[key] as number)).join(' ');
    return `<polyline fill="none" stroke="#FFFFFF" stroke-width="5.5" stroke-linejoin="round" stroke-linecap="round" points="${pts}"/><polyline fill="none" stroke="${col}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" points="${pts}"/>`;
  };
  s += line('pr', '#00A651') + line('cn', '#0E2A5E');
  return { svg: s, hint: hint + ' Eksen: ' + unit + '.' };
}

export function monthlyChart(m: CiModel): string {
  const y1 = m.years[0], L = y1.L;
  const W = 900, H = 250, pl = 56, pr = 12, pt = 14, pb = 26;
  const fazTot = y1.s.faz || 1;
  const data = y1.s.monthly;
  const mx = Math.max(...data.map((d) => Math.max(d.mah + d.shift, d.faz, d.cek))) / 1000 || 1;
  const x = (k: number) => pl + (W - pl - pr) * (k + 0.5) / 12, bw = (W - pl - pr) / 12 * 0.22;
  const y = (v: number) => pt + (H - pt - pb) * (1 - v / mx);
  let s = '';
  for (let g = 0; g <= 4; g++) { const v = mx * g / 4; s += `<line x1="${pl}" y1="${y(v)}" x2="${W - pr}" y2="${y(v)}" stroke="#E2E7EF"/><text x="${pl - 6}" y="${y(v) + 3}" text-anchor="end">${fmt(v, 0)}</text>`; }
  data.forEach((d, k) => {
    const bfree = (L.bedelsiz > 0 ? d.faz / fazTot * L.bedelsiz : 0) / 1000, bpaid = d.faz / 1000 - bfree;
    s += `<rect x="${x(k) - bw * 1.6}" y="${y((d.mah + d.shift) / 1000)}" width="${bw}" height="${H - pb - y((d.mah + d.shift) / 1000)}" fill="#1E7F4F"/>`;
    s += `<rect x="${x(k) - bw * 0.5}" y="${y(bpaid)}" width="${bw}" height="${H - pb - y(bpaid)}" fill="#E8A020"/>`;
    if (bfree > 0.01) s += `<rect x="${x(k) - bw * 0.5}" y="${y(bpaid + bfree)}" width="${bw}" height="${y(bpaid) - y(bpaid + bfree)}" fill="#C7000B"/>`;
    s += `<rect x="${x(k) + bw * 0.6}" y="${y(d.cek / 1000)}" width="${bw}" height="${H - pb - y(d.cek / 1000)}" fill="#C9D3E4"/>`;
    s += `<text x="${x(k)}" y="${H - 8}" text-anchor="middle">${MONTHS[k]}</text>`;
  });
  return s;
}
export function cumChart(i: CiInputs, m: CiModel): string {
  const r = i.r / 100;
  const pts = [-m.capex]; let cum = -m.capex;
  m.cfs.forEach((cf, k) => { cum += cf / Math.pow(1 + r, k + 1); pts.push(cum); });
  const W = 900, H = 240, pl = 70, pr = 12, pt = 14, pb = 26;
  const mn = Math.min(...pts, 0), mx = Math.max(...pts, 0);
  const x = (k: number) => pl + (W - pl - pr) * k / (pts.length - 1);
  const y = (v: number) => pt + (H - pt - pb) * (1 - (v - mn) / ((mx - mn) || 1));
  let s = '';
  for (let g = 0; g <= 4; g++) { const v = mn + (mx - mn) * g / 4; s += `<line x1="${pl}" y1="${y(v)}" x2="${W - pr}" y2="${y(v)}" stroke="#E2E7EF"/><text x="${pl - 6}" y="${y(v) + 3}" text-anchor="end">${(v / 1e3).toFixed(0)}k$</text>`; }
  s += `<line x1="${pl}" y1="${y(0)}" x2="${W - pr}" y2="${y(0)}" stroke="#5A6478" stroke-dasharray="4 3"/>`;
  const bw = Math.max(3, (W - pl - pr) / pts.length * 0.55);
  pts.forEach((v, k) => {
    s += `<rect x="${x(k) - bw / 2}" y="${v >= 0 ? y(v) : y(0)}" width="${bw}" height="${Math.abs(y(v) - y(0)) || 0.5}" fill="${v >= 0 ? '#18428F' : '#C9D3E4'}" rx="1.5"/>`;
    if (k % 5 === 0 || k === pts.length - 1) s += `<text x="${x(k)}" y="${H - 8}" text-anchor="middle">${k}</text>`;
  });
  for (let k = 1; k < pts.length; k++) if (pts[k - 1] < 0 && pts[k] >= 0) {
    const frac = -pts[k - 1] / (pts[k] - pts[k - 1]);
    const xi = x(k - 1) + (x(k) - x(k - 1)) * frac, yi = y(0);
    s += `<line x1="${xi}" y1="${pt}" x2="${xi}" y2="${H - pb}" stroke="#E8A020" stroke-dasharray="3 3"/>`;
    s += `<circle cx="${xi}" cy="${yi}" r="5" fill="#E8A020" stroke="#fff" stroke-width="2"/><text x="${xi}" y="${yi - 9}" text-anchor="middle" style="font-weight:600;fill:#9A6A0E">iskontolu geri ödeme: ${fmt(k - 1 + frac, 2)} yıl</text>`;
    break;
  }
  return s;
}

// ============================ SAAT SAAT MODAL ============================
export function hourlyModal(i: CiInputs, nv: NetChartState): { title: string; body: string } {
  const mi = nv.mi === 'y' ? 5 : nv.mi;
  const types = ([['wd', 'hafta içi'], ['we', 'hafta sonu']] as const).filter(([k]) => nv[k]);
  const mkTable = (dt: 'wd' | 'we', lab: string) => {
    const T = ciDayDetail(i, mi, dt);
    const dayCnt = dt === 'wd' ? DAYS[mi] * 5 / 7 : DAYS[mi] * 2 / 7;
    let rows = '', tp = 0, tc = 0, tm = 0, tch = 0, tdc = 0, tf = 0, tk = 0;
    for (let h = 0; h < 24; h++) {
      tp += T.prod[h]; tc += T.cons[h]; tm += T.mah[h]; tch += T.ch[h]; tdc += T.dch[h]; tf += T.faz[h]; tk += T.cek[h];
      rows += `<tr><td>${h}:00</td><td>${fmt(T.prod[h], 1)}</td><td>${fmt(T.cons[h], 1)}</td><td>${fmt(T.mah[h], 1)}</td>${i.bessOn ? `<td>${fmt(T.ch[h], 1)}</td><td>${fmt(T.dch[h], 1)}</td>` : ''}<td>${fmt(T.faz[h], 1)}</td><td>${fmt(T.cek[h], 1)}</td></tr>`;
    }
    return `<h4 style="font-family:var(--mono);font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--navy);margin:10px 0 6px">${lab} · ayda ≈ ${fmt(dayCnt, 1)} gün</h4>`
      + `<table><thead><tr><th>Saat</th><th>Üretim (kWh)</th><th>Tüketim (kWh)</th><th>Mahsup (kWh)</th>${i.bessOn ? '<th>BESS şarj</th><th>BESS deşarj</th>' : ''}<th>Fazla (kWh)</th><th>Çekiş (kWh)</th></tr></thead>`
      + `<tbody>${rows}<tr class="tot"><td>Σ gün</td><td>${fmt(tp)}</td><td>${fmt(tc)}</td><td>${fmt(tm)}</td>${i.bessOn ? `<td>${fmt(tch)}</td><td>${fmt(tdc)}</td>` : ''}<td>${fmt(tf)}</td><td>${fmt(tk)}</td></tr></tbody></table>`
      + `<div class="mnote">Denge: Üretim ${fmt(tp)} = Mahsup ${fmt(tm)} + Fazla ${fmt(tf)}${i.bessOn ? ' + Şarj ' + fmt(tch) : ''} ✓ · Tüketim ${fmt(tc)} = Mahsup ${fmt(tm)} + Çekiş ${fmt(tk)}${i.bessOn ? ' + Deşarj ' + fmt(tdc) : ''} ✓</div>`;
  };
  return {
    title: `Saat Saat Mahsuplaşma — ${MONTHS[mi]}`,
    body: `<div class="mnote">Her saat: mahsup = min(üretim, tüketim)${i.bessOn ? '; BESS fazladan şarj olur, çekişe RTE (' + fmt(i.bRte, 0) + '%) ile deşarj eder' : ''}. Tüm yılı (8.760 saat) CSV olarak indirebilirsin.</div>`
      + types.map(([dt, lab]) => mkTable(dt, lab)).join(''),
  };
}

// ============================ CSV ============================
export function csvAllYear(i: CiInputs): string {
  const sep = ';';
  let csv = ['Ay', 'Gün', 'Gün tipi', 'Saat', 'Üretim (kWh)', 'Tüketim (kWh)', 'Mahsup (kWh)', 'BESS şarj (kWh)', 'BESS deşarj (kWh)', 'Fazla üretim (kWh)', 'Şebeke çekişi (kWh)'].join(sep) + '\r\n';
  const num = (x: number) => String(Math.round(x * 100) / 100).replace('.', ',');
  for (let mi = 0; mi < 12; mi++) {
    for (let d = 0; d < DAYS[mi]; d++) {
      const we = d % 7 >= 5, lab = we ? 'Hafta sonu' : 'Hafta içi';
      const T = ciDayDetail(i, mi, we ? 'we' : 'wd', ciDayFactor(mi, d));
      for (let h = 0; h < 24; h++) {
        csv += [MONTHS[mi], d + 1, lab, h + ':00', num(T.prod[h]), num(T.cons[h]), num(T.mah[h]), num(T.ch[h]), num(T.dch[h]), num(T.faz[h]), num(T.cek[h])].join(sep) + '\r\n';
      }
    }
  }
  return csv;
}

// ============================ SENARYO MATRİSİ ============================
export function scenMatrixCi(i: CiInputs): string {
  const scen = [
    { name: 'Kötümser', pm: 0.90, prm: 0.90, cm: 1.10 },
    { name: 'Baz', pm: 1, prm: 1, cm: 1 },
    { name: 'İyimser', pm: 1.10, prm: 1.10, cm: 0.90 },
  ];
  const runs = scen.map((s) => ({ s, m: computeCi({ ...i, pBuy: i.pBuy * s.pm, pSell: i.pSell * s.pm, spec: i.spec * s.prm, capexU: i.capexU * s.cm }) }));
  const r = i.r / 100;
  const cell = (val: string, cls: string) => `<td class="${cls}">${val}</td>`;
  const row = (label: string, fn: (m: CiModel) => string, clsFn: (m: CiModel) => string) =>
    `<tr><td style="text-align:left">${label}</td>${runs.map(({ s, m }) => cell(fn(m), s.name === 'Baz' ? 'base' : clsFn(m))).join('')}</tr>`;
  const neutral = () => '';
  const selfC = (m: CiModel) => { const y1 = m.years[0]; return y1.s.prod > 0 ? (y1.s.mah + y1.s.shift) / y1.s.prod * 100 : 0; };
  let h = `<table class="senstable" style="width:100%"><tbody><tr><th style="text-align:left">Metrik</th>${scen.map((s) => `<th>${s.name}</th>`).join('')}</tr>`;
  h += row('NPV', (m) => usd(m.npv), (m) => (m.npv >= 0 ? 'g' : 'b'));
  h += row('Proje IRR', (m) => pct(m.irr * 100, 1), (m) => (m.irr >= r ? 'g' : 'b'));
  h += row('Basit geri ödeme', (m) => (Number.isFinite(m.pb) ? fmt(m.pb, 1) + ' yıl' : '—'), neutral);
  h += row('1. yıl net fayda', (m) => usd(m.years[0].cf), (m) => (m.years[0].cf >= 0 ? 'g' : 'b'));
  h += row('Öz tüketim', (m) => pct(selfC(m), 1), neutral);
  h += `</tbody></table>`;
  h += `<p class="tsub" style="margin-top:10px">Kötümser: tarife −%10, üretim −%10, CAPEX +%10 · İyimser: tersi. Her sütun, motorun (12 ay × saatlik simülasyon) tam yeniden çözümüdür.</p>`;
  return h;
}

// ============================ PDF RAPOR ============================
function esc(s: string): string {
  return String(s).replace(/[&<>]/g, (c) => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'));
}
export interface CiReportMeta { title: string; prep: string; date: string; profileLabel: string; }
export function reportCi(i: CiInputs, m: CiModel, meta: CiReportMeta): string {
  const y1 = m.years[0];
  const selfC = (y1.s.mah + y1.s.shift) / Math.max(y1.s.prod, 1) * 100;
  const rejim = i.abone === 'mesken' ? 'Mesken (aylık rejim)' : 'C&I (saatlik rejim)';
  const kpi = (l: string, v: string, cls = '') => `<div class="r-kpi${cls ? ' ' + cls : ''}"><div class="l">${l}</div><div class="v">${v}</div></div>`;
  let rows = '';
  m.years.forEach((yy) => { rows += `<tr><td>${yy.y}</td><td>${fmt((yy.s.mah + yy.s.shift) / 1000, 1)}</td><td>${fmt(yy.L.bedelli / 1000, 1)}</td><td>${fmt(yy.L.bedelsiz / 1000, 1)}</td><td>${fmt(yy.buy, 2)}</td><td>${fmt(yy.fx, 1)}</td><td>${fmt(yy.cfTL)}</td><td>${fmt(yy.cf)}</td></tr>`; });
  return `<div class="r-cover"><div class="r-eyebrow">C&I Saatlik Mahsuplaşma · Ön Fizibilite Raporu · EPDK Karar 14531</div><h1>${esc(meta.title)}</h1>`
    + `<div class="r-facts"><div class="r-fact"><b>Tarih</b><span>${esc(meta.date)}</span></div>`
    + (meta.prep ? `<div class="r-fact"><b>Hazırlayan</b><span>${esc(meta.prep)}</span></div>` : '')
    + `<div class="r-fact"><b>Rejim</b><span>${rejim}</span></div>`
    + `<div class="r-fact"><b>Kurulu güç</b><span>${fmt(i.kwp)} kWp${i.bessOn ? ' + ' + fmt(i.bKwh) + ' kWh BESS' : ''}</span></div>`
    + `<div class="r-fact"><b>Para birimi</b><span>USD · TL tarife kur projeksiyonuyla</span></div></div></div>`
    + `<div class="r-block"><h2><span class="rn">01</span>Yönetici Özeti</h2>`
    + `<div class="r-kpis">${kpi('CAPEX', usd(m.capex))}${kpi('NPV', usd(m.npv), m.npv >= 0 ? 'good' : 'bad')}${kpi('Proje IRR', pct(m.irr * 100, 1), m.irr > i.r / 100 ? 'good' : 'bad')}${kpi('Basit geri ödeme', fmt(m.pb, 2) + ' yıl')}</div>`
    + `<div class="r-kpis">${kpi('1. yıl net fayda', usd(y1.cf), 'good')}${kpi('Öz tüketim', pct(selfC, 1))}${kpi('İskontolu geri ödeme', Number.isFinite(m.pbD) ? fmt(m.pbD, 2) + ' yıl' : '—')}${i.lOn ? kpi('Equity IRR', pct(m.eIRR * 100, 1), 'good') : kpi('Otonomi', pct((y1.s.mah + y1.s.shift) / i.consY * 100, 1))}</div>`
    + `<p class="r-note">${m.npv >= 0 ? `Proje bu varsayımlarla USD bazında değer yaratıyor: iç verim oranı (%${fmt(m.irr * 100, 1)}) iskonto oranını (%${fmt(i.r, 1)}) aşıyor, basit geri ödeme ${fmt(m.pb, 2)} yıl. Yıl-1 öz tüketim oranı %${fmt(selfC, 0)}.` : `Proje bu varsayımlarla negatif NPV veriyor (${usd(m.npv)}); sistem boyutunu tüketim profiline yaklaştırmak, BESS ile öz tüketimi artırmak veya CAPEX/tarife varsayımlarını gözden geçirmek önerilir.`}</p></div>`
    + `<div class="r-block"><h2><span class="rn">02</span>Girdiler ve Varsayımlar</h2><table class="r-assume"><tbody>`
    + `<tr><td>GES</td><td>${fmt(i.kwp)} kWp · ${fmt(i.spec)} kWh/kWp/yıl · ${i.orient === 'ew' ? 'doğu-batı yerleşim' : 'güney yerleşim'} · degradasyon ${pct(i.degr, 1)}/yıl · ${fmt(i.life)} yıl</td></tr>`
    + `<tr><td>Tüketim</td><td>${fmt(i.consY / 1000, 0)} MWh/yıl · profil: ${esc(meta.profileLabel)} · aylık dağılım düzenlenebilir yüzde</td></tr>`
    + `<tr><td>Bedelli limit</td><td>${i.abone === 'mesken' ? 'uygulanmaz (mesken abone grubu)' : fmt(i.consPrev * 2 / 1000, 0) + ' MWh (önceki yıl tüketimi × 2)'}</td></tr>`
    + `<tr><td>Tarife</td><td>alış ${fmt(i.pBuy, 2)} / satış ${fmt(i.pSell, 2)} TL/kWh · TL enflasyonu %${fmt(i.esc1)} (ilk 5y) → %${fmt(i.esc2)}${i.preal ? ' · reel +%' + fmt(i.preal, 1) : ''}</td></tr>`
    + `<tr><td>Kur</td><td>başlangıç ${fmt(i.fx0, 1)} TL/$ · ${i.fxMode === 'ppp' ? 'SAGP: enflasyon farkı kadar artış' : 'manuel %' + fmt(i.fxMan) + '/yıl'} · USD enflasyonu %${fmt(i.piUS, 1)}</td></tr>`
    + (i.bessOn ? `<tr><td>Batarya (BESS)</td><td>${fmt(i.bKwh)} kWh / ${fmt(i.bKw)} kW · round-trip %${fmt(i.bRte)} · CAPEX ${fmt(i.bCapex)} $/kWh · degradasyon ${pct(i.bDegr, 1)}/yıl</td></tr>` : '')
    + `<tr><td>Finansman</td><td>GES CAPEX ${fmt(i.capexU)} $/kWp · OPEX ${fmt(i.opexU)} TL/kWp-yıl (TL enfl.) · iskonto %${fmt(i.r, 1)} USD${i.lOn ? ' · kredi %' + fmt(i.lRatio) + ' / faiz %' + fmt(i.lRate, 1) + ' / ' + i.lTerm + ' yıl' : ' · kredisiz'}</td></tr>`
    + `</tbody></table></div>`
    + `<div class="r-block"><h2><span class="rn">03</span>Yıl-1 Enerji Dengesi</h2><table>${balHtml(i, m)}</table>`
    + `<div class="r-chart"><div class="r-cap">Aylık dağılım — mahsup / bedelli satış / şebekeden çekiş (MWh)</div><svg viewBox="0 0 900 250" width="100%">${monthlyChart(m)}</svg>`
    + `<div class="r-legend"><span><i style="background:#1E7F4F"></i>Mahsuplaşan</span><span><i style="background:#E8A020"></i>Fazla (bedelli)</span><span><i style="background:#C9D3E4"></i>Çekiş</span><span><i style="background:#C7000B"></i>Bedelsiz</span></div></div></div>`
    + `<div class="r-block"><h2><span class="rn">04</span>Saatlik vs Aylık Rejim</h2><table>${compareHtml(i)}</table></div>`
    + `<div class="r-block"><h2><span class="rn">05</span>Yıllık Nakit Akışı (${fmt(i.life)} yıl)</h2>`
    + `<table><thead><tr><th>Yıl</th><th>Mahsup (MWh)</th><th>Bedelli (MWh)</th><th>Bedelsiz (MWh)</th><th>Alış ₺/kWh</th><th>Kur ₺/$</th><th>Net CF (TL)</th><th>Net CF ($)</th></tr></thead><tbody>${rows}</tbody></table>`
    + `<div class="r-chart"><div class="r-cap">Kümülatif iskontolu nakit akışı (USD) — sıfırı geçtiği an iskontolu geri ödeme</div><svg viewBox="0 0 900 240" width="100%">${cumChart(i, m)}</svg></div></div>`
    + `<div class="r-block"><h2><span class="rn">06</span>Metodoloji ve Uyarılar</h2>`
    + `<p class="r-note">Motor, her işletme yılını 12 ay × takvim günü (hafta içi/sonu) deseniyle saatlik simüle eder; mahsup = Σ min(üretim, tüketim). Ay içi üretim, aylık ortalamalar arası interpolasyonla gün gün eğimlendirilir (ay toplamı korunur). Bedelli üretim limiti = önceki yıl tüketimi × 2; bedelli satış = min(yıllık fazla, limit − mahsup); kalan miktar YEKDEM'e bedelsiz yazılır (EPDK Karar 14531, MADDE 7 ve 9). BESS günlük döngüsel dispatch: fazladan şarj, çekişe RTE ile deşarj — arbitraj modellenmez. Mali sonuçlar USD'dir: TL net fayda her yıl kur patikasıyla çevrilir; tarife TL enflasyonu (+reel artış) ile zamlanır varsayılır; hava durumu rastgeleliği bilinçli modellenmez (P50). Bu bir ön fizibilitedir; tarife, bedelli limit ve şebeke bağlantı koşulları güncel mevzuat ve ilgili şebeke işletmecisinden teyit edilmelidir. Yatırım kararı için bağlayıcı değildir.</p>`
    + `<div class="r-foot"><span>© 2026 <b>Fizibilite Platformu</b> · Furkan Ozan Seyfi</span><span>EPDK Karar 14531 · ${esc(meta.date)}</span></div></div>`;
}
