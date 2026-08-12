import { LoaderFunctionArgs, redirect } from "react-router-dom";
<<<<<<< HEAD
import { mockCaseService } from "../services/cases/mockCaseService";
=======
import { caseRouter } from "../services/cases/CaseRouter";
>>>>>>> upstream/main

export async function synopticLoader({ params }: LoaderFunctionArgs) {
  const caseId = params.caseId;

  if (!caseId) {
    console.error("Missing caseId in route params");
    return redirect("/worklist");
  }

<<<<<<< HEAD
  const caseData = await mockCaseService.getCase(caseId);

  if (!caseData) {
    console.error(`Case not found: ${caseId}`);
=======
  // caseRouter already handles both LIS (S26-) and Orchestrator (O26-)
  // lookups internally — was previously two separate, manual calls to
  // mockCaseService then mockOrchestratorCaseService, duplicating logic
  // caseRouter has since consolidated.
  const caseData = await caseRouter.getCase(caseId).catch(() => undefined);

  if (!caseData) {
    console.error(`Case not found in any service: ${caseId}`);
>>>>>>> upstream/main
    return redirect("/worklist");
  }

  return caseData;
<<<<<<< HEAD
}
=======
}
>>>>>>> upstream/main
