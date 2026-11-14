import type { Metadata } from "next";
import { ContactView } from "@/components/common/contact-view";

export const metadata: Metadata = {
  title: "İletişime Geç — Fizibilite Platformu",
};

export default function ContactPage() {
  return (
    <ContactView
      config={{
        current: "fizibilite",
        subjectTag: "Fizibilite",
        footerTag: "solar-fizibilite-platformu",
        bio: "Yenilenebilir enerji sektöründe, büyük ölçekli GES projelerinin geliştirme, yatırım ve işletme süreçlerinde çalışıyorum. Bu platformu, yatırım kararlarında ihtiyaç duyduğum hesapları tek bir yerde, şeffaf ve hızlı yapabilmek için bireysel olarak geliştirdim; sektördeki meslektaşlarımın da işine yarayacağı inancıyla paylaşıyorum.",
        formNote: "Formu doldurun; mesajınız e-posta uygulamanız üzerinden hazır taslak olarak açılır.",
        subjectPlaceholder: "Kısa bir özet — örn. Excel çıktısında hücre biçimi",
        privacy: (
          <>
            Oluşturduğunuz modeller kendi hesabınızda tutulur. Geliştirici dahil <strong>hiçbir üçüncü taraf</strong>{" "}
            modellerinizi göremez veya indiremez.
          </>
        ),
        disclaimerTitle: "Tahmin aracı",
        disclaimer: (
          <>
            Platform; üretim, mahsuplaşma ve yatırım getirisi hesaplarında yol gösterici bir yardımcıdır. Sonuçlar
            <strong> yatırım tavsiyesi veya resmi fizibilite raporu yerine geçmez</strong>; nihai kararlar kullanıcı
            sorumluluğundadır.
          </>
        ),
        legalIntro:
          "Bu uygulama bir fizibilite hesaplama yardımcısıdır. Yatırım kararları, sözleşmeler ve resmi raporlama için tek başına bağlayıcı kabul edilemez. Platformu kullanmaya devam ederek aşağıdaki şartları kabul etmiş sayılırsınız.",
        clauses: [
          {
            title: "Bilgi Amaçlı Kullanım",
            body: (
              <>
                Bu platform; GES yatırımlarında üretim, mahsuplaşma ve finansal getiri tahmini yapmak için geliştirilmiş bir{" "}
                <strong>karar destek ve hesaplama aracıdır</strong>. Sunulan sonuçlar yatırım tavsiyesi, resmi fizibilite
                raporu veya bağlayıcı bir teklif değildir.
              </>
            ),
          },
          {
            title: "Tarife ve Piyasa Verileri",
            body: (
              <>
                Tarife, PTF, kur ve maliyet varsayımları <strong>örnek referans değerlerdir</strong>; güncel mevzuatı ve
                piyasa koşullarını yansıtma garantisi yoktur. Karar öncesinde güncel EPDK tarifeleri ve kendi
                tekliflerinizle güncellemeniz önerilir.
              </>
            ),
          },
          {
            title: "Hesaplama Doğruluğu",
            body: (
              <>
                NPV, IRR, LCOE, DSCR ve nakit akışı hesapları kullanıcının girdiği değerlere ve seçtiği varsayımlara dayanır.
                Çıktılar <strong>mühendislik, finans veya hukuki danışmanlık yerine geçmez</strong>.
              </>
            ),
          },
          {
            title: "Kullanıcı Sorumluluğu",
            body: (
              <>
                Oluşturulan modellerin, raporların ve diğer çıktıların içeriği, doğruluğu, üçüncü taraflarla paylaşılması ve
                sonuçları <strong>tamamen kullanıcının sorumluluğundadır</strong>.
              </>
            ),
          },
          {
            title: "Sorumluluk Sınırlaması",
            body: (
              <>
                Platform sahibi ve geliştiricisi; platformun kullanımından, hesaplama hatalarından veya çıktılara dayanılarak
                alınan kararlardan doğan doğrudan ya da dolaylı zararlardan <strong>hiçbir şekilde sorumlu tutulamaz</strong>.
              </>
            ),
          },
          {
            title: "Hizmet Sunumu",
            body: (
              <>
                Platform &quot;olduğu gibi&quot; sunulur; kesintisiz erişim veya hatasız çalışma konusunda{" "}
                <strong>hiçbir garanti verilmez</strong>. Geliştirici, platformu önceden bildirmeksizin güncelleme veya
                durdurma hakkını saklı tutar.
              </>
            ),
          },
        ],
      }}
    />
  );
}
