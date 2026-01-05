import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "./components/layout/Navbar";
import AppRoutes from "./routes/AppRoutes";
import ScrollToTop from "./components/ScrollToTop";
import api from "./api/axios";
import { lockApp, isAppUnlocked, isAppLockEnabled } from "./utils/appLock";

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const INACTIVITY_LIMIT = 60 * 1000;

  /* Lock app when backgrounded */
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) {
        lockApp();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  /*  Lock app on inactivity */
  useEffect(() => {
    let timer;
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(lockApp, INACTIVITY_LIMIT);
    };

    ["mousemove", "keydown", "touchstart"].forEach((e) =>
      window.addEventListener(e, resetTimer)
    );
    resetTimer();

    return () => {
      clearTimeout(timer);
      ["mousemove", "keydown", "touchstart"].forEach((e) =>
        window.removeEventListener(e, resetTimer)
      );
    };
  }, []);
  useEffect(() => {
    lockApp();
  }, []);

  /* AUTH + LOCK GUARD (MOST IMPORTANT) */
  useEffect(() => {
    const token = localStorage.getItem("token");

    // Logged in users should NEVER see Home
    if (token && location.pathname === "/") {
      navigate("/app-lock", { replace: true });
      return;
    }

    // If app is locked, force AppLock
    if (
      token &&
      isAppLockEnabled() &&
      !isAppUnlocked() &&
      location.pathname !== "/app-lock"
    ) {
      navigate("/app-lock", { replace: true });
    }

    // Not logged in → no access to app pages
    if (!token && location.pathname !== "/" && location.pathname !== "/login") {
      navigate("/", { replace: true });
    }
  }, [location.pathname, navigate]);

  /* Token refresh */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    api.get("/auth/refresh-token").catch(() => {
      localStorage.clear();
      window.location.replace("/login");
    });
  }, []);

  return (
    <>
      <ScrollToTop />
      <Navbar />
      <AppRoutes />
    </>
  );
}

export default App;
