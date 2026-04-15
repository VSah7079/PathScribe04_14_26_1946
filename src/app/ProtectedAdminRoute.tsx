import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedAdminRoute({ children }: { children: JSX.Element }) {
  const { user } = useAuth();

  // Not logged in → redirect
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Logged in but NOT an admin → redirect
  const isAdmin =
    user.role === "admin" ||
    user.role === "SystemAdmin" ||
    user.roles?.includes("SystemAdmin") ||
    user.roles?.includes("admin");

  if (!isAdmin) {
    return <Navigate to="/login" replace />;
  }

  // Authorized → allow access
  return children;
}
