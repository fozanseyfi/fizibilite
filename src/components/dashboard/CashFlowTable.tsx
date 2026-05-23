'use client';

/**
 * Banka modeli stilinde transposed (dönemler yatay) finansal tablo.
 * - Gelirler siyah, giderler kırmızı.
 * - En altta dönem toplamı.
 * - Yıl/ay sağa doğru kolon.
 * - Her kalemin yanında InfoTooltip ile İngilizce terimin Türkçe açıklaması.
 * - Currency mode: TL veya USD.
 */

import { PeriodFinance } from '@/lib/types';
import { formatMoney, Currency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { FINANCIAL_TERMS } from '@/lib/financial-terms';

type Sign = 'income' | 'expense' | 'neutral' | 'subtotal';

export interface CashFlowRow {
  label: string;
  key?: keyof PeriodFinance;
  compute?: (p: PeriodFinance) => number;
  sign: Sign;
  bold?: boolean;
  topBorder?: boolean;
  indent?: number;
}

export interface CashFlowSection {
  title: string;
  rows: CashFlowRow[];
}

export function CashFlowTable({
  sections,
  periods,
  showTotalColumn = true,
  maxPeriodColumns = 25,
  periodHeader = (p) => p.label,
  totalRowLabel = 'Toplam',
  currency,
  usdTry,
}: {
  sections: CashFlowSection[];
  periods: PeriodFinance[];
  showTotalColumn?: boolean;
  maxPeriodColumns?: number;
  periodHeader?: (p: PeriodFinance) => string;
  totalRowLabel?: string;
  currency: Currency;
  usdTry: number;
}) {
  const shown = periods.slice(0, maxPeriodColumns);

  return (
    <div className="overflow-x-auto rounded-lg border border-border/60 bg-card">
      <table className="min-w-full text-xs">
        <thead className="bg-secondary sticky top-0 z-10">
          <tr>
            <th className="text-left px-3 py-2 font-semibold whitespace-nowrap sticky left-0 bg-secondary z-20 min-w-[260px]">Kalem</th>
            {shown.map((p) => (
              <th key={p.periodIndex} className="text-right px-3 py-2 font-medium whitespace-nowrap text-muted-foreground">
                {periodHeader(p)}
              </th>
            ))}
            {showTotalColumn && (
              <th className="text-right px-3 py-2 font-bold whitespace-nowrap bg-secondary/80">Toplam</th>
            )}
          </tr>
        </thead>
        <tbody>
          {sections.map((sec, si) => (
            <SectionBlock
              key={si}
              section={sec}
              periods={shown}
              showTotal={showTotalColumn}
              currency={currency}
              usdTry={usdTry}
            />
          ))}
          {/* Genel toplam satırı: her dönemin net (gelir − gider) toplamı */}
          <tr className="border-t-2 border-foreground/60 bg-secondary/40 font-bold">
            <td className="px-3 py-2 sticky left-0 bg-secondary/40 whitespace-nowrap">{totalRowLabel}</td>
            {shown.map((p) => {
              const total = periodNetTotal(p, sections);
              return (
                <td key={p.periodIndex} className={cn('px-3 py-2 text-right tabular-nums whitespace-nowrap', total >= 0 ? 'text-foreground' : 'text-destructive')}>
                  {formatMoney(total, currency, usdTry, { compact: true })}
                </td>
              );
            })}
            {showTotalColumn && (() => {
              const grand = shown.reduce((a, p) => a + periodNetTotal(p, sections), 0);
              return (
                <td className={cn('px-3 py-2 text-right tabular-nums whitespace-nowrap bg-secondary/60', grand >= 0 ? 'text-foreground' : 'text-destructive')}>
                  {formatMoney(grand, currency, usdTry, { compact: true })}
                </td>
              );
            })()}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function SectionBlock({
  section, periods, showTotal, currency, usdTry,
}: {
  section: CashFlowSection; periods: PeriodFinance[]; showTotal: boolean; currency: Currency; usdTry: number;
}) {
  return (
    <>
      <tr className="bg-secondary/30">
        <td className="px-3 py-1.5 font-bold uppercase text-[10px] tracking-wider sticky left-0 bg-secondary/30 z-10 whitespace-nowrap" colSpan={periods.length + (showTotal ? 2 : 1)}>
          {section.title}
        </td>
      </tr>
      {section.rows.map((row, ri) => (
        <CellRow key={ri} row={row} periods={periods} showTotal={showTotal} currency={currency} usdTry={usdTry} />
      ))}
    </>
  );
}

function CellRow({
  row, periods, showTotal, currency, usdTry,
}: {
  row: CashFlowRow; periods: PeriodFinance[]; showTotal: boolean; currency: Currency; usdTry: number;
}) {
  const values = periods.map((p) => extractValue(p, row));
  const total = values.reduce((a, b) => a + b, 0);
  const colorClass =
    row.sign === 'income' ? 'text-foreground' :
    row.sign === 'expense' ? 'text-destructive' :
    row.sign === 'subtotal' ? 'text-foreground font-semibold' :
    'text-muted-foreground';

  const term = FINANCIAL_TERMS[row.label];

  return (
    <tr className={cn('hover:bg-secondary/20', row.topBorder && 'border-t border-border/60', row.bold && 'font-semibold')}>
      <td className={cn('px-3 py-1.5 sticky left-0 bg-card hover:bg-secondary/20 whitespace-nowrap', `pl-${3 + (row.indent ?? 0) * 4}`)}>
        <span className="inline-flex items-center gap-1.5">
          {row.label}
          {term && <InfoTooltip {...term} />}
        </span>
      </td>
      {values.map((v, i) => (
        <td key={i} className={cn('px-3 py-1.5 text-right tabular-nums whitespace-nowrap', colorClass)}>
          {v === 0 ? <span className="opacity-30">—</span> : formatMoney(v, currency, usdTry, { compact: true })}
        </td>
      ))}
      {showTotal && (
        <td className={cn('px-3 py-1.5 text-right tabular-nums whitespace-nowrap font-medium bg-secondary/40', colorClass)}>
          {formatMoney(total, currency, usdTry, { compact: true })}
        </td>
      )}
    </tr>
  );
}

function extractValue(p: PeriodFinance, row: CashFlowRow): number {
  if (row.compute) return row.compute(p);
  if (row.key) {
    const v = p[row.key];
    return typeof v === 'number' ? v : 0;
  }
  return 0;
}

function periodNetTotal(p: PeriodFinance, sections: CashFlowSection[]): number {
  let acc = 0;
  for (const sec of sections) {
    for (const row of sec.rows) {
      const v = extractValue(p, row);
      if (row.sign === 'income') acc += v;
      else if (row.sign === 'expense') acc -= v;
    }
  }
  return acc;
}

// ---------- Hazır satır setleri ----------

export const INCOME_STATEMENT_ROWS: CashFlowSection = {
  title: 'Income Statement',
  rows: [
    { label: 'Sales Revenue', key: 'salesRevenueTl', sign: 'income' },
    { label: 'Scrapped Equipment', key: 'scrappedEquipmentTl', sign: 'income' },
    { label: 'Net Sales', key: 'netSalesTl', sign: 'subtotal', bold: true, topBorder: true },
    { label: 'Transmission and Operational Fees', key: 'transmissionOperationalFeesTl', sign: 'expense' },
    { label: 'Other Fees', key: 'otherFeesTl', sign: 'expense' },
    { label: 'Gross Profit', key: 'grossProfitTl', sign: 'subtotal', bold: true, topBorder: true },
    { label: 'Insurance Cost', key: 'insuranceCostTl', sign: 'expense' },
    { label: 'Corrective Maintenance', key: 'correctiveMaintenanceTl', sign: 'expense' },
    { label: 'Preventive Maintenance', key: 'preventiveMaintenanceTl', sign: 'expense' },
    { label: 'Total Payroll', key: 'totalPayrollTl', sign: 'expense' },
    { label: 'EBITDA', key: 'ebitdaTl', sign: 'subtotal', bold: true, topBorder: true },
    { label: 'Depreciation', key: 'depreciationTl', sign: 'expense' },
    { label: 'EBIT', key: 'ebitTl', sign: 'subtotal', bold: true, topBorder: true },
    { label: 'FX Gain/Loss', key: 'fxGainLossTl', sign: 'neutral' },
    { label: 'Interest Expenses', key: 'interestExpenseTl', sign: 'expense' },
    { label: 'Earnings Before Tax', key: 'earningsBeforeTaxTl', sign: 'subtotal', bold: true, topBorder: true },
    { label: 'FX Gain Loss Addback', key: 'fxGainLossAddbackTl', sign: 'neutral' },
    { label: 'Tax Expense', key: 'taxExpenseTl', sign: 'expense' },
    { label: 'Net Income', key: 'netIncomeTl', sign: 'subtotal', bold: true, topBorder: true },
  ],
};

export const CASH_FLOW_STATEMENT_ROWS: CashFlowSection[] = [
  {
    title: 'Cash Flow from Operating Activities',
    rows: [
      { label: 'Revenue', key: 'cfRevenueTl', sign: 'income' },
      { label: 'All in Cost of Sales', key: 'cfAllInCostOfSalesTl', sign: 'expense' },
      { label: 'OWC Requirement', key: 'owcRequirementTl', sign: 'neutral' },
      { label: 'Change in OWC', key: 'changeInOwcTl', sign: 'neutral' },
      { label: 'Corporate Income Tax', key: 'corporateIncomeTaxCfTl', sign: 'expense' },
      { label: 'VAT', key: 'vatCfTl', sign: 'expense' },
      { label: 'Net Operating Cash Flow', key: 'netOperatingCashFlowTl', sign: 'subtotal', bold: true, topBorder: true },
    ],
  },
  {
    title: 'Cash Flow from Investing Activities',
    rows: [
      { label: 'Capex', key: 'capexCfTl', sign: 'expense' },
      { label: 'Net Investing Cash Flow', key: 'netInvestingCashFlowTl', sign: 'subtotal', bold: true, topBorder: true },
    ],
  },
  {
    title: 'Cash Flow from Financing Activities',
    rows: [
      { label: 'Drawdown', key: 'drawdownTl', sign: 'income' },
      { label: 'Repayment', key: 'repaymentTl', sign: 'expense' },
      { label: 'Interest Expense', key: 'interestExpenseCfTl', sign: 'expense' },
      { label: 'Commitment Fee', key: 'commitmentFeeTl', sign: 'expense' },
      { label: 'Arrangement Fee', key: 'arrangementFeeTl', sign: 'expense' },
      { label: 'Equity', key: 'equityTl', sign: 'income' },
      { label: 'Additional Equity to cure DSCR', key: 'additionalEquityToCureDscrTl', sign: 'income' },
      { label: 'Net Working Capital Loan Drawdown', key: 'netWorkingCapitalLoanDrawdownTl', sign: 'income' },
      { label: 'Net Working Capital Loan Repayment', key: 'netWorkingCapitalLoanRepaymentTl', sign: 'expense' },
      { label: 'Net Financing Cash Flow', key: 'netFinancingCashFlowTl', sign: 'subtotal', bold: true, topBorder: true },
    ],
  },
  {
    title: 'Cash Balance',
    rows: [
      { label: 'Opening', key: 'cashOpeningTl', sign: 'neutral' },
      { label: 'Addition/(Disposal)', key: 'cashAdditionDisposalTl', sign: 'neutral' },
      { label: 'Closing', key: 'cashClosingTl', sign: 'subtotal', bold: true, topBorder: true },
    ],
  },
];

export const CASH_WATERFALL_ROWS: CashFlowSection[] = [
  {
    title: 'Cash Waterfall',
    rows: [
      { label: 'Revenues', key: 'revenuesTl', sign: 'income' },
      { label: 'Operating costs', key: 'operatingCostsTl', sign: 'expense' },
      { label: 'Change in working capital', key: 'changeInWorkingCapitalTl', sign: 'neutral' },
      { label: 'Net VAT Cash Flow', key: 'netVatCashFlowTl', sign: 'expense' },
      { label: 'Capex', key: 'capexWaterfallTl', sign: 'expense' },
      { label: 'Operating Cash Flow Before Tax', key: 'operatingCashFlowBeforeTaxTl', sign: 'subtotal', bold: true, topBorder: true },
      { label: 'Corporate income tax paid', key: 'corporateIncomeTaxPaidTl', sign: 'expense' },
      { label: 'CFADS', key: 'cfadsTl', sign: 'subtotal', bold: true, topBorder: true },
    ],
  },
  {
    title: 'FCFC (Free Cash Flow to Company)',
    rows: [
      { label: 'Net FCFC', key: 'netFcfcTl', sign: 'subtotal', bold: true },
      { label: 'Discounted Net FCFC', key: 'discountedNetFcfcTl', sign: 'neutral' },
      { label: 'Cumulative Net FCFC', key: 'cumulativeNetFcfcTl', sign: 'subtotal', bold: true },
    ],
  },
  {
    title: 'FCFE (Free Cash Flow to Equity)',
    rows: [
      { label: 'Net FCFE', key: 'netFcfeTl', sign: 'subtotal', bold: true },
      { label: 'Discounted Net FCFE', key: 'discountedNetFcfeTl', sign: 'neutral' },
      { label: 'Cumulative Net FCFE', key: 'cumulativeNetFcfeTl', sign: 'subtotal', bold: true },
    ],
  },
];
