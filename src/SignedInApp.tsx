// src/SignedInApp.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 527 (PS-486): everything after sign-in, loaded as its own part of the
// app. App.tsx keeps only the sign-in, SSO return, outside-consult and
// critical-alert pages, so the first screen downloads only what it needs.
// The providers here (messaging, specimen dictionary, unsaved-changes,
// breadcrumbs, voice) and every screen they wrap arrive with this module;
// the services barrel comes with them.
// ─────────────────────────────────────────────────────────────────────────────
import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router";

import { MessagingProvider } from "./contexts/MessagingContext";
import { SpecimenDictionaryProvider } from "./components/Config/System/useSpecimenDictionary";

// Breadcrumb
import { BreadcrumbProvider } from './contexts/BreadcrumbContext';
import { DirtyStateProvider } from './contexts/DirtyStateProvider';

// Voice Integration
import { VoiceProvider } from "./contexts/VoiceProvider";

// Scanner Integration (barcode/QR scanner support)
import { ScannerProvider } from "./contexts/ScannerProvider";
import { MaterialScanTrackingBridge } from "./components/MaterialScanTrackingBridge";
import { DefaultActionOnScanBridge } from "./components/DefaultActionOnScanBridge";

// PathScribe Agent print progress (Batch 346, PS-52)
import { AgentPrintStatus } from "./components/Printing/AgentPrintStatus";
// Network print results and Retry (Batch 347, PS-54)
import { NetworkPrintJobs } from "./components/Printing/NetworkPrintJobs";

// Standard Wrappers
import ProtectedRoute from "./ProtectedRoute";
import ScreenGate from "./components/Common/ScreenGate";
import MobileRestrictedRoute from "./MobileRestrictedRoute";
import AppShell from "./components/AppShell/AppShell";

// Loaders
import { grossingLoader, synopticLoader } from "./loaders/synopticLoader";
import { PageLoader } from './components/Common/PageLoader';
import { ConnectionBanner } from './components/Connectivity/ConnectionBanner';
import { ExportNotices } from './components/Exports/ExportNotices';



// ── Lazy-loaded pages ─────────────────────────────────────────────────────────
const Home = lazy(() => import("./pages/Home"));
const AccessionPage = lazy(() => import("./pages/AccessionPage/AccessionPage"));

