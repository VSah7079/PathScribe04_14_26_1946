// src/services/facilityOpsDashboard/demoDisplayProfileIds.ts
// Batch 747 (seed row S8): the demo wall display profiles' fixed ids, shared by the profile seed
// (mockDisplayProfileService.ts) and the demo token tool (demoReset/demoDisplayTokens.ts) without importing a mock.

/** Batch 747: the demo's Desert Valley wall displays (ids fixed; the token tool names them). */
export const DEMO_DISPLAY_PROFILE_IDS = {
  rotating: 'dispprof-demo-dvmc-rotating', grossing: 'dispprof-demo-dvmc-grossing', embedding: 'dispprof-demo-dvmc-embedding',
  staining: 'dispprof-demo-dvmc-staining', sendOut: 'dispprof-demo-dvmc-sendout', signOut: 'dispprof-demo-dvmc-signout',
  spare: 'dispprof-demo-dvmc-spare', revoked: 'dispprof-demo-dvmc-retired', secondSite: 'dispprof-demo-mpa-histology',
} as const;
