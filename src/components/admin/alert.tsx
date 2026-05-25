import * as React from "react";
import { cn } from "@/lib/utils";
import { Info, CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";

type Variant = "info" | "success" | "warning" | "error";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const styles: Record<Variant, { wrap: string; icon: React.ComponentType<any> }> = {
  info:    { wrap: "bg-accent/5 border-accent/20 text-text",  icon: Info },
  success: { wrap: "bg-green/5 border-green/20 text-text",    icon: CheckCircle2 },
  warning: { wrap: "bg-yellow/5 border-yellow/30 text-text",  icon: AlertTriangle },
  error:   { wrap: "bg-red/5 border-red/20 text-text",        icon: AlertCircle },
};

const iconColor: Record<Variant, string> = {
  info:    "text-accent",
  success: "text-green",
  warning: "text-yellow",
  error:   "text-red",
};

export function Alert({ variant = "info", className, children }: { variant?: Variant; className?: string; children: React.ReactNode }) {
  const { wrap, icon: Icon } = styles[variant];
  return (
    <div className={cn("flex items-start gap-3 px-4 py-3 rounded-xl border text-sm", wrap, className)}>
      <Icon size={18} className={cn("shrink-0 mt-0.5", iconColor[variant])} />
      <div className="flex-1 leading-snug">{children}</div>
    </div>
  );
}
