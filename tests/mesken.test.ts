import { describe, it, expect } from 'vitest';
import { estimateHome, defaultHome } from '@/lib/models/ci/home-estimate';
import { defaultMeskenInputs, defaultCiInputs } from '@/lib/models/ci/defaults';
import { computeCi } from '@/lib/models/ci/engine';
import { reportCi } from '@/components/models/native/ci-render';

const meta = { title: 'Test', prep: '', firm: '', loc: '', date: '1 Ocak 2026', profileLabel: '-' };

describe('Mesken tüketim tahmini', () => {
  it('3 kişilik doğalgazlı hane Türkiye ortalamasında (2.000–3.000 kWh)', () => {
    const e = estimateHome(defaultHome());
    expect(e.total).toBeGreaterThan(2000);
    expect(e.total).toBeLessThan(3000);
    expect(e.monthlyPct.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 6);
    expect(e.monthly.reduce((a, b) => a + b, 0)).toBeCloseTo(e.total, 6);
  });
  it('elektrikli ısınma ve araç tüketimi artırır, kışı ağırlaştırır', () => {
    const base = estimateHome(defaultHome());
    const big = estimateHome({ ...defaultHome(), heating: 'electric', ev: true, evKm: 15000 });
    expect(big.total).toBeGreaterThan(base.total + 5000);
    expect(big.monthly[0]).toBeGreaterThan(big.monthly[6]);
  });
});

describe('Mesken modeli', () => {
  it('aylık rejim, limit yok, batarya kapalı', () => {
    const i = defaultMeskenInputs();
    const m = computeCi(i);
    expect(m.regime).toBe('monthly');
    expect(m.years[0].L.bedelsiz).toBe(0);
    expect(i.bessOn).toBe(false);
    expect(i.consPrev).toBe(i.consY);
  });
  it('rapor fatura analizini içerir; Mesken raporunda saatlik rejim karşılaştırması yok', () => {
    const im = defaultMeskenInputs();
    const rm = reportCi(im, computeCi(im), meta);
    expect(rm).toContain('Fatura Analizi');
    expect(rm).toContain('Aylık Mahsuplaşma');
    expect(rm).not.toContain('Saatlik vs Aylık Rejim');
    const ic = defaultCiInputs();
    const rc = reportCi(ic, computeCi(ic), meta);
    expect(rc).toContain('Fatura Analizi');
    expect(rc).toContain('Saatlik vs Aylık Rejim');
  });
});

describe('Rapor enerji akışı', () => {
  it('C&I ve Mesken raporlarında Sankey var', () => {
    for (const i of [defaultCiInputs(), defaultMeskenInputs()]) {
      const r = reportCi(i, computeCi(i), meta);
      expect(r).toContain('Enerji akışı');
      expect(r).toContain('Yük kullanımı');
      expect(r).not.toContain('NaN');
    }
  });
});
