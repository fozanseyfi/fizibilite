// İstemci tarafı formatlayıcılar — HTML modellerindeki gösterimle uyumlu.

export const nf = (x: number, d = 0): string =>
  Number.isFinite(x)
    ? x.toLocaleString('tr-TR', { maximumFractionDigits: d, minimumFractionDigits: d })
    : '—';

/** USD tam sayı: "1.234 $" (negatifte "−") */
export const usd = (x: number, d = 0): string =>
  Number.isFinite(x) ? `${x < 0 ? '−' : ''}${nf(Math.abs(x), d)} $` : '—';

/** Milyon USD: "48,50 M$" */
export const musd = (x: number): string =>
  Number.isFinite(x) ? `${x < 0 ? '−' : ''}${nf(Math.abs(x) / 1e6, 2)} M$` : '—';

/** TL tam sayı: "1.234 ₺" */
export const tl = (x: number, d = 0): string =>
  Number.isFinite(x) ? `${nf(x, d)} ₺` : '—';

/** Milyon TL */
export const mtl = (x: number): string =>
  Number.isFinite(x) ? `${nf(x / 1e6, 2)} M₺` : '—';

/** Yüzde: "%16,1" */
export const pct = (x: number, d = 1): string => (Number.isFinite(x) ? `%${nf(x, d)}` : '—');

/** MWh gösterimi (kWh girişini böler) */
export const mwh = (kwh: number, d = 1): string => (Number.isFinite(kwh) ? `${nf(kwh / 1000, d)} MWh` : '—');

export const yearsFmt = (x: number, d = 2): string => (Number.isFinite(x) ? `${nf(x, d)} yıl` : '—');
