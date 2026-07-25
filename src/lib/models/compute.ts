// İki model için ortak hesap girişi — sunucu ve istemci tarafında kullanılır.

import type { AnyProjectConfig, ProjectSummary } from './types';
import { computeUtility, utilitySummary } from './utility/engine';
import { computeCi, ciSummary } from './ci/engine';

export function computeSummary(config: AnyProjectConfig): ProjectSummary {
  if (config.kind === 'utility') {
    return utilitySummary(config.inputs, computeUtility(config.inputs));
  }
  return ciSummary(config.inputs, computeCi(config.inputs));
}

export function projectName(config: AnyProjectConfig): string {
  return config.name || config.inputs.pname || 'Adsız Proje';
}
