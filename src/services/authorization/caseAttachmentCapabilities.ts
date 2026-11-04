// src/services/authorization/caseAttachmentCapabilities.ts
// Batch 742 (Pete, Case Image & File Attachments, Release 1, Oct 30, 2026): one capability per action.
//   case:attachment:upload   Attach External File: a PDF, JPG or PNG sent to the hospital's storage through the
//                            storage adapter; only the pointer is kept (services/caseAttachments/caseAttachments.ts).
//   case:attachment:link     an https link into a hospital system attached to the case.
//   case:attachment:unlink   Remove from case: unlinks only, the file is never deleted.
// Placing in the report stays report:case-images:attach (capabilityCatalog.ts, Batch 609).
// Seeds (capabilitySeeds.ts): the roles with case access, as for report:case-images:attach.
// Kept in its own file so capabilityCatalog.ts stays under 1,000 lines.
import type { CapabilityDefinition } from './capabilityCatalog';

export const CASE_ATTACHMENT_CAPABILITIES = [
  { key: 'case:attachment:upload', labelId: 'caseAttachmentUpload', group: 'casework', risk: 'standard', requires: [] },
  { key: 'case:attachment:link', labelId: 'caseAttachmentLink', group: 'casework', risk: 'standard', requires: [] },
  { key: 'case:attachment:unlink', labelId: 'caseAttachmentUnlink', group: 'casework', risk: 'standard', requires: [] },
] as const satisfies readonly CapabilityDefinition[];
