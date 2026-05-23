import Link from 'next/link';
import { listProjects, upsertProject, nowIso, IS_DEMO_MODE } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, FileText, Sparkles, Sun, Battery, FlaskConical, Info } from 'lucide-react';
import { DEMO_PROJECTS, ensureCapexComputed } from '@/lib/defaults';

export const dynamic = 'force-dynamic';

function autoSeedIfEmpty() {
  const existing = listProjects();
  if (existing.length > 0) return;
  for (const demo of DEMO_PROJECTS) {
    const config = ensureCapexComputed(demo.config);
    const now = nowIso();
    upsertProject({
      id: demo.id,
      name: config.name,
      description: config.description,
      projectType: config.projectType,
      status: 'draft',
      configJson: JSON.stringify(config),
      createdAt: now,
      updatedAt: now,
    });
  }
}

const TYPE_LABELS: Record<string, string> = {
  rooftop_ci: 'Çatı C&I',
  ground_mount: 'Arazi GES',
  hybrid_bess: 'GES + BESS Hibrit',
};

export default function HomePage() {
  // Vercel demo modunda otomatik seed (her cold start'ta)
  if (IS_DEMO_MODE) autoSeedIfEmpty();
  const projects = listProjects();
  const hasProjects = projects.length > 0;

  return (
    <div className="space-y-10">
      {IS_DEMO_MODE && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 text-amber-900 p-3 text-xs flex items-start gap-2">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <strong>Demo modu:</strong> Bu Vercel ortamında yapılan değişiklikler kalıcı değildir (serverless filesystem read-only).
            Demo projeler her cold start\'ta yenilenir. Üretim için Vercel KV / Postgres entegrasyonu önerilir.
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl gradient-navy text-white px-8 py-12 lg:px-12 lg:py-16">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '20px 20px' }} />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium mb-4 backdrop-blur">
            <Sparkles className="h-3 w-3" />
            EPDK Karar 14531 · Saatlik Mahsuplaşma · 2026
          </div>
          <h1 className="text-3xl lg:text-5xl font-bold mb-4 leading-tight">
            Yatırım bankası seviyesinde<br />
            <span className="text-solar-light">GES fizibilitesi</span>
          </h1>
          <p className="text-white/80 text-lg mb-6 leading-relaxed">
            EPDK 1 Nolu Açıklama'ya birebir uyumlu saatlik mahsuplaşma motoru, PVGIS-SARAH3 entegrasyonu,
            14 sektörel tüketim profili, BESS dispatch optimizasyonu ve Monte Carlo risk analizi.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-white text-navy hover:bg-white/90">
              <Link href="/projects/new">
                Yeni Fizibilite Başlat
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-transparent border-white/30 text-white hover:bg-white/10">
              <Link href="/about">EPDK Yorumu</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Capability cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <div className="h-10 w-10 rounded-lg gradient-solar flex items-center justify-center mb-2">
              <Sun className="h-5 w-5 text-white" />
            </div>
            <CardTitle>8760 Saatlik Tam Simülasyon</CardTitle>
            <CardDescription>PVGIS-SARAH3 API ile gerçek meteorolojik veri, lokasyon bazlı üretim profili.</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <div className="h-10 w-10 rounded-lg gradient-eco flex items-center justify-center mb-2">
              <Battery className="h-5 w-5 text-white" />
            </div>
            <CardTitle>BESS Dispatch Motoru</CardTitle>
            <CardDescription>Öz tüketim + bedelli limit koruması + peak shaving + arbitraj. Augmentation planı.</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <div className="h-10 w-10 rounded-lg gradient-navy flex items-center justify-center mb-2">
              <FlaskConical className="h-5 w-5 text-white" />
            </div>
            <CardTitle>Monte Carlo Risk Analizi</CardTitle>
            <CardDescription>1000+ koşum: IRR/NPV dağılımı, P10/P50/P90, tornado, VaR.</CardDescription>
          </CardHeader>
        </Card>
      </section>

      {/* Projects */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-semibold">Projeler</h2>
            <p className="text-sm text-muted-foreground">Mevcut fizibilite projeleri ve demo örnekler.</p>
          </div>
          <div className="flex gap-2">
            {!hasProjects && (
              <form action="/api/seed" method="POST">
                <Button type="submit" variant="outline">Demo projeleri ekle</Button>
              </form>
            )}
            <Button asChild>
              <Link href="/projects/new">+ Yeni Proje</Link>
            </Button>
          </div>
        </div>

        {!hasProjects && (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="text-lg font-medium mb-1">Henüz proje yok</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Yeni bir fizibilite başlat veya {DEMO_PROJECTS.length} hazır demo projesini yükle.
              </p>
              <form action="/api/seed" method="POST">
                <Button type="submit">Demo projeleri yükle</Button>
              </form>
            </CardContent>
          </Card>
        )}

        {hasProjects && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <Link key={p.id} href={`/projects/${p.id}`}>
                <Card className="hover:shadow-md hover:border-primary/40 transition-all h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base leading-snug">{p.name}</CardTitle>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${p.status === 'completed' ? 'bg-eco/15 text-eco-dark' : 'bg-secondary'}`}>
                        {p.status === 'completed' ? 'Tamamlandı' : 'Taslak'}
                      </span>
                    </div>
                    <CardDescription className="line-clamp-2">{p.description || '—'}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{TYPE_LABELS[p.projectType] ?? p.projectType}</span>
                      <span>{new Date(p.updatedAt).toLocaleDateString('tr-TR')}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
