import { Navigate, useLocation } from "react-router-dom";
import { isAppLockEnabled, isAppUnlocked } from "../utils/appLock";
import { isBiometricEnabled } from "../utils/biometric";

const LockGate = ({ children }) => {
  const location = useLocation();
  const token = localStorage.getItem("token");

  // Not logged in → allow public routes
  if (!token) return children;

  // App lock enabled & still locked → ONLY AppLock allowed
  if (
    (isAppLockEnabled() || isBiometricEnabled()) &&
    !isAppUnlocked() &&
    location.pathname !== "/app-lock"
  ) {
    return <Navigate to="/app-lock" replace />;
  }

  return children;
};

export default LockGate;
