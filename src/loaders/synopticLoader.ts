import { LoaderFunctionArgs, redirect } from "react-router";
import { openCaseForViewDefault } from "../services/cases/defaultOpenCaseForView";

export async function synopticLoader({ params }: LoaderFunctionArgs) {
  const caseId = params.caseId;

  if (!caseId) {
    console.error("Missing caseId in route params");
    return redirect("/worklist");
  }

  // Batch 396 (Pete's privacy model): services/cases/openCaseForView.ts
  // decides, the same as /report/:caseId. A case that is missing,
  // elsewhere or restricted goes to the report page's neutral "no access"
  // screen, identical for every reason. Before this, a missing case went
  // silently to the Worklist and a restricted one to the Worklist with a
  // toast naming the restriction, which told the reader the case existed.
  const { caseData } = await openCaseForViewDefault(caseId);
  if (!caseData) return redirect(`/report/${encodeURIComponent(caseId)}`);
  return caseData;
}
