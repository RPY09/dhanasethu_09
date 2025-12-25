import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import "./Navbar.css";

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
    key: "logout",
    to: "#",
    label: "Exit",
    icon: "bi-door-open",
    type: "action",
  },
];

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(
    Boolean(localStorage.getItem("token"))
  );

  useEffect(() => {
    setIsAuthenticated(Boolean(localStorage.getItem("token")));
  }, [location.pathname]);

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
        <div className="zira-user-avatar">
          <i className="bi bi-person-circle"></i>
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
