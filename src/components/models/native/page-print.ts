/**
 * Sayfa PDF — model ekranındaki AKTİF sekmeyi (başlık bandıyla birlikte) tek başına yazdırır.
 * Tarayıcının yazdır penceresinde "PDF olarak kaydet" seçilerek PDF alınır.
 * Tüm fizibilite modelleri (Utility, C&I, Mesken, Batarya) TabActions üzerinden kullanır.
 */
export function printActivePage(from: HTMLElement) {
  const root = from.closest('.mdl') as HTMLElement | null;
  const tab = root?.querySelector('.m-main .tab.active') as HTMLElement | null;
  if (!root || !tab) return;

  const header = root.querySelector('.m-header') as HTMLElement | null;
  const tabName = (root.querySelector('.m-tabs nav .active')?.textContent ?? '').trim();

  // Kopya — rapor görünümü: form kontrolleri girilen değerin düz metnine dönüşür
  const copy = tab.cloneNode(true) as HTMLElement;
  const src = tab.querySelectorAll('input, select, textarea');
  const dst = copy.querySelectorAll('input, select, textarea');
  src.forEach((el, i) => {
    const d = dst[i];
    if (!d) return;
    const val = document.createElement('span');
    val.className = 'pp-val' + (d.classList.contains('rem') || d.classList.contains('remz') ? ' rem' : '');
    if (el instanceof HTMLInputElement) {
      if (el.type === 'checkbox' || el.type === 'radio') {
        if (el.type === 'radio' && !el.checked) {
          // seçilmemiş seçenek gösterilmez
          const lbl = d.closest('label');
          (lbl ?? d).remove();
          return;
        }
        val.className = 'pp-check';
        val.textContent = el.checked ? '☑' : '☐';
      } else if (el.type === 'hidden') {
        d.remove();
        return;
      } else val.textContent = el.value === '' ? (el.placeholder ? '—' : '') : el.value;
    } else if (el instanceof HTMLSelectElement) {
      val.textContent = el.options[el.selectedIndex]?.text ?? '';
    } else if (el instanceof HTMLTextAreaElement) {
      val.classList.add('pp-text');
      val.textContent = el.value || '—';
    }
    d.replaceWith(val);
  });
  // Düğmeler: seçenek gruplarında yalnız seçili olan etiket olarak kalır; eylem düğmeleri çıkar
  copy.querySelectorAll('button').forEach((b) => {
    const on = b.classList.contains('active') || b.getAttribute('aria-pressed') === 'true' || b.getAttribute('aria-selected') === 'true';
    const txt = (b.textContent ?? '').trim();
    if (!on || !txt) { b.remove(); return; }
    const chip = document.createElement('span');
    chip.className = 'pp-chip';
    chip.textContent = txt;
    b.replaceWith(chip);
  });
  copy.querySelectorAll('.chips, .tab-actions').forEach((c) => { if (!c.textContent?.trim()) c.remove(); });
  // Grafik kartı başlığıyla birlikte aynı sayfada kalsın (tablo/ızgara içeren uzun kartlar bölünebilir)
  copy.querySelectorAll('.card, .chartcard').forEach((c) => {
    if (c.querySelector('svg') && !c.querySelector('table, .hgrid, .card, .chartcard')) c.classList.add('pp-keep');
  });
  // SVG id çakışması: gradyan/klip id'leri gizli orijinalde de var → kopyada yeniden adlandır
  const ids = new Map<string, string>();
  copy.querySelectorAll('[id]').forEach((el) => { const nid = el.id + '-pp'; ids.set(el.id, nid); el.id = nid; });
  if (ids.size) copy.querySelectorAll('*').forEach((el) => {
    for (const at of Array.from(el.attributes)) {
      if (!at.value.includes('#')) continue;
      const v = at.value.replace(/url\(#([^)]+)\)/g, (m, id) => (ids.has(id) ? `url(#${ids.get(id)})` : m)).replace(/^#(.+)$/, (m, id) => (ids.has(id) ? `#${ids.get(id)}` : m));
      if (v !== at.value) el.setAttribute(at.name, v);
    }
  });
  // Kapalı açılır bölümler PDF'te açık görünsün
  copy.querySelectorAll('details').forEach((d) => d.setAttribute('open', ''));

  const host = document.createElement('div');
  host.id = 'mdl-page-print';
  const wrap = document.createElement('div');
  wrap.className = root.className + ' page-print';
  if (header) wrap.appendChild(header.cloneNode(true));
  if (tabName) {
    const t = document.createElement('div');
    t.className = 'pp-tabname';
    t.textContent = tabName;
    wrap.appendChild(t);
  }
  const main = document.createElement('div');
  main.className = 'm-main';
  main.appendChild(copy);
  wrap.appendChild(main);
  host.appendChild(wrap);
  document.body.appendChild(host);

  // Gece modunda da açık renkli PDF
  const html = document.documentElement;
  const wasDark = html.classList.contains('dark');
  if (wasDark) html.classList.remove('dark');
  document.body.classList.add('mdl-page-printing');

  let done = false;
  const cleanup = () => {
    if (done) return;
    done = true;
    document.body.classList.remove('mdl-page-printing');
    if (wasDark) html.classList.add('dark');
    host.remove();
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  setTimeout(() => {
    window.print();
    // Bazı tarayıcılar afterprint göndermez
    setTimeout(cleanup, 1500);
  }, 80);
}
