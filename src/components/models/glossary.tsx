'use client';

export interface GlossTerm { t: string; en: string; d: string; f?: string; }

export function Glossary({ items }: { items: GlossTerm[] }) {
  return (
    <div className="space-y-2">
      {items.map((g) => (
        <details key={g.t} className="border border-border rounded-lg bg-card overflow-hidden group">
          <summary className="cursor-pointer px-4 py-3 font-semibold text-[14.5px] flex items-baseline gap-2 list-none">
            {g.t}
            <span className="font-mono font-normal text-[11.5px] text-muted-foreground">{g.en}</span>
            <span className="ml-auto text-primary font-mono group-open:hidden">+</span>
            <span className="ml-auto text-primary font-mono hidden group-open:inline">−</span>
          </summary>
          <div className="px-4 pb-4 text-[13.5px] text-foreground/80 space-y-2">
            <p>{g.d}</p>
            {g.f && <div className="font-mono text-[12.5px] bg-secondary rounded-md px-3 py-2">{g.f}</div>}
          </div>
        </details>
      ))}
    </div>
  );
}

export const UTILITY_TERMS: GlossTerm[] = [
  { t: 'NPV · Net Bugünkü Değer', en: 'Net Present Value', d: 'Ömür boyu nakit akışlarının bugüne indirgenmiş toplamı eksi yatırım. NPV > 0 → yap; NPV < 0 → beklenen getiriyi vermiyor (illa zarar değil).', f: 'NPV = −CAPEX + Σ FCFₜ/(1+r)ᵗ' },
  { t: 'IRR · İç Verim Oranı', en: 'Internal Rate of Return', d: 'NPV\'yi sıfır yapan oran — projenin "kendi yüzdesi". Karar kuralı: IRR > WACC ise proje değer yaratır.', f: '−CAPEX + Σ FCFₜ/(1+IRR)ᵗ = 0' },
  { t: 'LCOE', en: 'Levelized Cost of Energy', d: 'Ömür boyu üretilen 1 MWh\'in birim maliyeti; maliyet ve üretim bugünkü değere indirgenir. Satış fiyatının altındaysa her MWh değer yaratır.', f: 'LCOE = (CAPEX + Σ Maliyetₜ/(1+r)ᵗ) / (Σ Eₜ/(1+r)ᵗ)' },
  { t: 'LCOS', en: 'Levelized Cost of Storage', d: 'Deşarj edilen her MWh\'in ömür boyu maliyeti: BESS CAPEX + OPEX + güçlendirme + şarj maliyeti. LCOS < deşarj fiyatı ise depolama değer yaratır.' },
  { t: 'MOIC', en: 'Multiple on Invested Capital', d: 'Özkaynağın nakit çarpanı: ömür boyu toplanan / yatırılan özkaynak. Zamanı saymaz; IRR ile birlikte okunur.', f: 'MOIC = Σ Özkaynak nakit akışları / Özkaynak' },
  { t: 'Sources & Uses · Kaynak-Kullanım', en: 'Sources & Uses', d: 'Finansal kapanışın bilançosu: para nereye harcanacak (EPC, IDC, ücretler, DSRA, KDV) ve nereden gelecek (kredi, özkaynak). İki taraf eşittir.', f: 'Σ Uses = Σ Sources' },
  { t: 'IDC · İnşaat Dönemi Faizi', en: 'Interest During Construction', d: 'İnşaat sırasında çekilen kredinin, santral gelir üretmeden önce işleyen faizi. Krediyle aktifleştirilir ve amortismana girer. Kredi ↔ IDC döngüsü iteratif çözülür.', f: 'IDC = Σ_ay çekilmiş bakiye × k_d/12' },
  { t: 'Gearing / Kaldıraç', en: 'Gearing / Leverage', d: 'Toplam proje maliyetinin kredi ile finanse edilen oranı (tipik %65-80). Kaldıraç arttıkça equity IRR yükselir ama DSCR daralır.' },
  { t: 'Grace Period', en: 'Ödemesiz Dönem', d: 'Kredinin yalnızca faizinin ödendiği, anaparanın ertelendiği dönem — genelde inşaat + ilk işletme yılı.' },
  { t: 'Sculpted Repayment', en: 'DSCR-Sculpted Geri Ödeme', d: 'Anaparanın her yıl DSCR\'ı hedef değerde tutacak şekilde nakit akışına göre şekillendirilmesi. Değişken üretim/fiyatlı projelerde bankaların standardı.', f: 'Anaparaₜ = CFADSₜ/Hedef DSCR − Faizₜ' },
  { t: 'DSRA', en: 'Debt Service Reserve Account', d: 'Genelde 6 aylık taksit karşılığının bloke tutulduğu rezerv hesap. Kapanışta fonlanır, kredi kapanınca özkaynağa iade edilir.', f: 'DSRA = ay/12 × yıllık taksit' },
  { t: 'DSCR', en: 'Debt Service Coverage Ratio', d: 'CFADS\'in borç servisine oranı. Bankalar min. 1,20-1,30 ister. 1\'in altı = kredi ödenemiyor.', f: 'DSCRₜ = CFADSₜ / Borç servisiₜ' },
  { t: 'CFADS', en: 'Cash Flow Available for Debt Service', d: 'Borç servisine ayrılabilir nakit: EBITDA − vergi − bakım CAPEX. DSCR, LLCR ve PLCR\'ın hepsinin payıdır.', f: 'CFADS = EBITDA − Vergi − Bakım CAPEX' },
  { t: 'LLCR & PLCR', en: 'Loan / Project Life Coverage Ratio', d: 'LLCR: kredi ömrü boyunca CFADS bugünkü değerinin borca oranı. PLCR: aynı hesap proje ömrü üzerinden. Eşikler: LLCR ≥ 1,3, PLCR ≥ 1,5.', f: 'LLCR = BD(CFADS, kredi ömrü, k_d) / Borç' },
  { t: 'WACC', en: 'Weighted Average Cost of Capital', d: 'Kredi ve özkaynak maliyetinin ağırlıklı ortalaması; NPV/LCOE\'deki r genelde budur.', f: 'WACC = w_d×k_d + w_e×k_e' },
  { t: 'Kur Riski & SAGP', en: 'FX Risk & Purchasing Power Parity', d: 'TL gelir, USD kredi uyumsuzluğu. SAGP: kur iki ülkenin enflasyon farkı kadar artar. SAGP altında TL fiyat enflasyonu tek başına USD değer yaratmaz.', f: 'Kur artışı ≈ (1+π_TL)/(1+π_USD) − 1' },
  { t: 'P50 / P90', en: 'Exceedance Probabilities', d: 'P50: yılların yarısında aşılan üretim. P90: 10 yılın 9\'unda aşılan muhafazakâr üretim. Banka krediyi P90 ile test eder.' },
  { t: 'Round-Trip Verimlilik', en: 'Round-Trip Efficiency (RTE)', d: 'Bataryaya konan enerjinin geri alınabilen oranı (tipik %85-92). 1 MWh deşarj için 1/RTE MWh şarj gerekir.', f: 'Marj/MWh = P_deşarj − P_şarj/RTE' },
];

