// src/services/authorization/requisitionCapabilities.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 762 (Automated Batch Requisition & Document Ingestion spec §3, Pete, Nov 2, 2026): one capability per action.
// Each is checked in services/requisitions/requisitionService.ts (authorizationService.enforce); the Requisition Inbox
// screen by its route (services/screens/screenAccess.ts, sub-screen 'requisitionInbox').
//
//   requisition:ingestion:run             run the ingestion job now (the scheduled job runs as its own service
//                                         identity on the server). Audited: every match and every quarantine.
//   requisition:inbox:review              open the Requisition Inbox: the Unmatched Requisitions queue, recent links
//                                         and runs, and view an unmatched scan. Viewing is audited.
//   requisition:inbox:resolve             link an unmatched scan to a case, or discard it with a reason. Audited.
//   case:requisition:view                 open a case's linked requisition from the case. Audited ("Requisition Viewed").
//   config:requisition-ingestion:manage   the ingestion sources: the watched folder or sending system, how often the
//                                         job looks, and the separator-sheet barcode. Audited.
//
// Seeds (capabilitySeeds.ts): the roles that open Accession get the first three; the roles with case access get
// case:requisition:view; Admin gets the configuration with the other configuration sections. Pathologist: the view only.
// Kept in its own file so capabilityCatalog.ts stays under 1,000 lines.
// ─────────────────────────────────────────────────────────────────────────────
import type { CapabilityDefinition } from './capabilityCatalog';

export const REQUISITION_CAPABILITIES = [
  { key: 'requisition:ingestion:run', labelId: 'requisitionIngestionRun', group: 'casework', risk: 'standard', requires: [] },
  { key: 'requisition:inbox:review', labelId: 'requisitionInboxReview', group: 'casework', risk: 'high', requires: [] },
  { key: 'requisition:inbox:resolve', labelId: 'requisitionInboxResolve', group: 'casework', risk: 'high', requires: ['requisition:inbox:review'] },
  { key: 'case:requisition:view', labelId: 'caseRequisitionView', group: 'casework', risk: 'standard', requires: [] },
  { key: 'config:requisition-ingestion:manage', labelId: 'configRequisitionIngestionManage', group: 'configIntegrations', risk: 'high', requires: [] },
] as const satisfies readonly CapabilityDefinition[];
