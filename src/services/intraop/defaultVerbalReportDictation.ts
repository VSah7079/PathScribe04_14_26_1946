// src/services/intraop/defaultVerbalReportDictation.ts
// Batch 400: parseVerbalReportDictation wired to the organisation's AI model
// (the session facility's model when one is set), with the rules as fallback.
import { callAi } from '../aiIntegration/aiProviderService';
import { resolveAiConfigOverrideForClient } from '@/components/Config/AI/resolveClientAiModel';
import { parseVerbalReportDictation, type VerbalReportDictationContext, type VerbalReportDictationProposal } from './parseVerbalReportDictation';

export function parseVerbalReportDictationDefault(
  text: string, ctx: VerbalReportDictationContext, facilityId?: string,
): Promise<VerbalReportDictationProposal> {
  return parseVerbalReportDictation(text, ctx, async opts => {
    const configOverride = await resolveAiConfigOverrideForClient(facilityId);
    return callAi({ ...opts, configOverride, context: { feature: 'intraop', facilityId } });
  });
}
