// src/hooks/useViewerResourceLinks.ts
// Batch 659 (finding 10): the Quick Links (Protocols, References, Systems) are the organisation's own, managed in
// Configuration (services/externalResources). Search and the Audit Log used to show a fixed list with Systems links
// that went nowhere ("#"); they now load the same list the Worklist does. No case context here, so the list is the
// organisation-wide one. An https-only rule applies as everywhere (toQuickLinks marks an http link).
import { useEffect, useState } from 'react';
import { externalResourceService } from '@/services';
import { getSessionUser } from '@/services/auth/caseAccessControl';
import { toQuickLinks, type ResourceQuickLink } from '@/services/externalResources/externalResourceUrl';

export type ViewerQuickLinks = Record<'protocols' | 'references' | 'systems', ResourceQuickLink[]>;
const EMPTY: ViewerQuickLinks = { protocols: [], references: [], systems: [] };

export function useViewerResourceLinks(): ViewerQuickLinks {
  const [links, setLinks] = useState<ViewerQuickLinks>(EMPTY);
  useEffect(() => {
    const organisationId = getSessionUser()?.organisationId;
    if (!organisationId) return;
    let cancelled = false;
    externalResourceService.resolveForViewer({ organisationId, performingLabFacilityIds: [] })
      .then(resolved => { if (!cancelled) setLinks(toQuickLinks(resolved)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  return links;
}
