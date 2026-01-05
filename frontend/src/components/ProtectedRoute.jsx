import { Navigate, useLocation } from "react-router-dom";
import { isAppLockEnabled, isAppUnlocked } from "../utils/appLock";

const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // 1️Not logged in
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // 2 Security setup mandatory
  if (user?.needsSecuritySetup && location.pathname !== "/setup-security") {
    return <Navigate to="/setup-security" replace />;
  }

  // 3 APP LOCK ENFORCEMENT
  if (
    isAppLockEnabled() &&
    !isAppUnlocked() &&
    location.pathname !== "/app-lock"
  ) {
    return <Navigate to="/app-lock" replace />;
  }

  return children;
};

export default ProtectedRoute;
