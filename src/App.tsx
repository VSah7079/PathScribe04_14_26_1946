import React, { Suspense, lazy } from "react";
import "./pathscribe.css";
<<<<<<< HEAD
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
=======
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
>>>>>>> upstream/main
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Auth + Providers
import { AuthProvider } from "./contexts/AuthContext";
import { SystemConfigProvider } from "./contexts/SystemConfigContext";
import { MessagingProvider } from "./contexts/MessagingContext";
<<<<<<< HEAD
import { SpecimenProvider } from "./contexts/useSpecimens";
import { SubspecialtyProvider } from "./contexts/useSubspecialties";
=======
>>>>>>> upstream/main
import { SpecimenDictionaryProvider } from "./components/Config/System/useSpecimenDictionary";

// Breadcrumb
import { BreadcrumbProvider } from './contexts/BreadcrumbContext';
import { DirtyStateProvider } from './contexts/DirtyStateProvider';

// Voice Integration
import { VoiceProvider } from "./contexts/VoiceProvider";

// Scanner Integration (barcode/QR scanner support)
import { ScannerProvider } from "./contexts/ScannerProvider";

// Standard Wrappers
import ProtectedRoute from "./ProtectedRoute";
<<<<<<< HEAD
=======
import MobileRestrictedRoute from "./MobileRestrictedRoute";
>>>>>>> upstream/main
import AppShell from "./components/AppShell/AppShell";

// Loaders
import { synopticLoader } from "./loaders/synopticLoader";

//EMR Access
import MockEMRPage from './pages/MockEMRPage';

// ── Lazy-loaded pages ─────────────────────────────────────────────────────────
const Home = lazy(() => import("./pages/Home"));
<<<<<<< HEAD
const Login = lazy(() => import("./Login"));
const WorklistPage = lazy(() => import("./pages/WorklistPage/WorklistPage"));
=======
const LoginPage = lazy(() => import("./pages/LoginPage"));
const AccessionPage = lazy(() => import("./pages/AccessionPage/AccessionPage"));

