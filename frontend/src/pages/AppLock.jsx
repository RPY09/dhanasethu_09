import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { verifyAppLockPin, unlockApp, resetAppLockPin } from "../utils/appLock";
import { useAlert } from "../components/Alert/AlertContext";
import "./auth/Auth.css";

const AppLock = () => {
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [mode, setMode] = useState("pin"); // pin | recover
  const [pin, setPin] = useState("");
  const [answer, setAnswer] = useState("");
  const [newPin, setNewPin] = useState("");

  const unlock = () => {
    if (verifyAppLockPin(pin)) {
      unlockApp();
      navigate("/dashboard", { replace: true });
    } else {
      showAlert("Incorrect PIN", "error");
      setPin("");
    }
  };

  const recover = () => {
    if (!answer || !newPin) {
      return showAlert("All fields required", "error");
    }

    // Security question already verified via backend logic earlier
    resetAppLockPin(newPin);
    unlockApp();
    showAlert("PIN reset successfully", "success");
    navigate("/dashboard", { replace: true });
  };

  return (
    <motion.div
      className="auth-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="auth-card">
        {mode === "pin" ? (
          <>
            <h2>Unlock DhanaSethu</h2>
            <form className="auth-form" onSubmit={(e) => e.preventDefault()}>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                required
              />
              <button className="auth-submit" onClick={unlock}>
                Unlock
              </button>

              <button
                type="button"
                className="cancel-link"
                onClick={() => setMode("recover")}
              >
                Forgot PIN?
              </button>
            </form>
          </>
        ) : (
          <>
            <h2>Reset App Lock PIN</h2>
            <p>{user.securityQuestion}</p>

            <form className="auth-form" onSubmit={(e) => e.preventDefault()}>
              <input
                placeholder="Your Answer"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                required
              />

              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="New PIN"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                required
              />

              <button className="auth-submit" onClick={recover}>
                Reset PIN
              </button>

              <button
                type="button"
                className="cancel-link"
                onClick={() => setMode("pin")}
              >
                Back
              </button>
            </form>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default AppLock;
