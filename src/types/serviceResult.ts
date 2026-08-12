<<<<<<< HEAD
=======
// Real, still-in-use type — do not delete without also migrating
// services/aiIntegration/ (IAIIntegrationService.ts, MockAIIntegrationService.ts,
// PathScribeAIService.ts) off this {success,data,error} shape first.
// Confirmed via a direct trace: OrchestratorSectionEditor.tsx (a real,
// live component in SynopticReportPage) instantiates PathScribeAIService
// directly (`new PathScribeAIService()`), which returns this shape — not
// dead/legacy code despite most of the rest of the app having since
// moved to the newer {ok, data, meta, error} ServiceResult in
// services/types.ts. Two different ServiceResult conventions genuinely
// coexist in this codebase right now, each internally consistent within
// its own call chain, but inconsistent with each other — worth
// consolidating at some point, not something to guess at here.
>>>>>>> upstream/main
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}