const WorklistPage = lazy(() => import("./pages/WorklistPage/WorklistPage"));
const DeficienciesPage = lazy(() => import("./pages/DeficienciesPage"));
const IntraopQueuePage = lazy(() => import("./pages/IntraopQueuePage"));
>>>>>>> upstream/main
const AuditLogPage = lazy(() => import("./pages/AuditLogPage"));
const ConfigurationPage = lazy(() => import("./pages/ConfigurationPage"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const ContributionDashboardPage = lazy(() =>
  import("./pages/ContributionDashboardPage")
);

const SynopticReportPage = lazy(() =>
  import("./pages/SynopticReportPage/SynopticReportPage")
);
const FullReportPage = lazy(() => import("./pages/FullReportPage"));
<<<<<<< HEAD
const PatientReportPage = lazy(() =>
  import("./components/PatientReportPage/PatientReportPage")
);
=======
>>>>>>> upstream/main

const SynopticEditor = lazy(() =>
  import("./components/Config/Protocols/SynopticEditor")
);
<<<<<<< HEAD
const ProtocolEditor = lazy(() => import("./protocols/ProtocolEditor"));
=======
>>>>>>> upstream/main
const TemplateRendererPage = lazy(() =>
  import("./components/Config/Templates/TemplateRenderer").then((m) => ({
    default: m.TemplateRenderer,
  }))
);

<<<<<<< HEAD
=======
// ── Report Part & Template Assembly (replaces old TemplateBuilderPage) ────────
const PartBuilderPage = lazy(() =>
  import("./components/TemplateBuilder/PartBuilderPage")
);
const TemplateAssemblyPage = lazy(() =>
  import("./components/TemplateBuilder/TemplateAssemblyPage")
);

>>>>>>> upstream/main
// ── Loading fallback ──────────────────────────────────────────────────────────
const PageLoader: React.FC = () => (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "#0b1120",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
<<<<<<< HEAD
      zIndex: 9999,
=======
      zIndex: 10000,
>>>>>>> upstream/main
    }}
  >
    <div
      style={{
        width: 36,
        height: 36,
        border: "3px solid rgba(8,145,178,0.15)",
        borderTop: "3px solid #0891B2",
        borderRadius: "50%",
        animation: "ps-spin 0.7s linear infinite",
      }}
    />
    <style>{`@keyframes ps-spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

// ── App ───────────────────────────────────────────────────────────────────────
const App: React.FC = () => (
  <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <ToastContainer />
    <SystemConfigProvider>
      <AuthProvider>
        <MessagingProvider>
<<<<<<< HEAD
          <SpecimenProvider>
            <SubspecialtyProvider>
              <SpecimenDictionaryProvider>
                <DirtyStateProvider>
=======
          <SpecimenDictionaryProvider>
              <DirtyStateProvider>
>>>>>>> upstream/main
                <BreadcrumbProvider>
                <VoiceProvider>
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
<<<<<<< HEAD
                      {/* Public Route */}
                      <Route path="/login" element={<Login />} />

                      {/* Protected Routes — ScannerProvider only active when authenticated */}
                      <Route element={<ProtectedRoute />}>
                        <Route element={<ScannerProvider><AppShell /></ScannerProvider>}>
                          <Route path="/" element={<Home />} />
                          <Route path="/worklist" element={<WorklistPage />} />
=======
                      
                      {/* Public route — shown when not authenticated */}
                      <Route path="/login" element={<LoginPage />} />

                      {/* Protected Routes — ScannerProvider only active when authenticated */}
                      <Route element={<ProtectedRoute />}>
                        <Route element={<MobileRestrictedRoute />}>
                        <Route element={<ScannerProvider><AppShell /></ScannerProvider>}>
                          <Route path="/" element={<Home />} />
                          <Route path="/accession" element={<AccessionPage />} />
                          <Route path="/worklist" element={<WorklistPage />} />
                          <Route path="/deficiencies" element={<DeficienciesPage />} />
                          <Route path="/intraop-queue" element={<IntraopQueuePage />} />
>>>>>>> upstream/main
                          <Route path="/search" element={<SearchPage />} />
                          <Route path="/audit" element={<AuditLogPage />} />
                          <Route
                            path="/configuration"
                            element={<ConfigurationPage />}
                          />
                          <Route
                            path="/contribution"
                            element={<ContributionDashboardPage />}
                          />
                        </Route>

<<<<<<< HEAD
                        {/* Clinical Routes — full-screen, no AppShell, but still need scanner */}
                        <Route
                          path="/case/:caseId/synoptic"
                          element={<ScannerProvider><SynopticReportPage /></ScannerProvider>}
                          loader={synopticLoader}
                        />
                        <Route
                          path="/report/:accession"
                          element={<ScannerProvider><FullReportPage /></ScannerProvider>}
                        />
                        <Route
                          path="/case/:accession"
                          element={<PatientReportPage />}
                        />
=======
                        {/* Clinical Routes — full-screen, AppShell mounted for drawer/messaging but NavBar hidden */}
                        <Route element={<ScannerProvider><AppShell hideNav /></ScannerProvider>}>
                          <Route
                            path="/case/:caseId/synoptic"
                            element={<SynopticReportPage />}
                            loader={synopticLoader}
                          />
                          <Route
                            path="/report/:accession"
                            element={<FullReportPage />}
                          />
                        </Route>

                        {/* ── Report Part Builder — full-screen canvas for one part ── */}
                        <Route
                          path="/admin/parts/new"
                          element={<PartBuilderPage />}
                        />
                        <Route
                          path="/admin/parts/:partId/edit"
                          element={<PartBuilderPage />}
                        />

                        {/* ── Template Assembly — slot list editor ── */}
                        <Route
                          path="/admin/templates/new"
                          element={<TemplateAssemblyPage />}
                        />
                        <Route
                          path="/admin/templates/:templateId/edit"
                          element={<TemplateAssemblyPage />}
                        />

>>>>>>> upstream/main
                        <Route
                          path="/template-editor/new"
                          element={<SynopticEditor />}
                        />
                        <Route
                          path="/template-editor/:templateId"
                          element={<SynopticEditor />}
                        />
                        <Route
<<<<<<< HEAD
                          path="/configuration/protocols/:protocolId"
                          element={<ProtocolEditor />}
                        />
                        <Route
                          path="/template-review/:templateId"
                          element={<TemplateRendererPage />}
                        />
                        <Route 
                          path="/mock-emr" 
                          element={<MockEMRPage />} 
                        />
                      </Route>
=======
                          path="/template-review/:templateId"
                          element={<TemplateRendererPage />}
                        />
                        <Route
                          path="/mock-emr"
                          element={<MockEMRPage />}
                        />
                        </Route>
                      </Route>
                      {/* Redirect any unmatched paths to login */}
                      <Route path="*" element={<Navigate to="/login" replace />} />
>>>>>>> upstream/main
                    </Routes>
                  </Suspense>
                </VoiceProvider>
                </BreadcrumbProvider>
                </DirtyStateProvider>
<<<<<<< HEAD
              </SpecimenDictionaryProvider>
            </SubspecialtyProvider>
          </SpecimenProvider>
=======
            </SpecimenDictionaryProvider>
>>>>>>> upstream/main
        </MessagingProvider>
      </AuthProvider>
    </SystemConfigProvider>
  </Router>
);

<<<<<<< HEAD
export default App;
=======
export default App;
>>>>>>> upstream/main
