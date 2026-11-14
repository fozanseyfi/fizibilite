"use client";

import { useState } from "react";
import {
  ArrowUpRight,
  Boxes,
  Bug,
  FolderKanban,
  Globe,
  HelpCircle,
  Info,
  Lightbulb,
  LineChart,
  Mail,
  MessageSquare,
  Phone,
  Scale,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Trophy,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/lib/site-config";
import { LinkedInIcon } from "@/components/layout/AppShell";

/** Proje Yönetim Platformu'ndaki iletişim sayfasının aynısı; geliştirici kartına pozisyon / eğitim / uzmanlık eklendi. */
const DEV = siteConfig.developer;

type Topic = "feedback" | "bug" | "feature" | "question";

const TOPIC_TONES = {
  blue: "border-blue/40 bg-blue/10 text-blue",
  rose: "border-red/40 bg-red/10 text-red",
  amber: "border-yellow/40 bg-yellow/10 text-yellow",
  violet: "border-purple/40 bg-purple/10 text-purple",
} as const;

const TOPICS: { key: Topic; label: string; icon: React.ComponentType<{ className?: string }>; tone: keyof typeof TOPIC_TONES }[] = [
  { key: "feedback", label: "Genel Geri Bildirim", icon: MessageSquare, tone: "blue" },
  { key: "bug", label: "Hata Bildirimi", icon: Bug, tone: "rose" },
  { key: "feature", label: "Özellik Önerisi", icon: Lightbulb, tone: "amber" },
  { key: "question", label: "Soru / Yardım", icon: HelpCircle, tone: "violet" },
];

const accentText = "text-emerald-600 dark:text-emerald-400";

export function ContactView() {
  const [topic, setTopic] = useState<Topic>("feedback");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const valid = subject.trim().length > 0 && message.trim().length >= 10;

  function mailto() {
    const topicLabel = TOPICS.find((t) => t.key === topic)?.label ?? "";
    const params = new URLSearchParams({
      subject: `[Fizibilite – ${topicLabel}] ${subject || "Geri Bildirim"}`,
      body: message,
    });
    window.location.href = `mailto:${DEV.email}?${params.toString()}`;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* HERO */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-bg2 via-card to-emerald-500/5 p-8 md:p-12">
        <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 size-72 rounded-full bg-blue/10 blur-3xl" />
        <div className="relative max-w-3xl">
          <div className={cn("mb-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider", accentText)}>
            <MessageSquare className="size-3" />
            Katkılarınız
          </div>
          <h1 className="text-3xl font-extrabold leading-[1.1] tracking-tight text-text md:text-[36px]">
            Sizden gelen her geri bildirim
            <br className="hidden md:block" /> <span className={accentText}>platformu daha iyi yapar.</span>
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-text2 md:text-base">
            Hata bildirimi, özellik önerisi veya genel sorularınız için aşağıdaki formdan veya doğrudan iletişim
            kanallarından bana ulaşabilirsiniz.
          </p>
        </div>
      </div>

      {/* GELİŞTİRİCİ KARTI + FORM */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm lg:col-span-5">
          <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-7 text-white">
            <div className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-emerald-500/20 blur-2xl" />
            <div className="relative">
              <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-500/20 ring-1 ring-emerald-500/30 backdrop-blur">
                <Sparkles className="size-5 text-white" />
              </div>
              <div className="mt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-400">Geliştirici</div>
              <h2 className="mt-1.5 text-2xl font-bold tracking-tight" data-no-i18n>{DEV.name}</h2>
              <div className="mt-0.5 text-sm text-slate-300">{DEV.role}</div>
              <p className="mt-4 max-w-md text-[12.5px] leading-relaxed text-slate-300/95">{DEV.bio}</p>

              <dl className="mt-5 space-y-0">
                {(
                  [
                    ["Şu an", `${DEV.position} · ${DEV.company}`],
                    ["Eğitim", DEV.education],
                    ["Uzmanlık", DEV.expertise],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[84px_minmax(0,1fr)] gap-3 border-t border-white/10 py-2.5">
                    <dt className="pt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">{k}</dt>
                    <dd className="text-[13px] font-semibold text-white">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          <div className="space-y-1 p-4">
            <ContactRow href={`tel:${DEV.phone.replace(/\s/g, "")}`} icon={Phone} label="Telefon" value={DEV.phone} />
            <ContactRow href={`mailto:${DEV.email}`} icon={Mail} label="E-posta" value={DEV.email} />
            <ContactRow href={DEV.linkedin.href} external icon={LinkedInIcon} label="LinkedIn" value={DEV.linkedin.label} />
            <ContactRow href={DEV.website.href} external icon={Globe} label="Web Sitesi" value={DEV.website.label} />
          </div>
        </div>

        <div className="rounded-xl border bg-card shadow-sm lg:col-span-7">
          <div className="p-6 md:p-8">
            <div className="mb-6 border-b pb-4">
              <div className={cn("mb-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider", accentText)}>
                <Send className="size-3" />
                Mesaj Formu
              </div>
              <h3 className="text-xl font-extrabold tracking-tight text-text">Mesajınızı Bırakın</h3>
              <p className="mt-1.5 max-w-xl text-sm text-text2">
                Formu doldurun; mesajınız e-posta uygulamanız üzerinden hazır taslak olarak açılır.
              </p>
            </div>

            <form
              className="space-y-6"
              onSubmit={(e) => {
                e.preventDefault();
                if (valid) mailto();
              }}
            >
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-text3">Konu Türü</p>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  {TOPICS.map((t) => {
                    const Icon = t.icon;
                    const active = topic === t.key;
                    return (
                      <button
                        key={t.key}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setTopic(t.key)}
                        className={cn(
                          "flex flex-col items-center gap-1.5 rounded-lg border-2 px-2 py-3 text-xs font-semibold transition-all",
                          active ? TOPIC_TONES[t.tone] : "border-border bg-card text-text3 hover:bg-bg2 hover:text-text2"
                        )}
                      >
                        <Icon className="size-4" />
                        <span className="text-center leading-tight">{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label htmlFor="subject" className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-text3">
                  Konu
                </label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Kısa bir özet — örn. Excel çıktısında hücre biçimi"
                  required
                />
              </div>

              <div>
                <label htmlFor="message" className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-text3">
                  Mesaj
                </label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Detaylı açıklama: hangi sayfada, hangi adımda yaşandı, ne bekleniyordu, ne oldu?"
                  rows={7}
                  required
                  minLength={10}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <div className="mt-1 flex justify-between text-[11px] text-text3">
                  <span>En az 10 karakter</span>
                  <span className={cn(message.trim().length >= 10 && cn("font-semibold", accentText))}>{message.length} karakter</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
                <Button type="button" variant="outline" onClick={mailto} className="gap-2">
                  <Mail className="size-4" />
                  E-posta ile Gönder
                </Button>
                <Button type="submit" disabled={!valid} className="gap-2">
                  <Send className="size-4" />
                  Gönder
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* BİLGİ KARTLARI */}
      <div className="grid gap-4 md:grid-cols-2">
        <InfoCard icon={ShieldCheck} tone="green" eyebrow="Veri Gizliliği" title="Verileriniz size aittir">
          Oluşturduğunuz modeller kendi hesabınızda tutulur. Geliştirici dahil <strong>hiçbir üçüncü taraf</strong>{" "}
          modellerinizi göremez veya indiremez.
        </InfoCard>
        <InfoCard icon={Info} tone="yellow" eyebrow="Sorumluluk Reddi" title="Tahmin aracı">
          Platform; üretim, mahsuplaşma ve yatırım getirisi hesaplarında yol gösterici bir yardımcıdır. Sonuçlar
          <strong> yatırım tavsiyesi veya resmi fizibilite raporu yerine geçmez</strong>; nihai kararlar kullanıcı
          sorumluluğundadır.
        </InfoCard>
      </div>

      <DisclaimerSection />

      <OtherPlatformsSection />
    </div>
  );
}

/* ---------------- Diğer platformlar ---------------- */

interface PlatformItem {
  title: string;
  subtitle: string;
  href?: string;
  status: "here" | "live" | "soon";
  icon: React.ComponentType<{ className?: string }>;
  tone: keyof typeof PLATFORM_TONES;
}

const PLATFORM_TONES = {
  purple: { iconBg: "bg-purple/15 text-purple", ring: "ring-purple/40" },
  yellow: { iconBg: "bg-yellow/20 text-yellow", ring: "ring-yellow/50" },
  blue: { iconBg: "bg-blue/15 text-blue", ring: "ring-blue/40" },
  red: { iconBg: "bg-red/15 text-red", ring: "ring-red/40" },
  green: { iconBg: "bg-green/15 text-green", ring: "ring-green/40" },
  slate: { iconBg: "bg-slate-500/15 text-slate-600 dark:text-slate-300", ring: "ring-slate-400/40" },
} as const;

const PLATFORMS: PlatformItem[] = [
  { title: "Solar Fizibilite Platformu", subtitle: "GES yatırım & geri ödeme analizi", status: "here", icon: LineChart, tone: "green" },
  { title: "Teklif Platformu", subtitle: "Solar EPC teklif yönetimi & kapsam-maliyet", href: "https://teklif.fozanseyfi.com", status: "live", icon: TrendingUp, tone: "blue" },
  { title: "Proje Yönetim Platformu", subtitle: "Çoklu proje, ekip & ilerleme takibi", href: "https://proje.fozanseyfi.com", status: "live", icon: FolderKanban, tone: "purple" },
  { title: "Satınalma Karar Destek", subtitle: "Çoklu kriterli skor ile en doğru tedarik", href: "https://karardestek.fozanseyfi.com", status: "live", icon: Trophy, tone: "yellow" },
  { title: "Konstrüksiyon BoM Platformu", subtitle: "Konstrüksiyon malzeme listesi (BoM) hazırlama", status: "live", icon: Boxes, tone: "slate" },
  { title: "GES Mühendislik Platformu", subtitle: "Tasarım, hesap & teknik dokümantasyon", status: "soon", icon: Wrench, tone: "red" },
];

function OtherPlatformsSection() {
  return (
    <section className="relative mt-8 overflow-hidden rounded-2xl border border-yellow/30 bg-gradient-to-br from-yellow/10 via-yellow/5 to-card p-6 md:p-8">
      <div className="mb-1.5">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow/40 bg-yellow/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[1.4px] text-yellow">
          <Sparkles className="size-3" />
          Diğer Ücretsiz Platformlarım
        </span>
      </div>
      <h2 className="text-xl font-extrabold tracking-tight text-text md:text-2xl">Geliştirdiğim diğer platformlara da göz atın</h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-text2">
        Hepsi tamamen ücretsiz, <strong className="text-text">bağımsız bir inisiyatifle</strong> sektör paydaşlarına
        sunuluyor. Diğer platformlara ulaşmak için kart üzerine tıklamanız yeterli.
      </p>
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        {PLATFORMS.map((p) => (
          <PlatformCard key={p.title} item={p} />
        ))}
      </div>
    </section>
  );
}

function PlatformCard({ item }: { item: PlatformItem }) {
  const Icon = item.icon;
  const tone = PLATFORM_TONES[item.tone];
  const isHere = item.status === "here";
  const isSoon = item.status === "soon";
  const linked = !!item.href && !isHere && !isSoon;

  const inner = (
    <div
      className={cn(
        "relative h-full rounded-xl border bg-card p-4 transition-all",
        isHere
          ? `border-yellow/60 shadow-sm ring-2 ${tone.ring}`
          : isSoon || !linked
            ? "border-border opacity-90"
            : "cursor-pointer border-border hover:-translate-y-0.5 hover:border-text3 hover:shadow-md"
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className={cn("inline-flex size-10 items-center justify-center rounded-lg", tone.iconBg)}>
          <Icon className="size-5" />
        </span>
        <StatusBadge status={item.status} />
      </div>
      <div className="text-sm font-bold leading-tight tracking-tight text-text" data-no-i18n>{item.title}</div>
      <div className="mt-1 text-[12px] leading-snug text-text2">{item.subtitle}</div>
      {linked && (
        <div className={cn("mt-2 inline-flex items-center gap-1 text-[11px] font-bold", accentText)}>
          Aç <ArrowUpRight className="size-3" />
        </div>
      )}
    </div>
  );

  if (linked) {
    return (
      <a href={item.href} target="_blank" rel="noopener noreferrer" className="group block">
        {inner}
      </a>
    );
  }
  return inner;
}

function StatusBadge({ status }: { status: PlatformItem["status"] }) {
  if (status === "here")
    return <span className="inline-flex items-center rounded-md bg-yellow px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-sm">Buradasın</span>;
  if (status === "soon")
    return <span className="inline-flex items-center rounded-md bg-bg3 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-text3">Yakında</span>;
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-green/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-green">
      <span className="size-1.5 animate-pulse rounded-full bg-green" />
      Canlı
    </span>
  );
}

/* ---------------- Yasal bildirim ---------------- */

const DISCLAIMER_SECTIONS: { n: string; title: string; body: React.ReactNode }[] = [
  {
    n: "1",
    title: "Bilgi Amaçlı Kullanım",
    body: (
      <>
        Bu platform; GES yatırımlarında üretim, mahsuplaşma ve finansal getiri tahmini yapmak için geliştirilmiş bir{" "}
        <strong className="text-text">karar destek ve hesaplama aracıdır</strong>. Sunulan sonuçlar yatırım tavsiyesi,
        resmi fizibilite raporu veya bağlayıcı bir teklif değildir.
      </>
    ),
  },
  {
    n: "2",
    title: "Tarife ve Piyasa Verileri",
    body: (
      <>
        Tarife, PTF, kur ve maliyet varsayımları <strong className="text-text">örnek referans değerlerdir</strong>; güncel
        mevzuatı ve piyasa koşullarını yansıtma garantisi yoktur. Karar öncesinde güncel EPDK tarifeleri ve kendi
        tekliflerinizle güncellemeniz önerilir.
      </>
    ),
  },
  {
    n: "3",
    title: "Hesaplama Doğruluğu",
    body: (
      <>
        NPV, IRR, LCOE, DSCR ve nakit akışı hesapları kullanıcının girdiği değerlere ve seçtiği varsayımlara dayanır.
        Çıktılar <strong className="text-text">mühendislik, finans veya hukuki danışmanlık yerine geçmez</strong>.
      </>
    ),
  },
  {
    n: "4",
    title: "Kullanıcı Sorumluluğu",
    body: (
      <>
        Oluşturulan modellerin, raporların ve diğer çıktıların içeriği, doğruluğu, üçüncü taraflarla paylaşılması ve
        sonuçları <strong className="text-text">tamamen kullanıcının sorumluluğundadır</strong>.
      </>
    ),
  },
  {
    n: "5",
    title: "Sorumluluk Sınırlaması",
    body: (
      <>
        Platform sahibi ve geliştiricisi; platformun kullanımından, hesaplama hatalarından veya çıktılara dayanılarak
        alınan kararlardan doğan doğrudan ya da dolaylı zararlardan{" "}
        <strong className="text-text">hiçbir şekilde sorumlu tutulamaz</strong>.
      </>
    ),
  },
  {
    n: "6",
    title: "Hizmet Sunumu",
    body: (
      <>
        Platform &quot;olduğu gibi&quot; sunulur; kesintisiz erişim veya hatasız çalışma konusunda{" "}
        <strong className="text-text">hiçbir garanti verilmez</strong>. Geliştirici, platformu önceden bildirmeksizin
        güncelleme veya durdurma hakkını saklı tutar.
      </>
    ),
  },
];

function DisclaimerSection() {
  return (
    <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex items-start gap-4 border-b border-yellow/30 bg-gradient-to-r from-yellow/15 via-yellow/5 to-card px-6 py-5">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-yellow text-white shadow-sm">
          <Scale className="size-5" />
        </span>
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[1.4px] text-yellow">
            <ShieldAlert className="size-3" />
            Yasal Bildirim
          </div>
          <h3 className="mt-1 text-xl font-extrabold leading-tight tracking-tight text-text">Disclaimer · Sorumluluk Reddi</h3>
          <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-text2">
            Bu uygulama bir fizibilite hesaplama yardımcısıdır. Yatırım kararları, sözleşmeler ve resmi raporlama için tek
            başına bağlayıcı kabul edilemez. Platformu kullanmaya devam ederek aşağıdaki şartları kabul etmiş sayılırsınız.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-x-8 gap-y-5 px-6 py-6 md:grid-cols-2">
        {DISCLAIMER_SECTIONS.map((s) => (
          <div key={s.n} className="flex gap-3">
            <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-yellow/15 font-mono text-[11px] font-bold tabular-nums text-yellow">
              {s.n}
            </span>
            <div className="min-w-0">
              <h4 className="text-[13px] font-bold tracking-tight text-text">{s.title}</h4>
              <p className="mt-1 text-[12.5px] leading-relaxed text-text2">{s.body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between border-t bg-bg2/30 px-6 py-3 font-mono text-[10px] text-text3">
        <span>
          Sorularınız için: <span className="text-text2">{DEV.email}</span>
        </span>
        <span>solar-fizibilite-platformu</span>
      </div>
    </section>
  );
}

/* ---------------- Yardımcılar ---------------- */

const INFO_TONES = {
  green: { border: "border-green/30 bg-green/5", iconBg: "bg-green text-white", text: "text-green" },
  yellow: { border: "border-yellow/30 bg-yellow/5", iconBg: "bg-yellow text-white", text: "text-yellow" },
} as const;

function InfoCard({
  icon: Icon,
  tone,
  eyebrow,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: keyof typeof INFO_TONES;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  const t = INFO_TONES[tone];
  return (
    <div className={cn("rounded-xl border p-5", t.border)}>
      <div className="flex items-start gap-3">
        <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg shadow-sm", t.iconBg)}>
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <div className={cn("text-[10px] font-bold uppercase tracking-wider", t.text)}>{eyebrow}</div>
          <h4 className="mt-0.5 text-sm font-bold text-text">{title}</h4>
          <p className="mt-2 text-xs leading-relaxed text-text2">{children}</p>
        </div>
      </div>
    </div>
  );
}

function ContactRow({
  href,
  external,
  icon: Icon,
  label,
  value,
}: {
  href: string;
  external?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="flex items-center gap-3 rounded-lg border border-transparent px-3 py-2 transition-colors hover:border-border hover:bg-bg2"
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-bg2 text-text2">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold uppercase tracking-wider text-text3">{label}</div>
        <div className="truncate text-sm font-semibold text-text">{value}</div>
      </div>
    </a>
  );
}
