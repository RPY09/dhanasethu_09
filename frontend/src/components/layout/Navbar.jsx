import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import "./Navbar.css";

const publicNavItems = [
  { key: "home", to: "/", label: "Home", icon: "bi-house", type: "link" },
  {
    key: "login",
    to: "/login",
    label: "Login",
    icon: "bi-box-arrow-in-right",
    type: "link",
  },
  {
    key: "register",
    to: "/register",
    label: "Register",
    icon: "bi-pencil-square",
    type: "link",
  },
];

const authNavItems = [
  {
    key: "dashboard",
    to: "/dashboard",
    label: "Dashboard",
    icon: "bi-speedometer2",
    type: "link",
  },
  {
    key: "history",
    to: "/transactions",
    label: "History",
    icon: "bi-clock-history",
    type: "link",
  },
  {
    key: "analytics",
    to: "/analytics",
    label: "Analytics",
    icon: "bi-graph-up-arrow",
    type: "link",
  },
  {
    key: "add",
    to: "/add-transaction",
    label: "Add",
    icon: "bi-plus-lg",
    type: "link",
  },
  {
    key: "logout",
    to: "#",
    label: "Logout",
    icon: "bi-box-arrow-right",
    type: "action",
  },
];

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // auth state kept in local state so UI updates immediately on logout/login
  const [isAuthenticated, setIsAuthenticated] = useState(
    Boolean(localStorage.getItem("token"))
  );
  const [open, setOpen] = useState(false);

  // close mobile menu on route change
  useEffect(() => {
    setOpen(false);
    // also update auth state in case token changed externally
    setIsAuthenticated(Boolean(localStorage.getItem("token")));
  }, [location.pathname]);

  // also listen to storage events (optional) to react to login/logout in another tab
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "token") setIsAuthenticated(Boolean(e.newValue));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsAuthenticated(false);
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;

  const toggleMenu = () => setOpen((s) => !s);
  const closeMenu = () => setOpen(false);

  const bottomItems = isAuthenticated ? authNavItems : publicNavItems;

  return (
    <>
      <nav className="navbar">
        <div className="logo" onClick={() => navigate("/")}>
          Dhana<span>Sethu</span>
        </div>

        {/* desktop / slide panel */}
        <ul className={`nav-links ${open ? "open" : ""}`} role="menu">
          <li role="none">
            <Link
              to="/"
              className={isActive("/") ? "active" : ""}
              role="menuitem"
              onClick={closeMenu}
            >
              Home
            </Link>
          </li>

          {!isAuthenticated ? (
            <>
              <li role="none">
                <Link
                  to="/login"
                  className={isActive("/login") ? "active" : ""}
                  role="menuitem"
                  onClick={closeMenu}
                >
                  Login
                </Link>
              </li>
              <li role="none">
                <Link
                  to="/register"
                  className="nav-btn register"
                  role="menuitem"
                  onClick={closeMenu}
                >
                  Register
                </Link>
              </li>
            </>
          ) : (
            <>
              <li role="none">
                <Link
                  to="/dashboard"
                  className={isActive("/dashboard") ? "active" : ""}
                  role="menuitem"
                  onClick={closeMenu}
                >
                  <i className="bi bi-speedometer2 me-2" aria-hidden="true"></i>
                  Dashboard
                </Link>
              </li>
              <li role="none">
                <Link
                  to="/transactions"
                  className={isActive("/transactions") ? "active" : ""}
                  role="menuitem"
                  onClick={closeMenu}
                >
                  <i
                    className="bi bi-clock-history me-2"
                    aria-hidden="true"
                  ></i>
                  History
                </Link>
              </li>
              <li role="none">
                <Link
                  to="/analytics"
                  className={isActive("/analytics") ? "active" : ""}
                  role="menuitem"
                  onClick={closeMenu}
                >
                  <i
                    className="bi bi-graph-up-arrow me-2"
                    aria-hidden="true"
                  ></i>
                  Analytics
                </Link>
              </li>
              <li className="nav-divider" aria-hidden="true"></li>
              <li role="none">
                <Link
                  to="/add-transaction"
                  className="nav-btn add"
                  role="menuitem"
                  onClick={closeMenu}
                >
                  + Add
                </Link>
              </li>
              <li role="none">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    logout();
                    closeMenu();
                  }}
                  className="logout-link"
                  role="menuitem"
                >
                  Logout
                </motion.button>
              </li>
            </>
          )}
        </ul>

        {/* burger button for mobile */}
        <button
          className={`burger ${open ? "open" : ""}`}
          onClick={toggleMenu}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          <i className={`bi ${open ? "bi-x" : "bi-list"}`} aria-hidden="true" />
        </button>

        {/* backdrop for mobile when menu is open */}
        <div
          className={`nav-backdrop ${open ? "visible" : ""}`}
          onClick={closeMenu}
          aria-hidden={!open}
        />
      </nav>

      {/* BOTTOM ICON NAV (MOBILE) */}
      <nav
        className="bottom-nav"
        role="navigation"
        aria-label="Mobile navigation"
      >
        {bottomItems.map((it) =>
          it.type === "link" ? (
            <Link
              key={it.key}
              to={it.to}
              className={`bottom-item ${isActive(it.to) ? "active" : ""}`}
              aria-current={isActive(it.to) ? "page" : undefined}
            >
              <div className="icon-wrap" aria-hidden="true">
                <i className={`bi ${it.icon}`} />
              </div>
              <span className="label">{it.label}</span>
            </Link>
          ) : (
            // action (logout) - render as button
            <button
              key={it.key}
              className="bottom-item action-item"
              onClick={() => {
                if (it.key === "logout") logout();
              }}
            >
              <div className="icon-wrap" aria-hidden="true">
                <i className={`bi ${it.icon}`} />
              </div>
              <span className="label">{it.label}</span>
            </button>
          )
        )}
      </nav>
    </>
  );
};

export default Navbar;
