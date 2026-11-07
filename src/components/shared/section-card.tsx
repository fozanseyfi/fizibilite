import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Hesabım / Kullanıcılar sayfalarındaki bölüm kartı (teklif platformuyla aynı düzen). */
export function SectionCard({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="space-y-5 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <IconBox icon={Icon} />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        <div className="sm:ml-12">{children}</div>
      </CardContent>
    </Card>
  );
}

export function IconBox({
  icon: Icon,
  size = "md",
}: {
  icon: React.ComponentType<{ className?: string }>;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg bg-primary/10 text-solar-dark dark:text-solar-light",
        size === "sm" && "size-7 rounded-md",
        size === "md" && "size-9",
        size === "lg" && "size-11 rounded-xl bg-sidebar text-white dark:text-white"
      )}
    >
      <Icon className={size === "sm" ? "size-3.5" : size === "lg" ? "size-5" : "size-4"} />
    </div>
  );
}

export function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export function FormMessage({ tone, children }: { tone: "error" | "success"; children: React.ReactNode }) {
  return (
    <p
      className={cn(
        "rounded-md border px-3 py-2 text-xs font-medium",
        tone === "error"
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-eco/30 bg-eco/10 text-eco-dark dark:text-eco-light"
      )}
    >
      {children}
    </p>
  );
}

export function FeatureChip({
  icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg border bg-secondary/40 px-3 py-2.5">
      <IconBox icon={icon} size="sm" />
      <div className="min-w-0">
        <p className="text-[11.5px] font-semibold leading-tight">{title}</p>
        <p className="mt-0.5 text-[10.5px] leading-tight text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

export const formatDateTr = (iso: string) =>
  new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
