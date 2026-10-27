// src/services/reports/intraopDiagnosisForCase.ts
// Batch 613: the intraoperative diagnosis belongs to the case report (like an addendum), so every
// output path (screen, PDF, text, outbound result) reads it through this one function.
import { intraoperativeService } from '@/services';
import { resolveIntraopDiagnosisText } from './fullPatientReportRows';

export async function loadIntraopDiagnosisForCase(caseId: string, carried?: Parameters<typeof resolveIntraopDiagnosisText>[2]): Promise<string | null> {
  const res = await intraoperativeService.getAll();
  // Batch 655: when the session cannot be read (or was removed), the copy kept on the case is still shown.
  return resolveIntraopDiagnosisText(res.ok ? res.data : [], caseId, carried);
}
