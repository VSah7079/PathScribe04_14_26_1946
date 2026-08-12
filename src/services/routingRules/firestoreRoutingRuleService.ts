// Stub only — real implementation pending backend cutover.
// mockRoutingRuleService.ts is the active implementation; this satisfies the
// service interface's contract so the swap to a real backend is a
// one-line change in services/index.ts when that backend exists.

// src/services/routingRules/firestoreRoutingRuleService.ts
// TODO: implement Firestore version
const notImplemented = (): never => { throw new Error('firestoreRoutingRuleService: not yet implemented'); };
export const firestoreRoutingRuleService = new Proxy({}, { get: () => notImplemented }) as any;
