import { describe, expect, it } from 'vitest';
import { computeBessCi } from '@/lib/models/bess/ci';
import { computeBessUtility } from '@/lib/models/bess/utility';
import { defaultBessCiInputs, defaultBessUtilityInputs } from '@/lib/models/bess/defaults';

describe('C&I batarya', () => {
  it('kapasite 0 iken kazanç yok', () => {
    const m = computeBessCi({ ...defaultBessCiInputs(), bKwh: 0 });
    expect(m.y1.self).toBeCloseTo(0, 6);
    expect(m.y1Stats.disKwh).toBe(0);
  });

  it('akşam yüklü C&I tesiste güneş kaydırma faturayı düşürür', () => {
    const m = computeBessCi({ ...defaultBessCiInputs(), profileId: 'otel', pSell: 2.0 });
    expect(m.y1.self).toBeGreaterThan(0);
    expect(m.y1Stats.disKwh).toBeLessThanOrEqual((m.y1Stats.chSolar + m.y1Stats.chGrid) * 0.9 + 1e-6);
  });

  it('üç zamanlı tarifede gece→puant arbitrajı kazanç üretir; tek zamanlıda devre dışı', () => {
    const uc = computeBessCi({ ...defaultBessCiInputs(), useSelf: false, useArb: true, tariff: 'uc', pGece: 2, pPuant: 7 });
    expect(uc.y1.arb).toBeGreaterThan(0);
    expect(uc.y1Stats.chGrid).toBeGreaterThan(0);
    const tek = computeBessCi({ ...defaultBessCiInputs(), useSelf: false, useArb: true, tariff: 'tek' });
    expect(tek.y1.arb).toBe(0);
    expect(tek.warnings.join(' ')).toMatch(/üç zamanlı/);
  });

  it('meskende aylık mahsup: kaydırma kazanç getirmez (≤ 0)', () => {
    const m = computeBessCi({ ...defaultBessCiInputs(), abone: 'mesken', profileId: 'm_aksam', consY: 6000, kwp: 5, bKwh: 10, bKw: 5 });
    expect(m.y1.self).toBeLessThanOrEqual(1e-6);
  });

  it('zirve tıraşlama güç ve enerjiyle sınırlı', () => {
    const m = computeBessCi({ ...defaultBessCiInputs(), useSelf: false, usePeak: true, peakCutKw: 1000, bKw: 250, bKwh: 500, peakHours: 2, dod: 100 });
    expect(m.y1Stats.peakCutKw).toBeLessThanOrEqual(250);
    expect(m.y1.peak).toBeCloseTo(m.y1Stats.peakCutKw * 120 * 12, 6);
  });
});

describe('Utility batarya', () => {
  it('tüm süre YEKDEM iken arbitraj sıfır', () => {
    const m = computeBessUtility({ ...defaultBessUtilityInputs(), regime: 'yekdem', yekdemYears: 30, useClip: false, useArb: true });
    m.years.forEach((y) => expect(Math.abs(y.arbUsd)).toBeLessThan(1e-6));
  });

  it('Kırpma ve kısıntı yokken kurtarılacak enerji yok', () => {
    const m = computeBessUtility({ ...defaultBessUtilityInputs(), clipPct: 0, curtPct: 0, useArb: false });
    expect(m.y1Stats.recoveredMwh).toBeCloseTo(0, 6);
    expect(m.years[0].clipUsd).toBeCloseTo(0, 6);
  });

  it('kırpılan enerji kurtarılır ama kırpma + kısıntıyı aşamaz', () => {
    const m = computeBessUtility({ ...defaultBessUtilityInputs(), clipPct: 4, useArb: false });
    expect(m.y1Stats.recoveredMwh).toBeGreaterThan(0);
    expect(m.y1Stats.recoveredMwh).toBeLessThanOrEqual(m.y1Stats.clipMwh + m.y1Stats.curtMwh + 1e-6);
    expect(m.years[0].clipUsd).toBeGreaterThan(0);
  });

  it('serbest piyasada öğle→puant arbitrajı pozitif', () => {
    const m = computeBessUtility({ ...defaultBessUtilityInputs(), regime: 'merchant', useClip: false, useArb: true, ptfNoon: 1500, ptfPeak: 4000 });
    expect(m.years[0].arbUsd).toBeGreaterThan(0);
  });

  it('yan hizmete ayrılan MW arbitraj gücünden düşülür', () => {
    const m = computeBessUtility({ ...defaultBessUtilityInputs(), useAnc: true, ancMw: 2, bMw: 5 });
    expect(m.y1Stats.arbMw).toBe(3);
    expect(m.years[0].ancUsd).toBeGreaterThan(0);
  });
});

describe('örnek çıktılar (bilgi)', () => {
  it('varsayılanlar', () => {
    const c = computeBessCi(defaultBessCiInputs());
    const u = computeBessUtility(defaultBessUtilityInputs());
    console.log('C&I', JSON.stringify({ capex: c.capex, npv: Math.round(c.npv), irr: c.irr, pb: c.payback, y1: c.y1, st: c.y1Stats, lcos: c.lcos }));
    console.log('UTIL', JSON.stringify({ capex: u.capex, npv: Math.round(u.npv), irr: u.irr, pb: u.payback, y1: u.years[0], y7: u.years[6], st: u.y1Stats, lcos: u.lcos }));
  });
});

describe('Yan hizmet uyarısı', () => {
  it('gelirin çoğu yan hizmetten geliyorsa uyarır; fiyat TL enflasyonuyla otomatik artmaz', () => {
    const m = computeBessUtility({ ...defaultBessUtilityInputs(), useAnc: true, ancMw: 2, ancEsc: 0 });
    expect(m.warnings.join(' ')).toMatch(/yan hizmet varsayımına dayanıyor/);
    // TL'de sabit fiyat → USD geliri kur artışıyla düşer
    expect(m.years[1].ancUsd).toBeLessThan(m.years[0].ancUsd);
  });
});
