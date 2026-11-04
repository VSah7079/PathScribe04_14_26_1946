// src/services/templates/demoChecklistRemovalDeps.ts
// Batch 754: the real dependencies of removeDemoChecklists (demoChecklistRemoval.ts): the authorization service, the
// synoptic library (the protocol registry), templateService.archiveTemplate and the Audit Log.
import { PROTOCOL_REGISTRY, notifyRegistryChanged } from '../../components/Config/Protocols/protocolShared';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import { auditService } from '../auditlog/auditServiceInstance';
import { getSessionUser } from '../auth/caseAccessControl';
import { formatFullDisplayName, fromLegacyName } from '../../utils/personName';
import { archiveTemplate } from './templateService';
import { DEMO_CHECKLIST_REMOVAL_AUDIT_EVENT, removeDemoChecklists, type DemoChecklistRemovalDeps } from './demoChecklistRemoval';

function actorName(): string {
  const s = getSessionUser();
  return s?.firstName || s?.lastName ? formatFullDisplayName(fromLegacyName(s.firstName ?? '', s.lastName ?? '')) : 'Unknown User';
}

export const demoChecklistRemovalDeps: DemoChecklistRemovalDeps = {
  enforce: capability => authorizationService.enforce(capability),
  library: () => PROTOCOL_REGISTRY,
  archive: async id => { const r = await archiveTemplate(id); notifyRegistryChanged(); return r; },
  audit: async detail => {
    await auditService.logEvent({ type: 'user', event: DEMO_CHECKLIST_REMOVAL_AUDIT_EVENT, detail, user: actorName(), caseId: null, confidence: null });
  },
};

/** Removes the demonstration checklists from this organisation's library (or reports what would happen). */
export const removeDemoChecklistsHere = (options: { dryRun?: boolean } = {}) => removeDemoChecklists(demoChecklistRemovalDeps, options);
