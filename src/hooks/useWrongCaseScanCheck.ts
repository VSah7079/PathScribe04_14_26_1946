// src/hooks/useWrongCaseScanCheck.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 729 (Lab Workflow & Batch spec §7.3): listens to bench scans on the
// Grossing screen and flags a cassette, block or slide that belongs to a
// different case from the one open. The rule is services/stationScans/
// wrongCaseScan.ts; this hook resolves the scan, holds the flag and records the
// choice (station scan log, and the audit log for "Continue anyway"). The
// global scan tracking still records the item's location as before.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useState } from 'react';
import { auditService, stationScanEventService } from '@/services';
import { resolveMaterialFromScan } from '@/utils/resolveMaterialFromScan';
import { wrongCaseScan, wrongCaseScanEvent, wrongCaseAuditDetail, type WrongCaseScan, type WrongCaseChoice } from '@/services/stationScans/wrongCaseScan';
import type { ScanEvent } from '@/contexts/ScannerProvider';

export function useWrongCaseScanCheck(openAccession: string | undefined, caseId: string | undefined, who: { stationId: string | null | undefined; userId: string; userName: string }) {
  const [flag, setFlag] = useState<WrongCaseScan | null>(null);

  useEffect(() => {
    if (!openAccession) return;
    const listener = (e: Event) => {
      const scan = (e as CustomEvent<ScanEvent>).detail;
      const raw = scan?.raw?.trim();
      if (!raw || raw.toUpperCase().startsWith('STATION:')) return;
      void resolveMaterialFromScan(raw).then(resolved => {
        if (!resolved) return;
        const itemAccession = resolved.caseData.accession?.fullAccession ?? resolved.caseData.id;
        const found = wrongCaseScan({ itemId: raw, materialType: resolved.target.level, itemAccession }, openAccession);
        if (found) setFlag(found);
      }).catch(() => undefined);
    };
    window.addEventListener('PATHSCRIBE_SCAN', listener);
    return () => window.removeEventListener('PATHSCRIBE_SCAN', listener);
  }, [openAccession]);

  const choose = useCallback((choice: WrongCaseChoice) => {
    const f = flag;
    setFlag(null);
    if (!f) return;
    if (who.stationId) void stationScanEventService.recordMany([wrongCaseScanEvent(f, choice, { stationId: who.stationId, userId: who.userId, userName: who.userName })]).catch(() => undefined);
    if (choice === 'continued') {
      void auditService.logEvent({ type: 'user', event: 'Wrong Case Scan Continued', detail: wrongCaseAuditDetail(f, choice), user: who.userName, caseId: caseId ?? '', confidence: null }).catch(() => undefined);
    }
  }, [flag, who.stationId, who.userId, who.userName, caseId]);

  return { flag, choose };
}
