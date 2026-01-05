import { useState, useEffect, useRef } from "react";

import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  verifyAppLockPin,
  unlockApp,
  disableAppLock,
  isAppLockEnabled,
} from "../utils/appLock";
import {
  isBiometricSupported,
  isBiometricEnabled,
  verifyBiometric,
} from "../utils/biometric";

import { useAlert } from "../components/Alert/AlertContext";
import appIcon from "../assets/dhanasethuIconWithName.png";
import api from "../api/axios";
import "./AppLock.css";

const AppLock = () => {
  const navigate = useNavigate();
  const { showAlert } = useAlert();

  const [pin, setPin] = useState("");
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const MAX_BIOMETRIC_ATTEMPTS = 3;

  const [showPin, setShowPin] = useState(false);
  const [biometricAttempts, setBiometricAttempts] = useState(0);

  useEffect(() => {
    if (!isAppLockEnabled()) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (
      isBiometricSupported() &&
      isBiometricEnabled() &&
      biometricAttempts < MAX_BIOMETRIC_ATTEMPTS &&
      !showPin
    ) {
      handleBiometricUnlock();
    } else {
      setShowPin(true); // fallback to PIN
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Keypad input */ const isVerifyingRef = useRef(false);
  const handleBiometricUnlock = async () => {
    try {
      const ok = await verifyBiometric();
      if (!ok) throw new Error();

      unlockApp(); // session only
      navigate("/dashboard", { replace: true });
    } catch {
      const attempts = biometricAttempts + 1;
      setBiometricAttempts(attempts);

      if (attempts >= MAX_BIOMETRIC_ATTEMPTS) {
        showAlert("Biometric failed. Use PIN", "info");
        setShowPin(true);
      } else {
        showAlert("Biometric failed. Try again", "error");
      }
    }
  };

  const handleKeyPress = (val) => {
    if (pin.length < 4) setPin((prev) => prev + val);
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    isVerifyingRef.current = false;
  };

  /* PIN verification (disabled during recovery) */
  useEffect(() => {
    if (isRecovering) return;
    if (pin.length !== 4) return;
    if (isVerifyingRef.current) return; //  prevent double run

    isVerifyingRef.current = true;

    if (verifyAppLockPin(pin)) {
      unlockApp();
      setPin(""); //  clear immediately
      navigate("/dashboard", { replace: true });
    } else {
      showAlert("Incorrect PIN", "error");
      setPin("");
      isVerifyingRef.current = false; // allow retry
    }
  }, [pin, isRecovering, navigate, showAlert]);

  /*  Password verification for Forgot PIN */
  const handleVerifyPassword = async () => {
    if (!password) {
      showAlert("Enter your password", "error");
      return;
    }

    try {
      setLoading(true);

      const user = JSON.parse(localStorage.getItem("user"));

      await api.post("/auth/login", {
        email: user.email,
        password,
      });

      //  Correct password → disable app lock
      disableAppLock();
      unlockApp();

      setIsRecovering(false);
      setPin("");

      showAlert("App lock disabled", "success");
      navigate("/dashboard", { replace: true });
    } catch {
      showAlert("Incorrect password", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-lock-wrapper">
      <motion.div
        className="app-lock-content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {/* Branding */}
        <div className="app-lock-branding">
          <div className="auth-logo-wrap">
            <img src={appIcon} alt="DhanaSethu" className="auth-brand-icon" />
          </div>
          <header className="app-lock-header">
            <h1>Security Lock</h1>
            <p>Secure access to your wealth</p>
          </header>
        </div>

        {/* PIN dots */}
        {showPin && (
          <>
            {/* PIN dots */}
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

            {/* Keypad */}
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

              <button className="key-btn icon-mode" disabled />

              <button className="key-btn" onClick={() => handleKeyPress("0")}>
                0
              </button>

              <button className="key-btn icon-mode" onClick={handleDelete}>
                <i className="bi bi-backspace"></i>
              </button>
            </div>
          </>
        )}

        {/* Footer */}
        <footer className="app-lock-footer">
          <button
            className="footer-link"
            onClick={() => {
              setIsRecovering(true);
              setShowPasswordPrompt(true);
              setPin("");
            }}
          >
            Forgot PIN?
          </button>
        </footer>
      </motion.div>

      {/* Password Modal */}
      {showPasswordPrompt && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Verify Password</h3>
            <p>Enter your login password to disable App Lock</p>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />

            <button
              className="save-btn"
              onClick={handleVerifyPassword}
              disabled={loading}
            >
              {loading ? "Verifying..." : "Verify"}
            </button>

            <button
              className="cancel-link"
              onClick={() => {
                setShowPasswordPrompt(false);
                setPassword("");
                setIsRecovering(false);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppLock;