export const CI_TERMS: GlossTerm[] = [
  { t: 'Saatlik mahsuplaşma', en: 'Hourly netting', d: 'Her saat için mahsup = min(üretim, tüketim). EPDK 14531 ile C&I abonelerde zorunlu; saatler arası taşıma yok.', f: 'mahsup[s] = min(üretim[s], tüketim[s])' },
  { t: 'Aylık mahsuplaşma', en: 'Monthly netting', d: 'Eski rejim; mesken abonelerinde devam eder. Ay toplamı üzerinden netleşir, saat uyumu aranmaz.', f: 'mahsup_ay = min(Σüretim, Σtüketim)' },
  { t: 'Bedelli üretim limiti', en: 'Paid production cap', d: 'Satışa konu edilebilecek yıllık üretim tavanı: önceki yıl tüketimi × 2. Mesken muaf. Limit üstü YEKDEM bedelsizdir.', f: 'limit = önceki yıl tüketim × 2' },
  { t: 'Öz tüketim oranı', en: 'Self-consumption ratio', d: 'Üretimin tüketimle eşleşen payı: mahsup ÷ üretim. Saatlik rejimde fizibilitenin ana KPI değeri; BESS ve doğu-batı yerleşim yükseltir.', f: 'öz tüketim = mahsup / üretim' },
  { t: 'Otonomi', en: 'Autonomy', d: 'Tüketimin GES tarafından karşılanan payı: mahsup ÷ tüketim.', f: 'otonomi = mahsup / tüketim' },
  { t: 'YEKDEM bedelsiz', en: 'Uncompensated feed-in', d: 'Limit üstü ihtiyaç fazlasının 0 TL ile YEKDEM sistemine aktarılması — gelir yaratmayan üretim.' },
  { t: 'SKB · Sistem kullanım bedeli', en: 'Grid usage fee', d: 'Şebekeyi kullanmanın birim bedeli. Limit üstü miktar "SKB ödemeli" statüsündedir: gelir yok, bedel var.' },
  { t: 'Fiyat terfisi (BESS)', en: 'Price uplift', d: 'Depolanan fazla kWh değerinin satış fiyatı yerine alış fiyatından değerlenmesi: bataryanın mahsuplaşma rejimindeki ana değer kaynağı.', f: 'Δdeğer = kaydırılan × (alış − satış)' },
];
