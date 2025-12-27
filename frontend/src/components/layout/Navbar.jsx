import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import "./Navbar.css";
import { getLoans } from "../../api/loan.api";

const authNavItems = [
  {
    key: "dashboard",
    to: "/dashboard",
    label: "Home",
    icon: "bi-house-door",
    type: "link",
  },
  {
    key: "history",
    to: "/transactions",
    label: "History",
    icon: "bi-stack",
    type: "link",
  },
  {
    key: "add",
    to: "/add-transaction",
    label: "Add",
    icon: "bi-plus-circle-fill",
    type: "link",
  },
  {
    key: "analytics",
    to: "/analytics",
    label: "Stats",
    icon: "bi-pie-chart",
    type: "link",
  },
  {
    key: "loan",
    to: "/loan",
    label: "Lend",
    icon: "bi-cash-coin",
    type: "link",
  },
];

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(
    Boolean(localStorage.getItem("token"))
  );
  const [notificationCount, setNotificationCount] = useState(0); // TEMP
  useEffect(() => {
    setIsAuthenticated(Boolean(localStorage.getItem("token")));
  }, [location.pathname]);
  useEffect(() => {
    const isNearOrOverdue = (dueDate) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const end = new Date(dueDate);
      end.setHours(0, 0, 0, 0);

      const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));

      return diffDays <= 7;
    };

    const fetchLoanNotifications = async () => {
      try {
        const loans = await getLoans();

        const count = loans.filter(
          (l) => l.role === "lent" && !l.settled && isNearOrOverdue(l.dueDate)
        ).length;

        setNotificationCount(count);
      } catch {
        setNotificationCount(0);
      }
    };

    fetchLoanNotifications();

    const handler = () => fetchLoanNotifications();

    window.addEventListener("loans:changed", handler);

    return () => {
      window.removeEventListener("loans:changed", handler);
    };
  }, [isAuthenticated]);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsAuthenticated(false);
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;

  if (!isAuthenticated) return null; // Keep public pages clean or add a separate simple nav

  return (
    <>
      {/* Top Brand Header */}
      <header className="zira-top-nav">
        <div className="zira-logo" onClick={() => navigate("/dashboard")}>
          Dhana<span>Sethu</span>
        </div>
        {/* Update this div to navigate to profile */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {/* Notification Bell */}
          <div
            className="zira-bell"
            onClick={() => navigate("/notifications")}
            style={{ cursor: "pointer", position: "relative" }}
          >
            <i className="bi bi-bell"></i>

            {notificationCount > 0 && (
              <span className="zira-bell-badge">{notificationCount}</span>
            )}
          </div>

          {/* Profile */}
          <div
            className="zira-user-avatar"
            onClick={() => navigate("/profile")}
            style={{ cursor: "pointer" }}
          >
            <i className="bi bi-person-circle"></i>
          </div>
        </div>
      </header>

      {/* Bottom Floating Navigation */}
      <nav className="zira-bottom-nav">
        {authNavItems.map((it) =>
          it.type === "link" ? (
            <Link
              key={it.key}
              to={it.to}
              className={`zira-nav-item ${isActive(it.to) ? "active" : ""}`}
            >
              <div className="zira-icon-box">
                <i className={`bi ${it.icon}`} />
              </div>
              <span className="zira-label">{it.label}</span>
            </Link>
          ) : (
            <button
              key={it.key}
              className="zira-nav-item logout"
              onClick={logout}
            >
              <div className="zira-icon-box">
                <i className={`bi ${it.icon}`} />
              </div>
              <span className="zira-label">{it.label}</span>
            </button>
          )
        )}
      </nav>
    </>
  );
};

export default Navbar;
