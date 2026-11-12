import { describe, it, expect } from 'vitest';
import { computeCi, ciDayCons } from '@/lib/models/ci/engine';
import { defaultCiInputs } from '@/lib/models/ci/defaults';

// Referans değerler: "C&I Saatlik Mahsuplaşma Kokpiti" HTML'inin 1.000 kWp baz senaryosu
// (Sanayi tek vardiya, yaz pik, BESS kapalı, kredisiz).
describe('C&I engine — HTML baz senaryosuyla birebir', () => {
  // HTML kokpitinin baz senaryosu hafta içi / hafta sonu ayrımlıdır
  const inputs = { ...defaultCiInputs(), weSplit: true };
  const m = computeCi(inputs);
  const y1 = m.years[0];

  it('CAPEX 600.000 $', () => {
    expect(m.capex).toBeCloseTo(600000, -2);
  });

  it('yıl-1 enerji: üretim 1.550 MWh, mahsup ~882,6 · fazla ~667,4 · çekiş ~317,4 MWh', () => {
    expect(y1.s.prod).toBeCloseTo(1550000, -2);
    expect(y1.s.mah).toBeCloseTo(882597, -3);
    expect(y1.s.faz).toBeCloseTo(667403, -3);
    expect(y1.s.cek).toBeCloseTo(317403, -3);
  });

  it('yıl-1 net fayda: 6.063.757 TL / 129.016 $', () => {
    expect(y1.cfTL).toBeCloseTo(6063757, -3);
    expect(y1.cf).toBeCloseTo(129016, -2);
  });

  it('öz tüketim oranı ~%56,9', () => {
    const selfC = (y1.s.mah + y1.s.shift) / y1.s.prod;
    expect(selfC * 100).toBeCloseTo(56.9, 0);
  });

  it('KPI: NPV ~765.662 $, IRR %23,3, payback 4,49 yıl, iskontolu 6,17 yıl', () => {
    expect(m.npv).toBeCloseTo(765662, -3);
    expect(m.irr * 100).toBeCloseTo(23.3, 0);
    expect(m.pb).toBeCloseTo(4.49, 1);
    expect(m.pbD).toBeCloseTo(6.17, 1);
  });
});

describe('C&I engine — mesken (aylık rejim) ve saatlik vs aylık', () => {
  it('mesken abone → aylık rejim, mahsup saatlikten yüksek', () => {
    const inputs = defaultCiInputs();
    const hourly = computeCi(inputs);
    const mesken = computeCi({ ...inputs, abone: 'mesken' });
    expect(mesken.regime).toBe('monthly');
    // Aylık rejimde mahsup (öz tüketim) saatlik rejimden daha yüksektir.
    expect(mesken.years[0].s.mah).toBeGreaterThan(hourly.years[0].s.mah);
  });
});

describe('C&I engine — hafta içi / hafta sonu ayrımı', () => {
  it('ayrım kapalıyken (varsayılan) hafta sonu günü hafta içi günüyle aynı', () => {
    const inputs = defaultCiInputs();
    expect(inputs.weSplit).toBe(false);
    for (const mi of [0, 6]) {
      const wd = ciDayCons(inputs, mi, 'wd'), we = ciDayCons(inputs, mi, 'we');
      wd.forEach((v, h) => expect(we[h]).toBeCloseTo(v, 9));
    }
  });
  it('ayrım kapalıyken yıllık tüketim korunur; ayrım açıkken hafta sonu farklılaşır', () => {
    const off = computeCi(defaultCiInputs()), on = computeCi({ ...defaultCiInputs(), weSplit: true });
    const cons = (m: ReturnType<typeof computeCi>) => m.years[0].s.monthly.reduce((a, x) => a + x.cons, 0);
    expect(cons(off)).toBeCloseTo(cons(on), -2);
    const i = { ...defaultCiInputs(), weSplit: true };
    expect(ciDayCons(i, 5, 'we').reduce((a, b) => a + b, 0)).toBeLessThan(ciDayCons(i, 5, 'wd').reduce((a, b) => a + b, 0));
  });
});

describe('C&I engine — ay içi gün dağılımı (dayW)', () => {
  it('varsayılan dağılım elle girilince sonuç değişmez; dağılım değişince ay toplamı korunur', async () => {
    const { ciDefaultDayW } = await import('@/lib/models/ci/engine');
    const base = defaultCiInputs();
    const dw = Array.from({ length: 12 }, (_, m) => ciDefaultDayW(base, m));
    const a = computeCi(base), b = computeCi({ ...base, dayW: dw });
    expect(Math.abs(b.npv - a.npv) / Math.abs(a.npv)).toBeLessThan(0.001); // yüzdeler 0,1 hassasiyetle yuvarlanır
    // Ocak: ilk 10 güne ağırlık ver
    const jan = dw[0].map((v, d) => (d < 10 ? v * 2 : v));
    const s = jan.reduce((x, y) => x + y, 0);
    const c = computeCi({ ...base, dayW: [jan.map((v) => (v * 100) / s), ...dw.slice(1)] });
    expect(c.years[0].s.monthly[0].cons).toBeCloseTo(a.years[0].s.monthly[0].cons, 3);
    expect(c.years[0].s.monthly[0].mah).not.toBeCloseTo(a.years[0].s.monthly[0].mah, 0);
  });
});
