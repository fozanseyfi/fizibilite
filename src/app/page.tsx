'use client';

import { numLocale } from '@/lib/i18n';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, FolderOpen, Plus } from 'lucide-react';
import { formatPct } from '@/lib/utils';
import { useMyProjects, useProjectsHydrated } from '@/lib/project-store';
import { ReportButton, useProjectReport } from '@/components/models/native/project-report';
import { KIND_SHORT } from '@/lib/models/types';

export default function DashboardPage() {
  const hydrated = useProjectsHydrated();
  const report = useProjectReport();
  const rows = useMyProjects().map((p) => ({
    id: p.id,
    name: p.name,
    kind: p.kind,
    firm: (p.inputs.firm as string) || undefined,
    loc: (p.inputs.loc as string) || undefined,
    summary: p.summary,
    updatedAt: p.updatedAt,
    project: p,
  }));
  if (!hydrated) return null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {rows.length > 0 ? `${rows.length} proje kayıtlı` : 'Henüz proje yok'}
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/projects/new">
            <Plus className="mr-1 h-4 w-4" /> Yeni Proje
          </Link>
        </Button>
      </div>


      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center">
            <FolderOpen className="mx-auto mb-3 h-9 w-9 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">İlk fizibilite çalışmanızı oluşturun.</p>
            <Button asChild size="sm" className="mt-4">
              <Link href="/projects/new">
                <Plus className="mr-1 h-4 w-4" /> Yeni Proje
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b px-5 py-3">
            <h2 className="text-sm font-semibold">Projeler</h2>
            <Link href="/projects" className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
              Tümünü gör <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary/50 text-left text-xs text-muted-foreground">
                  <th className="px-5 py-2.5 font-medium">Proje</th>
                  <th className="px-3 py-2.5 font-medium">Tip</th>
                  <th className="hidden px-3 py-2.5 font-medium md:table-cell">Kapasite</th>
                  <th className="px-3 py-2.5 text-right font-medium">IRR</th>
                  <th className="hidden px-3 py-2.5 text-right font-medium sm:table-cell">Geri Ödeme</th>
                  <th className="hidden px-3 py-2.5 text-right font-medium lg:table-cell">Güncellendi</th>
                  <th className="px-5 py-2.5 text-right font-medium">Rapor</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-secondary/30">
                    <td className="px-5 py-3">
                      <Link href={`/projects/${r.id}`} className="font-medium text-foreground hover:underline" data-no-i18n>
                        {r.name}
                      </Link>
                      {(r.firm || r.loc) && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {[r.firm, r.loc].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">
                      {KIND_SHORT[r.kind] ?? r.kind}
                    </td>
                    <td className="hidden px-3 py-3 tabular-nums md:table-cell">{r.summary?.capacityLabel ?? '—'}</td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {r.summary ? formatPct(r.summary.irrPct * 100) : '—'}
                    </td>
                    <td className="hidden px-3 py-3 text-right tabular-nums sm:table-cell">
                      {r.summary && Number.isFinite(r.summary.paybackYears)
                        ? `${r.summary.paybackYears.toFixed(1)} yıl`
                        : '—'}
                    </td>
                    <td className="hidden px-3 py-3 text-right text-xs text-muted-foreground lg:table-cell">
                      {new Date(r.updatedAt).toLocaleDateString(numLocale())}
                    </td>
                    <td className="px-5 py-2 text-right">
                      <ReportButton busy={report.busyId === r.id} onClick={() => report.print(r.project)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {report.printer}
    </div>
  );
}
