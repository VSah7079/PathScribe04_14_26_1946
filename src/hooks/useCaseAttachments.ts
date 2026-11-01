// src/hooks/useCaseAttachments.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 742 (Pete, Case Image & File Attachments, Release 1): the Attachments window's state and actions. Every
// decision is in services: the rows and the badge count (attachmentCatalog.ts), the file checks and the upload
// through the storage adapter (caseAttachments.ts), placing in a section and the signed-report rule
// (caseReportImages.ts, reportEditState.ts). This keeps the lists current and runs the calls.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addAttachmentLink, amendmentService, attachExternalFile, attachmentStorageService, buildAttachmentRows,
  insertIntoReport, isOverWarningSize, listCaseAttachments, listCaseReportImages, placementItemFor,
  subscribeCaseAttachments, subscribeCaseReportImages, takeOutOfReport, unlinkAttachment,
  type AttachmentRow, type PlacementSection, type ReportEditState,
} from '@/services';
import { reportEditStateFor } from '@/services/caseAttachments/reportEditState';

export type AttachmentsProblem = { code: string; values?: Record<string, string | number> };

interface Input {
  caseData: { id?: string; status?: string; reportingMode?: string; specimens?: unknown[]; intraoperativeFindings?: unknown[] } | null;
  caseId: string;
  accession: string;
  facilityId: string | null;
  user: string;
}

const ERROR_FALLBACK = 'failed';

export function useCaseAttachments({ caseData, caseId, accession, facilityId, user }: Input) {
  const ref = useMemo(() => ({ caseId, accession }), [caseId, accession]);
  const [attachments, setAttachments] = useState(() => listCaseAttachments(ref));
  const [placements, setPlacements] = useState(() => listCaseReportImages(ref));
  const [reportState, setReportState] = useState<ReportEditState>({ signed: false, amendmentOpen: false });
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<AttachmentsProblem | null>(null);
  const [notice, setNotice] = useState<AttachmentsProblem | null>(null);
  const [pendingLargeFile, setPendingLargeFile] = useState<File | null>(null);

  useEffect(() => {
    setAttachments(listCaseAttachments(ref));
    setPlacements(listCaseReportImages(ref));
    const offA = subscribeCaseAttachments(() => setAttachments(listCaseAttachments(ref)));
    const offP = subscribeCaseReportImages(() => setPlacements(listCaseReportImages(ref)));
    return () => { offA(); offP(); };
  }, [ref]);

  useEffect(() => {
    let live = true;
    void amendmentService.getByCaseId(caseId).then(r => {
      if (live) setReportState(reportEditStateFor(caseData?.status, r.ok ? r.data : [], caseData?.reportingMode));
    }).catch(() => { if (live) setReportState(reportEditStateFor(caseData?.status, [], caseData?.reportingMode)); });
    return () => { live = false; };
  }, [caseId, caseData?.status, caseData?.reportingMode]);

  const rows = useMemo(() => buildAttachmentRows(caseData as never, attachments, placements), [caseData, attachments, placements]);

  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | null> => {
    setBusy(true);
    setProblem(null);
    setNotice(null);
    try { return await fn(); } catch { setProblem({ code: ERROR_FALLBACK }); return null; } finally { setBusy(false); }
  }, []);

  const upload = useCallback(async (file: File) => {
    setPendingLargeFile(null);
    const out = await run(() => attachExternalFile({ caseId, accession, facilityId, file, user }));
    if (out && out.ok === false) setProblem({ code: out.problem });
    if (out?.ok) setNotice({ code: 'uploaded' });
  }, [run, caseId, accession, facilityId, user]);

  /** A file picked: over the warning size it waits for "Attach anyway"; otherwise it goes straight up. */
  const pickFile = useCallback((file: File | undefined) => {
    if (!file) return;
    if (isOverWarningSize(file.size)) { setProblem(null); setPendingLargeFile(file); return; }
    void upload(file);
  }, [upload]);

  const addLink = useCallback(async (url: string) => {
    const out = await run(() => addAttachmentLink({ caseId, accession, facilityId, url, user }));
    if (out && out.ok === false) setProblem({ code: out.problem });
    return !!out?.ok;
  }, [run, caseId, accession, facilityId, user]);

  const unlink = useCallback(async (attachmentId: string) => {
    const out = await run(() => unlinkAttachment(attachmentId, user, facilityId));
    if (out && out.ok === false) setProblem({ code: out.problem });
  }, [run, user, facilityId]);

  const insert = useCallback(async (chosen: readonly AttachmentRow[], captions: Record<string, string>, section: PlacementSection | null) => {
    const items = chosen.map(r => placementItemFor(r, captions[r.key] ?? r.placement?.caption ?? ''));
    const out = await run(() => insertIntoReport({ caseId, accession, facilityId, items, section, user, reportState }));
    if (out && out.ok === false) setProblem({ code: out.reason });
    if (out?.ok) setNotice({ code: 'inserted', values: { number: out.placed } });
    return !!out?.ok;
  }, [run, caseId, accession, facilityId, user, reportState]);

  const takeOut = useCallback(async (imageId: string) => {
    const out = await run(() => takeOutOfReport(imageId, user, facilityId, reportState));
    if (out && out.ok === false) setProblem({ code: out.reason });
  }, [run, user, facilityId, reportState]);

  /** Opens a row in a new tab: its own link, or a fresh read link for a file in the hospital's storage. */
  const open = useCallback(async (row: AttachmentRow) => {
    if (row.imageUrl) { window.open(row.imageUrl, '_blank', 'noopener'); return; }
    if (row.pointer?.kind !== 'objectKey') return;
    const link = await attachmentStorageService.getReadLink(row.pointer, 'view');
    if (link.ok) window.open(link.data.url, '_blank', 'noopener');
    else setProblem({ code: 'unavailable' });
  }, []);

  return {
    rows, placements, reportState, busy, problem, notice, pendingLargeFile,
    pickFile, confirmLargeFile: () => { if (pendingLargeFile) void upload(pendingLargeFile); }, cancelLargeFile: () => setPendingLargeFile(null),
    addLink, unlink, insert, takeOut, open, clearProblem: () => { setProblem(null); setNotice(null); },
  };
}

/** The badge's number for a case (used where the window is not open). */
export function useCaseAttachmentCount(caseData: Input['caseData'], caseId: string | undefined, accession: string | undefined): number {
  const ref = useMemo(() => ({ caseId: caseId ?? null, accession: accession ?? null }), [caseId, accession]);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const offA = subscribeCaseAttachments(() => setTick(n => n + 1));
    const offP = subscribeCaseReportImages(() => setTick(n => n + 1));
    return () => { offA(); offP(); };
  }, []);
  return useMemo(() => buildAttachmentRows(caseData as never, listCaseAttachments(ref), listCaseReportImages(ref)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [caseData, ref, tick]);
}

