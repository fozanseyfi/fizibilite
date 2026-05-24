import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, Sun, Activity, Calculator, Scale, AlertTriangle, CheckCircle2, FileText, Lightbulb } from 'lucide-react';
import { NettingCalculator } from './netting-calculator';

export const dynamic = 'force-dynamic';

export default function NettingMethodologyPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link href="/about"><ArrowLeft className="h-4 w-4 mr-1" /> Hakkında'ya dön</Link>
        </Button>
        <div className="text-xs text-muted-foreground">📚 Mahsuplaşma 101 · Adım adım rehber</div>
      </div>

      <div>
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-3">
          <BookOpen className="h-3 w-3" />
          EPDK Karar 14531 · Saatlik Mahsuplaşma Metodolojisi
        </div>
        <h1 className="text-3xl font-bold">Mahsuplaşma Nasıl Çalışır?</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
          GES yatırımının finansal mantığını anlamak için <strong>tek konu</strong> mahsuplaşma. Bu sayfa, EPDK Karar No: 14531
          (30.04.2026) ile yürürlüğe giren saatlik mahsuplaşma rejimini <strong>sıfırdan</strong> öğretir. Aşağıdaki 6 bilgi
          kartını ve canlı hesaplayıcıyı kullanarak konuya hakim olabilirsin.
        </p>
      </div>

      {/* KART 1 — Mahsuplaşma nedir */}
      <InfoCard
        n={1}
        icon={Activity}
        title="Mahsuplaşma (Netting) Nedir?"
        subtitle="Aynı saat içinde üretim ile tüketim eşleşmesi"
        accent="solar"
      >
        <p>
          <strong>Mahsuplaşma</strong>, GES'inden üretilen elektriği tüketiminle eşleştirme işlemidir.
          Eşleşen kısım için <strong>fatura ödemezsin</strong> — adeta elektriğini kendin ürettin gibi sayılır.
        </p>
        <div className="bg-secondary/40 rounded-md p-3 mt-3">
          <div className="text-xs font-semibold mb-2">Temel formül (her saat için):</div>
          <code className="block bg-card p-2 rounded text-xs">
            mahsuplaşılan[saat] = min(üretim[saat], tüketim[saat])
          </code>
          <ul className="text-xs mt-2 space-y-1 list-disc list-inside text-muted-foreground">
            <li>Üretim 10 kWh, tüketim 7 kWh → 7 kWh mahsuplaştı (kalan 3 kWh fazla)</li>
            <li>Üretim 5 kWh, tüketim 12 kWh → 5 kWh mahsuplaştı (kalan 7 kWh şebekeden alış)</li>
            <li>Üretim 0 kWh (gece), tüketim 8 kWh → 0 mahsup, 8 kWh şebekeden</li>
          </ul>
        </div>
      </InfoCard>

      {/* KART 2 — Saatlik vs Aylık */}
      <InfoCard
        n={2}
        icon={Scale}
        title="Saatlik vs Aylık Mahsuplaşma — En Önemli Değişiklik"
        subtitle="EPDK 2026'da rejim değişti"
        accent="navy"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-md border border-eco/40 bg-eco/5 p-3">
            <div className="font-bold text-eco-dark mb-2">📅 ESKİ: Aylık Mahsuplaşma</div>
            <p className="text-xs">
              Aydaki <strong>tüm üretim</strong> ile aydaki <strong>tüm tüketim</strong> ay sonu netlenirdi.
              Saat ayrımı yoktu. Mesken aboneleri için <strong>hala</strong> bu kural geçerli.
            </p>
            <code className="block bg-card p-2 rounded text-[10px] mt-2">
              netted_ay = min(Σ üretim_ay, Σ tüketim_ay)
            </code>
          </div>
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
            <div className="font-bold text-destructive mb-2">⏰ YENİ: Saatlik Mahsuplaşma</div>
            <p className="text-xs">
              <strong>EPDK Karar 14531</strong> (01.05.2026 yürürlük) — Her saat ayrı netlenir.
              Mesken hariç tüm aboneler (C&I, sanayi, tarımsal) için zorunlu.
            </p>
            <code className="block bg-card p-2 rounded text-[10px] mt-2">
              netted_saat = min(üretim_saat, tüketim_saat)
            </code>
          </div>
        </div>
        <div className="mt-3 p-3 rounded-md bg-amber-50 border border-amber-300 text-xs">
          <strong className="text-amber-900">⚠ Pratik etkisi:</strong> C&I yatırımcı için yıllık gelir <strong>%20-35</strong> azaldı.
          GES öğleyin tepe yapar ama ofis tüketimi az → fazla üretim ucuz satış fiyatından elden çıkar.{' '}
          <Link href="/about/netting-comparison" className="text-primary hover:underline">Tam karşılaştırma →</Link>
        </div>
      </InfoCard>

      {/* KART 3 — Interaktif hesaplayıcı */}
      <InfoCard
        n={3}
        icon={Calculator}
        title="Canlı Hesaplayıcı — Kendi Sayılarını Dene"
        subtitle="Üretim ve tüketim gir, mahsuplaşma sonucunu gör"
        accent="solar"
      >
        <p>
          Aşağıda 24 saatlik tipik bir gün üzerinden hesaplayıcı var. Üretim/tüketim profillerini değiştir, mahsuplaşmanın
          gerçek zamanlı nasıl çalıştığını gör.
        </p>
        <div className="mt-3">
          <NettingCalculator />
        </div>
      </InfoCard>

      {/* KART 4 — Bedelli üretim limiti */}
      <InfoCard
        n={4}
        icon={AlertTriangle}
        title="Bedelli Üretim Limiti — Üretemediğin Para"
        subtitle="Önceki yıl tüketim × 2 sınırı"
        accent="navy"
      >
        <p>
          Yıllık üretim <strong>sınırsız değil</strong>. EPDK bir tavan koyar:{' '}
          <code className="bg-secondary px-1.5 py-0.5 rounded">bedelli_limit = önceki_yıl_tüketim × 2</code>
        </p>
        <ul className="text-sm space-y-1 list-disc list-inside mt-3">
          <li>Limit içinde kalan üretim: <span className="text-eco-dark font-semibold">bedelli</span> (mahsup + bedelli satış)</li>
          <li>Limiti aşan üretim: <span className="text-destructive font-semibold">YEKDEM bedelsiz</span> — gelir yaratmaz</li>
        </ul>
        <div className="bg-secondary/40 rounded-md p-3 mt-3 text-xs">
          <div className="font-semibold mb-1">Örnek (EPDK Tablo 3 birebir):</div>
          <table className="w-full">
            <tbody>
              <Row label="Önceki yıl tüketim" value="100 MWh" />
              <Row label="Bedelli üretim limiti" value="200 MWh (= 100 × 2)" />
              <Row label="Cari yıl üretim" value="220 MWh" />
              <Row label="Mahsuplaşılan" value="70 MWh" highlight />
              <Row label="Bedelli ihtiyaç fazlası satış" value="130 MWh (= 200 − 70)" highlight />
              <Row label="YEKDEM bedelsiz aktarım" value="20 MWh (= 220 − 200)" negative />
              <Row label="TOPLAM" value="220 MWh ✓" bold />
            </tbody>
          </table>
        </div>
      </InfoCard>

      {/* KART 5 — Fiyatlama */}
      <InfoCard
        n={5}
        icon={FileText}
        title="Fiyat Uygulaması — Hangi kWh Hangi Fiyattan?"
        subtitle="EPDK 14461 tarife yapısı"
        accent="solar"
      >
        <p>4 farklı miktarın 4 farklı fiyat sonucu var:</p>
        <table className="w-full text-xs mt-3 border border-border/40 rounded overflow-hidden">
          <thead className="bg-secondary">
            <tr>
              <th className="text-left px-3 py-2">Miktar</th>
              <th className="text-left px-3 py-2">Fiyat</th>
              <th className="text-left px-3 py-2">Yıllık etki</th>
            </tr>
          </thead>
          <tbody>
            <PriceRow item="Mahsuplaşılan" price="Tarife alış fiyatı (yüksek)" effect="Tasarruf — fatura azalır" tone="eco" />
            <PriceRow item="Net şebekeden çekiş" price="Tarife alış fiyatı (yüksek)" effect="Gider — fatura olur" tone="red" />
            <PriceRow item="Bedelli ihtiyaç fazlası" price="Tarife satış fiyatı (düşük)" effect="Gelir — düşük fiyatlı" tone="amber" />
            <PriceRow item="YEKDEM bedelsiz" price="0 TL" effect="Yok — boşa giden üretim" tone="red" />
          </tbody>
        </table>
        <div className="mt-3 p-3 rounded-md bg-amber-50 border border-amber-300 text-xs">
          <strong className="text-amber-900">💡 Önemli:</strong> Alış fiyatı satış fiyatından <strong>her zaman yüksek</strong>.
          (Örn. Ticarethane LV: 4.28 alış / 3.95 satış). Bu yüzden <strong>fazla üretim yapmak yerine öz tüketim</strong>
          her zaman daha karlı.
        </div>
      </InfoCard>

      {/* KART 6 — Karar matrisi */}
      <InfoCard
        n={6}
        icon={Lightbulb}
        title="Pratik Karar Matrisi — Hangi Yatırımcı Ne Yapmalı?"
        subtitle="Saatlik rejim için strateji rehberi"
        accent="navy"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Decision
            title="✅ Saatlik rejim AVANTAJLI"
            color="eco"
            items={[
              'Soğuk hava deposu, veri merkezi — 24/7 sabit tüketim',
              'Fabrika 3 vardiya — gece tüketimi yüksek',
              'Otel — akşam pik (kısmen)',
              'Doğu-batı yönelimli paneller (üretim daha geniş dağılır)',
              'Batarya ile öz tüketim oranı %80+ çıkarılabilenler',
            ]}
          />
          <Decision
            title="⚠ Saatlik rejim ZORLAYICI"
            color="red"
            items={[
              'Ofis 5×8 (gündüz tüketim az, hafta sonu kapalı)',
              'Sanayi tek vardiya (sadece 08-18)',
              'Güney 30° optimum tilt (öğle pikine bağımlı)',
              'Bataryasız küçük çatı GES',
              'Tüketim çok düşük olan + büyük kurulu güçler',
            ]}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          <div className="rounded-md border border-eco/40 bg-eco/5 p-3 text-xs">
            <div className="font-bold text-eco-dark mb-1">🔋 Batarya Düşün</div>
            <p>Gündüz fazlasını akşama kaydır. Self-consumption ratio %50 → %80. ROI: 7-10 yıl.</p>
          </div>
          <div className="rounded-md border border-amber-400 bg-amber-50 p-3 text-xs">
            <div className="font-bold text-amber-800 mb-1">📋 PPA Bul</div>
            <p>Kurumsal alıcıyla sabit fiyat (örn. 4.50 TL/kWh × 10y). Satış fiyatını dolaylı yükseltir.</p>
          </div>
          <div className="rounded-md border border-primary/40 bg-primary/5 p-3 text-xs">
            <div className="font-bold text-primary mb-1">⚙ Boyutlandır</div>
            <p>Aşırı boyut yapma. Yıllık üretim ~yıllık tüketim hedefle. Fazla üretim ucuz satış kaybı.</p>
          </div>
        </div>
      </InfoCard>

      {/* CTA */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="text-base">🎯 Konuyu öğrendin mi? Şimdi kendi projeni yarat!</CardTitle>
          <CardDescription>Saatlik mahsuplaşma motoru EPDK Tablo 1/2/3 ile birebir doğrulanmış. Real-time hesap için bir proje aç.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/projects/new">Yeni Proje Başlat →</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/templates">Hazır Şablonlar</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/about/netting-comparison">Saatlik vs Aylık Karşılaştırma</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------- Yardımcı bileşenler ----------

function InfoCard({ n, icon: Icon, title, subtitle, accent, children }: { n: number; icon: typeof Sun; title: string; subtitle: string; accent: 'solar' | 'eco' | 'navy'; children: React.ReactNode }) {
  const accentClass = accent === 'solar' ? 'gradient-solar' : accent === 'eco' ? 'gradient-eco' : 'gradient-navy';
  return (
    <Card className="overflow-hidden">
      <div className={`h-1 ${accentClass}`} />
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className={`h-12 w-12 rounded-xl ${accentClass} flex items-center justify-center flex-shrink-0`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Adım {n} / 6</div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription className="text-xs mt-0.5">{subtitle}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="text-sm space-y-2">{children}</CardContent>
    </Card>
  );
}

function Row({ label, value, highlight = false, negative = false, bold = false }: { label: string; value: string; highlight?: boolean; negative?: boolean; bold?: boolean }) {
  return (
    <tr className={`${bold ? 'font-bold border-t border-border/40' : ''}`}>
      <td className="py-1">{label}</td>
      <td className={`py-1 text-right font-mono ${highlight ? 'text-eco-dark font-semibold' : negative ? 'text-destructive' : ''}`}>{value}</td>
    </tr>
  );
}

function PriceRow({ item, price, effect, tone }: { item: string; price: string; effect: string; tone: 'eco' | 'red' | 'amber' }) {
  const colorClass = tone === 'eco' ? 'text-eco-dark' : tone === 'red' ? 'text-destructive' : 'text-amber-700';
  return (
    <tr className="border-b border-border/30">
      <td className="px-3 py-2 font-medium whitespace-nowrap">{item}</td>
      <td className="px-3 py-2 whitespace-nowrap">{price}</td>
      <td className={`px-3 py-2 whitespace-nowrap font-semibold ${colorClass}`}>{effect}</td>
    </tr>
  );
}

function Decision({ title, color, items }: { title: string; color: 'eco' | 'red'; items: string[] }) {
  const colorClass = color === 'eco' ? 'border-eco/40 bg-eco/5' : 'border-destructive/40 bg-destructive/5';
  const titleColor = color === 'eco' ? 'text-eco-dark' : 'text-destructive';
  return (
    <div className={`rounded-md border ${colorClass} p-3`}>
      <div className={`font-bold mb-2 text-sm ${titleColor}`}>{title}</div>
      <ul className="text-xs space-y-1 list-disc list-inside text-foreground/80">
        {items.map((it, i) => <li key={i}>{it}</li>)}
      </ul>
    </div>
  );
}
