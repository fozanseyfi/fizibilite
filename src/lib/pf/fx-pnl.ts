/**
 * MODÜL 4 — FX Gain/Loss (Yeniden Değerleme — Unrealized)
 *
 * USD kredi + TL gelir varsa, USD bakiyesi her dönem yeniden değerlenir.
 * Gerçek nakit hareketi yok ama P&L'e yansır (VUK m.280 — kur farkı tahakkuku).
 *
 * Formül:
 *   net_usd_pozisyon[t] = usd_cash[t] − usd_debt[t]   (asset−liability)
 *   fx_pnl[t] = avg_pozisyon × (rate[t] − rate[t−1])
 *   Negatif = TL zararı (devalüasyon + net negatif pozisyon → büyüyen TL borç)
 *
 * COD öncesi → CAPEX'e kapitalize (TFRS isteğe bağlı)
 * COD sonrası → doğrudan P&L
 */

import { FxInput, FxResult } from './types';

export function calculateFxPnl(input: FxInput): FxResult {
  const { usdDebtBalanceMonthly, usdCashBalanceMonthly, usdTryMonthly, codMonthIndex } = input;

  const n = usdDebtBalanceMonthly.length;
  if (n === 0) {
    return {
      monthlyFxPnlTry: [],
      cumulativeFxPnlTry: 0,
      quarterlyFxPnlTry: [],
      annualFxPnlTry: [],
      fxCapitalizedInConstruction: 0,
      fxThroughPnlOperation: 0,
    };
  }
  if (usdCashBalanceMonthly.length !== n || usdTryMonthly.length !== n) {
    throw new Error('Tüm aylık diziler aynı uzunlukta olmalı');
  }

  const monthlyPnl: number[] = [];
  let prevPos = (usdCashBalanceMonthly[0] || 0) - (usdDebtBalanceMonthly[0] || 0);
  let prevRate = usdTryMonthly[0];

  for (let i = 0; i < n; i++) {
    const currentPos = (usdCashBalanceMonthly[i] || 0) - (usdDebtBalanceMonthly[i] || 0);
    const currentRate = usdTryMonthly[i];

    const avgPos = (prevPos + currentPos) / 2;
    const rateChange = currentRate - prevRate;
    const pnl = avgPos * rateChange;

    monthlyPnl.push(pnl);
    prevPos = currentPos;
    prevRate = currentRate;
  }

  const cutIdx = Math.max(0, Math.min(n, codMonthIndex));
  const fxCap = monthlyPnl.slice(0, cutIdx).reduce((a, b) => a + b, 0);
  const fxOp = monthlyPnl.slice(cutIdx).reduce((a, b) => a + b, 0);

  return {
    monthlyFxPnlTry: monthlyPnl,
    cumulativeFxPnlTry: fxCap + fxOp,
    quarterlyFxPnlTry: aggregateBy(monthlyPnl, 3),
    annualFxPnlTry: aggregateBy(monthlyPnl, 12),
    fxCapitalizedInConstruction: fxCap,
    fxThroughPnlOperation: fxOp,
  };
}

function aggregateBy(arr: number[], size: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size).reduce((a, b) => a + b, 0));
  }
  return out;
}
