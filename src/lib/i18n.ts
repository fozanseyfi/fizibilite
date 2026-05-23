/**
 * Hafif i18n — context yerine module-level dictionary.
 * Component'ler `t('key')` ile çağırır.
 * Sözlüğe TR-EN çiftleri eklenir; yoksa key dönülür.
 */

export type Locale = 'tr' | 'en';

let currentLocale: Locale = 'tr';

const DICT: Record<string, { tr: string; en: string }> = {
  // Navigation
  'nav.projects': { tr: 'Projeler', en: 'Projects' },
  'nav.newProject': { tr: 'Yeni Proje', en: 'New Project' },
  'nav.about': { tr: 'Hakkında', en: 'About' },
  'nav.compare': { tr: 'Karşılaştır', en: 'Compare' },

  // Dashboard tabs
  'tab.overview': { tr: 'Genel Bakış', en: 'Overview' },
  'tab.energy': { tr: 'Enerji', en: 'Energy' },
  'tab.netting': { tr: 'Mahsuplaşma', en: 'Netting' },
  'tab.hourly': { tr: 'Saatlik Veri', en: 'Hourly Data' },
  'tab.battery': { tr: 'Batarya', en: 'Battery' },
  'tab.pnl': { tr: 'P&L', en: 'P&L' },
  'tab.cf': { tr: 'Cash Flow', en: 'Cash Flow' },
  'tab.waterfall': { tr: 'Cash Waterfall', en: 'Cash Waterfall' },
  'tab.risk': { tr: 'Risk (MC)', en: 'Risk (MC)' },
  'tab.sensitivity': { tr: 'Duyarlılık', en: 'Sensitivity' },
  'tab.assumptions': { tr: 'Varsayımlar', en: 'Assumptions' },
  'tab.esg': { tr: 'ESG', en: 'ESG' },

  // KPI labels
  'kpi.irr': { tr: 'IRR', en: 'IRR' },
  'kpi.npv': { tr: 'NPV', en: 'NPV' },
  'kpi.lcoe': { tr: 'LCOE', en: 'LCOE' },
  'kpi.payback': { tr: 'Geri Ödeme', en: 'Payback' },
  'kpi.roi': { tr: 'ROI', en: 'ROI' },
  'kpi.roe': { tr: 'ROE', en: 'ROE' },
  'kpi.dscr': { tr: 'Ortalama DSCR', en: 'Average DSCR' },
  'kpi.annualGeneration': { tr: 'Yıllık Üretim', en: 'Annual Generation' },
  'kpi.specific': { tr: 'Spesifik', en: 'Specific' },

  // Actions
  'action.edit': { tr: 'Düzenle & Tekrar Çalıştır', en: 'Edit & Re-run' },
  'action.compare': { tr: 'Karşılaştır', en: 'Compare' },
  'action.excelFull': { tr: 'Excel Tam', en: 'Full Excel' },
  'action.generation': { tr: 'Üretim', en: 'Generation' },
  'action.consumption': { tr: 'Tüketim', en: 'Consumption' },
  'action.pdf': { tr: 'PDF', en: 'PDF' },
  'action.run': { tr: 'Fizibiliteyi Çalıştır', en: 'Run Feasibility' },

  // Common
  'common.year': { tr: 'Yıl', en: 'Year' },
  'common.month': { tr: 'Ay', en: 'Month' },
  'common.day': { tr: 'Gün', en: 'Day' },
  'common.week': { tr: 'Hafta', en: 'Week' },
  'common.total': { tr: 'Toplam', en: 'Total' },
  'common.yes': { tr: 'Evet', en: 'Yes' },
  'common.no': { tr: 'Hayır', en: 'No' },

  // Project types
  'projectType.rooftop_ci': { tr: 'Çatı C&I', en: 'Rooftop C&I' },
  'projectType.ground_mount': { tr: 'Arazi GES', en: 'Ground-mount PV' },
  'projectType.hybrid_bess': { tr: 'GES + BESS Hibrit', en: 'PV + BESS Hybrid' },
};

export function setLocale(l: Locale) {
  currentLocale = l;
  if (typeof window !== 'undefined') localStorage.setItem('locale', l);
}

export function getLocale(): Locale {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('locale') as Locale | null;
    if (stored) currentLocale = stored;
  }
  return currentLocale;
}

export function t(key: string): string {
  const entry = DICT[key];
  if (!entry) return key;
  return entry[currentLocale] ?? entry.tr;
}
