import { LoaderFunctionArgs, redirect } from "react-router-dom";
import { caseRouter } from "../services/cases/CaseRouter";

export async function synopticLoader({ params }: LoaderFunctionArgs) {
  const caseId = params.caseId;

  if (!caseId) {
    console.error("Missing caseId in route params");
    return redirect("/worklist");
  }

  // caseRouter already handles both LIS (S26-) and Orchestrator (O26-)
  // lookups internally — was previously two separate, manual calls to
  // mockCaseService then mockOrchestratorCaseService, duplicating logic
  // caseRouter has since consolidated.
  const caseData = await caseRouter.getCase(caseId).catch(() => undefined);

  if (!caseData) {
    console.error(`Case not found in any service: ${caseId}`);
    return redirect("/worklist");
  }

  return caseData;
}
