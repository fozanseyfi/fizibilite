import Link from 'next/link';
import { DEMO_PROJECTS } from '@/lib/defaults';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatTl, formatKwh } from '@/lib/utils';
import { LayoutTemplate, Battery as BatteryIcon, Building2, Mountain, Factory, Sun, Zap, ChevronRight } from 'lucide-react';
import { UseTemplateButton } from './use-template-button';

export const dynamic = 'force-dynamic';

const TYPE_META: Record<string, { label: string; icon: typeof Building2; gradient: string }> = {
  rooftop_ci: { label: 'Çatı C&I', icon: Building2, gradient: 'gradient-solar' },
  ground_mount: { label: 'Arazi GES', icon: Mountain, gradient: 'gradient-eco' },
  hybrid_bess: { label: 'GES + BESS Hibrit', icon: BatteryIcon, gradient: 'gradient-navy' },
};

export default function TemplatesPage() {
  // Boyut bazında grupla
  const small = DEMO_PROJECTS.filter((d) => d.config.pv.peakPowerKwp <= 1500);
  const medium = DEMO_PROJECTS.filter((d) => d.config.pv.peakPowerKwp > 1500 && d.config.pv.peakPowerKwp <= 15_000);
  const utility = DEMO_PROJECTS.filter((d) => d.config.pv.peakPowerKwp > 15_000);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <LayoutTemplate className="h-6 w-6 text-primary" />
          Proje Şablonları
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Hazır {DEMO_PROJECTS.length} şablon — bir tanesini kullan, kopyası senin projen olarak açılır, dilediğin gibi düzenle ve simüle et.
          Şablonlar değişmez (master copy).
        </p>
      </div>

      <TemplateGroup title="Küçük Ölçek (≤ 1.5 MWp)" subtitle="Mesken, küçük ticari, otel çatı GES" templates={small} />
      <TemplateGroup title="Orta Ölçek (1.5 – 15 MWp)" subtitle="Sanayi çatı + küçük arazi GES + ilk batarya yatırımları" templates={medium} />
      <TemplateGroup title="Utility-Scale (> 15 MWp)" subtitle="Lisanslı arazi GES, kurumsal PPA, büyük batarya" templates={utility} />

      <Card className="border-l-4 border-l-primary mt-8">
        <CardHeader>
          <CardTitle className="text-base">📌 Şablon Nasıl Çalışır?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <Step n={1} title="Şablonu Seç" desc="Yatırım büyüklüğüne göre bir hazır şablon seç. Lokasyon, kurulu güç, tarife, finansman önceden yapılandırılmıştır." />
            <Step n={2} title="Kopyasını Aç" desc="'Bu Şablonu Kullan' butonu yeni bir proje kopyası yaratır ve düzenleme sayfasına yönlendirir." />
            <Step n={3} title="Düzenle & Çalıştır" desc="Wizard'da kendi parametrelerine göre düzenle (kurulu güç, tüketim, batarya, vs.) → simülasyonu çalıştır." />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TemplateGroup({ title, subtitle, templates }: { title: string; subtitle: string; templates: typeof DEMO_PROJECTS }) {
  if (templates.length === 0) return null;
  return (
    <section>
      <div className="flex items-baseline justify-between mb-3 border-b border-border/40 pb-2">
        <h2 className="text-lg font-bold">{title}</h2>
        <span className="text-xs text-muted-foreground">{subtitle}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {templates.map((t) => {
          const meta = TYPE_META[t.config.projectType] ?? TYPE_META.rooftop_ci;
          const Icon = meta.icon;
          const totalCapex = t.config.capex?.total ?? 0;
          return (
            <Card key={t.id} className="hover:shadow-md hover:border-primary/40 transition-all flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className={`h-10 w-10 rounded-lg ${meta.gradient} flex items-center justify-center`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium whitespace-nowrap">
                    {meta.label}
                  </span>
                </div>
                <CardTitle className="text-base leading-snug">{t.name}</CardTitle>
                <CardDescription className="text-xs leading-relaxed line-clamp-2">{t.config.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 mt-auto">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Spec icon={Zap} label="Kurulu Güç" value={`${(t.config.pv.peakPowerKwp / 1000).toFixed(1)} MWp`} />
                  <Spec icon={Sun} label="Lokasyon" value={t.config.location.city ?? '—'} />
                  {t.config.battery.enabled && (
                    <Spec icon={BatteryIcon} label="Batarya" value={`${(t.config.battery.nominalCapacityKwh / 1000).toFixed(1)} MWh`} />
                  )}
                  <Spec icon={Factory} label="Tüketim" value={formatKwh(t.config.consumption.annualKwh, { compact: true })} />
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t border-border/40">
                  <span>Tahmini CAPEX: <strong className="text-foreground">{formatTl(totalCapex, { compact: true })}</strong></span>
                  <span>{t.config.financing.type === 'loan' ? 'Banka Kredisi' : t.config.financing.type === 'leasing' ? 'Leasing' : 'Öz Sermaye'}</span>
                </div>
                <UseTemplateButton templateId={t.id} />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function Spec({ icon: Icon, label, value }: { icon: typeof Zap; label: string; value: string }) {
  return (
    <div className="rounded bg-secondary/40 p-2">
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><Icon className="h-3 w-3" /> {label}</div>
      <div className="text-xs font-bold tabular-nums whitespace-nowrap mt-0.5">{value}</div>
    </div>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="rounded-md border border-border/40 p-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">{n}</span>
        <span className="font-semibold">{title}</span>
      </div>
      <div className="text-xs text-muted-foreground">{desc}</div>
    </div>
  );
}
