import type { Metadata } from "next";
import { MessageSquare, Phone, Mail, Globe, ShieldCheck, TriangleAlert, Code2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ContactForm } from "@/components/shared/contact-form";
import { LegalDisclaimerCard } from "@/components/shared/legal-disclaimer";
import { OtherPlatforms } from "@/components/auth/other-platforms";
import { LinkedInIcon } from "@/components/layout/AppShell";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "İletişime Geç — Fizibilite Platformu",
};

export default function ContactPage() {
  const { developer } = siteConfig;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Card>
        <CardContent className="space-y-3 px-7 py-6">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue/20 bg-blue/10 px-3 py-1 text-xs font-medium text-blue2 dark:text-blue">
            <MessageSquare className="size-3.5" />
            İletişim &amp; Destek
          </span>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight">
            Sizden gelen her geri bildirim platformu daha iyi yapar.
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Hata bildirimi, özellik önerisi veya genel sorularınız için aşağıdaki formdan veya doğrudan
            iletişim kanallarından bana ulaşabilirsiniz.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        {/* Geliştirici — koyu kart */}
        <Card className="overflow-hidden border-sidebar-border bg-sidebar text-sidebar-foreground">
          <CardContent className="space-y-5 p-6">
            <div className="flex size-9 items-center justify-center rounded-lg bg-sidebar-border/60">
              <Code2 className="size-4 text-sidebar-accent" />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-muted">
                Geliştirici
              </p>
              <p className="text-lg font-semibold tracking-tight text-white">{developer.name}</p>
              <p className="mt-0.5 text-sm text-sidebar-muted">{developer.role}</p>
            </div>
            <p className="text-xs leading-relaxed text-sidebar-muted">{developer.bio}</p>

            <div className="space-y-3 border-t border-sidebar-border pt-4">
              <DevContactRow icon={Phone} label="Telefon" value={developer.phone} href={`tel:${developer.phone.replace(/\s/g, "")}`} />
              <DevContactRow icon={Mail} label="E-posta" value={developer.email} href={`mailto:${developer.email}`} />
              <DevContactRow icon={LinkedInIcon} label="LinkedIn" value={developer.linkedin.label} href={developer.linkedin.href} />
              <DevContactRow icon={Globe} label="Web Sitesi" value={developer.website.label} href={developer.website.href} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-5 p-6">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Mesaj Bırakın</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Formu doldurun, mesajınız e-posta uygulamanız üzerinden iletilir.
              </p>
            </div>
            <ContactForm recipientEmail={developer.email} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="border-eco/30 bg-eco/[0.06]">
          <CardContent className="flex items-start gap-3 p-5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-eco/15 text-eco-dark dark:text-eco-light">
              <ShieldCheck className="size-4" />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-eco-dark dark:text-eco-light">
                Veri Gizliliği
              </p>
              <p className="text-sm font-semibold">Verileriniz size aittir</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Geliştirici dahil hiçbir üçüncü taraf modellerinizi görmez veya indiremez.
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow/30 bg-yellow/[0.06]">
          <CardContent className="flex items-start gap-3 p-5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-yellow/15 text-solar-dark dark:text-solar-light">
              <TriangleAlert className="size-4" />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-solar-dark dark:text-solar-light">
                Sorumluluk Reddi
              </p>
              <p className="text-sm font-semibold">Tahmin aracı — yatırım tavsiyesi değildir</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Tüm hesaplamalar <strong>bilgilendirme amaçlıdır</strong>. Sonuçların doğruluğu ve
                kullanımı kullanıcının sorumluluğundadır.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <LegalDisclaimerCard />

      <OtherPlatforms variant="compact" />
    </div>
  );
}

function DevContactRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  href: string;
}) {
  const external = href.startsWith("http");
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="-m-1.5 flex items-start gap-3 rounded-md p-1.5 transition-colors hover:bg-sidebar-border/50"
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-border/60 text-sidebar-muted">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-muted">{label}</p>
        <p className="truncate text-sm text-white">{value}</p>
      </div>
    </a>
  );
}
