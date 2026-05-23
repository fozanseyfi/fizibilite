import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">EPDK Saatlik Mahsuplaşma Yorumu</h1>
        <p className="text-muted-foreground mt-1">
          EPDK Karar No: 14531 (30.04.2026), R.G. 02.04.2026 / 33212 — "Lisanssız Elektrik Üretimine İlişkin 1 Nolu Açıklama"
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1. Saatlik Mahsuplaşma Algoritması</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-3 leading-relaxed">
          <p>Her saat için:</p>
          <pre className="bg-secondary p-3 rounded-md text-xs overflow-x-auto">
{`netted[h]          = min(üretim[h], tüketim[h])
net_consumption[h] = max(0, tüketim[h] − üretim[h])    // şebekeden alış
surplus[h]         = max(0, üretim[h] − tüketim[h])    // şebekeye veriş`}
          </pre>
          <p>
            <strong>Aynı ölçüm noktası</strong> durumunda mahsuplaşma öncesi tüketim formülle hesaplanır:
            <code className="bg-secondary px-1.5 py-0.5 rounded mx-1">T = A + (B − C)</code> — A: çift yönlü sayaç çekiş, B: tek yönlü üretim sayacı veriş, C: çift yönlü sayaç veriş.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Bedelli Üretim Limiti</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-3 leading-relaxed">
          <p>
            <code className="bg-secondary px-1.5 py-0.5 rounded">Limit = önceki yıl tüketim × 2</code> (yıllık kümülatif).
          </p>
          <p>
            Yıllık <em>bedelli</em> miktar = mahsuplaşılan + ihtiyaç fazlası satış. Bu toplam limiti aşarsa,
            aşan kısım <strong>YEKDEM'e bedelsiz</strong> aktarılır (gelir yaratmaz).
          </p>
          <p>
            <em>Önemli</em> (Tablo 3 dipnotu): Limit aşıldıktan sonra da mahsuplaşma DEVAM EDER —
            mahsuplaşılan kısım her zaman tüketimden düşülür, sadece <em>fazla üretim</em> YEKDEM'e gider.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3. Tablo 1/2/3 Örneklerinin Doğrulaması</CardTitle>
          <CardDescription>Birim test seviyesinde EPDK örnekleri birebir geçer.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Tablo 1</strong> (günlük): 75.000 kWh tüketim, 60.000 kWh üretim → 47.400 kWh mahsup.</li>
            <li><strong>Tablo 2</strong> (limit altı): 100 MWh önceki yıl, 200 MWh üretim, 70 MWh mahsup → 130 MWh bedelli, 0 YEKDEM.</li>
            <li><strong>Tablo 3</strong> (limit aşımı): 100 MWh önceki yıl, 220 MWh üretim, 70 MWh mahsup → 130 MWh bedelli + 20 MWh YEKDEM.</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle>📊 Saatlik vs Aylık Mahsuplaşma — Detaylı Karşılaştırma</CardTitle>
          <CardDescription>Aynı üretim/tüketim için iki rejimin fatura sonucu yan yana, sayısal örnek ile.</CardDescription>
        </CardHeader>
        <CardContent>
          <a href="/about/netting-comparison" className="text-primary hover:underline text-sm font-semibold">
            → Karşılaştırma sayfasını aç (saatlik rejim C&I yatırımcısı için neden %20-35 daha düşük gelir?)
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>4. Mesken İstisnası</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed">
          Mesken aboneleri kurulu güçten bağımsız olarak <strong>aylık mahsuplaşma</strong>ya tabidir ve bedelli üretim limiti uygulanmaz.
          UI'da abone grubu "Mesken" seçildiğinde motor otomatik olarak aylık moda geçer.
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>5. Fiyat Uygulaması</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed space-y-2">
          <p><strong>Mahsuplaşılan kısım:</strong> tarife alış fiyatı üzerinden tasarruf (fatura azalması).</p>
          <p><strong>Net tüketim:</strong> ikili anlaşma fiyatı veya son kaynak tedarik tarifesi (mesken {'>'} 4.000 kWh, ticarethane-sanayi {'>'} 15.000 kWh için).</p>
          <p><strong>İhtiyaç fazlası (limit altı):</strong> kendi abone grubu tarifesi üzerinden satış geliri.</p>
          <p><strong>YEKDEM bedelsiz:</strong> 0 TL gelir, ama raporlanır.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>6. Disclaimer</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground leading-relaxed">
          Bu uygulama mevcut tarife, fiyat ve yönetmelik koşullarına dayanır. Yatırım kararı vermeden önce yetkili enerji uzmanına danışın.
          GES-Fizibilite Pro, sonuçların doğruluğu konusunda yasal sorumluluk kabul etmez.
        </CardContent>
      </Card>
    </div>
  );
}
