import { useEffect } from "react";
import Navbar from "./components/layout/Navbar";
import AppRoutes from "./routes/AppRoutes";
import api from "./api/axios";
import ScrollToTop from "./components/ScrollToTop";
import { lockApp } from "./utils/appLock";
function App() {
  const INACTIVITY_LIMIT = 60 * 1000;
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
  useEffect(() => {
    let timer;

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        lockApp();
      }, INACTIVITY_LIMIT);
    };

    ["mousemove", "keydown", "touchstart"].forEach((event) =>
      window.addEventListener(event, resetTimer)
    );

    resetTimer();

    return () => {
      clearTimeout(timer);
      ["mousemove", "keydown", "touchstart"].forEach((event) =>
        window.removeEventListener(event, resetTimer)
      );
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    api
      .get("/auth/refresh-token")
      .then((res) => {
        if (res.data.token) {
          localStorage.setItem("token", res.data.token);
        }
      })
      .catch(() => {
        // Token invalid → logout
        localStorage.clear();
        window.location.href = "/login";
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
