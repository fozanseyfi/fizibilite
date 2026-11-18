/**
 * Fizibilite Platformu — tanıtım ekran görüntüleri + src/lib/tanitim/manifest.json.
 *
 *   npx next dev -p 4100                                 (ayrı terminalde)
 *   node scripts/tour/capture.mjs [bölüm-id ...]
 *
 * Hesaplar ve projeler tarayıcıda (localStorage) tutulduğu için demo verisi çekimin başında
 * arayüzden oluşturulur: demo hesap açılır, dört modelden birer proje kaydedilir.
 */
import path from "node:path";
import { launch, autoDialogs, noSmoothScroll, go, settle, sleep, byText, fill, waitPath } from "./lib.mjs";
import { VW, VH, mark, press, scrollTo, toTop, modalButton, rowButton, runTour } from "./engine.mjs";

const MANIFEST = path.resolve("src/lib/tanitim/manifest.json");
const DEMO = { name: "Deniz Aydın", email: "deniz.aydin@demo-enerji.example", password: "Demo-Sifre-2026" };
const NAMES = {
  utility: "Konya Karapınar 100 MWp GES + BESS",
  ci: "Manisa OSB Tekstil Çatı GES",
  bessCi: "Kayseri Gıda Fabrikası — Batarya",
  bessUtility: "Aksaray 30 MWp GES — Batarya Ekleme",
};
/** Model sayfalarında üstte sabit duran çubuklar (üst bar + model sekmeleri) */
const MODEL_OFF = 132;

// ---------------------------------------------------------------- yardımcılar
/** Model sayfasının sekmesine geç. */
async function tab(page, label) {
  await press(page, await byText(page, label, "button"), 1200);
  await toTop(page);
  await sleep(300);
}
/** Model sayfası başlığındaki proje bilgisi alanları (sırasıyla ad, firma, lokasyon, hazırlayan). */
async function headerInputs(page) {
  return page.$$eval("main input[type=text]", (els) => els.slice(0, 4).map((_, i) => i)).then(async () => page.$$("main input[type=text]"));
}
/** Odaklı alanı bırak, fareyi kenara çek (ipucu balonları kapanır). */
export async function unfocus(page) {
  await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
  await page.mouse.move(5, 895);
  await sleep(200);
}
async function setHeader(page, { name, firm, place, by }) {
  const ins = await headerInputs(page);
  if (name) await fill(page, ins[0], name);
  if (firm) await fill(page, ins[1], firm);
  if (place) await fill(page, ins[2], place);
  if (by) await fill(page, ins[3], by);
  await unfocus(page);
}
/** Metni içeren başlığın bulunduğu bölümdeki ilk sayı alanı (etiket metnine göre). */
async function inputNear(page, labelText) {
  const h = await page.evaluateHandle((t) => {
    const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
    const vis = (n) => n.getBoundingClientRect().height > 0;
    const lab = [...document.querySelectorAll("label, span, div, p, td, th")].find(
      (n) => vis(n) && norm(n.textContent).startsWith(t) && ![...n.children].some((c) => norm(c.textContent).startsWith(t)),
    );
    if (!lab) return null;
    let a = lab;
    for (let i = 0; i < 4 && a; i++, a = a.parentElement) {
      const f = [...a.querySelectorAll("input, select")].find(vis);
      if (f) return f;
    }
    return null;
  }, labelText);
  const el = h.asElement();
  if (!el) throw new Error(`Alan bulunamadı: ${labelText}`);
  return el;
}
/** Kaydet → proje sayfasına geçişi bekle. */
async function saveProject(page) {
  await press(page, await byText(page, "Projeyi Kaydet", "button"), 1500);
  try {
    await waitPath(page, /^\/projects\/(?!new)[^/]+$/, 15_000);
  } catch {}
}

