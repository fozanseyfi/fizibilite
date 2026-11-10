'use client';

import { numLocale } from '@/lib/i18n';

import { useCallback, useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PrintReport } from '@/components/models/native/mdl-kit';
import * as CiR from '@/components/models/native/ci-render';
import * as UtR from '@/components/models/native/utility-render';
import { computeCi, type CiInputs } from '@/lib/models/ci/engine';
import { defaultCiInputs } from '@/lib/models/ci/defaults';
import { PROFILE_LABELS, type ProfileKey } from '@/lib/models/ci/presets';
import { computeUtility, computeUtilityHuawei, type UtilityInputs } from '@/lib/models/utility/engine';
import { defaultUtilityInputs } from '@/lib/models/utility/defaults';
import type { StoredProject } from '@/lib/project-store';
import { computeBessCi, type BessCiInputs } from '@/lib/models/bess/ci';
import { computeBessUtility, type BessUtilityInputs } from '@/lib/models/bess/utility';
import { bessCiFromSaved, bessUtilityFromSaved } from '@/lib/models/bess/defaults';
import { reportBessCi, reportBessUtility } from '@/components/models/native/bess-report';

const today = () => new Date().toLocaleDateString(numLocale(), { day: 'numeric', month: 'long', year: 'numeric' });

/** Kayıtlı projenin girdilerinden, model ekranındaki "Rapor çıktısı al" ile aynı raporu üretir. */
export function buildReportHtml(project: StoredProject): string {
  const meta = (i: { pname?: string; prep?: string; firm?: string; loc?: string }) => ({ title: i.pname || project.name, prep: i.prep, firm: i.firm, loc: i.loc, date: today() });
  if (project.kind === 'bess-ci') {
    const i: BessCiInputs = bessCiFromSaved(project.inputs as Partial<BessCiInputs>);
    return reportBessCi(i, computeBessCi(i), meta(i));
  }
  if (project.kind === 'bess-utility') {
    const i: BessUtilityInputs = bessUtilityFromSaved(project.inputs as Partial<BessUtilityInputs>);
    return reportBessUtility(i, computeBessUtility(i), meta(i));
  }
  if (project.kind === 'ci') {
    const i: CiInputs = { ...defaultCiInputs(), ...(project.inputs as Partial<CiInputs>) };
    const m = computeCi(i);
    return CiR.reportCi(i, m, {
      title: i.pname || project.name,
      prep: i.prep,
      firm: i.firm,
      loc: i.loc,
      date: today(),
      profileLabel: PROFILE_LABELS[i.profileId as ProfileKey] || i.profileId,
    });
  }
  const i: UtilityInputs = { ...defaultUtilityInputs(), ...(project.inputs as Partial<UtilityInputs>) };
  const p = UtR.paramsOf(i);
  const m = computeUtility(i);
  const hw = computeUtilityHuawei(i, m);
  return UtR.reportUtility(
    i, p, m, hw,
    { title: i.pname || project.name, prep: i.prep, firm: i.firm, loc: i.loc, date: today() },
    UtR.techPresets(i)
  );
}

/**
 * Liste sayfalarında doğrudan rapor almak için. Sayfada TEK bir rapor alanı
 * (`printer`) olur; satırlardaki düğmeler `print(project)` çağırır.
 */
export function useProjectReport() {
  const [html, setHtml] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const print = useCallback((project: StoredProject) => {
    setBusyId(project.id);
    // Hesap birkaç yüz ms sürebilir — önce "hazırlanıyor" durumu çizilsin
    setTimeout(() => {
      try {
        setHtml(buildReportHtml(project));
      } finally {
        setBusyId(null);
      }
    }, 20);
  }, []);

  const close = useCallback(() => setHtml(null), []);

  const printer = (
    <PrintReport open={html !== null} onClose={close}>
      {html && <div dangerouslySetInnerHTML={{ __html: html }} />}
    </PrintReport>
  );

  return { print, busyId, printer };
}

export function ReportButton({ busy, onClick }: { busy: boolean; onClick: () => void }) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick} disabled={busy} className="h-8 gap-1.5 whitespace-nowrap">
      {busy ? <Loader2 className="size-3.5 animate-spin" /> : <FileDown className="size-3.5" />}
      Rapor al
    </Button>
  );
}
