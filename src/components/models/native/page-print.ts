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

  // Kopya: girilmiş değerler (input/select/textarea) da görünsün
  const copy = tab.cloneNode(true) as HTMLElement;
  const src = tab.querySelectorAll('input, select, textarea');
  const dst = copy.querySelectorAll('input, select, textarea');
  src.forEach((el, i) => {
    const d = dst[i];
    if (!d) return;
    if (el instanceof HTMLInputElement && d instanceof HTMLInputElement) {
      if (el.type === 'checkbox' || el.type === 'radio') {
        if (el.checked) d.setAttribute('checked', '');
        else d.removeAttribute('checked');
      } else d.setAttribute('value', el.value);
    } else if (el instanceof HTMLSelectElement && d instanceof HTMLSelectElement) {
      Array.from(d.options).forEach((o, k) => (o.selected = k === el.selectedIndex));
      d.options[el.selectedIndex]?.setAttribute('selected', '');
    } else if (el instanceof HTMLTextAreaElement && d instanceof HTMLTextAreaElement) {
      d.textContent = el.value;
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
