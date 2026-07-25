import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Building2, Home } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function NewProjectSelectPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link href="/projects"><ArrowLeft className="h-4 w-4 mr-1" /> Projeler</Link>
        </Button>
      </div>

      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Yeni Fizibilite Projesi</h1>
        <p className="text-sm text-muted-foreground">Hangi model türüyle çalışacaksınız?</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ModelCard
          href="/projects/new/utility"
          icon={<Building2 className="h-6 w-6" />}
          title="Utility"
          subtitle="GES + BESS Proje Finansmanı"
          points={[
            'Arazi/utility ölçek — MWp bazlı',
            'IDC, DSRA, DSCR-sculpting, LLCR/PLCR',
            'TL gelir + USD kredi, vergi & amortisman',
            'Huawei değer analizi + duyarlılık + senaryo',
          ]}
          accent="bg-primary/10 text-primary"
        />
        <ModelCard
          href="/projects/new/ci"
          icon={<Home className="h-6 w-6" />}
          title="C&I / Mesken"
          subtitle="Saatlik Mahsuplaşma — EPDK 14531"
          points={[
            'Çatı C&I / mesken — kWp bazlı',
            'Saatlik min(üretim, tüketim) mahsuplaşma',
            'Bedelli üretim limiti + BESS kaydırma',
            'Saatlik vs aylık rejim + fatura analizi',
          ]}
          accent="bg-eco/10 text-eco-dark"
        />
      </div>
    </div>
  );
}

function ModelCard({ href, icon, title, subtitle, points, accent }: {
  href: string; icon: React.ReactNode; title: string; subtitle: string; points: string[]; accent: string;
}) {
  return (
    <Link href={href}>
      <Card className="h-full p-6 hover:border-primary/50 hover:shadow-lg transition-all group">
        <div className="flex items-start gap-4">
          <span className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${accent} flex-shrink-0`}>{icon}</span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold leading-tight">{title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
        </div>
        <ul className="mt-4 space-y-1.5 text-[13px] text-foreground/80">
          {points.map((p) => (
            <li key={p} className="flex items-start gap-2">
              <span className="text-primary mt-1 text-[8px]">●</span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </Card>
    </Link>
  );
}
