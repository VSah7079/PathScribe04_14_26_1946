// src/pages/SynopticReportPage/hooks/useRevisionReleaseAvailability.ts
// Batch 649: which revision kinds (amendment, correction, addendum) the signed-in person may release on this case,
// for the Amend button, the draft banner and the Amendment window to grey out. The decision is
// services/reports/revisionReleaseCapability.ts; this only supplies the person's capabilities.
import { useMemo } from 'react';
import { useCapabilities } from '@/hooks/useCapabilities';
export type RevisionScope = { id?: string | null; order?: { facilityId?: string | null } | null };
import { revisionReleaseAvailability, type RevisionReleaseAvailability } from '@/services/reports/revisionReleaseCapability';

export function useRevisionReleaseAvailability(scope?: RevisionScope | null): { availability: RevisionReleaseAvailability; loading: boolean } {
  const { has, loading } = useCapabilities();
  // `has` changes identity each render, so key on its answers instead.
  const availability = revisionReleaseAvailability(c => has(c, { caseId: scope?.id ?? null, facilityId: scope?.order?.facilityId ?? null }));
  const { amendment, correction, addendum } = availability.allowed;
  const stable = useMemo(() => availability, [amendment, correction, addendum]); // eslint-disable-line react-hooks/exhaustive-deps
  return { availability: stable, loading };
}
