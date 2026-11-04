// src/services/ai/withAiVendorPolicy.ts
// Batch 536 (PS-558): the streaming providers (narrative generation through
// the orchestrator) are checked against the jurisdiction's AI vendor policy
// the same way callAi() is (services/aiIntegration/aiCallPolicy.ts): before a
// generation is sent, the service and its hosting region must be allowed
// where the work belongs. A refusal throws AiNotAvailableError (recorded and
// audited); nothing is sent and no other service is tried. The connection
// test is not a generation and isn't checked.
import type { IAIProvider, AIGenerationRequest, AIStreamCallback } from './IAIProvider';
import type { AiProviderId } from '@/components/Config/AI/aiProviderConfig';
import { checkAiCall, defaultAiCallPolicyDeps, type AiCallContext, type AiCallPolicyDeps } from '../aiIntegration/aiCallPolicy';

export function withAiVendorPolicy(
  provider: IAIProvider,
  target: { region?: string },
  context: AiCallContext,
  deps: AiCallPolicyDeps = defaultAiCallPolicyDeps,
): IAIProvider {
  const check = () => checkAiCall({ providerId: provider.providerId as AiProviderId, modelId: provider.modelId, region: target.region }, context, deps);
  return {
    get providerId() { return provider.providerId; },
    get modelId() { return provider.modelId; },
    get displayName() { return provider.displayName; },
    async generate(request: AIGenerationRequest) { await check(); return provider.generate(request); },
    async generateStream(request: AIGenerationRequest, onToken: AIStreamCallback) { await check(); return provider.generateStream(request, onToken); },
    testConnection: () => provider.testConnection(),
  };
}
