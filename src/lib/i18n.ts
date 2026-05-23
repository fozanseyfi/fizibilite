/**
 * Hafif i18n — cookie tabanlı, server + client uyumlu.
 *
 * - Client tarafı: localStorage + document.cookie
 * - Server tarafı: next/headers cookies() (server component'lerde getServerLocale ile)
 * - Toggle reload sonrası server cookie'yi okur, doğru locale render edilir.
 */

export type Locale = 'tr' | 'en';

const COOKIE_NAME = 'locale';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 yıl

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
  'tab.coverage': { tr: 'Borç Karşılama', en: 'Debt Coverage' },
  'tab.scenarios': { tr: 'Senaryo Matrisi', en: 'Scenario Matrix' },
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

// ---------- Client (browser) ----------

export function getClientLocale(): Locale {
  if (typeof document === 'undefined') return 'tr';
  // Önce cookie'den oku (server ile tutarlı)
  const match = document.cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (match) return match[1] === 'en' ? 'en' : 'tr';
  // Yedek: localStorage
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('locale');
    if (stored === 'en') return 'en';
  }
  return 'tr';
}

export function setClientLocale(l: Locale) {
  if (typeof document !== 'undefined') {
    document.cookie = `${COOKIE_NAME}=${l}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  }
  if (typeof window !== 'undefined') {
    localStorage.setItem('locale', l);
  }
}

// ---------- Server (Next.js server component) ----------
// Server component'ler için: const locale = await getServerLocale(); t('key', locale);

export async function getServerLocale(): Promise<Locale> {
  // Dynamic import — sadece server'da çalışır
  try {
    const { cookies } = await import('next/headers');
    const c = cookies().get(COOKIE_NAME)?.value;
    return c === 'en' ? 'en' : 'tr';
  } catch {
    return 'tr';
  }
}

// ---------- Translation ----------

export function t(key: string, locale: Locale = 'tr'): string {
  const entry = DICT[key];
  if (!entry) return key;
  return entry[locale] ?? entry.tr;
}

// Backwards compat
export const getLocale = getClientLocale;
export const setLocale = setClientLocale;
