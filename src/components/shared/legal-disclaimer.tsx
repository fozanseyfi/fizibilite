import { ChevronDown, Scale } from "lucide-react";
import { siteConfig } from "@/lib/site-config";

/** Yasal uyarı + sorumluluk reddi — açılır kapanır blok (varsayılan kapalı). */
export function LegalDisclaimerCard() {
  const email = siteConfig.developer.email;
  return (
    <details className="group rounded-2xl border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
          <Scale className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-amber-600 dark:text-amber-400">
            Yasal uyarı ve sorumluluk reddi
          </p>
          <p className="text-sm font-semibold">Platformu kullanmadan önce okuyun · 6 madde</p>
        </div>
        <ChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>

      <div className="space-y-4 border-t px-5 pb-5 pt-4">
        <div className="grid gap-x-6 gap-y-4 text-[13px] leading-relaxed text-foreground/85 sm:grid-cols-2">
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

        <div className="rounded-xl bg-secondary/60 px-4 py-3 text-[12px] leading-relaxed text-foreground/85">
          <strong>Onayınız:</strong> Platformu kullanmaya devam etmekle yukarıdaki şartları kabul etmiş
          sayılırsınız. Sorularınız için{" "}
          <a href={`mailto:${email}`} className="font-semibold underline-offset-2 hover:underline">
            {email}
          </a>{" "}
          adresinden iletişime geçebilirsiniz.
        </div>
      </div>
    </details>
  );
}

function Clause({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-[11px] font-bold text-amber-700 dark:text-amber-400">
        {n}
      </span>
      <div className="space-y-1">
        <p className="text-[13px] font-semibold text-foreground">{title}</p>
        <p>{children}</p>
      </div>
    </div>
  );
}
