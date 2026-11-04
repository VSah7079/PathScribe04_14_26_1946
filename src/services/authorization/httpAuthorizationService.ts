// src/services/authorization/httpAuthorizationService.ts
// Batch 616 (PS-484): the API server's version of IAuthorizationService
// (contract: AUTHORIZATION_API.md "What the API server must do" and
// STAFF_ADMIN_API.md §6). The browser never decides access here: each check is
// a question put to the server, which evaluates it from the bearer token with
// the same catalog and requirement rule, audits a high-risk check itself, and
// answers. A server that cannot be reached, or an answer that cannot be read,
// is a refusal (fail closed), never a grant.
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, value } from '../apiServer/httpServiceKit';
import type { AuthorizationSnapshot, IAuthorizationService } from './authorizationService';
import type { CapabilityContext, CapabilityDecision } from './evaluateCapability';

const refused = (capability: string, context: CapabilityContext): CapabilityDecision =>
  ({ capability, allowed: false, reason: 'notGranted', grantedBy: [], missingRequirements: [], context });
const NO_SNAPSHOT: AuthorizationSnapshot = { subject: null, roles: [] };
const BASE = '/api/authorization/authorization';
const route = (method: string): string => methodPath(BASE, method);

export const createHttpAuthorizationService = (client: ApiHttpClient): IAuthorizationService => {
  const routes = buildHttpService<{
    evaluate(capability: string, context?: CapabilityContext): Promise<CapabilityDecision | null>;
    enforce(capability: string, context?: CapabilityContext): Promise<CapabilityDecision | null>;
    grantedCapabilities(): Promise<string[]>;
    snapshot(): Promise<AuthorizationSnapshot>;
  }>(client, {
    evaluate: value('POST', () => route('evaluate'), { body: (capability: string, context?: CapabilityContext) => ({ capability, context: context ?? {} }), missing: null }),
    enforce: value('POST', () => route('enforce'), { body: (capability: string, context?: CapabilityContext) => ({ capability, context: context ?? {} }), missing: null }),
    grantedCapabilities: value('GET', () => route('grantedCapabilities'), { pick: (d: { capabilities: string[] }) => d.capabilities ?? [], missing: [], fallback: [] }),
    snapshot: value('GET', () => route('snapshot'), { missing: NO_SNAPSHOT, fallback: NO_SNAPSHOT }),
  });
  const decide = async (call: (c: string, x?: CapabilityContext) => Promise<CapabilityDecision | null>, capability: string, context: CapabilityContext = {}): Promise<CapabilityDecision> => {
    const d = await call(capability, context);
    return d && typeof d.allowed === 'boolean' ? { ...d, context: d.context ?? context } : refused(capability, context);
  };
  return {
    evaluate: (capability, context) => decide(routes.evaluate, capability, context),
    enforce: (capability, context) => decide(routes.enforce, capability, context),
    grantedCapabilities: async () => new Set(await routes.grantedCapabilities()),
    snapshot: routes.snapshot,
  };
};
