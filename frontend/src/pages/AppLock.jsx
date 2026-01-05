import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { verifyAppLockPin, unlockApp } from "../utils/appLock";
import { useAlert } from "../components/Alert/AlertContext";
import appIcon from "../assets/dhanasethuIconWithName.png";
import "./AppLock.css";

const AppLock = () => {
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const [pin, setPin] = useState("");

  const handleKeyPress = (val) => {
    if (pin.length < 4) setPin((prev) => prev + val);
  };

  const handleDelete = () => setPin((prev) => prev.slice(0, -1));

  useEffect(() => {
    if (pin.length === 4) {
      if (verifyAppLockPin(pin)) {
        unlockApp();
        navigate("/dashboard", { replace: true });
      } else {
        showAlert("Incorrect PIN", "error");
        setPin("");
      }
    }
  }, [pin, navigate, showAlert]);

  return (
    <div className="app-lock-wrapper">
      <motion.div
        className="app-lock-content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {/* LOGO SECTION MATCHING LOGIN PAGE */}
        <div className="app-lock-branding">
          <div className="auth-logo-wrap">
            <img src={appIcon} alt="DhanaSethu" className="auth-brand-icon" />
          </div>
          <header className="app-lock-header">
            <h1>Security Lock</h1>
            <p>Secure access to your wealth</p>
          </header>
        </div>

        <div className="pin-display-section">
          <div className="pin-dots">
            {[...Array(4)].map((_, i) => (
              <motion.div
                key={i}
                className={`pin-dot ${pin.length > i ? "active" : ""}`}
                animate={pin.length === i + 1 ? { scale: [1, 1.2, 1] } : {}}
              />
            ))}
          </div>
          <span className="pin-hint">Enter your 4-digit PIN</span>
        </div>

        <div className="keypad-container">
          <div className="keypad-grid">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                className="key-btn"
                onClick={() => handleKeyPress(num.toString())}
              >
                {num}
              </button>
            ))}
            <button className="key-btn icon-mode">
              <i className="bi bi-fingerprint"></i>
            </button>
            <button className="key-btn" onClick={() => handleKeyPress("0")}>
              0
            </button>
            <button className="key-btn icon-mode" onClick={handleDelete}>
              <i className="bi bi-backspace"></i>
            </button>
          </div>
        </div>

        <footer className="app-lock-footer">
          <button className="footer-link">Forgot PIN?</button>
          <button className="footer-link primary">Use Password</button>
        </footer>
      </motion.div>
    </div>
  );
};

export default AppLock;
