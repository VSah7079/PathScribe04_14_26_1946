import { Navigate, Outlet } from "react-router-dom";
import './pathscribe.css';
import { useEffect } from "react";
import { useAuth } from "@contexts/AuthContext";
import { useIdleTimeout } from "@/hooks/useIdleTimeout";
import SessionExpiryWarningModal from "@/components/Common/SessionExpiryWarningModal";

const ProtectedRoute = () => {
  const { isAuthenticated, loading, logout } = useAuth();

  // Force a re-check of auth state on mount.
  // This ensures Back/Forward cannot resurrect stale UI state.
  useEffect(() => {
    // Triggering a re-render is enough because isAuthenticated
    // is derived from localStorage in the updated AuthContext.
  }, []);

  // Phase 1 of the Inactivity Timeout & Draft Recovery spec (see
  // PRIORITY_FIXES.md). Only active once actually authenticated -- no
  // point running an idle timer against the login page itself.
  const { showWarning, secondsRemaining, expired, stayLoggedIn } = useIdleTimeout(isAuthenticated);

  useEffect(() => {
    if (expired) logout();
  }, [expired, logout]);

  if (loading) {
    return <div style={{ background: "#0f172a", height: "100vh" }} />;
  }

  if (!isAuthenticated) {
   return <Navigate to="/login" replace />;
  }

  return (
    <>
      <Outlet />
      {showWarning && (
        <SessionExpiryWarningModal
          secondsRemaining={secondsRemaining}
          onStayLoggedIn={stayLoggedIn}
          onLogOutNow={logout}
        />
      )}
    </>
  );
};

export default ProtectedRoute;
