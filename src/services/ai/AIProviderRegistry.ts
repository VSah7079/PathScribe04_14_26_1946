// src/services/ai/AIProviderRegistry.ts
// ─────────────────────────────────────────────────────────────
// Resolves the active IAIProvider from the configured AiProviderConfig.
//
// This is the single place that maps provider IDs to concrete
// implementations. The rest of the codebase only imports IAIProvider —
// never a concrete provider class or MockProvider directly.
//
// Usage:
//   const provider = AIProviderRegistry.getActive();
//   const result   = await provider.generateStream(request, onToken);
//
// Real fix: all six providers are now genuinely wired here - previously
// only structured_messages and mock were implemented, and every other
// provider silently fell back to MockProvider with a console warning,
// even though aiProviderService.ts's non-streaming callAi() already
// supported all of them. See each provider's own file for real,
// verified request/response protocol details; model_gateway (Bedrock)
// carries an honest, documented dependency on the backend proxy
// normalizing AWS's raw binary event-stream response into simple SSE -
// see ModelGatewayProvider.ts's header for why that's a proxy
// responsibility, not something parsed raw in the browser.
// ─────────────────────────────────────────────────────────────

import { resolveAiConfig, aiHostingRegion } from '../../components/Config/AI/aiProviderConfig';
import type { AiCallContext } from '../aiIntegration/aiCallPolicy';
import { withAiVendorPolicy } from './withAiVendorPolicy';
import type { IAIProvider }  from './IAIProvider';
import { StructuredMessagesProvider }        from './providers/StructuredMessagesProvider';
import { ChatCompletionsProvider }           from './providers/ChatCompletionsProvider';
import { ChatCompletionsManagedProvider }    from './providers/ChatCompletionsManagedProvider';
import { ModelGatewayProvider }              from './providers/ModelGatewayProvider';
import { StructuredContentProvider }         from './providers/StructuredContentProvider';
import { CustomProvider }                    from './providers/CustomProvider';
import { MockProvider }      from './providers/MockProvider';

export class AIProviderRegistry {

  /**
   * Returns the currently configured IAIProvider.
   *
   * Priority chain (highest wins):
   *   user override > org config > env defaults
   *
   * Call this at the start of any AI generation request.
   */
  static getActive(context?: AiCallContext): IAIProvider {
    const provider = AIProviderRegistry.resolveActive();
    // Batch 536 (PS-558): every generation is checked against the AI vendor
    // policy of the jurisdiction the work belongs to.
    return withAiVendorPolicy(provider, { region: aiHostingRegion(resolveAiConfig()) }, context ?? { feature: 'narrative' });
  }

  private static resolveActive(): IAIProvider {
    const config = resolveAiConfig();

    switch (config.providerId) {

      case 'mock':
        return new MockProvider();

      case 'structured_messages':
        return new StructuredMessagesProvider(config.modelId);

      case 'chat_completions':
        return new ChatCompletionsProvider(config.modelId);

      case 'chat_completions_managed':
        return new ChatCompletionsManagedProvider(
          config.modelId, config.managedEndpoint, config.managedDeploymentName,
        );

      case 'model_gateway':
        return new ModelGatewayProvider(config.modelId, config.gatewayRegion);

      case 'structured_content':
        return new StructuredContentProvider(config.modelId);

      case 'custom':
        return new CustomProvider(config.modelId, config.customEndpoint);

      default:
        console.error(
          `[AIProviderRegistry] Unknown provider '${(config as any).providerId}'. ` +
          `Falling back to MockProvider.`,
        );
        return new MockProvider(0);
    }
  }

  /**
   * Returns a specific provider by ID, ignoring org config.
   * Used for the "Test Connection" button in AiProviderSettings.
   */
  static getById(providerId: string, modelId?: string): IAIProvider {
    const config = resolveAiConfig();
    switch (providerId) {
      case 'mock':
        return new MockProvider(0); // instant for test
      case 'structured_messages':
        return new StructuredMessagesProvider(modelId ?? 'claude-sonnet-4-6');
      case 'chat_completions':
        return new ChatCompletionsProvider(modelId ?? 'gpt-4o');
      case 'chat_completions_managed':
        return new ChatCompletionsManagedProvider(
          modelId ?? 'gpt-4o', config.managedEndpoint, config.managedDeploymentName,
        );
      case 'model_gateway':
        return new ModelGatewayProvider(modelId ?? 'anthropic.claude-sonnet-4-6-v1:0', config.gatewayRegion);
      case 'structured_content':
        return new StructuredContentProvider(modelId ?? 'gemini-1.5-flash');
      case 'custom':
        return new CustomProvider(modelId ?? 'custom', config.customEndpoint);
      default:
        return new MockProvider(0);
    }
  }
}
