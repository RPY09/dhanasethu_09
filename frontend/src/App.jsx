import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "./components/layout/Navbar";
import AppRoutes from "./routes/AppRoutes";
import ScrollToTop from "./components/ScrollToTop";
import api from "./api/axios";
import { lockApp, isAppUnlocked, isAppLockEnabled } from "./utils/appLock";
import LockGate from "./components/LockGate";

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isBackgrounded, setIsBackgrounded] = useState(false);

  const INACTIVITY_LIMIT = 60 * 1000;

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsBackgrounded(true);
      } else {
        setIsBackgrounded(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

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
      <LockGate>
        <AppRoutes />
      </LockGate>
      {isBackgrounded && (
        <div className="privacy-blur-overlay">
          <div className="privacy-blur-content">
            <span>
              <i class="bi bi-shield-lock"></i> Securing your data
            </span>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
