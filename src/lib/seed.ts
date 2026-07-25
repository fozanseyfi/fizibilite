import { listProjects, upsertProject, getProject, nowIso, ProjectRow } from '@/lib/db';
import { DEMO_PROJECTS } from '@/lib/models/demo';
import { computeSummary, projectName } from '@/lib/models/compute';

/** Portföy boşsa demo projeleri (her iki model türünden) yükler. */
export function autoSeedIfEmpty(): void {
  if (listProjects().length > 0) return;
  const now = nowIso();
  for (const demo of DEMO_PROJECTS) {
    if (getProject(demo.id)) continue;
    const summary = computeSummary(demo.config);
    const row: ProjectRow = {
      id: demo.id,
      name: projectName(demo.config),
      projectType: demo.config.kind,
      status: 'completed',
      configJson: JSON.stringify(demo.config),
      resultsJson: JSON.stringify(summary),
      createdAt: now,
      updatedAt: now,
    };
    upsertProject(row);
  }
}
