// src/services/reports/intraopDiagnosisForCase.ts
// Batch 613: the intraoperative diagnosis belongs to the case report (like an addendum), so every
// output path (screen, PDF, text, outbound result) reads it through this one function.
import { intraoperativeService } from '@/services';
import { resolveIntraopDiagnosisText } from './fullPatientReportRows';

export async function loadIntraopDiagnosisForCase(caseId: string): Promise<string | null> {
  const res = await intraoperativeService.getAll();
  if (!res.ok) return null;
  return resolveIntraopDiagnosisText(res.data, caseId);
}
