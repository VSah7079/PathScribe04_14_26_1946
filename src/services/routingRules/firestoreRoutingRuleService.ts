// src/services/routingRules/firestoreRoutingRuleService.ts
// TODO: implement Firestore version
const notImplemented = (): never => { throw new Error('firestoreRoutingRuleService: not yet implemented'); };
export const firestoreRoutingRuleService = new Proxy({}, { get: () => notImplemented }) as any;
