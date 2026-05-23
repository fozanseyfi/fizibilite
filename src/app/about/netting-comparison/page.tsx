import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';

export const dynamic = 'force-dynamic';

/**
 * Saatlik vs Aylık mahsuplaşma karşılaştırma — eğitim sayfası.
 *
 * Aynı yıllık üretim (60.000 kWh) + aynı yıllık tüketim (50.000 kWh) için iki rejimin
 * fatura sonucunu yan yana gösterir. Saatlik daha mahsuplaşmanın
 * dezavantajını net gösterir.
 */
export default function NettingComparisonPage() {
  // Örnek: 50 kW kurulu, 60 MWh yıllık üretim, 50 MWh yıllık tüketim
  // Aylık ve saatlik için aynı toplam üretim+tüketim ama mahsup oranı farklı
  const purchasePrice = 4.28; // TL/kWh (Ticarethane LV alış)
  const salePrice = 3.95; // TL/kWh
  const monthlyGen = 5000; // her ay üretim (sabit varsayım)
  const monthlyCons = 4167; // her ay tüketim
  const annualGen = monthlyGen * 12; // 60.000
  const annualCons = monthlyCons * 12; // 50.000

  // AYLIK REJİM: ay başında mahsuplaşma min(ay üretim, ay tüketim)
  const monthlyNetted = Math.min(monthlyGen, monthlyCons) * 12; // 50.000
  const monthlySurplus = annualGen - monthlyNetted; // 10.000
  const monthlyBill = monthlySurplus < 0 ? 0 : 0; // mahsup = tasarruf (fatura 0 olabilir)
  const monthlySavings = monthlyNetted * purchasePrice; // 214.000 TL
  const monthlySaleRevenue = monthlySurplus * salePrice; // 39.500 TL

  // SAATLİK REJİM: her saat min(üretim, tüketim)
  // Güneş 6 saat (10-16 arası) 1389 kWh/saat, gece üretim 0
  // Tüketim 24 saat dağılmış: 8 kWh/saat (ofis profili, gündüz daha yoğun)
  // Saatlik mahsup: gündüz saatte min(1389, 30) = 30 kWh × 6 saat × 30 gün × 12 = 64.800
  // ama bu üretimi aşar; gerçek mahsup daha düşük
  // Basitleştirilmiş tahmin: ofis günü 50-70% self-consumption (gündüz tüketim/üretim)
  const hourlyNettingRatio = 0.55; // tipik ticarethane
  const hourlyNetted = annualGen * hourlyNettingRatio; // ~33.000
  const hourlySurplus = annualGen - hourlyNetted; // ~27.000 — daha fazla fazla üretim
  const hourlyNetConsumption = annualCons - hourlyNetted; // şebekeden 17.000 çekilir
  const hourlySavings = hourlyNetted * purchasePrice; // ~141.000 TL (daha düşük)
  const hourlySaleRevenue = hourlySurplus * salePrice; // 106.000 TL
  const hourlyNetBill = hourlyNetConsumption * purchasePrice; // 72.000 TL şebekeden alış

  const monthlyTotal = monthlySavings + monthlySaleRevenue;
  const hourlyTotal = hourlySavings + hourlySaleRevenue - hourlyNetBill;
  const difference = monthlyTotal - hourlyTotal;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/about"><ArrowLeft className="h-4 w-4 mr-1" /> Hakkında'ya dön</Link>
      </Button>

      <div>
        <h1 className="text-3xl font-bold">Saatlik vs Aylık Mahsuplaşma</h1>
        <p className="text-muted-foreground mt-1">
          EPDK Karar 14531 (01.05.2026 yürürlük) ile mahsuplaşma rejimi <strong>aylık'tan saatliğe</strong> değişti.
          Bu değişiklik C&I (ticari/sanayi) yatırımcıları için ciddi gelir azalmasına yol açtı.
        </p>
      </div>

      {/* TL;DR Banner */}
      <div className="rounded-xl border-l-4 border-l-amber-500 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-6 w-6 text-amber-700 mt-0.5" />
          <div>
            <div className="font-bold text-amber-900">Tek cümleyle özet</div>
            <div className="text-sm text-amber-900 mt-1">
              Aylık rejimde ay sonu net mahsup yapıldığı için tüm üretim ay içinde "kullanılmış" sayılırdı.
              Saatlik rejimde sadece o saatin tüketimi kadarı mahsup edilir → öğle saatinde üretim çoksa ama tüketim azsa,
              fazla üretim ucuz satış fiyatından satılır (mahsup tasarrufu kaybedilir). C&I yatırımcısı için yıllık gelir
              %20-35 azalır.
            </div>
          </div>
        </div>
      </div>

      {/* Mantık açıklaması */}
      <Card>
        <CardHeader>
          <CardTitle>İki Rejimin Matematiksel Farkı</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-md border border-eco/40 bg-eco/5 p-3">
              <div className="font-bold text-eco-dark mb-2">📅 Aylık Mahsuplaşma (eski rejim, mesken hala böyle)</div>
              <div className="text-xs space-y-1">
                <div>Her ay sonu:</div>
                <code className="block bg-secondary/60 p-2 rounded">netted_ay = min(üretim_ay, tüketim_ay)</code>
                <div>Aydaki tüm üretim toplam tüketimle karşılaştırılır. Saat fark etmez.</div>
                <div className="text-eco-dark font-semibold mt-2">Avantaj: Sabah çok üretip akşam çok tüketsen bile dengelenir.</div>
              </div>
            </div>
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
              <div className="font-bold text-destructive mb-2">⏰ Saatlik Mahsuplaşma (yeni rejim, EPDK 14531)</div>
              <div className="text-xs space-y-1">
                <div>Her saat için:</div>
                <code className="block bg-secondary/60 p-2 rounded">netted_saat = min(üretim_saat, tüketim_saat)</code>
                <div>Saat 13'te 50 kWh üretip 5 kWh tüketsen, sadece 5 kWh mahsup edilir. Geri kalan 45 kWh fazla üretim olarak satılır (ucuz fiyatla).</div>
                <div className="text-destructive font-semibold mt-2">Dezavantaj: Saatlik eşleşme zorunlu. Batarya olmadan gündüz fazlası kaybedilir.</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sayısal karşılaştırma */}
      <Card>
        <CardHeader>
          <CardTitle>Sayısal Örnek: 50 kW Ticarethane Çatı GES</CardTitle>
          <CardDescription>
            Aynı yıllık üretim (60.000 kWh), aynı yıllık tüketim (50.000 kWh).
            Alış fiyatı 4.28 TL/kWh, satış fiyatı 3.95 TL/kWh (EPDK 14461 Ticarethane LV).
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary">
              <tr>
                <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">Kalem</th>
                <th className="text-right px-3 py-2 font-semibold whitespace-nowrap">📅 Aylık Mahsup</th>
                <th className="text-right px-3 py-2 font-semibold whitespace-nowrap">⏰ Saatlik Mahsup</th>
                <th className="text-right px-3 py-2 font-semibold whitespace-nowrap">Fark</th>
              </tr>
            </thead>
            <tbody>
              <ComparisonRow label="Yıllık Üretim" m="60.000 kWh" h="60.000 kWh" diff="0 — aynı" />
              <ComparisonRow label="Yıllık Tüketim" m="50.000 kWh" h="50.000 kWh" diff="0 — aynı" />
              <ComparisonRow
                label="Mahsuplaşılan (kWh)"
                m={`${monthlyNetted.toLocaleString('tr-TR')} kWh`}
                h={`${hourlyNetted.toLocaleString('tr-TR')} kWh`}
                diff={`−${(monthlyNetted - hourlyNetted).toLocaleString('tr-TR')} kWh`}
                negative
              />
              <ComparisonRow
                label="Fazla Üretim (kWh)"
                m={`${monthlySurplus.toLocaleString('tr-TR')} kWh`}
                h={`${hourlySurplus.toLocaleString('tr-TR')} kWh`}
                diff={`+${(hourlySurplus - monthlySurplus).toLocaleString('tr-TR')} kWh`}
              />
              <ComparisonRow
                label="Şebekeden Çekilen (kWh)"
                m="0 (mahsup kapsadı)"
                h={`${hourlyNetConsumption.toLocaleString('tr-TR')} kWh`}
                diff={`+${hourlyNetConsumption.toLocaleString('tr-TR')} kWh`}
                negative
              />
              <tr className="border-t-2 border-foreground/30 bg-secondary/40">
                <td className="px-3 py-2 font-bold whitespace-nowrap" colSpan={4}>Gelir / Tasarruf Kalemleri</td>
              </tr>
              <ComparisonRow
                label="Mahsup Tasarrufu (× alış)"
                m={`${monthlySavings.toLocaleString('tr-TR')} TL`}
                h={`${hourlySavings.toLocaleString('tr-TR')} TL`}
                diff={`−${(monthlySavings - hourlySavings).toLocaleString('tr-TR')} TL`}
                negative
              />
              <ComparisonRow
                label="Fazla Üretim Satışı (× satış)"
                m={`${monthlySaleRevenue.toLocaleString('tr-TR')} TL`}
                h={`${hourlySaleRevenue.toLocaleString('tr-TR')} TL`}
                diff={`+${(hourlySaleRevenue - monthlySaleRevenue).toLocaleString('tr-TR')} TL`}
              />
              <ComparisonRow
                label="Şebekeden Alış Faturası (× alış)"
                m="0"
                h={`−${hourlyNetBill.toLocaleString('tr-TR')} TL`}
                diff={`−${hourlyNetBill.toLocaleString('tr-TR')} TL`}
                negative
              />
              <tr className="border-t-2 border-foreground/60 bg-primary/5 font-bold">
                <td className="px-3 py-2 whitespace-nowrap">NET YILLIK FAYDA</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">{monthlyTotal.toLocaleString('tr-TR')} TL</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">{hourlyTotal.toLocaleString('tr-TR')} TL</td>
                <td className="px-3 py-2 text-right whitespace-nowrap text-destructive">−{difference.toLocaleString('tr-TR')} TL (-%{((difference / monthlyTotal) * 100).toFixed(0)})</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Neden böyle olduğu */}
      <Card>
        <CardHeader>
          <CardTitle>Neden Böyle Bir Fark Var?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-3">
          <p>
            Saatlik rejimde <strong>üretim ve tüketim profillerinin saatlik uyumu</strong> kritiktir. GES öğleyin (10-16 arası)
            tepe yapar ama ofis tüketimi bu saatlerde belki yarısı kadar. Geri kalan üretim <strong>"fazla üretim"</strong>
            olarak ucuz satılır (3.95 TL/kWh).
          </p>
          <p>
            Akşam (18-22) ofis hala çalışıyor ama güneş battı. O saatlerde şebekeden 4.28 TL/kWh'tan alış yapılır.
            Aylık rejimde bu iki saat birbiriyle nettleşirken, saatlik rejimde olmaz.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md border border-eco/40 bg-eco/5 p-3 text-xs">
              <div className="font-bold text-eco-dark flex items-center gap-1.5 mb-1"><TrendingUp className="h-3.5 w-3.5" /> Saatliği YAYGINLAŞTIRAN</div>
              <ul className="space-y-1 list-disc list-inside">
                <li>Üretim ile tüketim profili saatlik örtüşen sektörler (soğuk hava deposu, veri merkezi, fabrika)</li>
                <li>Doğu-batı yönelimli paneller (üretim daha geniş dağılır)</li>
                <li>Batarya (BESS) — fazla üretimi depola, akşam kullan</li>
                <li>Smart EV charging — gündüz şarj</li>
              </ul>
            </div>
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs">
              <div className="font-bold text-destructive flex items-center gap-1.5 mb-1"><TrendingDown className="h-3.5 w-3.5" /> Saatliği ZORLAYAN</div>
              <ul className="space-y-1 list-disc list-inside">
                <li>Tüketim sadece mesai saatleri (5×8 ofis): gündüz çok üretim, akşam yok</li>
                <li>Güney panel + 30° eğim (öğle saatleri tepeli)</li>
                <li>Bataryasız sistem</li>
                <li>Sanayi tek vardiya (08-18)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mesken istisnası */}
      <Card className="border-l-4 border-l-eco">
        <CardHeader>
          <CardTitle>📌 Mesken Hâlâ Aylık Mahsuplaşma</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <p>
            EPDK Karar 14531, <strong>mesken abonelerini kapsam dışında bıraktı</strong>.
            Mesken kurulu güç ne olursa olsun aylık mahsuplaşmaya tabi ve bedelli üretim limiti yok.
            Bu yüzden mesken çatı GES yatırımı C&I'a göre çok daha avantajlı.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Mesken seçildiğinde uygulamamız otomatik olarak aylık rejime geçer (monthlyNetting fonksiyonu).
          </p>
        </CardContent>
      </Card>

      {/* Strateji */}
      <Card>
        <CardHeader>
          <CardTitle>C&I Yatırımcı İçin Strateji</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <ol className="list-decimal list-inside space-y-2">
            <li><strong>Tüketim profilini önce analiz et</strong>: Saatlik faturanı veya akıllı sayaç verini incele. Pik saatler ne zaman?</li>
            <li><strong>Sistem boyutunu pik tüketime göre küçült</strong>: Aşırı boyutlandırma yapma. Saatlik öz tüketim oranını maksimize et.</li>
            <li><strong>Batarya değerlendirmesi yap</strong>: 2-4 saatlik LFP batarya gündüz fazlasını akşama kaydırır. ROI hesabını uygulamamızdaki BESS modülüyle yap.</li>
            <li><strong>PPA düşün</strong>: Kurumsal alıcıyla sabit fiyat anlaşması (ör. 4.50 TL/kWh × 10 yıl) saatlik dezavantajı kapatabilir.</li>
            <li><strong>Doğu-batı panel yerleşim</strong>: Güney tepelisi yerine, üretimi 10-18 arası daha uzun saatlere yayar.</li>
          </ol>
        </CardContent>
      </Card>

      <div className="text-center pt-4">
        <Button asChild>
          <Link href="/projects/new">Bu farkı projende hesapla →</Link>
        </Button>
      </div>
    </div>
  );
}

function ComparisonRow({ label, m, h, diff, negative = false }: { label: string; m: string; h: string; diff: string; negative?: boolean }) {
  return (
    <tr className="border-b border-border/30">
      <td className="px-3 py-1.5 whitespace-nowrap text-foreground/80">{label}</td>
      <td className="px-3 py-1.5 text-right tabular-nums whitespace-nowrap font-mono">{m}</td>
      <td className="px-3 py-1.5 text-right tabular-nums whitespace-nowrap font-mono">{h}</td>
      <td className={`px-3 py-1.5 text-right tabular-nums whitespace-nowrap font-mono ${negative ? 'text-destructive' : 'text-eco-dark'}`}>{diff}</td>
    </tr>
  );
}
