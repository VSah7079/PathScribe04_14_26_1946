import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router";
import { ToastContainer, toast } from "react-toastify";
// PS-100 (Batch 349): warnings, errors and long toasts stay until closed.
import { installToastPolicy } from "./utils/installToastPolicy";
// react-toastify's stylesheet must load BEFORE pathscribe.css: both declare
// `:root { --toastify-* }`, and the later declaration wins regardless of
// selector specificity. pathscribe.css's own toast section (search
// "TOAST NOTIFICATIONS") re-maps those variables onto PathScribe's dark
// theme tokens — that only takes effect if it loads last.
import "react-toastify/dist/ReactToastify.css";
import "./pathscribe.css";

// Auth + Providers
import { AuthProvider } from "./contexts/AuthContext";
import { SystemConfigProvider } from "./contexts/SystemConfigContext";
import { PageLoader } from './components/Common/PageLoader';

// Batch 527 (PS-486): everything after sign-in is its own part of the app
// (SignedInApp.tsx), so the sign-in page doesn't wait for every screen and
// service.
const SignedInApp = lazy(() => import("./SignedInApp"));

// ── Lazy-loaded public pages ──────────────────────────────────────────────────
const LoginPage = lazy(() => import("./pages/LoginPage"));
const AuthCallbackPage = lazy(() => import("./pages/AuthCallbackPage"));
const ExternalConsultViewPage = lazy(() => import("./pages/ExternalConsultViewPage/ExternalConsultViewPage"));
const CriticalAlertReferencePage = lazy(() => import("./pages/CriticalAlertReferencePage/CriticalAlertReferencePage"));

// ── Loading fallback ──────────────────────────────────────────────────────────
// Real, found while converting this file: the `ps-spin` keyframe below was
// being redefined locally on every render via an inline <style> tag, when
// it's already a real, global keyframe in pathscribe.css (reused by
// .ps-autogen-toast-spinner elsewhere) — dead, redundant CSS. Uses the
// existing global keyframe via a real class instead.
// Batch 548: the shared PageLoader (components/Common/PageLoader.tsx).


installToastPolicy(toast);

// ── App ───────────────────────────────────────────────────────────────────────
const App: React.FC = () => (
  <Router>
    <ToastContainer />
    <SystemConfigProvider>
      <AuthProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
                      {/* Public route — shown when not authenticated */}
                      <Route path="/login" element={<LoginPage />} />
                      {/* PS-60: where the identity provider returns after SSO sign-in. */}
                      <Route path="/auth/callback/:providerId" element={<AuthCallbackPage />} />

                      {/* PS-290 — deliberately public/unauthenticated for a
                          different reason than the wall-display routes (SignedInApp.tsx):
                          there is no PathScribe login for an outside
                          consultant to have at all. The token in the URL
                          IS this route's entire authorization — see
                          services/consultAccess/IConsultTokenService.ts's
                          own header for the full, load-bearing caveat on
                          what that does and does NOT mean. Do not treat
                          this route as a precedent for any other
                          unauthenticated PHI-bearing page without the
                          same explicit caveat. */}
                      {/* Batch 522: links carry the token after `#` (/consult#<token>), out of
                          server logs; /consult/:token still opens links issued before. */}
                      <Route path="/consult" element={<ExternalConsultViewPage />} />
                      <Route path="/consult/:token" element={<ExternalConsultViewPage />} />

                      {/* PS-136 — the reference-resolution landing page
                          behind the SMS/secure-email non-PHI "tap to
                          view" deep link. This IS the "any other
                          unauthenticated PHI-bearing page" the comment
                          just above warns against becoming — the
                          answer, not an exception to it: this route
                          never displays PHI or clinical content at all
                          (no findingTerm/findingSeverity/sourceQuote),
                          precisely because it has no real
                          authentication to gate that with. See
                          services/clinical/ICriticalAlertReferenceTokenService.ts's
                          own header and CriticalAlertReferencePage.tsx's
                          own header for the full reasoning. Do not add
                          real clinical content to this route without
                          first adding the same "same explicit caveat"
                          this file's own comments require. */}
                      <Route path="/critical-alert/:token" element={<CriticalAlertReferencePage />} />

            {/* Everything else, signed-in screens included (SignedInApp.tsx). */}
            <Route path="*" element={<SignedInApp />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </SystemConfigProvider>
  </Router>
);

export default App;
