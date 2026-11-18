/**
 * Tanıtım çekim motoru — bütün platformlarda aynı dosya.
 *
 * Senaryo: bölümler (modules) → adımlar (steps). Her adım bir işlem (tıkla / doldur / kaydet) yapar,
 * `mark()` ile işaretlenen elemanlar tanıtımda kırmızı çerçeve, `{ click: true }` olan imleçle
 * gösterilir. Görüntüler kayıpsız WebP (2x) kaydedilir; lib/tanitim/manifest.json yazılır.
 * Bir adım hata verirse atlanır ve sonda raporlanır.
 */
import fs from "node:fs";
import path from "node:path";
import { byText, saveLossless, settle, sleep, OUT } from "./lib.mjs";

export const VW = 1440;
export const VH = 900;

let marks = [];
let cursor = null;

/** Elemanı işaretle (çerçeve). `click: true` → imleç de bu elemanın üstünde gösterilir. */
export async function mark(page, target, { click = false, center = true } = {}) {
  const el = typeof target === "string" ? await byText(page, target) : target;
  if (!el) throw new Error("İşaretlenecek eleman yok");
  if (center) {
    await el.evaluate((n) => {
      const r = n.getBoundingClientRect();
      if (r.top < 80 || r.bottom > innerHeight - 20) n.scrollIntoView({ block: "center", inline: "nearest" });
    });
    await sleep(250);
  }
  marks.push(el);
  if (click) cursor = el;
  return el;
}

async function rectOf(el) {
  const r = await el.evaluate((n) => {
    const b = n.getBoundingClientRect();
    return { x: b.left, y: b.top, w: b.width, h: b.height };
  });
  const pad = 4;
  const x = Math.max(0, r.x - pad), y = Math.max(0, r.y - pad);
  const w = Math.min(VW - x, r.w + pad * 2), h = Math.min(VH - y, r.h + pad * 2);
  if (w <= 0 || h <= 0 || y >= VH) return null;
  const pct = (v, t) => Math.round((v / t) * 10000) / 100;
  return { x: pct(x, VW), y: pct(y, VH), w: pct(w, VW), h: pct(h, VH) };
}

/** Elemana tıkla ve sayfanın oturmasını bekle. */
export async function press(page, target, wait = 600) {
  const el = typeof target === "string" ? await byText(page, target) : target;
  await el.evaluate((n) => n.scrollIntoView({ block: "center" }));
  await el.click();
  await settle(page, wait);
  return el;
}

/**
 * Başlığı (veya elemanı) ekranın üstüne getir. `offset`: üstteki sabit çubukların yüksekliği.
 * Başlık metni tam eşleşmezse içeren ilk görünür başlık alınır.
 */
export async function scrollTo(page, target, offset = 76) {
  const el =
    typeof target === "string"
      ? await byText(page, target, "h1, h2, h3, h4, h5, p, span, div, label, button, a, th, td, summary")
      : target;
  await el.evaluate((n, off) => {
    const y = n.getBoundingClientRect().top + window.scrollY - off;
    window.scrollTo(0, Math.max(0, y));
  }, offset);
  await sleep(450);
  return el;
}
export const toTop = (page) => page.evaluate(() => window.scrollTo(0, 0));

/** Açık penceredeki (en üstteki sabit katman) düğme. */
export async function modalButton(page, text, timeout = 8000) {
  const end = Date.now() + timeout;
  for (;;) {
    const h = await page.evaluateHandle((t) => {
      const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
      const layers = [...document.querySelectorAll("[role=dialog], .fixed")].filter((n) => {
        const r = n.getBoundingClientRect();
        return r.width > 200 && r.height > 150 && getComputedStyle(n).position === "fixed";
      });
      for (const layer of layers.reverse()) {
        const b = [...layer.querySelectorAll("button")].find((x) => norm(x.textContent) === t);
        if (b) return b;
      }
      return null;
    }, text);
    const el = h.asElement();
    if (el) return el;
    if (Date.now() > end) throw new Error(`Pencere düğmesi bulunamadı: "${text}"`);
    await sleep(300);
  }
}

