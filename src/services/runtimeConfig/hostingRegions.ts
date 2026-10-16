// src/services/runtimeConfig/hostingRegions.ts
// Batch 557 (readiness review §9 item 7): the rows administrators see for where
// the deployment keeps its data: the database and file storage (from the API
// server's /api/config) and the AI service (Batch 536). Pure.
import type { ServerHosting } from './runtimeSettings';

export type HostingRegionKind = 'database' | 'files' | 'ai';

export function hostingRegionRows(hosting: ServerHosting, aiRegion?: string): { kind: HostingRegionKind; region?: string }[] {
  const ai = aiRegion?.trim();
  return [
    { kind: 'database', ...(hosting.databaseRegion ? { region: hosting.databaseRegion } : {}) },
    { kind: 'files', ...(hosting.blobRegion ? { region: hosting.blobRegion } : {}) },
    { kind: 'ai', ...(ai ? { region: ai } : {}) },
  ];
}
