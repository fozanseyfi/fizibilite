/*
 * Giriş sayfasının BU PLATFORMA ÖZGÜ kısmı. Sayfanın geri kalanı
 * components/auth/login-kit.tsx'te — o dosya bütün platformlarda birebir aynıdır.
 */
import type { LoginPlatform } from "@/components/auth/login-kit";
import { BrandMark } from "@/components/layout/BrandMark";
import manifest from "@/lib/tanitim/manifest.json";
import { TOUR } from "@/lib/tanitim/config";

interface TourModule { id: string; title: string; steps: { img: string; title: string }[] }
const MODULES = (manifest.modules as TourModule[]).filter((m) => m.steps.length > 0);

function shot(moduleId: string, step: number) {
  const m = MODULES.find((x) => x.id === moduleId) ?? MODULES[0];
  const s = m?.steps[Math.min(step, (m?.steps.length ?? 1) - 1)];
  return { id: m?.id ?? moduleId, img: s?.img ?? "", title: s?.title ?? "" };
}

const hero = shot("utility", 9);

export const LOGIN_PLATFORM: LoginPlatform = {
  id: "fizibilite",
  name: "Solar Fizibilite",
  fullName: "Solar Fizibilite Platformu",
  mark: <BrandMark />,
  accent: TOUR.accent,
  accentDark: TOUR.accentDark,
  intro: {
    eyebrow: "GES ve batarya yatırımları için",
    title: "Yatırım kararını tahminle değil, saat saat hesapla verin.",
    text:
      "Utility ölçekli santralin proje finansmanından fabrika çatısının saatlik mahsuplaşmasına, mevcut santrale batarya eklemeye kadar her model aynı mantıkla kurulur: girdiyi yazarsınız, nakit akışını, getiriyi ve riski hemen görürsünüz.",
    points: [
      { title: "Utility GES + BESS", text: "CAPEX, OPEX, borç yapısı, vergi ve proje finansmanı" },
      { title: "C&I ve mesken", text: "Saatlik tüketim profili, mahsuplaşma ve fatura analizi" },
      { title: "Batarya ekleme", text: "Gelir kırılımı, batarya sağlığı ve boyut optimizasyonu" },
      { title: "Duyarlılık ve paylaşım", text: "Kırılma noktası, senaryolar, müşteriye rapor linki" },
    ],
  },
  hero: { img: hero.img, caption: `Gerçek ekran: ${hero.title}`, href: `/tanitim#${hero.id}` },
  privacy: [
    "Hesap ve veriler yalnızca bu tarayıcıda tutulur",
    "Şifreler düz metin saklanmaz",
    "Üçüncü taraf izleme ya da reklam yok",
    "Bulut eşitleme yakında",
  ],
  tour: {
    text: TOUR.promoText,
    modules: MODULES.map((m) => ({ id: m.id, title: m.title })),
    total: MODULES.reduce((n, m) => n + m.steps.length, 0),
    previews: TOUR.previews.map((p) => ({ ...shot(p.id, p.step), label: p.label })),
  },
};
