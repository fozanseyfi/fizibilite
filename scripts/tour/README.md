# Platform tanıtımı — ekran çekimi

Tanıtım sayfası (`/tanitim`, `/platform-tanitimi`) `public/tanitim/*.webp` görüntülerini ve
`src/lib/tanitim/manifest.json` dosyasını kullanır. İkisi de `scripts/tour/capture.mjs` ile üretilir.

1. `npx next dev -p 4100`
2. `node scripts/tour/capture.mjs [bölüm-id ...]` — bölüm verilmezse hepsi çekilir.

Hesaplar ve projeler tarayıcıda (localStorage) tutulduğu için demo hesap ve dört örnek proje çekimin
başında arayüzden oluşturulur. Görüntüler 1440×900, 2× (2880×1800) kayıpsız WebP olarak kaydedilir.
`scripts/tour/engine.mjs` bütün platformlarda aynıdır.
