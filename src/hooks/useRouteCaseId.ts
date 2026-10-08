// src/hooks/useRouteCaseId.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 446: the case a case page's address names.
//   const caseId = useRouteCaseId('synoptic');            // reads :caseId
//   const caseId = useRouteCaseId('addOnOrders', 'case'); // reads ?case=
// • A reference this session created or resolved is known at once.
// • Another reference (after a refresh, from a bookmark) is looked up;
//   undefined until then.
// • An unknown reference gives the raw reference back, which matches no
//   case, so the page shows its neutral "case unavailable" screen.
// • An old accession address opens the case and replaces the address with the
//   reference straight away, keeping the navigation state and other query
//   parameters.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { caseAddresses } from '@/services/caseAddresses/caseAddressesInstance';
import { isCaseAddressReference, type CaseView } from '@/services/caseAddresses/caseAddresses';

export function useRouteCaseId(view: CaseView, queryParam?: string): string | undefined {
  const params = useParams<{ caseId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const raw = (queryParam ? new URLSearchParams(location.search).get(queryParam) : params.caseId) ?? undefined;

  const immediate = !raw ? undefined
    : isCaseAddressReference(raw) ? caseAddresses.knownCaseId(raw)
    : raw;
  const [resolved, setResolved] = useState<{ raw: string; caseId: string } | null>(null);

  useEffect(() => {
    if (!raw) return;
    let live = true;
    void caseAddresses.caseIdOf(raw).then(async ({ caseId, legacy }) => {
      if (!live) return;
      setResolved({ raw, caseId: caseId ?? raw });
      if (legacy && caseId) {
        const address = await caseAddresses.addressOf(caseId, view);
        if (!live || !address) return;
        const rest = new URLSearchParams(location.search);
        if (queryParam) rest.delete(queryParam);
        const extra = rest.toString();
        const target = extra ? `${address}${address.includes('?') ? '&' : '?'}${extra}` : address;
        navigate(target, { replace: true, state: location.state });
      }
    });
    return () => { live = false; };
    // Resolve once per address; location.state/search are read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw, view, queryParam]);

  if (immediate) return immediate;
  return resolved && resolved.raw === raw ? resolved.caseId : undefined;
}
