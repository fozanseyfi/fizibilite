import { describe, it, expect } from 'vitest';
import { computeCi, ciClipping } from '@/lib/models/ci/engine';
import { defaultCiInputs, defaultMeskenInputs } from '@/lib/models/ci/defaults';

describe('İnverter AC gücü (kırpma)', () => {
  it('AC = DC iken kırpma yok; AC düştükçe üretim azalır', () => {
    const i = defaultCiInputs();
    const full = computeCi({ ...i, kwac: i.kwp });
    const free = computeCi({ ...i, kwac: undefined });
    expect(full.years[0].s.prod).toBeCloseTo(free.years[0].s.prod, 3);
    const low = computeCi({ ...i, kwac: i.kwp / 2 });
    expect(low.years[0].s.prod).toBeLessThan(full.years[0].s.prod * 0.95);
    expect(ciClipping({ ...i, kwac: i.kwp / 2 }).lossPct).toBeGreaterThan(5);
  });
  it('Mesken (aylık rejim) de AC ile kırpılır', () => {
    const i = defaultMeskenInputs();
    const a = computeCi(i), b = computeCi({ ...i, kwac: 1.5 });
    expect(b.years[0].s.prod).toBeLessThan(a.years[0].s.prod);
  });
});
