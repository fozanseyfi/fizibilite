import type { AnyProjectConfig } from './types';
import { defaultUtilityInputs } from './utility/defaults';
import { defaultCiInputs } from './ci/defaults';

export interface DemoProject {
  id: string;
  config: AnyProjectConfig;
}

/** İlk açılışta yüklenen demo projeler — her iki model türünden örnekler. */
export const DEMO_PROJECTS: DemoProject[] = [
  {
    id: 'demo_utility_100mw',
    config: {
      kind: 'utility',
      name: '100 MWp Arazi GES + BESS Projesi',
      inputs: { ...defaultUtilityInputs() },
    },
  },
  {
    id: 'demo_utility_bess',
    config: {
      kind: 'utility',
      name: '80 MWp GES + 50 MWh BESS Hibrit',
      inputs: {
        ...defaultUtilityInputs(),
        pname: '80 MWp GES + 50 MWh BESS Hibrit',
        mw: 80,
        bessOn: true,
      },
    },
  },
  {
    id: 'demo_ci_rooftop',
    config: {
      kind: 'ci',
      name: 'C&I Çatı GES — 1 MWp (Sanayi Tek Vardiya)',
      inputs: { ...defaultCiInputs(), pname: 'C&I Çatı GES — 1 MWp (Sanayi Tek Vardiya)' },
    },
  },
];
