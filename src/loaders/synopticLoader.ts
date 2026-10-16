import { LoaderFunctionArgs, redirect } from "react-router";
import { openCaseForViewDefault } from "../services/cases/defaultOpenCaseForView";
import { caseAddresses } from "../services/caseAddresses/caseAddressesInstance";
import { CASE_ADDRESS_VIEWS, type CaseView } from "../services/caseAddresses/caseAddresses";

/**
 * Batch 564: the case loader for a view. An old accession address is redirected to the same view's
 * address (it always went to the synoptic page before, so an old grossing link opened the report editor).
 */
export function caseViewLoader(view: Extract<CaseView, 'synoptic' | 'grossing'>) {
  return (args: LoaderFunctionArgs) => loadCase(args, view);
}

export const synopticLoader = caseViewLoader('synoptic');
export const grossingLoader = caseViewLoader('grossing');

async function loadCase({ params, request }: LoaderFunctionArgs, view: 'synoptic' | 'grossing') {
  const param = params.caseId;

  if (!param) {
    console.error("Missing caseId in route params");
    return redirect("/worklist");
  }

  // Batch 446: the address carries the case's support reference, never its
  // accession. An old accession address is redirected to the reference
  // before the page opens, so it never becomes the page's address.
  const { caseId, legacy } = await caseAddresses.caseIdOf(param);
  if (legacy) {
    const address = caseId ? await caseAddresses.addressOf(caseId, view) : null;
    return redirect(address ? `${address}${new URL(request.url).search}` : "/worklist");
  }

  // Batch 396 (Pete's privacy model): services/cases/openCaseForView.ts
  // decides, the same as /report/:caseId. A case that is missing,
  // elsewhere or restricted goes to the report page's neutral "no access"
  // screen, identical for every reason. Before this, a missing case went
  // silently to the Worklist and a restricted one to the Worklist with a
  // toast naming the restriction, which told the reader the case existed.
  // An unknown reference goes there too.
  const { caseData } = caseId ? await openCaseForViewDefault(caseId) : { caseData: null };
  if (!caseData) return redirect(CASE_ADDRESS_VIEWS.report(param));
  return caseData;
}
