/**
 * EPDK Tarife Otomatik Güncelleme Servisi.
 *
 * Çalışma mantığı:
 *   1. EPDK tarife listesi sayfasını fetch et.
 *   2. En son Kurul Kararı'nın numarasını + yürürlük tarihini + Excel link'ini bul.
 *   3. DB'deki en son tarife `validFrom` ile karşılaştır.
 *   4. Yeni karar varsa: parse et, DB'ye yeni TariffEntry[] ekle.
 *   5. Eski tarifenin `validTo`'sunu yeni `validFrom - 1 gün` olarak güncelle.
 *
 * NOT — Bu basit implementasyon HTML üzerinden tarama yapar.
 * EPDK Excel parsing tam otomatize edilmemiştir; eşleşme bulunsa bile
 * `sync()` yeni veri eklemez, sadece "yeni karar var" bilgisini döner.
 * Tam parse için `xlsx` veya `pdf-parse` kütüphanesi eklenmelidir (TODO).
 *
 * Çağırma:
 *   - Manuel: POST /api/admin/tariffs/refresh
 *   - Otomatik: cron / GitHub Actions ile haftalık (her Pazartesi 03:00 UTC)
 */

import { getTariffsV2 } from '../db';

export interface EpdkScrapeResult {
  status: 'up_to_date' | 'new_decision_detected' | 'parse_failed' | 'fetch_failed';
  currentDecisionRef: string | null;
  latestDecisionRef: string | null;
  latestDecisionDate: string | null;
  latestExcelUrl: string | null;
  message: string;
  fetchedAt: string;
}

const EPDK_TARIFFS_INDEX_URL =
  process.env.EPDK_TARIFFS_INDEX_URL ||
  'https://www.epdk.gov.tr/Detay/Icerik/3-1327/elektrik-faturalarina-esas-tarife-tablolari';

export async function checkForNewEpdkDecision(): Promise<EpdkScrapeResult> {
  const fetchedAt = new Date().toISOString();
  const currentDb = getTariffsV2();
  const currentDecisionRef =
    currentDb.entries[currentDb.entries.length - 1]?.sourceDocRef ?? null;

  try {
    const res = await fetch(EPDK_TARIFFS_INDEX_URL, {
      headers: {
        'User-Agent': 'GES-Fizibilite-Pro/0.1 (admin sync)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      return {
        status: 'fetch_failed',
        currentDecisionRef,
        latestDecisionRef: null,
        latestDecisionDate: null,
        latestExcelUrl: null,
        message: `EPDK HTTP ${res.status}`,
        fetchedAt,
      };
    }
    const html = await res.text();

    // Naive HTML parse — Kurul Kararı numarası ve tarihi ara
    const decisionMatch = html.match(/Kurul\s*Karar(?:[ıi])?\s*(?:No)?\s*[:\.]?\s*(\d{4,6})/i);
    const dateMatch = html.match(/(\d{2})[\.\/-](\d{2})[\.\/-](2026|2027)/);
    const excelLinkMatch = html.match(/href="([^"]+\.(xlsx?|pdf))"/i);

    const latestDecisionRef = decisionMatch ? `EPDK Kurul Kararı No: ${decisionMatch[1]}` : null;
    const latestDecisionDate = dateMatch ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` : null;
    const latestExcelUrl = excelLinkMatch ? absolutize(excelLinkMatch[1]) : null;

    if (!latestDecisionRef) {
      return {
        status: 'parse_failed',
        currentDecisionRef,
        latestDecisionRef: null,
        latestDecisionDate: null,
        latestExcelUrl,
        message: 'EPDK sayfasından kurul kararı numarası parse edilemedi',
        fetchedAt,
      };
    }

    const isUpToDate = currentDecisionRef?.includes(decisionMatch?.[1] ?? '___nope___');
    return {
      status: isUpToDate ? 'up_to_date' : 'new_decision_detected',
      currentDecisionRef,
      latestDecisionRef,
      latestDecisionDate,
      latestExcelUrl,
      message: isUpToDate
        ? `Mevcut tarife güncel (${currentDecisionRef}).`
        : `Yeni karar bulundu (${latestDecisionRef}, ${latestDecisionDate}). ` +
          `Excel parse manuel onay gerektirir — POST /api/admin/tariffs/manual ile yeni TariffEntry ekleyin.`,
      fetchedAt,
    };
  } catch (err) {
    return {
      status: 'fetch_failed',
      currentDecisionRef,
      latestDecisionRef: null,
      latestDecisionDate: null,
      latestExcelUrl: null,
      message: err instanceof Error ? err.message : String(err),
      fetchedAt,
    };
  }
}

function absolutize(url: string): string {
  if (url.startsWith('http')) return url;
  if (url.startsWith('//')) return 'https:' + url;
  if (url.startsWith('/')) return 'https://www.epdk.gov.tr' + url;
  return url;
}
