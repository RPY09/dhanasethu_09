import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import appIcon from "../assets/dhanasethuIconWithName.png";
import { useEffect, useState } from "react";
import "./Home.css";

const Home = () => {
  const navigate = useNavigate();
  const isLoggedIn = Boolean(localStorage.getItem("token"));

  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  /* Redirect logged-in users */
  useEffect(() => {
    if (isLoggedIn) {
      navigate("/app-lock", { replace: true });
    }
  }, [isLoggedIn, navigate]);

  /* Capture install prompt */
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handler);

    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setInstallPrompt(null);
    }
  };

  return (
    <div className="home-wrapper">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-glow"></div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="hero-content"
        >
          <img src={appIcon} alt="DhanaSethu" className="home-brand-icon" />

          <h1 className="hero-title">
            Master Your Money. <br />
            <span className="accent-text">Elevate Your Life.</span>
          </h1>

          <p className="hero-subtitle">
            A premium financial bridge designed to track spending, manage dues,
            and secure your digital wealth with elegance.
          </p>

          <div className="hero-btns">
            {!isLoggedIn && (
              <>
                <Link to="/login" className="btn-primary-new">
                  Get Started
                </Link>
                <Link to="/register" className="btn-outline">
                  Create Account
                </Link>
              </>
            )}

            {/* INSTALL BUTTON */}
            {!isInstalled && installPrompt && (
              <button
                className="btn-glass install-btn"
                onClick={handleInstallClick}
              >
                <i class="bi bi-download"></i>Install App
              </button>
            )}
          </div>

          <div className="hero-trust-badge">
            <i className="bi bi-shield-check"></i> Military-grade Encryption
          </div>
        </motion.div>
      </section>

      {/* Stats/Preview Section (New) */}
      <section className="stats-preview">
        <div className="preview-card glass-morphism">
          <div className="preview-item">
            <span className="label">Wealth Flow</span>
            <span className="value">Automated</span>
          </div>
          <div className="preview-divider"></div>
          <div className="preview-item">
            <span className="label">Security</span>
            <span className="value">Private</span>
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section className="about-section">
        <div className="section-header">
          <span className="overline">Capabilities</span>
          <h2>Financial Intelligence</h2>
        </div>

        <div className="feature-grid">
          <div className="feature-card-new">
            <div className="icon-box">
              <i className="bi bi-graph-up-arrow"></i>
            </div>
            <h3>Analytics</h3>
            <p>Visual breakdown of your income and category spending.</p>
          </div>
          <div className="feature-card-new">
            <div className="icon-box">
              <i className="bi bi-safe"></i>
            </div>
            <h3>Lending</h3>
            <p>Manage private loans and automated interest calculations.</p>
          </div>
          <div className="feature-card-new">
            <div className="icon-box">
              <i className="bi bi-fingerprint"></i>
            </div>
            <h3>Privacy</h3>
            <p>Your data is yours. Encrypted and never shared.</p>
          </div>
        </div>
      </section>
      <section className="how-it-works">
        <div className="section-header">
          <span className="overline">The Process</span>
          <h2>How to use DhanaSethu</h2>
        </div>

        <div className="step-container">
          <motion.div
            whileInView={{ opacity: 1, x: 0 }}
            initial={{ opacity: 0, x: -20 }}
            className="step-card"
          >
            <div className="step-number">01</div>
            <div className="step-info">
              <h3>Secure Onboarding</h3>
              <p>
                Create your private account with military-grade encryption to
                protect your financial footprint.
              </p>
            </div>
          </motion.div>

          <motion.div
            whileInView={{ opacity: 1, x: 0 }}
            initial={{ opacity: 0, x: -20 }}
            transition={{ delay: 0.2 }}
            className="step-card"
          >
            <div className="step-number">02</div>
            <div className="step-info">
              <h3>Log Transactions</h3>
              <p>
                Easily input daily expenses, income, or private lending dues
                through our intuitive interface.
              </p>
            </div>
          </motion.div>

          <motion.div
            whileInView={{ opacity: 1, x: 0 }}
            initial={{ opacity: 0, x: -20 }}
            transition={{ delay: 0.4 }}
            className="step-card"
          >
            <div className="step-number">03</div>
            <div className="step-info">
              <h3>Analyze & Grow</h3>
              <p>
                View automated wealth flow reports and track your path to
                financial freedom in real-time.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <div className="footer-logo">
          Dhana<span>Sethu</span>
        </div>
        <p className="footer-tagline">The bridge to financial freedom.</p>
        <div className="copyright">
          &copy; {new Date().getFullYear()} DhanaSethu • Crafted for Excellence
        </div>
      </footer>
    </div>
  );
};

export default Home;
