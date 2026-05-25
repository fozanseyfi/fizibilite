import * as React from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
  className,
}: {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ size?: number | string; className?: string }>;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4", className)}>
      <div className="flex items-start gap-3 min-w-0">
        {Icon && (
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-accent/10 text-accent shrink-0">
            <Icon size={20} />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="font-display text-xl sm:text-2xl font-extrabold text-text tracking-tight leading-tight">
            {title}
          </h1>
          {description && <p className="text-sm text-text2 mt-1">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
