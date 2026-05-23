/**
 * Banka modelindeki tüm finansal kalemlerin Türkçe açıklamaları.
 * CashFlowTable her satıra info ikonu ile bunları gösterir.
 */

export interface TermDef {
  title: string;
  body: string;
}

export const FINANCIAL_TERMS: Record<string, TermDef> = {
  // ---------- INCOME STATEMENT ----------
  'Sales Revenue': {
    title: 'Sales Revenue (Satış Geliri)',
    body: 'Dönem içinde elde edilen toplam satış geliri: mahsuplaşılan elektriğin tarife alış fiyatından sağlanan tasarruf + ihtiyaç fazlası satış geliri + (varsa) batarya arbitraj net + peak shaving tasarrufu. KDV hariç net tutardır.',
  },
  'Scrapped Equipment': {
    title: 'Scrapped Equipment (Hurda Değer)',
    body: 'Analiz süresinin sonunda (genelde 25. yıl) ekipmanın hurda satış değeri. CAPEX\'in yaklaşık %3\'ü olarak modellenir. Yalnızca son yıl gelirine eklenir.',
  },
  'Net Sales': {
    title: 'Net Sales (Net Satışlar)',
    body: 'Sales Revenue + Scrapped Equipment. Bu satır transmission ve diğer bedeller düşülmeden önceki brüt gelirdir.',
  },
  'Transmission and Operational Fees': {
    title: 'Transmission & Operational Fees (İletim ve Operasyon Bedelleri)',
    body: 'TEİAŞ iletim, EPİAŞ piyasa işletim, dağıtım kaybı ve operasyonel kesintilerin elektrik gelirinden düşülen kısmı. Görevli tedarik şirketine ödenen kesintilerle birlikte.',
  },
  'Other Fees': {
    title: 'Other Fees (Diğer Bedeller)',
    body: 'YEKDEM katkısı, EPDK lisans bedeli, sistem kullanım bedeli vb. küçük operasyonel kesintiler. Genelde net üretimin küçük bir yüzdesi.',
  },
  'Gross Profit': {
    title: 'Gross Profit (Brüt Kar)',
    body: 'Net Sales − (Transmission + Other Fees). İşletme giderleri (O&M, sigorta, payroll) düşülmeden önceki kar. Brüt kar marjı projenin operasyonel verimliliğini gösterir.',
  },
  'Insurance Cost': {
    title: 'Insurance Cost (Sigorta Gideri)',
    body: 'İşletme dönemi all-risk sigortası. Tipik %0.5 CAPEX/yıl. İnşaat dönemi CAR sigortası CAPEX\'e dahildir, burada işletme dönemi vardır.',
  },
  'Corrective Maintenance': {
    title: 'Corrective Maintenance (Düzeltici Bakım)',
    body: 'Arıza sonrası onarım maliyetleri. Yedek parça, müdahale, modül değişimi. O&M\'in reaktif kısmı.',
  },
  'Preventive Maintenance': {
    title: 'Preventive Maintenance (Önleyici Bakım)',
    body: 'Periyodik bakım: panel temizliği, kablo kontrolü, termal kamera, invertör kalibrasyonu. O&M\'in planlı kısmı (%60 ağırlık tipik).',
  },
  'Total Payroll': {
    title: 'Total Payroll (Toplam Personel Gideri)',
    body: 'Tesis operatörü, asset manager, mali müşavir, danışmanlık ücretleri. Küçük projelerde dış kaynak ile minimumda tutulur.',
  },
  'EBITDA': {
    title: 'EBITDA (Faiz, Vergi, Amortisman Öncesi Kar)',
    body: 'Earnings Before Interest, Taxes, Depreciation, Amortization. Gross Profit − (Insurance + Maintenance + Payroll). Operasyonel nakit yaratma kapasitesinin temel göstergesi. EBITDA marjı = EBITDA / Revenue.',
  },
  'Depreciation': {
    title: 'Depreciation (Amortisman)',
    body: 'CAPEX\'in muhasebe ömrü boyunca yıllık yazılması. GES için tipik 10 yıl doğrusal. Vergi matrahını düşürür ama nakit çıkışı yaratmaz.',
  },
  'EBIT': {
    title: 'EBIT (Faiz ve Vergi Öncesi Kar)',
    body: 'EBITDA − Depreciation. Operasyonel kar. Şirket finansman yapısından bağımsız kar göstergesi.',
  },
  'FX Gain/Loss': {
    title: 'FX Gain/Loss (Kur Farkı Kar/Zararı)',
    body: 'USD bazlı borç/varlık pozisyonlarında dönem içi kur değişiminden doğan kar veya zarar. Pozitif = TL\'nin değer kazanması (kazanç), negatif = TL\'nin değer kaybetmesi (zarar). Vergi matrahından düşülür/eklenir.',
  },
  'Interest Expenses': {
    title: 'Interest Expenses (Faiz Giderleri)',
    body: 'Banka kredisi faiz ödemeleri (anapara hariç). P&L\'de vergi öncesi gider olarak yer alır, kur farkı kaynaklı faizler dahil. Annuity (eşit taksit) modelinde ilk yıllarda yüksek, son yıllarda düşüktür.',
  },
  'Earnings Before Tax': {
    title: 'Earnings Before Tax (Vergi Öncesi Kar)',
    body: 'EBIT + FX Gain/Loss − Interest Expenses. Vergi matrahı buradan başlar (sonra FX addback ile düzeltilir).',
  },
  'FX Gain Loss Addback': {
    title: 'FX Gain Loss Addback (Kur Farkı Geri Eklemesi)',
    body: 'Vergi matrahı hesaplamasında, gerçekleşmemiş (unrealized) kur farkları geri eklenir. KVK gereği yalnızca gerçekleşmiş kur farkları vergiye tabidir.',
  },
  'Tax Expense': {
    title: 'Tax Expense (Kurumlar Vergisi Gideri)',
    body: 'Vergi öncesi kar × kurumlar vergisi oranı (2026: %25). Yatırım teşvik belgesi varsa indirimli oran uygulanır (bölge 1-6\'ya göre %30-90 vergi indirimi). Zarar varsa vergi 0.',
  },
  'Net Income': {
    title: 'Net Income (Net Kar)',
    body: 'EBT − Tax. Şirketin hissedarlara dağıtılabilir kar. P&L\'in son satırı. ROE hesabında kullanılır.',
  },

  // ---------- CASH FLOW STATEMENT ----------
  'Revenue': {
    title: 'Revenue (Nakit Bazlı Gelir)',
    body: 'P&L\'deki Sales Revenue\'nun nakit girişi karşılığı. Tahakkuk ve nakit arasındaki farklar OWC\'ye yansıtılır.',
  },
  'All in Cost of Sales': {
    title: 'All in Cost of Sales (Toplam Satış Maliyeti)',
    body: 'Tüm operasyonel giderler: sigorta + bakım + payroll + iletim/operasyon bedelleri. Nakit çıkışlarının net görünümü.',
  },
  'OWC Requirement': {
    title: 'OWC Requirement (Operating Working Capital İhtiyacı)',
    body: 'İşletme sermayesi ihtiyacı: alacaklar (faturalanmış ama tahsil edilmemiş) + stoklar − borçlar. GES\'te tipik 30 günlük gelir-gider farkı.',
  },
  'Change in OWC': {
    title: 'Change in OWC (İşletme Sermayesi Değişimi)',
    body: 'Dönem başı ile dönem sonu arasında OWC\'deki değişim. Artış = nakit çıkışı (sermaye bağlandı), azalış = nakit girişi (sermaye serbest kaldı).',
  },
  'Corporate Income Tax': {
    title: 'Corporate Income Tax (Kurumlar Vergisi Ödemesi)',
    body: 'P&L\'deki tax expense\'in nakit ödemesi. Türkiye\'de yıllık 4 taksitte ödenir (Şubat/Mayıs/Ağustos/Kasım). Modelde toplam yıllık çıkış olarak gösterilir.',
  },
  'VAT': {
    title: 'VAT (KDV Nakit Akışı)',
    body: 'Satışlardan tahsil edilen KDV − alımlarda ödenen KDV. GES yatırımında ilk yıllarda KDV iadesi alınır (5746 sayılı kanun); işletme döneminde net KDV ödemesi olur.',
  },
  'Net Operating Cash Flow': {
    title: 'Net Operating Cash Flow (Net İşletme Nakit Akışı)',
    body: 'İşletme faaliyetlerinden gelen net nakit. Revenue − Costs − ΔOWC − Tax − VAT. Yatırım ve finansman öncesi nakit yaratma kapasitesi.',
  },
  'Capex': {
    title: 'Capex (Sermaye Harcaması)',
    body: 'Yatırım harcamaları. İlk yıl tüm CAPEX, sonra augmentation yıllarında batarya kapasite yenileme. Negatif değer = nakit çıkışı.',
  },
  'Net Investing Cash Flow': {
    title: 'Net Investing Cash Flow (Net Yatırım Nakit Akışı)',
    body: 'Yatırım faaliyetlerinden net nakit. GES\'te genelde sadece Capex satırı (varlık satışı yok).',
  },
  'Drawdown': {
    title: 'Drawdown (Kredi Çekişi)',
    body: 'Bankadan çekilen kredi tutarı. Yatırım fazı boyunca milestone\'lara göre çekilir. Modelde basitleştirme: yıl 0\'da tam çekiş.',
  },
  'Repayment': {
    title: 'Repayment (Anapara Geri Ödemesi)',
    body: 'Kredi anaparasının taksitli ödenmesi. Annuity (eşit taksit) veya equal principal (eşit anapara) yöntemi. Negatif değer = nakit çıkışı.',
  },
  'Interest Expense': {
    title: 'Interest Expense (Faiz Ödemesi — Nakit)',
    body: 'Banka kredisi faiz ödemesi nakit çıkışı. P&L\'deki interest expense ile çakışır ama nakit akışında ayrı satır.',
  },
  'Commitment Fee': {
    title: 'Commitment Fee (Taahhüt Komisyonu)',
    body: 'Bankanın taahhüt ettiği ama henüz çekilmeyen kredi için yıllık ücret. Tipik %0.5 çekilmemiş tutar üzerinden.',
  },
  'Arrangement Fee': {
    title: 'Arrangement Fee (Düzenleme Ücreti)',
    body: 'Kredinin yapılandırılması için tek seferlik banka komisyonu. Tipik %1-2 kredi tutarı üzerinden. Drawdown anında ödenir.',
  },
  'Equity': {
    title: 'Equity (Öz Sermaye Girişi)',
    body: 'Sponsorlardan giren öz sermaye. Banka tarafından zorunlu tutulan asgari pay (genelde %30). İlk yıl tam giriş.',
  },
  'Additional Equity to cure DSCR': {
    title: 'Additional Equity to Cure DSCR (DSCR İyileştirme Sermayesi)',
    body: 'DSCR bankanın asgari oranının (genelde 1.20) altına düşerse, kredi sözleşmesi gereği sponsorların ek sermaye koyması. Cure mechanism olarak adlandırılır.',
  },
  'Net Working Capital Loan Drawdown': {
    title: 'NWC Loan Drawdown (İşletme Sermayesi Kredisi Çekişi)',
    body: 'Mevsimsel veya geçici nakit ihtiyacı için çekilen revolving credit. Genelde kısa vadeli, yüksek faizli.',
  },
  'Net Working Capital Loan Repayment': {
    title: 'NWC Loan Repayment (İşletme Sermayesi Kredisi Geri Ödemesi)',
    body: 'Revolving facility\'nin geri ödemesi. Dönem içi sıklıkla çekilir-ödenir.',
  },
  'Net Financing Cash Flow': {
    title: 'Net Financing Cash Flow (Net Finansman Nakit Akışı)',
    body: 'Tüm finansman faaliyetlerinden net nakit. Drawdown + Equity − Repayment − Interest − Fees. Yıl 0 büyük pozitif, sonraki yıllar negatif.',
  },
  'Opening': {
    title: 'Opening Cash (Dönem Başı Nakit)',
    body: 'Dönemin başındaki kasa/banka bakiyesi. Önceki dönemin closing\'i ile eşit.',
  },
  'Addition/(Disposal)': {
    title: 'Addition / (Disposal) (Net Nakit Değişimi)',
    body: 'Operating + Investing + Financing nakit akışlarının toplamı. Pozitif = kasa arttı, negatif = kasa düştü.',
  },
  'Closing': {
    title: 'Closing Cash (Dönem Sonu Nakit)',
    body: 'Opening + Addition. Bir sonraki dönemin opening\'i. Negatife düşerse likidite krizi sinyali.',
  },

  // ---------- CASH WATERFALL ----------
  'Revenues': {
    title: 'Revenues (Şelale — Toplam Gelir)',
    body: 'Cash waterfall başlangıcı. Tüm satış ve diğer gelirlerin nakit girişi. P&L revenue ile aynı tabandan başlar.',
  },
  'Operating costs': {
    title: 'Operating Costs (İşletme Giderleri)',
    body: 'Tüm operasyonel nakit çıkışları: O&M, sigorta, payroll, transmission, other fees. Pozitif değer gösterilir; nakit çıkışı.',
  },
  'Change in working capital': {
    title: 'Change in Working Capital (İşletme Sermayesi Değişimi)',
    body: 'Cash flow statement\'taki ΔOWC ile aynı. Şelalede ayrı satır olarak yer alır.',
  },
  'Net VAT Cash Flow': {
    title: 'Net VAT Cash Flow (Net KDV Nakit Akışı)',
    body: 'KDV ile ilgili net nakit hareket. Yatırım yıllarında iade nedeniyle pozitif, işletmede negatif olabilir.',
  },
  'Operating Cash Flow Before Tax': {
    title: 'Operating Cash Flow Before Tax (Vergi Öncesi İşletme Nakit Akışı)',
    body: 'Revenues − Operating Costs − ΔWC − Net VAT − Capex. Vergi ödemesi düşülmeden önce projenin yaratabildiği nakit. Banka analizinde kritiktir.',
  },
  'Corporate income tax paid': {
    title: 'Corporate Income Tax Paid (Ödenmiş Kurumlar Vergisi)',
    body: 'Gerçek nakit vergi ödemesi. Yatırım teşvik indirimi varsa düşük çıkar.',
  },
  'CFADS': {
    title: 'CFADS (Cash Flow Available for Debt Service)',
    body: 'Borç servisine ayrılan kullanılabilir nakit akışı. Operating CF Before Tax − Tax Paid. DSCR = CFADS / Debt Service. Bankaların asgari DSCR koşulu (1.20-1.30) bu satıra dayanır.',
  },

  'Net FCFC': {
    title: 'Net FCFC (Free Cash Flow to Company)',
    body: 'Şirketin tüm sermaye sağlayıcılarına (hem öz sermaye hem kreditörler) giden serbest nakit akışı. Finansman öncesi. Proje değerlemesi için kullanılır. NPV = Σ FCFC / (1+WACC)^t.',
  },
  'Discounted Net FCFC': {
    title: 'Discounted Net FCFC (İskontolu FCFC)',
    body: 'FCFC değerinin WACC ile bugüne indirgenmiş hali. NPV hesaplamasında her dönemin katkısı.',
  },
  'Cumulative Net FCFC': {
    title: 'Cumulative Net FCFC (Kümülatif FCFC)',
    body: 'Yıl 0\'dan itibaren tüm FCFC\'lerin toplamı (initial CAPEX dahil). Sıfırı geçtiği yıl FCFC Payback Period.',
  },
  'Net FCFE': {
    title: 'Net FCFE (Free Cash Flow to Equity)',
    body: 'Yalnızca öz sermaye sahiplerine giden nakit akışı. CFADS − Anapara ödemesi − Faiz ödemesi. Yatırımcı getirisi (Equity IRR) hesaplamasında kullanılır.',
  },
  'Discounted Net FCFE': {
    title: 'Discounted Net FCFE (İskontolu FCFE)',
    body: 'FCFE\'nin cost of equity ile iskontolanmış hali. Equity NPV hesaplamasında her dönemin katkısı.',
  },
  'Cumulative Net FCFE': {
    title: 'Cumulative Net FCFE (Kümülatif FCFE)',
    body: 'FCFE\'lerin yıl 0\'dan kümülatif toplamı. Sıfırı geçtiği yıl Equity Payback Period.',
  },
};

export function getTermByLabel(label: string): TermDef | undefined {
  return FINANCIAL_TERMS[label];
}
