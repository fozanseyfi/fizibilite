/**
 * Tanıtım sayfasının platforma özgü ayarları. Tanıtım bileşenleri (components/tanitim/tour-view.tsx,
 * components/auth/tour-promo.tsx) bütün platformlarda birebir aynıdır; yalnız bu dosya ve
 * manifest/görüntüler platforma göre değişir.
 */
export const TOUR = {
  /** Platformun ana rengi (vurgu, numaralar, kaydırma çubuğu) */
  accent: "#1f4e8c",
  /** Gece modunda vurgu rengi */
  accentDark: "#7ea6dc",
  /** Tarayıcı çerçevesindeki adres */
  domain: "fizibilite.fozanseyfi.com",
  /** Giriş sayfasındaki tanıtım şeridinin açıklaması */
  promoText:
    "Utility GES + BESS proje finansmanından C&I saatlik mahsuplaşmaya, batarya eklemeden paylaşım linkine kadar bütün modeller gerçek ekranlar üzerinden anlatılıyor: hangi girdi nereye yazılır, sonuç nerede okunur.",
  /** Giriş sayfasında gösterilen örnek ekranlar (bölüm id + adım sırası, 0'dan) */
  previews: [
    { id: "utility", step: 9, label: "Proje finansmanı" },
    { id: "ci", step: 7, label: "Saatlik mahsuplaşma" },
    { id: "bess-utility", step: 5, label: "Batarya geliri" },
  ],
};
