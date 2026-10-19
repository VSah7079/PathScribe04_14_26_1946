// src/hooks/useCaseReportImages.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 609 (PS-44): the Attach images screen's state: the images linked to a
// report, linking one and taking one off. Every decision (the https link check,
// permission, the audit entry) is in services/imageAssociation/caseReportImages.ts;
// this only keeps the list current.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';
import {
  attachCaseReportImage, removeCaseReportImage, listCaseReportImages, subscribeCaseReportImages,
  type AttachFailure, type CaseReportImage,
} from '@/services';

export type AttachProblem = AttachFailure | 'failed';

export function useCaseReportImages(input: { caseId: string; accession: string; facilityId: string | null; user: string }) {
  const { caseId, accession, facilityId, user } = input;
  const read = useCallback(() => [...listCaseReportImages({ caseId, accession })], [caseId, accession]);
  const [images, setImages] = useState<CaseReportImage[]>(read);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<AttachProblem | null>(null);

  useEffect(() => {
    setImages(read());
    return subscribeCaseReportImages(() => setImages(read()));
  }, [read]);

  const attach = useCallback(async (url: string, imageType: string, caption: string) => {
    setBusy(true);
    setProblem(null);
    try {
      const result = await attachCaseReportImage({ caseId, accession, facilityId, url, imageType, caption, user });
      if (result.ok === false) setProblem(result.reason);
      return result.ok;
    } catch {
      setProblem('failed');
      return false;
    } finally {
      setBusy(false);
    }
  }, [caseId, accession, facilityId, user]);

  const remove = useCallback(async (imageId: string) => {
    setProblem(null);
    const result = await removeCaseReportImage(imageId, user, facilityId);
    if (!result.ok) setProblem(result.reason === 'notPermitted' ? 'notPermitted' : 'failed');
  }, [user, facilityId]);

  return { images, busy, problem, attach, remove, clearProblem: () => setProblem(null) };
}
