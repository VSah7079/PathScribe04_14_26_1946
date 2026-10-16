// src/services/interfaceDispatch/outboundQueueDeps.ts
// Batch 518 (PS-122): the app's real dependencies for outboundQueueActions.ts
// (the queue adapters, the dispatch transport, the authorization service and
// the deficiency service). The Outbound view passes these; tests pass fakes.
import type { OutboundActionDeps } from './outboundQueueActions';
import { loadOutboundQueueAdapters, type OutboundQueueAdapter, type OutboundQueueType } from './outboundQueueAdapters';
import { dispatchInterfaceMessage } from './dispatchInterfaceMessage';

let adapters: Promise<Record<OutboundQueueType, OutboundQueueAdapter>> | null = null;

export const outboundQueueDeps: OutboundActionDeps = {
  adapter: async queue => (await (adapters ??= loadOutboundQueueAdapters()))[queue],
  dispatch: dispatchInterfaceMessage,
  enforce: async (capability, context) => {
    const { authorizationService } = await import('../authorization/defaultAuthorizationService');
    return authorizationService.enforce(capability as never, context ?? {});
  },
  raiseDeficiency: async input => {
    const { specimenDeficiencyService } = await import('../index');
    return specimenDeficiencyService.raise(input);
  },
};
