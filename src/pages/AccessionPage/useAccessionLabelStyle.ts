// src/pages/AccessionPage/useAccessionLabelStyle.ts
// Batch 715: the letters/numbers style in force for the case being accessioned
// (the ordering facility's performing lab, over its enterprise), and the
// relabelling of the specimens still on the form when that changes. A draft
// specimen has no cassette, slide or barcode yet, so relabelling it is safe;
// once the case is accessioned its labels never change.

import { useEffect, useMemo, type Dispatch, type SetStateAction } from 'react';
import type { Facility } from '@/services/facilities/IFacilityService';
import { resolveLabelStyleForFacility } from '@/services/labeling/resolveLabelStyle';
import type { LabelStyle } from '@/services/labeling/labelStyle';
import { getSpecimenLabel } from '@/utils/specimenLabeling';

export function useAccessionLabelStyle<S extends { label: string }>(
  facility: Facility | undefined,
  facilities: readonly Facility[],
  setSpecimens: Dispatch<SetStateAction<S[]>>,
): LabelStyle {
  const labelStyle = useMemo(() => resolveLabelStyleForFacility(facility, facilities), [facility, facilities]);
  useEffect(() => {
    setSpecimens(prev => {
      const next = prev.map((s, i) => ({ ...s, label: getSpecimenLabel(i, { specimen: labelStyle.specimen }) }));
      return next.every((s, i) => s.label === prev[i].label) ? prev : next;
    });
  }, [labelStyle.specimen, setSpecimens]);
  return labelStyle;
}
