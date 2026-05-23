'use client';

import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { CheckCircle2, AlertTriangle, XCircle, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MasterCheckReport, CheckResult } from '@/lib/pf/types';

export function MasterCheckBadge({ projectId }: { projectId: string }) {
  const [report, setReport] = useState<MasterCheckReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/master-check/${projectId}`)
      .then((r) => r.json())
      .then((data) => { if (!cancelled) setReport(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [projectId]);

  if (loading) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border/40 bg-secondary text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Master Check…
      </span>
    );
  }
  if (!report) return null;

  const status = report.masterCheckPassed
    ? (report.warningCount > 0 ? 'yellow' : 'green')
    : 'red';

  const cfg = {
    green: { color: 'border-eco/50 bg-eco/10 text-eco-dark', icon: CheckCircle2, label: `MASTER CHECK ✓ (${report.passedCount}/${report.totalChecks})` },
    yellow: { color: 'border-amber-400 bg-amber-50 text-amber-800', icon: AlertTriangle, label: `MASTER CHECK ⚠ (${report.warningCount} warning)` },
    red: { color: 'border-destructive bg-destructive/10 text-destructive', icon: XCircle, label: `MASTER CHECK ✗ (${report.failedCount} error)` },
  }[status];

  const Icon = cfg.icon;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-semibold hover:opacity-80 transition-opacity', cfg.color)}
          title="Detayları gör"
        >
          <Icon className="h-3.5 w-3.5" />
          {cfg.label}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-[95vw] max-w-3xl translate-x-[-50%] translate-y-[-50%] gap-3 border bg-background p-6 shadow-lg rounded-lg max-h-[90vh] overflow-y-auto">
          <Dialog.Title className="text-lg font-bold flex items-center gap-2">
            <Icon className={cn('h-5 w-5', status === 'green' ? 'text-eco-dark' : status === 'yellow' ? 'text-amber-600' : 'text-destructive')} />
            Master Check Raporu
          </Dialog.Title>
          <Dialog.Description className="text-sm text-muted-foreground">
            {report.passedCount} geçti · {report.warningCount} uyarı · {report.failedCount} hata · Toplam {report.totalChecks} kontrol
          </Dialog.Description>

          <div className="space-y-1.5 mt-3">
            {[...report.individualResults]
              .sort((a, b) => Number(a.passed) - Number(b.passed))
              .map((c, i) => <CheckRow key={i} check={c} />)
            }
          </div>

          <div className="text-xs text-muted-foreground pt-3 border-t border-border/40">
            Tolerans default %0.01 (1 baz puan). Master Check, model matematik tutarlılığını test eder; banka onayı için zorunludur.
          </div>

          <Dialog.Close asChild>
            <button className="absolute right-4 top-4 rounded-md p-1 hover:bg-secondary" aria-label="Kapat">
              <X className="h-4 w-4" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function CheckRow({ check }: { check: CheckResult }) {
  const icon = check.passed ? '✓' : check.severity === 'warning' ? '⚠' : '✗';
  const colorClass = check.passed ? 'text-eco-dark' : check.severity === 'warning' ? 'text-amber-600' : 'text-destructive';
  return (
    <div className="flex items-start gap-2 py-1.5 px-2 rounded border border-border/30 hover:bg-secondary/50 text-xs">
      <span className={cn('font-bold w-4', colorClass)}>{icon}</span>
      <div className="flex-1">
        <div className="font-medium">{check.name}</div>
        <div className="text-muted-foreground">{check.message}</div>
      </div>
      <div className="text-right font-mono text-[10px] text-muted-foreground whitespace-nowrap">
        {check.expected !== null && check.actual !== null && (
          <>beklenen <span className="text-foreground">{check.expected.toFixed(4)}</span> · gerçek <span className="text-foreground">{check.actual.toFixed(4)}</span></>
        )}
      </div>
    </div>
  );
}