/** Tabloda / listede metni içeren satırdaki düğme. */
export async function rowButton(page, rowText, buttonText) {
  const h = await page.evaluateHandle(
    (rt, bt) => {
      const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
      const rows = [...document.querySelectorAll("tr, li, [role=row]")].filter((r) => r.textContent.includes(rt));
      for (const row of rows) {
        const b = [...row.querySelectorAll("button, a")].find(
          (x) => norm(x.textContent) === bt || x.getAttribute("aria-label") === bt || x.title === bt,
        );
        if (b) return b;
      }
      return null;
    },
    rowText,
    buttonText,
  );
  const el = h.asElement();
  if (!el) throw new Error(`Satır düğmesi bulunamadı: ${rowText} / ${buttonText}`);
  return el;
}

/**
 * Senaryoyu çalıştır. `pages`: { main, guest } (guest: oturumsuz bağlam). Adımda `guest: true`
 * olan görüntü oturumsuz bağlamdan alınır. `hide`: görüntüden önce gizlenecek seçiciler.
 */
export async function runTour({ modules, pages, manifest, only = [], hide = [] }) {
  const prev = fs.existsSync(manifest) ? JSON.parse(fs.readFileSync(manifest, "utf8")) : { modules: [] };
  const result = { generatedAt: new Date().toISOString(), viewport: { w: VW, h: VH }, modules: [] };
  const failures = [];
  const write = () => {
    const byId = new Map([...prev.modules, ...result.modules].map((m) => [m.id, m]));
    const mods = modules.map((m) => byId.get(m.id)).filter(Boolean);
    fs.mkdirSync(path.dirname(manifest), { recursive: true });
    fs.writeFileSync(manifest, JSON.stringify({ ...result, modules: mods }, null, 1));
    return mods;
  };

  for (const mod of modules) {
    if (only.length && !only.includes(mod.id)) {
      const old = prev.modules.find((m) => m.id === mod.id);
      if (old) result.modules.push(old);
      continue;
    }
    console.log(`\n=== ${mod.title}`);
    const steps = [];
    for (const [i, st] of mod.steps.entries()) {
      const pg = st.guest ? pages.guest : pages.main;
      marks = [];
      cursor = null;
      const name = `${mod.id}-${String(i + 1).padStart(2, "0")}`;
      try {
        await st.run(pg);
        await settle(pg, 300);
        const rects = [];
        for (const m of marks) {
          const r = await rectOf(m).catch(() => null);
          if (r) rects.push(r);
        }
        const cur = cursor ? await rectOf(cursor).catch(() => null) : null;
        // Fare kenara: üzerinde durduğu elemanın ipucu balonu görüntüye girmesin
        if (!st.keepHover) await pg.mouse.move(2, VH - 2).catch(() => {});
        await sleep(150);
        // Bildirim (toast) yalnız `toast: true` adımlarda görünür
        const hidden = st.toast ? [] : hide;
        await pg.evaluate((sel) => {
          document.querySelectorAll("nextjs-portal").forEach((n) => (n.style.display = "none"));
          for (const s of sel) document.querySelectorAll(s).forEach((n) => (n.style.visibility = "hidden"));
        }, hidden);
        fs.mkdirSync(OUT, { recursive: true });
        await saveLossless(await pg.screenshot({ type: "png" }), path.join(OUT, `${name}.webp`));
        await pg.evaluate((sel) => {
          for (const s of sel) document.querySelectorAll(s).forEach((n) => (n.style.visibility = ""));
        }, hide);
        steps.push({
          img: `/tanitim/${name}.webp`,
          title: st.title,
          text: st.text,
          marks: rects,
          cursor: cur ? { x: Math.round((cur.x + cur.w / 2) * 100) / 100, y: Math.round((cur.y + cur.h / 2) * 100) / 100 } : null,
        });
        console.log("✓", name, st.title);
      } catch (e) {
        failures.push(`${name} ${st.title}: ${String(e.message || e).split("\n")[0]}`);
        console.log("✗", name, st.title, "—", String(e.message || e).split("\n")[0]);
      }
      if (st.after) await st.after(pg).catch(() => {});
    }
    result.modules.push({ id: mod.id, group: mod.group, title: mod.title, intro: mod.intro, steps });
    write();
    console.log(`--- bölüm bitti: ${mod.id} (${steps.length}/${mod.steps.length})`);
  }
  const all = write();
  const total = all.reduce((s, m) => s + m.steps.length, 0);
  console.log(`\nManifest: ${total} adım, ${all.length} bölüm`);
  if (failures.length) console.log(`\nAtlanan ${failures.length} adım:\n` + failures.join("\n"));
  return { total, failures };
}
