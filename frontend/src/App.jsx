import { useEffect } from "react";
import Navbar from "./components/layout/Navbar";
import AppRoutes from "./routes/AppRoutes";
import api from "./api/axios";
import ScrollToTop from "./components/ScrollToTop";
function App() {
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
