import { Scale } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { siteConfig } from "@/lib/site-config";

/** Yasal uyarı + sorumluluk reddi — teklif platformundaki kartın fizibilite metni. */
export function LegalDisclaimerCard() {
  const email = siteConfig.developer.email;
  return (
    <Card className="border-yellow/40 bg-yellow/[0.04]">
      <CardContent className="space-y-4 p-6">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-yellow/15 text-solar-dark dark:text-solar-light">
            <Scale className="size-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-solar-dark/80 dark:text-solar-light/80">
              Yasal Uyarı &amp; Sorumluluk Reddi
            </p>
            <h2 className="mt-1 text-base font-semibold tracking-tight sm:text-lg">
              Lütfen platformu kullanmadan önce okuyun
            </h2>
          </div>
        </div>

        <div className="grid gap-4 text-xs leading-relaxed text-foreground/85 sm:grid-cols-2 sm:text-[13px]">
          <Clause n="1" title="Bilgi amaçlı kullanım">
            Bu platform; GES yatırımlarında üretim, mahsuplaşma ve finansal getiri tahmini yapmak için
            geliştirilmiş bir <strong>karar destek ve hesaplama aracıdır</strong>. Sunulan sonuçlar{" "}
            <strong>yatırım tavsiyesi, resmi fizibilite raporu veya bağlayıcı bir teklif değildir</strong>.
          </Clause>
          <Clause n="2" title="Tarife ve piyasa verileri">
            Tarife, PTF, kur ve maliyet varsayımları <strong>örnek referans değerlerdir</strong>; güncel
            mevzuatı ve piyasa koşullarını yansıtma garantisi yoktur. Karar öncesinde{" "}
            <strong>güncel EPDK tarifeleri ve kendi tekliflerinizle güncellemeniz önerilir</strong>.
          </Clause>
          <Clause n="3" title="Hesaplama doğruluğu">
            NPV, IRR, LCOE, DSCR ve nakit akışı hesapları kullanıcının girdiği değerlere ve seçtiği
            varsayımlara dayanır. Çıktılar <strong>mühendislik, finans veya hukuki danışmanlık yerine
            geçmez</strong>.
          </Clause>
          <Clause n="4" title="Kullanıcı sorumluluğu">
            Oluşturulan modellerin, raporların ve diğer çıktıların{" "}
            <strong>içeriği, doğruluğu, üçüncü taraflarla paylaşılması ve sonuçları tamamen kullanıcının
            sorumluluğundadır</strong>.
          </Clause>
          <Clause n="5" title="Sorumluluk sınırlaması">
            Platform sahibi ve geliştiricisi; platformun kullanımından, hesaplama hatalarından veya
            çıktılara dayanılarak alınan kararlardan doğan doğrudan ya da dolaylı zararlardan{" "}
            <strong>hiçbir şekilde sorumlu tutulamaz</strong>.
          </Clause>
          <Clause n="6" title="Hizmet sunumu">
            Platform &quot;olduğu gibi&quot; sunulur; kesintisiz erişim veya hatasız çalışma konusunda{" "}
            <strong>hiçbir garanti verilmez</strong>. Geliştirici, platformu önceden bildirmeksizin
            güncelleme veya durdurma hakkını saklı tutar.
          </Clause>
        </div>

        <div className="rounded-lg border border-yellow/30 bg-yellow/10 px-4 py-3 text-[12px] leading-relaxed text-foreground/85">
          <strong>Onayınız:</strong> Platformu kullanmaya devam etmekle yukarıdaki şartları kabul etmiş
          sayılırsınız. Sorularınız için{" "}
          <a href={`mailto:${email}`} className="font-semibold underline-offset-2 hover:underline">
            {email}
          </a>{" "}
          adresinden iletişime geçebilirsiniz.
        </div>
      </CardContent>
    </Card>
  );
}

function Clause({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[10.5px] font-semibold uppercase tracking-wider text-solar-dark/90 dark:text-solar-light/90">
        {n}) {title}
      </p>
      <p>{children}</p>
    </div>
  );
}
