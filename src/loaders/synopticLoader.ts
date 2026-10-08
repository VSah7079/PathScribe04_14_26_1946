import { LoaderFunctionArgs, redirect } from "react-router";
import { openCaseForViewDefault } from "../services/cases/defaultOpenCaseForView";
import { caseAddresses } from "../services/caseAddresses/caseAddressesInstance";
import { CASE_ADDRESS_VIEWS } from "../services/caseAddresses/caseAddresses";

export async function synopticLoader({ params, request }: LoaderFunctionArgs) {
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
    const address = caseId ? await caseAddresses.addressOf(caseId, "synoptic") : null;
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