// ---------------------------------------------------------------- senaryo
const MODULES = [
  {
    id: "giris",
    group: "Başlarken",
    title: "Giriş ve Genel Görünüm",
    intro:
      "Platforma e-posta ve şifreyle girilir. Solda bütün modellere ve sayfalara giden menü, üstte hesap menüsü, dil (TR/EN) ve gece modu bulunur.",
    steps: [
      {
        title: "Hesap oluşturma",
        text: "İlk kez kullanıyorsanız “Hesap Oluştur” ile ad soyad, e-posta ve şifrenizi girin. Hesap açılınca doğrudan Dashboard'a geçilir.",
        guest: true,
        run: async (page) => {
          await go(page, "/register", 800);
          await fill(page, "#name", "Deniz Aydın");
          await fill(page, "#email", "deniz.aydin@demo-enerji.example");
          await fill(page, "#password", "Demo-Sifre-2026");
          await fill(page, "#password2", "Demo-Sifre-2026");
          await mark(page, await byText(page, "Kayıt Ol", "button"), { click: true });
        },
      },
      {
        title: "Giriş ekranı",
        text: "Kayıtlı kullanıcılar e-posta ve şifreyle girer. Şifrenizi unuttuysanız “Şifremi unuttum” bağlantısını kullanın. Sağda platformun örnek ekranları ve veri gizliliği notu yer alır.",
        guest: true,
        run: async (page) => {
          await go(page, "/login", 800);
          await fill(page, "#email", DEMO.email);
          await fill(page, "#password", DEMO.password);
          await mark(page, await byText(page, "Giriş Yap", "button"), { click: true });
        },
      },
      {
        title: "Dashboard",
        text: "Girişten sonra Dashboard açılır: kayıtlı projeler model tipi, kapasite, IRR, geri ödeme süresi ve güncelleme tarihiyle listelenir; “Rapor al” raporu doğrudan hazırlar. “Yeni Proje” ile dört modelden biri seçilerek başlanır.",
        run: async (page) => {
          await go(page, "/", 1200);
          await mark(page, await byText(page, "Yeni Proje", "main a, main button"));
        },
      },
      {
        title: "Hesap menüsü",
        text: "Sol üstteki adınıza tıklayınca hesap menüsü açılır: rolünüz, Hesabım sayfası ve çıkış buradadır.",
        run: async (page) => {
          await go(page, "/", 800);
          await press(page, await byText(page, DEMO.name, "header button, button"), 500);
          await mark(page, await byText(page, DEMO.name, "header button, button"), { click: true });
        },
        after: async (page) => page.keyboard.press("Escape"),
      },
      {
        title: "Gece modu",
        text: "Sağ üstteki ay simgesiyle gece moduna geçilir; tercih tarayıcıda saklanır ve bütün sayfalarda geçerlidir.",
        run: async (page) => {
          await go(page, "/", 800);
          await press(page, await page.$('[aria-label="Karanlık temaya geç"]'), 800);
          await mark(page, await page.$('[aria-label="Aydınlık temaya geç"]'), { click: true });
        },
        after: async (page) => {
          const b = await page.$('[aria-label="Aydınlık temaya geç"]');
          if (b) await b.click();
          await sleep(500);
        },
      },
      {
        title: "İngilizce arayüz",
        text: "TR / EN düğmesiyle bütün menüler, başlıklar ve açıklamalar İngilizceye geçer; model hesapları aynı kalır.",
        run: async (page) => {
          await go(page, "/", 800);
          await press(page, await byText(page, "EN", "button"), 1500);
          await mark(page, await byText(page, "EN", "button"), { click: true });
        },
        after: async (page) => {
          await (await byText(page, "TR", "button")).click();
          await sleep(1200);
        },
      },
    ],
  },

  {
    id: "yeni-proje",
    group: "Başlarken",
    title: "Yeni Proje ve Model Seçimi",
    intro:
      "Her fizibilite bir model üzerinde kurulur: Utility (GES + BESS proje finansmanı), C&I / Mesken (saatlik mahsuplaşma), Batarya · C&I ve Batarya · Utility.",
    steps: [
      {
        title: "Model seçimi",
        text: "“Yeni Proje”de dört model kartı bulunur. Arazi ölçekli, kredili santraller için Utility; çatı ve tüketim tesisleri için C&I / Mesken; mevcut tesise batarya eklemek için Batarya modelleri seçilir.",
        run: async (page) => {
          await go(page, "/projects/new", 1000);
          await mark(page, await byText(page, "Utility", "main a"));
          await mark(page, await byText(page, "C&I / Mesken", "main a"));
        },
      },
    ],
  },

  {
    id: "utility",
    group: "Fizibilite Modelleri",
    title: "Utility GES + BESS Proje Finansmanı",
    intro:
      "Arazi ölçekli GES (ve isteğe bağlı batarya) için proje finansmanı modeli: CAPEX, üretim, OPEX, gelir, vergi, inşaat dönemi ve kredi yapısı girilir; IRR, NPV, DSCR, LCOE ve nakit akışları anında hesaplanır.",
    steps: [
      {
        title: "Proje bilgileri",
        text: "Sayfanın başında proje adı, firma, lokasyon ve hazırlayan girilir; bu bilgiler rapor kapağında ve proje listesinde görünür. Üstteki sekmeler model, Huawei değer analizi ve sonuçlar arasında geçiş yapar.",
        run: async (page) => {
          await go(page, "/projects/new/utility", 1500);
          await setHeader(page, { name: NAMES.utility, firm: "Demo Enerji A.Ş.", place: "Konya, Karapınar", by: DEMO.name });
          const ins = await headerInputs(page);
          await mark(page, ins[0], { click: true });
          await mark(page, await byText(page, "1 · Fizibilite Modeli", "button"));
        },
      },
      {
        title: "Adım 1 · PV yatırım maliyeti (CAPEX)",
        text: "Kurulu güç (MWp) ve birim EPC maliyeti ($/kWp) girilir; toplam PV CAPEX yanda formülüyle hesaplanır. Formül kutuları her sonucun nasıl bulunduğunu açıkça gösterir.",
        run: async (page) => {
          await scrollTo(page, "PV Yatırım Maliyeti (EPC CAPEX)", MODEL_OFF);
          await mark(page, await inputNear(page, "Kurulu güç"), { center: false });
          await mark(page, await inputNear(page, "Toplam EPC CAPEX"), { center: false });
        },
      },
      {
        title: "Adım 2 · Enerji üretimi",
        text: "Spesifik üretim (P50), P90 oranı, availability, curtailment ve yıllık degradasyon girilir. Model ilk yıl üretimini ve 30 yıllık üretim eğrisini bu değerlerden kurar.",
        run: async (page) => {
          await scrollTo(page, "Enerji Üretimi — P50/P90, Availability, Curtailment", MODEL_OFF);
        },
      },
      {
        title: "Adım 3 · İşletme gideri (OPEX)",
        text: "Yıllık OPEX ($/MWp), TL payı, inverter yenileme yılı ve maliyeti ile santralin ömür sonu uç değeri girilir.",
        run: async (page) => {
          await scrollTo(page, "İşletme Gideri (OPEX), Yenileme ve Uç Değer", MODEL_OFF);
        },
      },
      {
        title: "Adım 4 · Gelir ve kur–enflasyon",
        text: "Satış fiyatı modeli (YEKDEM / serbest piyasa), birim fiyat, TL ve USD enflasyonları ile kur projeksiyonu seçilir. TL gelirlerin dolar karşılığı her yıl kur farkıyla yeniden hesaplanır.",
        run: async (page) => {
          await scrollTo(page, "Gelir ve Kur–Enflasyon", MODEL_OFF);
        },
      },
      {
        title: "Adım 5 · Batarya modülü (BESS)",
        text: "İsteğe bağlı batarya: kutucuk işaretlenince kapasite, süre, birim maliyet ve arbitraj marjı girilir; batarya geliri ve yatırımı proje nakit akışına eklenir.",
        run: async (page) => {
          await scrollTo(page, "Batarya Modülü (BESS) — Opsiyonel", MODEL_OFF);
          const box = await page.evaluateHandle(() =>
            [...document.querySelectorAll("label")].find((l) => /BESS modülü dahil/i.test(l.textContent || "")),
          );
          if (box.asElement()) await mark(page, box.asElement(), { center: false });
        },
      },
      {
        title: "Adım 6 · Vergi, amortisman, KDV",
        text: "Kurumlar vergisi, amortisman süresi, vergi teşviki ve KDV iadesi girilir. Yanda yıl yıl vergi hesabı formülüyle açıklanır.",
        run: async (page) => {
          await scrollTo(page, "Vergi, Amortisman, KDV", MODEL_OFF);
        },
      },
      {
        title: "Adım 7 · İnşaat dönemi",
        text: "İnşaat süresi ve harcama profili seçilir; inşaat dönemi faizi (IDC) ve kredi çekiş takvimi buna göre hesaplanır.",
        run: async (page) => {
          await scrollTo(page, "İnşaat Dönemi", MODEL_OFF);
        },
      },
      {
        title: "Adım 8 · Borç yapısı",
        text: "Kaldıraç oranı, kredi faizi, vade, ödemesiz dönem ve hedef DSCR girilir. Kredi tutarı DSCR'ye göre boyutlanır; ödeme planı ve DSRA hesabı yanda adım adım gösterilir.",
        run: async (page) => {
          await scrollTo(page, "Borç Yapısı — Kredi Nasıl Boyutlanır, Nasıl Ödenir", MODEL_OFF);
        },
      },
      {
        title: "Kaynak–kullanım ve sonuçlar",
        text: "Kullanımlar (CAPEX, IDC, DSRA) ve kaynaklar (kredi, özkaynak) tablosunun altında temel göstergeler yer alır: NPV, proje ve özkaynak IRR'ı, LCOE, minimum ve ortalama DSCR, LLCR ve geri ödeme süresi.",
        run: async (page) => {
          await scrollTo(page, "Kaynak–Kullanım ve Sonuçlar", MODEL_OFF);
        },
      },
      {
        title: "Duyarlılık analizi",
        text: "Fiyat ve üretimdeki ±%10 değişimlerin proje IRR'ı ve minimum DSCR üzerindeki etkisi tabloda görünür; baz senaryo vurgulanır.",
        run: async (page) => {
          await scrollTo(page, "Duyarlılık — Proje IRR ve Min. DSCR", MODEL_OFF);
        },
      },
      {
        title: "Kırılma noktası (breakeven)",
        text: "NPV'yi sıfırlayan satış fiyatı, üretim ve CAPEX ile bankanın hedef DSCR'sini sağlayan en düşük değerler hesaplanır; mevcut değere göre güvenlik payı yanda yazılır.",
        run: async (page) => {
          await scrollTo(page, "Kırılma Noktası (Breakeven) Analizi", MODEL_OFF);
        },
      },
      {
        title: "Teknoloji karşılaştırması",
        text: "Sabit, bifacial, tracker ve farklı DC/AC oranları aynı tabloda karşılaştırılır: her biri için üretim, CAPEX, OPEX ile NPV, IRR ve DSCR sonuçları yan yana görünür.",
        run: async (page) => {
          await scrollTo(page, "Teknoloji Karşılaştırması — Sabit / Bifacial / Tracker / DC-AC", MODEL_OFF);
        },
      },
      {
        title: "Senaryo matrisi",
        text: "Kötümser, baz ve iyimser senaryolar fiyat, üretim, CAPEX ve kur varsayımlarıyla birlikte hesaplanır; sonuçlar tek tabloda karşılaştırılır.",
        run: async (page) => {
          await scrollTo(page, "Senaryo Matrisi — Kötümser / Baz / İyimser", MODEL_OFF);
        },
      },
      {
        title: "Kümülatif nakit akışı grafiği",
        text: "Kaldıraçsız serbest nakit akışının iskontolu kümülatif değeri yıl yıl çizilir; eğrinin sıfırı geçtiği yıl iskontolu geri ödeme süresidir.",
        run: async (page) => {
          await scrollTo(page, "Kümülatif iskontolu serbest nakit akışı", MODEL_OFF);
        },
      },
      {
        title: "İşletme dönemi nakit akışı",
        text: "30 yıllık tablo: üretim, fiyat, gelir, OPEX, EBITDA, vergi, borç servisi, serbest nakit akışı, DSCR ve kümülatif nakit yıl yıl listelenir.",
        run: async (page) => {
          await scrollTo(page, "İşletme Dönemi Nakit Akışı", MODEL_OFF);
        },
      },
      {
        title: "Borç takvimi",
        text: "Kredinin yıl yıl açılış bakiyesi, faiz, anapara, toplam borç servisi ve CFADS'a göre DSCR değeri tabloda görünür.",
        run: async (page) => {
          await scrollTo(page, "Borç Takvimi", MODEL_OFF);
        },
      },
      {
        title: "Huawei değer analizi",
        text: "İnverter seçiminin değeri: verim, arıza oranı, garanti ve servis farkları inverter bazında girilir; farkın santral ömrü boyunca iskontolu net değeri hesaplanır.",
        run: async (page) => {
          await tab(page, "2 · Huawei Değer Analizi");
          await mark(page, await byText(page, "2 · Huawei Değer Analizi", "button"), { click: true, center: false });
        },
      },
      {
        title: "Sonuçlar sekmesi",
        text: "Yatırım kuruluna sunulacak özet: proje bilgileri, temel göstergeler, kaynak–kullanım tablosu ve nakit akışı grafikleri tek sayfada.",
        run: async (page) => {
          await tab(page, "3 · Sonuçlar");
          await mark(page, await byText(page, "3 · Sonuçlar", "button"), { click: true, center: false });
        },
      },
      {
        title: "Projeyi kaydetme",
        text: "“Projeyi Kaydet” ile bütün girdiler saklanır ve proje listesine eklenir. “Rapor çıktısı al” ise sonuçları yazdırılabilir rapor olarak hazırlar.",
        run: async (page) => {
          await tab(page, "1 · Fizibilite Modeli");
          await mark(page, await byText(page, "Projeyi Kaydet", "button"), { click: true, center: false });
          await mark(page, await byText(page, "Rapor çıktısı al", "button"), { center: false });
        },
      },
    ],
  },

  {
    id: "ci",
    group: "Fizibilite Modelleri",
    title: "C&I / Mesken Saatlik Mahsuplaşma",
    intro:
      "Çatı GES'li tüketim tesisleri için EPDK 14531 saatlik mahsuplaşma modeli: tüketim profili, üretim, tarife ve finansman girilir; saat saat mahsup, fatura etkisi ve yatırım getirisi hesaplanır.",
    steps: [
      {
        title: "Abone ve yıllık tüketim",
        text: "Proje bilgilerinden sonra abone grubu, bağlantı tipi ve yıllık tüketim girilir. Hafta içi ve hafta sonu tüketimi farklıysa kutucuk işaretlenir.",
        run: async (page) => {
          await go(page, "/projects/new/ci", 1500);
          await setHeader(page, { name: NAMES.ci, firm: "Demo Tekstil A.Ş.", place: "Manisa OSB", by: DEMO.name });
          await scrollTo(page, "Tesis ve Tüketim Profili", MODEL_OFF);
        },
      },
      {
        title: "Aylık tüketim dağılımı",
        text: "Yıllık tüketimin aylara dağılımı yüzde olarak girilir (Aralık otomatik kalan). Sağdaki grafik dağılımı anında gösterir.",
        run: async (page) => {
          await scrollTo(page, "Aylık tüketim dağılımı", MODEL_OFF);
        },
      },
      {
        title: "Gün içi saatlik profil",
        text: "Seçilen ayın günlerine ve günün saatlerine dağılım girilir. Saatlik mahsuplaşmada en önemli girdi budur: üretimle tüketimin aynı saatte örtüşmesi mahsup oranını belirler.",
        run: async (page) => {
          await scrollTo(page, "Gün içi saatlik dağılım", MODEL_OFF);
        },
      },
      {
        title: "GES ve üretim",
        text: "Kurulu güç, il bazlı üretim profili, panel ve inverter verimleri, degradasyon girilir; model saatlik üretimi bu değerlerden çıkarır.",
        run: async (page) => {
          await scrollTo(page, "GES ve Üretim", MODEL_OFF);
        },
      },
      {
        title: "Tarife ve fiyatlar",
        text: "Tarife grubu, tek / üç zamanlı fiyatlar, dağıtım bedeli ve fazla üretimin satış fiyatı girilir.",
        run: async (page) => {
          await scrollTo(page, "Tarife ve Fiyatlar", MODEL_OFF);
        },
      },
      {
        title: "Batarya (BESS)",
        text: "İsteğe bağlı: tüketim tesisine batarya eklenirse kapasite ve maliyet girilir; fazla üretim akşam saatlerine kaydırılarak mahsup oranı artırılır.",
        run: async (page) => {
          await scrollTo(page, "Batarya (BESS)", MODEL_OFF);
        },
      },
      {
        title: "Yatırım ve finansman",
        text: "Yatırım tutarı, özkaynak / kredi oranı, faiz, vade, iskonto oranı ve kur varsayımları girilir.",
        run: async (page) => {
          await scrollTo(page, "Yatırım ve Finansman", MODEL_OFF);
        },
      },
      {
        title: "Saatlik mahsuplaşma motoru",
        text: "Mahsuplaşma sekmesi: her ay ve gün tipi için saat saat üretim, tüketim, mahsup edilen ve şebekeye verilen enerji. Bir döneme tıklayınca ayrıntısı açılır.",
        run: async (page) => {
          await tab(page, "2 · Mahsuplaşma");
          await mark(page, await byText(page, "2 · Mahsuplaşma", "button"), { click: true, center: false });
        },
      },
      {
        title: "Enerji akışı",
        text: "Enerjinin nereden gelip nereye gittiği: GES'ten doğrudan tüketim, mahsup, bedelli satış ve şebekeden çekiş miktarları akış şemasında gösterilir.",
        run: async (page) => {
          await scrollTo(page, "Enerji akışı", MODEL_OFF);
        },
      },
      {
        title: "Bedelli üretim limiti",
        text: "Yönetmelikteki bedelli üretim sınırı ve projenizin bu sınıra göre durumu: limit aşılırsa fazla üretim bedelsiz kalır.",
        run: async (page) => {
          await scrollTo(page, "Bedelli üretim limiti", MODEL_OFF);
        },
      },
      {
        title: "Saatlik veri",
        text: "Seçilen ayın temsili gününde üretim ve tüketim saat saat karşılaştırılır; altta gün, ay ve yıl toplamları bulunur.",
        run: async (page) => {
          await tab(page, "3 · Saatlik Veri");
          await mark(page, await byText(page, "3 · Saatlik Veri", "button"), { click: true, center: false });
        },
      },
      {
        title: "Fatura analizi",
        text: "Mevcut operasyon ile GES'li operasyonun aktif enerji faturası karşılaştırılır: yıl-1 özeti ve 12 aylık kırılım.",
        run: async (page) => {
          await tab(page, "4 · Fatura Analizi");
          await mark(page, await byText(page, "4 · Fatura Analizi", "button"), { click: true, center: false });
        },
      },
      {
        title: "Saatlik vs aylık mahsuplaşma",
        text: "Eski (aylık) ve yeni (saatlik) rejimin farkı formülleriyle açıklanır; altta sizin projenizin iki rejimdeki sonucu yan yana görünür.",
        run: async (page) => {
          await tab(page, "5 · Saatlik vs Aylık");
          await mark(page, await byText(page, "5 · Saatlik vs Aylık", "button"), { click: true, center: false });
        },
      },
      {
        title: "Projenizin iki rejimdeki sonucu",
        text: "Aylık ve saatlik mahsuplaşmada yıllık tasarruf, mahsup oranı ve geri ödeme süresi karşılaştırılır.",
        run: async (page) => {
          await scrollTo(page, "Senin Projen: Saatlik vs Aylık", MODEL_OFF);
        },
      },
      {
        title: "Sonuçlar",
        text: "Özet göstergeler, aylık mahsup / bedelli / çekiş dağılımı ve kümülatif iskontolu nakit akışı. Sıfır geçişi iskontolu geri ödeme süresidir.",
        run: async (page) => {
          await tab(page, "6 · Sonuçlar");
          await mark(page, await byText(page, "6 · Sonuçlar", "button"), { click: true, center: false });
        },
      },
      {
        title: "Kaydetme",
        text: "“Projeyi Kaydet” ile proje saklanır; daha sonra Projeler listesinden açılıp güncellenebilir.",
        run: async (page) => {
          await tab(page, "1 · Fizibilite Modeli");
          await mark(page, await byText(page, "Projeyi Kaydet", "button"), { click: true, center: false });
        },
      },
    ],
  },

  {
    id: "bess-ci",
    group: "Fizibilite Modelleri",
    title: "Batarya Ekleme · C&I / Mesken",
    intro:
      "Mevcut GES'li tüketim tesisine batarya eklemenin fizibilitesi: güneş fazlasını akşama kaydırma, tarife arbitrajı, zirve tıraşlama ve kesinti yedeklemesinden gelen tasarruf hesaplanır.",
    steps: [
      {
        title: "Kullanım şekilleri",
        text: "Bataryanın hangi amaçlarla kullanılacağı seçilir: güneş fazlasını akşama kaydırma, gece şarj / puant deşarj arbitrajı, güç bedelini düşüren zirve tıraşlama ve kesinti yedeklemesi.",
        run: async (page) => {
          await go(page, "/projects/new/bess-ci", 1500);
          await setHeader(page, { name: NAMES.bessCi, firm: "Demo Gıda A.Ş.", place: "Kayseri", by: DEMO.name });
          await scrollTo(page, "Bataryayı nasıl kullanacaksınız?", MODEL_OFF);
        },
      },
      {
        title: "Mevcut GES ve tüketim",
        text: "Tesisin mevcut GES gücü, yıllık üretimi ve tüketimi ile tüketim profili girilir.",
        run: async (page) => {
          await scrollTo(page, "Mevcut GES ve tüketim", MODEL_OFF);
        },
      },
      {
        title: "Tarife ve fiyatlar",
        text: "Zaman dilimli tarife fiyatları, güç bedeli ve fazla üretimin satış fiyatı girilir.",
        run: async (page) => {
          await scrollTo(page, "Tarife ve fiyatlar", MODEL_OFF);
        },
      },
      {
        title: "Batarya",
        text: "Batarya kapasitesi (kWh), gücü (C-oranı), verimi, deşarj derinliği ve birim maliyeti girilir.",
        run: async (page) => {
          await scrollTo(page, "Batarya", MODEL_OFF);
        },
      },
      {
        title: "Sonuçlar",
        text: "Yıllık kazancın kullanım şekillerine göre kırılımı, Temmuz ve Ocak için tipik gün şarj/deşarj grafiği ile kümülatif ve yıllık nakit akışı.",
        run: async (page) => {
          await tab(page, "2 · Sonuçlar");
          await mark(page, await byText(page, "2 · Sonuçlar", "button"), { click: true, center: false });
        },
      },
      {
        title: "Tipik gün",
        text: "Bataryanın gün içinde ne zaman şarj, ne zaman deşarj olduğu saat saat görünür; yaz ve kış günleri ayrı ayrı çizilir.",
        run: async (page) => {
          await scrollTo(page, "Tipik gün — Temmuz", MODEL_OFF);
        },
      },
      {
        title: "Boyut optimizasyonu",
        text: "Farklı kapasite ve C-oranı kombinasyonları aynı fiyatlarla denenir; en yüksek NPV'yi veren boyut işaretlenir.",
        run: async (page) => {
          await tab(page, "3 · Optimizasyon");
          await mark(page, await byText(page, "3 · Optimizasyon", "button"), { click: true, center: false });
        },
      },
      {
        title: "Kullanım analizi",
        text: "Aynı batarya farklı kullanım şekilleriyle (tek tek ve birlikte) karşılaştırılır; hangi kullanımın ne kadar değer kattığı görünür.",
        run: async (page) => {
          await tab(page, "4 · Kullanım analizi");
          await mark(page, await byText(page, "4 · Kullanım analizi", "button"), { click: true, center: false });
        },
      },
    ],
  },

  {
    id: "bess-utility",
    group: "Fizibilite Modelleri",
    title: "Batarya Ekleme · Utility",
    intro:
      "Lisanslı GES santraline batarya eklemenin fizibilitesi: kırpılan üretimi kurtarma, PTF arbitrajı, yan hizmetler ve dengesizlik maliyeti; batarya sağlığı ve kapasite şartıyla birlikte.",
    steps: [
      {
        title: "Kullanım şekilleri",
        text: "Gelir kaynakları seçilir: kırpılan (curtailment) üretimi kurtarma, öğle–akşam PTF arbitrajı, TEİAŞ yan hizmetleri (PFK / SFK) ve dengesizlik maliyetini azaltma.",
        run: async (page) => {
          await go(page, "/projects/new/bess-utility", 1500);
          await setHeader(page, { name: NAMES.bessUtility, firm: "Demo Enerji Üretim A.Ş.", place: "Aksaray", by: DEMO.name });
          await scrollTo(page, "Bataryayı nasıl kullanacaksınız?", MODEL_OFF);
        },
      },
      {
        title: "Mevcut santral",
        text: "Santralin DC / AC gücü, yıllık üretimi, kırpılan enerji oranı ve YEKDEM bitiş yılı girilir.",
        run: async (page) => {
          await scrollTo(page, "Mevcut santral", MODEL_OFF);
        },
      },
      {
        title: "Fiyatlar",
        text: "PTF profili, YEKDEM fiyatı, yan hizmet bedelleri ve dengesizlik maliyeti girilir.",
        run: async (page) => {
          await scrollTo(page, "Fiyatlar", MODEL_OFF);
        },
      },
      {
        title: "Batarya ve finansal varsayımlar",
        text: "Batarya kapasitesi, süresi, verimi, yıllık kapasite kaybı ve maliyeti ile iskonto oranı, vergi ve kur varsayımları girilir.",
        run: async (page) => {
          await scrollTo(page, "Batarya", MODEL_OFF);
        },
      },
      {
        title: "Sonuçlar · gelir kırılımı",
        text: "Birinci yıl gelirinin kaynaklara göre dağılımı ve 15 yıllık toplam gelir. YEKDEM bitip serbest piyasaya geçilen yıl ayrıca gösterilir.",
        run: async (page) => {
          await tab(page, "2 · Sonuçlar");
          await mark(page, await byText(page, "2 · Sonuçlar", "button"), { click: true, center: false });
        },
      },
      {
        title: "Tipik gün",
        text: "Yaz ve kış günü için üretim, kırpılan enerji, batarya şarj/deşarjı ve şebekeye verilen enerji saat saat çizilir.",
        run: async (page) => {
          await scrollTo(page, "Tipik gün — Temmuz", MODEL_OFF);
        },
      },
      {
        title: "Batarya sağlığı (SOH)",
        text: "Bataryanın yıl sonu sağlığı ve beyan edilen kapasiteye oranı çizilir; sözleşmedeki kapasite şartının hangi yıl riske girdiği görünür.",
        run: async (page) => {
          await scrollTo(page, "Batarya sağlığı (SOH)", MODEL_OFF);
        },
      },
      {
        title: "Nakit akışı",
        text: "Kümülatif ve yıllık nakit akışı grafikleri: yatırım, gelir, OPEX ve kapasite takviyesi harcamaları dahil.",
        run: async (page) => {
          await scrollTo(page, "Kümülatif nakit akışı", MODEL_OFF);
        },
      },
      {
        title: "Boyut optimizasyonu",
        text: "Kapasite ve C-oranı kombinasyonları denenir; NPV ve IRR'ı en yüksek boyut öne çıkarılır.",
        run: async (page) => {
          await tab(page, "3 · Optimizasyon");
          await mark(page, await byText(page, "3 · Optimizasyon", "button"), { click: true, center: false });
        },
      },
      {
        title: "Kullanım analizi",
        text: "Gelir kaynaklarının kombinasyonları, YEKDEM süresi, yan hizmet payı, arbitraj ve DC artırma seçenekleri karşılaştırılır.",
        run: async (page) => {
          await tab(page, "4 · Kullanım analizi");
          await mark(page, await byText(page, "4 · Kullanım analizi", "button"), { click: true, center: false });
        },
      },
      {
        title: "Sağlık şartı stratejisi",
        text: "5. yılda %90, 10. yılda %80 kapasite şartını en ucuza sağlamanın yolları karşılaştırılır: baştan fazla kapasite, ara takviye veya hücre değişimi.",
        run: async (page) => {
          await tab(page, "5 · Sağlık şartı stratejisi");
          await mark(page, await byText(page, "5 · Sağlık şartı stratejisi", "button"), { click: true, center: false });
        },
      },
    ],
  },

  {
    id: "projeler",
    group: "Projeler ve Paylaşım",
    title: "Projeler ve Paylaşım Linkleri",
    intro:
      "Kaydedilen projeler listelenir, açılıp güncellenir. Paylaşım linkiyle bir projenin raporu giriş yapmadan görüntülenebilir hâlde gönderilir.",
    steps: [
      {
        title: "Proje listesi",
        text: "Bütün projeler model türü, kayıt tarihi ve temel sonuçlarıyla listelenir. Bir projeye tıklayınca model, kaydedilen girdilerle açılır.",
        run: async (page) => {
          await go(page, "/projects", 1200);
          await mark(page, await byText(page, NAMES.utility, "main a, main td, main div, main span"));
        },
      },
      {
        title: "Kayıtlı projeyi açma",
        text: "Kayıtlı proje açıldığında girdiler yerindedir; değişiklik yapıp “Güncelle & Kaydet” ile saklayabilir, gerekmiyorsa projeyi silebilirsiniz.",
        run: async (page) => {
          await go(page, "/projects", 1000);
          await press(page, await byText(page, NAMES.ci, "main a, main td, main div, main span"), 2500);
          await mark(page, await byText(page, "Güncelle & Kaydet", "button"), { center: false });
        },
      },
      {
        title: "Paylaşım linkleri",
        text: "Paylaşım Linkleri sayfasında oluşturduğunuz linkler, süreleri ve durumlarıyla listelenir. “Link Oluştur” ile yeni link hazırlanır.",
        run: async (page) => {
          await go(page, "/admin/share", 1000);
          await mark(page, await byText(page, "Link Oluştur", "button"), { click: true });
        },
      },
      {
        title: "Link oluşturma",
        text: "Paylaşılacak proje ve linkin geçerlilik süresi (7, 30, 90 gün veya süresiz) seçilir. Link, projenin o andaki girdilerini taşır; açan kişi raporu yeniden hesaplanmış olarak görür.",
        run: async (page) => {
          await go(page, "/admin/share", 800);
          await press(page, await byText(page, "Link Oluştur", "button"), 800);
          // Proje seçimi (yerel select): Utility projesi
          const sel = await page.$("[role=dialog] select");
          const val = await sel.evaluate(
            (s, name) => [...s.options].find((o) => o.textContent.includes(name))?.value ?? "",
            NAMES.utility,
          );
          await page.select("[role=dialog] select", val);
          await sleep(300);
          await mark(page, sel, { center: false });
        },
      },
      {
        title: "Link hazır",
        text: "Link oluşunca gönderme penceresi açılır: link tek tıkla kopyalanır ya da e-posta, WhatsApp, SMS veya karekodla gönderilir. Link, Paylaşım Linkleri listesine de eklenir.",
        run: async (page) => {
          const create = await modalButton(page, "Link oluştur");
          await create.click();
          await settle(page, 1500);
          const copy = await modalButton(page, "Kopyala").catch(() => null);
          if (copy) await mark(page, copy, { center: false });
        },
      },
      {
        title: "Paylaşılan rapor",
        text: "Linki açan kişi giriş yapmadan proje raporunu görür: proje bilgileri, temel göstergeler ve grafikler. Girdiler değiştirilemez.",
        guest: true,
        run: async (page) => {
          const href = await pages.main.evaluate(() => {
            const a = [...document.querySelectorAll("[role=dialog] input, a[href*='/p'], input")].map((n) => n.value || n.href).find((v) => v && /\/p[#?/]/.test(v));
            return a || null;
          });
          await pages.main.keyboard.press("Escape").catch(() => {});
          if (!href) throw new Error("Paylaşım linki bulunamadı");
          await page.goto(href, { waitUntil: "domcontentloaded" });
          await settle(page, 2500);
        },
      },
    ],
  },

  {
    id: "ekip",
    group: "Yönetim",
    title: "Ekip ve Hesap",
    intro: "Ekibinizi platforma davet eder, rollerini (Yönetici, Kullanıcı, Görüntüleyici) belirlersiniz. Hesabım sayfasında ad, şifre ve verileriniz yönetilir.",
    steps: [
      {
        title: "Kullanıcılar",
        text: "Ekipteki kişiler rolleriyle listelenir; üstteki sekmelerle role göre süzülür, arama kutusuyla isim veya e-postaya göre bulunur.",
        run: async (page) => {
          await go(page, "/admin/users", 1000);
          await mark(page, await byText(page, "Kişi davet et", "button"));
        },
      },
      {
        title: "Kişi davet etme",
        text: "“Kişi davet et” ile e-posta ve rol girilir. Yönetici her şeyi, Kullanıcı proje oluşturup düzenlemeyi, Görüntüleyici yalnız okumayı yapabilir.",
        run: async (page) => {
          await go(page, "/admin/users", 800);
          await press(page, await byText(page, "Kişi davet et", "button"), 800);
          const email = await page.$("[role=dialog] input[type=email], .fixed input[type=email]");
          if (email) {
            await fill(page, email, "ayse.kaya@demo-enerji.example");
            await mark(page, email, { center: false });
          }
        },
        after: async (page) => page.keyboard.press("Escape"),
      },
      {
        title: "Hesabım",
        text: "Ad soyad ve şifre güncellenir; verilerinizi indirebilir veya hesabınızı silebilirsiniz.",
        run: async (page) => {
          await go(page, "/admin/account", 1000);
        },
      },
    ],
  },

  {
    id: "bilgi",
    group: "Destek",
    title: "Bilgi Merkezi",
    intro: "Modellerin arkasındaki kavramlar: saatlik mahsuplaşmanın mantığı, saatlik ve aylık rejim farkı, finansal terimler sözlüğü ve platformun nasıl çalıştığı.",
    steps: [
      {
        title: "Mahsuplaşma 101",
        text: "Saatlik mahsuplaşma örneklerle anlatılır: ofis, üç vardiyalı fabrika ve otel profilleri için üretim–tüketim uyumu ve mahsup oranı.",
        run: async (page) => {
          await go(page, "/about/netting-methodology", 1200);
        },
      },
      {
        title: "Örnek profiller",
        text: "Bir örneğe tıklayınca o profilin saatlik grafiği ve mahsuplaşma sonucu açılır.",
        run: async (page) => {
          await go(page, "/about/netting-methodology", 1000);
          const b = await byText(page, "Fabrika 3 vardiya", "button");
          await press(page, b, 800);
          await mark(page, b, { click: true });
        },
      },
      {
        title: "Saatlik vs aylık",
        text: "Aynı tesis için saatlik ve aylık mahsuplaşmanın sonuçları karşılaştırılır; farkın nereden geldiği adım adım gösterilir.",
        run: async (page) => {
          await go(page, "/about/netting-comparison", 1200);
        },
      },
      {
        title: "Finansal terimler",
        text: "DSCR, NPV, IRR, EBITDA, cash waterfall gibi 80'i aşkın terim kategorilere ayrılmış olarak açıklanır.",
        run: async (page) => {
          await go(page, "/admin/financial-terms", 1000);
        },
      },
      {
        title: "Terim arama",
        text: "Arama kutusuna terimi yazınca liste anında süzülür.",
        run: async (page) => {
          await go(page, "/admin/financial-terms", 800);
          const s = await page.$('input[placeholder^="Terim ara"]');
          await fill(page, s, "DSCR");
          await sleep(500);
          await mark(page, s, { click: true });
        },
      },
      {
        title: "Nasıl çalışır",
        text: "Platformun işleyişi, modellerin hesap mantığı ve verilerin nerede saklandığı özetlenir.",
        run: async (page) => {
          await go(page, "/admin/how-it-works", 1000);
        },
      },
    ],
  },

  {
    id: "destek",
    group: "Destek",
    title: "İletişim ve Platformlarım",
    intro: "Hata bildirimi, öneri ve sorular İletişime Geç sayfasından gönderilir. Platformlarım bölümünden bu tanıtıma ve diğer platformlara geçilir.",
    steps: [
      {
        title: "İletişime geç",
        text: "Konu türü (geri bildirim, hata, öneri, soru) seçilir, konu ve mesaj yazılır; mesaj e-posta uygulamanızda taslak olarak açılır.",
        run: async (page) => {
          await go(page, "/admin/contact", 1000);
          await fill(page, "#c-subject", "Rapor çıktısında logo");
          await fill(page, "#c-message", "Rapor kapağına firma logosu eklenebilir mi?");
          await mark(page, "#c-message" && (await page.$("#c-message")));
        },
      },
      {
        title: "Platformlarım",
        text: "Sol menüdeki Platformlarım bölümünden bu tanıtıma ve teklif, proje yönetimi, satınalma karar destek ve konstrüksiyon BoM platformlarına geçilir.",
        run: async (page) => {
          await go(page, "/admin/platforms", 1000);
          await mark(page, await byText(page, "Platform Tanıtımı", "aside a, nav a, a"));
        },
      },
    ],
  },
];

// ---------------------------------------------------------------- çalıştır
const { browser, page } = await launch({ width: VW, height: VH });
await page.evaluateOnNewDocument(() => {
  window.print = () => {};
});
const guestCtx = await browser.createBrowserContext();
const guest = await guestCtx.newPage();
autoDialogs(guest);
await noSmoothScroll(guest);
await guest.setViewport({ width: VW, height: VH, deviceScaleFactor: Number(process.env.TOUR_DPR || 2) });
guest.setDefaultTimeout(45_000);
const pages = { main: page, guest };

try {
  // Demo hesap + dört kayıtlı proje (localStorage)
  await go(page, "/register", 800);
  await fill(page, "#name", DEMO.name);
  await fill(page, "#email", DEMO.email);
  await fill(page, "#password", DEMO.password);
  await fill(page, "#password2", DEMO.password);
  await (await byText(page, "Kayıt Ol", "button")).click();
  await sleep(2500);
  const seed = [
    ["/projects/new/utility", NAMES.utility, "Demo Enerji A.Ş.", "Konya, Karapınar"],
    ["/projects/new/ci", NAMES.ci, "Demo Tekstil A.Ş.", "Manisa OSB"],
    ["/projects/new/bess-ci", NAMES.bessCi, "Demo Gıda A.Ş.", "Kayseri"],
    ["/projects/new/bess-utility", NAMES.bessUtility, "Demo Enerji Üretim A.Ş.", "Aksaray"],
  ];
  for (const [url, name, firm, place] of seed) {
    await go(page, url, 1500);
    await setHeader(page, { name, firm, place, by: DEMO.name });
    await saveProject(page);
    console.log("kaydedildi:", name, page.url());
  }

  await runTour({
    modules: MODULES,
    pages,
    manifest: MANIFEST,
    only: process.argv.slice(2),
    hide: ["div.fixed.top-20.right-4"],
  });
} finally {
  await browser.close();
}
