import { Link, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import "./Navbar.css";
import appIcon from "../../assets/dhanasethu_icon.png";
import { getLoans } from "../../api/loan.api";

const allowedNavbarRoutes = [
  "/dashboard",
  "/transactions",
  "/add-transaction",
  "/loan",
  "/analytics",
  "/notifications",
  "/profile",
];

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
    key: "loan",
    to: "/loan",
    label: "Deals",
    icon: "bi-cash-coin",
    type: "link",
  },
  {
    key: "analytics",
    to: "/analytics",
    label: "Stats",
    icon: "bi-pie-chart",
    type: "link",
  },
];

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isAuthenticated, setIsAuthenticated] = useState(
    Boolean(localStorage.getItem("token"))
  );
  const [notificationCount, setNotificationCount] = useState(0);

  const shouldShowNavbar = () => {
    const path = location.pathname;

    // Exact allowed pages
    if (allowedNavbarRoutes.includes(path)) return true;

    // Edit pages (dynamic routes)
    if (path.startsWith("/edit-transaction") || path.startsWith("/edit-loan")) {
      return true;
    }

    return false;
  };

  /* ---------------- HELPERS ---------------- */

  const isNearOrOverdue = (dueDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const end = new Date(dueDate);
    end.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  };

  const hasPendingAmount = (loan) => {
    const principalPending = Number(loan.principal || 0) > 0;

    const interestPending =
      Number(loan.interestAmount || 0) - Number(loan.interestPaid || 0) > 0;

    return principalPending || interestPending;
  };

  /* ---------------- AUTH WATCH ---------------- */

  useEffect(() => {
    setIsAuthenticated(Boolean(localStorage.getItem("token")));
  }, [location.pathname]);

  /* ---------------- NOTIFICATION LOGIC ---------------- */

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchLoanNotifications = async () => {
      try {
        const loans = await getLoans();

        const count = loans.filter(
          (l) =>
            l.role === "lent" &&
            !l.settled &&
            hasPendingAmount(l) &&
            isNearOrOverdue(l.dueDate)
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

  /* ---------------- LOGOUT ---------------- */

  const logout = () => {
    localStorage.clear();
    setIsAuthenticated(false);
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;

  if (!isAuthenticated || !shouldShowNavbar()) return null;

  return (
    <>
      {/* TOP NAV */}
      <header className="zira-top-nav">
        <div
          className="zira-logo-container" /* Changed class name for better targeting */
          onClick={() => navigate("/dashboard")}
        >
          <div className="logo-image-wrapper">
            <img src={appIcon} alt="DhanaSethu" className="app-logo-img" />
          </div>
          <span className="logo-text">
            Dhana<span id="spans">Sethu</span>
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {/* Notification Bell */}
          <div
            className={`zira-top-item ${isActive("/notifications") ? "active" : ""}`} // Add this class
            onClick={() => navigate("/notifications")}
            style={{ cursor: "pointer", position: "relative" }}
          >
            <i className="bi bi-receipt"></i>
            {notificationCount > 0 && (
              <span className="zira-bell-badge">{notificationCount}</span>
            )}
          </div>

          {/* Profile */}
          <div
            className={`zira-top-item ${isActive("/profile") ? "active" : ""}`} // Add this class
            onClick={() => navigate("/profile")}
            style={{ cursor: "pointer" }}
          >
            <i className="bi bi-person-circle"></i>
          </div>
        </div>
      </header>

      {/* BOTTOM NAV */}
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
