// src/services/labeling/liveCaseLabelStyle.ts
// Batch 715: resolveCaseLabelStyle wired to the app's facility service, for
// hooks and pages (grossing, report page). Tests use resolveCaseLabelStyle with
// their own deps.

import { facilityService } from '../facilities/facilityServiceInstance';
import { resolveCaseLabelStyle, type CaseLabelStyleSource } from './resolveCaseLabelStyle';
import type { LabelStyle } from './labelStyle';

export function caseLabelStyle(c: CaseLabelStyleSource | null | undefined): Promise<LabelStyle> {
  return resolveCaseLabelStyle(c, {
    getFacilities: async () => {
      const r = await facilityService.getAll();
      return r.ok ? r.data : [];
    },
  });
}