const WorklistPage = lazy(() => import("./pages/WorklistPage/WorklistPage"));
const CytologyWorklistPage = lazy(() => import("./pages/CytologyWorklistPage/CytologyWorklistPage"));
const PathologyWorkspacePage = lazy(() => import("./pages/PathologyWorkspacePage/PathologyWorkspacePage"));
const QualityComplianceHubPage = lazy(() => import("./pages/QualityComplianceHubPage/QualityComplianceHubPage"));
const CytologyScreeningPage = lazy(() => import("./pages/CytologyWorklistPage/CytologyScreeningPage"));
const MolecularWorkcenterPage = lazy(() => import("./pages/MolecularWorkcenterPage/MolecularWorkcenterPage"));
const MolecularPlateBuilderPage = lazy(() => import("./pages/MolecularBatchPage/MolecularPlateBuilderPage"));
const MolecularRackWorklistPage = lazy(() => import("./pages/MolecularBatchPage/MolecularRackWorklistPage"));
const MolecularRackLoadingPage = lazy(() => import("./pages/MolecularBatchPage/MolecularRackLoadingPage"));
const MolecularControlRulesPage = lazy(() => import("./pages/MolecularBatchPage/MolecularControlRulesPage"));
// Batch 527 (PS-486): demo and developer screens are left out of a server build (__DEMO_TOOLS__ is false there).
const MockInterfaceEnginePage = __DEMO_TOOLS__ ? lazy(() => import("./pages/MockInterfaceEnginePage/MockInterfaceEnginePage")) : null;
const MockEMRPage = __DEMO_TOOLS__ ? lazy(() => import("./pages/MockEMRPage")) : null;
const MockWsiViewerPage = __DEMO_TOOLS__ ? lazy(() => import("./pages/MockWsiViewerPage")) : null;
const QualityAssurancePage = lazy(() => import("./pages/QualityAssurancePage"));
const BatchManagementPage = lazy(() => import("./pages/BatchManagement/BatchManagementPage"));
const WsiScanBatchesPage = lazy(() => import("./pages/BatchManagement/WsiScanBatchesPage"));
// Batch 518 (PS-123): batch label reprint.
const LabelReprintPage = lazy(() => import("./pages/BatchManagement/LabelReprintPage"));
const DisposalQueuePage = lazy(() => import("./pages/BatchManagement/DisposalQueuePage"));
const DisposalReportPage = lazy(() => import("./pages/BatchManagement/DisposalReportPage"));
const RetentionHoldsQueuePage = lazy(() => import("./pages/BatchManagement/RetentionHoldsQueuePage"));
const PendingBatchQueuePage = lazy(() => import("./pages/BatchManagement/PendingBatchQueuePage"));
const EngraverMonitorPage = lazy(() => import("./pages/BatchManagement/EngraverMonitorPage"));
const EquipmentServiceLogPage = lazy(() => import("./pages/BatchManagement/EquipmentServiceLogPage"));
const IntraopQueuePage = lazy(() => import("./pages/IntraopQueuePage"));
const OrSuiteDashboardPage = lazy(() => import("./pages/OrSuiteDashboardPage"));
const FacilityOpsDashboardPage = lazy(() => import("./pages/FacilityOpsDashboard/FacilityOpsDashboardPage"));
const MigrationJobsPage = lazy(() => import("./pages/MigrationJobsPage"));
const AuditLogPage = lazy(() => import("./pages/AuditLogPage"));
const RegistryExceptionsPage = lazy(() => import("./pages/RegistryExceptionsPage/RegistryExceptionsPage"));
const AutopsyDashboardPage = lazy(() => import("./pages/AutopsyDashboardPage/AutopsyDashboardPage"));
const OutboundQueuePage = lazy(() => import("./pages/OutboundQueuePage/OutboundQueuePage"));
// Batch 550 (PS-539 D7): the signed-in user's exports from the API server.
const MyExportsPage = lazy(() => import("./pages/MyExportsPage"));
const ConfigurationPage = lazy(() => import("./pages/ConfigurationPage"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const ContributionDashboardPage = lazy(() =>
  import("./pages/ContributionDashboardPage")
);
const BenchContributionDashboardPage = lazy(() =>
  import("./pages/BenchContributionDashboardPage")
);
// Batch 489 (Module 1 of Pete's Tumor Board / MDT Workspace spec).
const TumorBoardWorkspacePage = lazy(() =>
  import("./pages/TumorBoardWorkspacePage")
);
// Batch 491 (deferred from Batch 490's margin-distance extraction layer).
const MarginExceptionReviewPage = lazy(() =>
  import("./pages/MarginExceptionReviewPage")
);

const SynopticReportPage = lazy(() =>
  import("./pages/SynopticReportPage/SynopticReportPage")
);
const GrossingScreenPage = lazy(() =>
  import("./pages/GrossingScreenPage/GrossingScreenPage")
);
const MicrotomyWorkstationPage = lazy(() =>
  import("./pages/MicrotomyWorkstationPage/MicrotomyWorkstationPage")
);
const EmbeddingStationPage = lazy(() =>
  import("./pages/EmbeddingStationPage/EmbeddingStationPage")
);
const SlideDistributionStationPage = lazy(() =>
  import("./pages/SlideDistributionStationPage/SlideDistributionStationPage")
);
const AddOnOrderPage = lazy(() =>
  import("./pages/AddOnOrderPage/AddOnOrderPage")
);
const MolecularOrderQueuePage = lazy(() =>
  import("./pages/MolecularOrderQueuePage/MolecularOrderQueuePage")
);
const FullReportPage = lazy(() => import("./pages/FullReportPage"));

const SynopticEditor = lazy(() =>
  import("./components/Config/Protocols/SynopticEditor")
);
const TemplateRendererPage = lazy(() =>
  import("./components/Config/Templates/TemplateRenderer").then((m) => ({
    default: m.TemplateRenderer,
  }))
);

// ── Report Part & Template Assembly (replaces old TemplateBuilderPage) ────────
const PartBuilderPage = lazy(() =>
  import("./components/TemplateBuilder/PartBuilderPage")
);
const TemplateAssemblyPage = lazy(() =>
  import("./components/TemplateBuilder/TemplateAssemblyPage")
);

// Batch 548: the shared PageLoader (components/Common/PageLoader.tsx).


const SignedInApp: React.FC = () => (
  <>
    <ConnectionBanner />
    <div className="ps-print-feedback">
      <ExportNotices />
      <NetworkPrintJobs />
      <AgentPrintStatus />
    </div>
    <MessagingProvider>
      <SpecimenDictionaryProvider>
        <DirtyStateProvider>
          <BreadcrumbProvider>
            <VoiceProvider>
              <Suspense fallback={<PageLoader />}>
                <Routes>

                      {/* Real, per direct design brief on the RFP-APLIS-2026-GLOBAL
                          Intraoperative/Frozen Section Dashboard — deliberately
                          public/unauthenticated. This is a Location-First "Station
                          Identity" terminal (a wall-mounted OR display), not a
                          lab-staff login; it must stay up and keep its live timers
                          running without ever hitting this app's own normal session
                          timeout. Individual attribution for a real action (a
                          verbal report, an alert acknowledgement) happens via its
                          own, separate quick-auth PIN flow inside the page itself,
                          never via this app's normal, authenticated login. */}
                      <Route path="/or-suite-dashboard" element={<OrSuiteDashboardPage />} />

                      {/* PS-288 — same real, deliberate "public/
                          unauthenticated, wall-mounted Station-Identity
                          display" reasoning as /or-suite-dashboard just
                          above: a Grossing/Embedding/Staining/etc. bench
                          display binds once to a real Display Profile
                          (facilityOpsDashboard/) and must keep running
                          without hitting this app's own normal session
                          timeout. */}
                      <Route path="/facility-ops-dashboard" element={<FacilityOpsDashboardPage />} />


                      {/* Protected Routes — ScannerProvider only active when authenticated */}
                      <Route element={<ProtectedRoute />}>
                        <Route element={<MobileRestrictedRoute />}>
                        <Route element={<ScannerProvider><MaterialScanTrackingBridge /><DefaultActionOnScanBridge /><AppShell /></ScannerProvider>}>
                          <Route path="/" element={<Home />} />
                          <Route path="/accession" element={<ScreenGate screen="accession"><AccessionPage /></ScreenGate>} />
                          <Route path="/worklist" element={<ScreenGate screen="worklist"><WorklistPage /></ScreenGate>} />
                          {/* "Homepage Changes part 1" — direct request: new second-level
                              hub grouping Cytology Workspace, Microtomy Workspace, Embedding
                              Workspace, and Slide Distribution Workspace behind one Home tile. */}
                          <Route path="/pathology-workspace" element={<ScreenGate screen="pathologyWorkspace"><PathologyWorkspacePage /></ScreenGate>} />
                          {/* Real, direct follow-up (Sep 2026) — Quality & Compliance hub
                              grouping Audit and Quality Assurance behind one Home tile,
                              same real second-level-hub pattern as Pathology Workspace. */}
                          <Route path="/quality-compliance" element={<ScreenGate screen="qualityCompliance"><QualityComplianceHubPage /></ScreenGate>} />
                          <Route path="/cytology-worklist" element={<ScreenGate screen="cytologyWorkspace"><CytologyWorklistPage /></ScreenGate>} />
                          <Route path="/cytology-worklist/:caseId" element={<ScreenGate screen="cytologyWorkspace"><CytologyScreeningPage /></ScreenGate>} />
                          <Route path="/molecular" element={<ScreenGate screen="molecular"><MolecularWorkcenterPage /></ScreenGate>} />
                          <Route path="/molecular-batch/:batchId" element={<ScreenGate screen="molecular"><MolecularPlateBuilderPage /></ScreenGate>} />
                          <Route path="/molecular-rack" element={<ScreenGate screen="molecular"><MolecularRackWorklistPage /></ScreenGate>} />
                          <Route path="/molecular-rack/:rackId" element={<ScreenGate screen="molecular"><MolecularRackLoadingPage /></ScreenGate>} />
                          <Route path="/molecular-control-rules" element={<ScreenGate screen="molecular"><MolecularControlRulesPage /></ScreenGate>} />
                          {MockInterfaceEnginePage && <Route path="/dev/mock-interface-engine" element={<ScreenGate screen="configuration"><MockInterfaceEnginePage /></ScreenGate>} />}
                          <Route path="/quality-assurance" element={<ScreenGate screen="qualityAssurance"><QualityAssurancePage /></ScreenGate>} />
                          <Route path="/batch-management" element={<ScreenGate screen="batchManagement"><BatchManagementPage /></ScreenGate>} />
                          <Route path="/batch-management/disposal" element={<ScreenGate screen="batchManagement"><DisposalQueuePage /></ScreenGate>} />
                          <Route path="/batch-management/disposal-report" element={<ScreenGate screen="batchManagement"><DisposalReportPage /></ScreenGate>} />
                          <Route path="/batch-management/retention-holds" element={<ScreenGate screen="batchManagement"><RetentionHoldsQueuePage /></ScreenGate>} />
                          <Route path="/batch-management/pending-load" element={<ScreenGate screen="batchManagement"><PendingBatchQueuePage /></ScreenGate>} />
                          <Route path="/batch-management/engraver-monitor" element={<ScreenGate screen="batchManagement"><EngraverMonitorPage /></ScreenGate>} />
                          <Route path="/batch-management/wsi-scan" element={<ScreenGate screen="batchManagement"><WsiScanBatchesPage /></ScreenGate>} />
                          <Route path="/batch-management/label-reprint" element={<ScreenGate screen="batchManagement"><LabelReprintPage /></ScreenGate>} />
                          {/* Batch 429: the bench staff record equipment maintenance and calibration here. */}
                          <Route path="/batch-management/equipment-log" element={<ScreenGate screen="batchManagement"><EquipmentServiceLogPage /></ScreenGate>} />
                          <Route path="/workstations/microtomy" element={<ScreenGate screen="microtomy"><MicrotomyWorkstationPage /></ScreenGate>} />
                          <Route path="/workstations/embedding" element={<ScreenGate screen="embedding"><EmbeddingStationPage /></ScreenGate>} />
                          <Route path="/workstations/slide-distribution" element={<ScreenGate screen="slideDistribution"><SlideDistributionStationPage /></ScreenGate>} />
                          <Route path="/add-on-orders" element={<ScreenGate screen="addOnOrders"><AddOnOrderPage /></ScreenGate>} />
                          <Route path="/intraop-queue" element={<ScreenGate screen="intraopQueue"><IntraopQueuePage /></ScreenGate>} />
                          <Route path="/molecular-order-queue" element={<ScreenGate screen="configuration"><MolecularOrderQueuePage /></ScreenGate>} />
                          {/* Batch 375: the two peer-review queues are views of the Worklist now; the old addresses land there. */}
                          <Route path="/cytology-qc-queue" element={<Navigate to="/worklist?view=cytologyQc" replace />} />
                          <Route path="/surgical-qa-worklist" element={<Navigate to="/worklist?view=surgicalQa" replace />} />
                          <Route path="/migration-jobs" element={<ScreenGate screen="configuration"><MigrationJobsPage /></ScreenGate>} />
                          <Route path="/search" element={<ScreenGate screen="search"><SearchPage /></ScreenGate>} />
                          <Route path="/audit" element={<ScreenGate screen="auditLog"><AuditLogPage /></ScreenGate>} />
                          <Route path="/registry-exceptions" element={<ScreenGate screen="registryExceptions"><RegistryExceptionsPage /></ScreenGate>} />
                          <Route path="/autopsy-dashboards" element={<ScreenGate screen="autopsyDashboards"><AutopsyDashboardPage /></ScreenGate>} />
                          <Route path="/outbound-queue" element={<ScreenGate screen="outboundQueue"><OutboundQueuePage /></ScreenGate>} />
                          <Route path="/my-exports" element={<MyExportsPage />} />
                          <Route
                            path="/configuration"
                            element={<ScreenGate screen="configuration"><ConfigurationPage /></ScreenGate>}
                          />
                          <Route
                            path="/contribution"
                            element={<ScreenGate screen="myContributions"><ContributionDashboardPage /></ScreenGate>}
                          />
                          <Route
                            path="/bench-contributions"
                            element={<ScreenGate screen="benchContributions"><BenchContributionDashboardPage /></ScreenGate>}
                          />
                          <Route
                            path="/tumor-board"
                            element={<ScreenGate screen="tumorBoard"><TumorBoardWorkspacePage /></ScreenGate>}
                          />
                          <Route
                            path="/margin-exception-review"
                            element={<ScreenGate screen="marginExceptionReview"><MarginExceptionReviewPage /></ScreenGate>}
                          />
                        </Route>

                        {/* Clinical Routes — full-screen, AppShell mounted for drawer/messaging but NavBar hidden */}
                        <Route element={<ScannerProvider><MaterialScanTrackingBridge /><DefaultActionOnScanBridge /><AppShell hideNav /></ScannerProvider>}>
                          <Route
                            path="/case/:caseId/synoptic"
                            element={<SynopticReportPage />}
                            loader={synopticLoader}
                          />
                          <Route
                            path="/case/:caseId/grossing"
                            element={<GrossingScreenPage />}
                            loader={grossingLoader}
                          />
                          <Route
                            path="/report/:caseId"
                            element={<FullReportPage />}
                          />
                        </Route>

                        {/* Batch 497: the detachable report-preview window (/report-preview/:caseId)
                            was retired — nothing opened it, and Pete had already confirmed it as
                            superseded (inline preview in the editor; printing from the report page). */}

                        {/* Batch 427 (Pete: "If you don't have permission to access configuration, you should [not] be able to
                            backdoor in and see individual config pages"): every page opened from Configuration carries
                            the Configuration gate, so typing its address doesn't get round it. Template Authors and
                            Approvers hold screen:configuration:open, so nobody who uses these loses them. */}
                        {/* ── Report Part Builder — full-screen canvas for one part ── */}
                        <Route
                          path="/admin/parts/new"
                          element={<ScreenGate screen="configuration"><PartBuilderPage /></ScreenGate>}
                        />
                        <Route
                          path="/admin/parts/:partId/edit"
                          element={<ScreenGate screen="configuration"><PartBuilderPage /></ScreenGate>}
                        />

                        {/* ── Template Assembly — slot list editor ── */}
                        <Route
                          path="/admin/templates/new"
                          element={<ScreenGate screen="configuration"><TemplateAssemblyPage /></ScreenGate>}
                        />
                        <Route
                          path="/admin/templates/:templateId/edit"
                          element={<ScreenGate screen="configuration"><TemplateAssemblyPage /></ScreenGate>}
                        />

                        <Route
                          path="/template-editor/new"
                          element={<ScreenGate screen="configuration"><SynopticEditor /></ScreenGate>}
                        />
                        <Route
                          path="/template-editor/:templateId"
                          element={<ScreenGate screen="configuration"><SynopticEditor /></ScreenGate>}
                        />
                        <Route
                          path="/template-review/:templateId"
                          element={<ScreenGate screen="configuration"><TemplateRendererPage /></ScreenGate>}
                        />
                        {MockEMRPage && <Route path="/mock-emr" element={<MockEMRPage />} />}
                        {MockWsiViewerPage && <Route path="/wsi-viewer" element={<MockWsiViewerPage />} />}
                        </Route>
                      </Route>
                  {/* Redirect any unmatched paths to login */}
                  <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
              </Suspense>
            </VoiceProvider>
          </BreadcrumbProvider>
        </DirtyStateProvider>
      </SpecimenDictionaryProvider>
    </MessagingProvider>
  </>
);

export default SignedInApp;
