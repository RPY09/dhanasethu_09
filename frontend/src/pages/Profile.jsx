import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAlert } from "../components/Alert/AlertContext";
import { updateProfile, resetPasswordWithSecurity } from "../api/auth.api";
import {
  isAppLockEnabled,
  enableAppLock,
  changeAppLockPin,
  disableAppLock,
} from "../utils/appLock";
import {
  isBiometricSupported,
  registerBiometric,
  disableBiometric,
  isBiometricEnabled,
} from "../utils/biometric";

import "./Profile.css";

const Profile = () => {
  const navigate = useNavigate();
  const { showAlert } = useAlert();

  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user") || "{}")
  );

  const [isEditing, setIsEditing] = useState(false);
  const [showEnableLock, setShowEnableLock] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: user.name || "",
    number: user.number || "",
  });

  const [securityData, setSecurityData] = useState({
    answer: "",
    newPassword: "",
  });

  const [pinData, setPinData] = useState({ oldPin: "", newPin: "" });
  const [newPin, setNewPin] = useState("");

  /* ---------------- LOGOUT ---------------- */
  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.replace("/login");
  };

  /* ---------------- PROFILE UPDATE ---------------- */
  const handleProfileUpdate = async (e) => {
    e.preventDefault();

    if (!isEditing) return;

    try {
      const res = await updateProfile(formData);
      const updatedUser = res.data.user;

      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);

      setIsEditing(false);
      showAlert("Profile updated", "success");
    } catch {
      showAlert("Update failed", "error");
    }
  };

  /* ---------------- APP LOCK ---------------- */
  const handleEnableLock = () => {
    if (newPin.length !== 4) {
      showAlert("PIN must be 4 digits", "error");
      return;
    }
    enableAppLock(newPin);
    setShowEnableLock(false);
    showAlert("App Lock Enabled", "success");
  };

  const handleChangePin = () => {
    if (!pinData.oldPin || !pinData.newPin) {
      showAlert("Fill all PIN fields", "error");
      return;
    }
    const ok = changeAppLockPin(pinData.oldPin, pinData.newPin);
    if (ok) {
      setShowPinModal(false);
      showAlert("PIN updated", "success");
    } else {
      showAlert("Incorrect old PIN", "error");
    }
  };

  const handleDisableLock = () => {
    if (window.confirm("Disable App Lock?")) {
      disableAppLock();
      showAlert("App Lock Disabled", "success");
    }
  };

  /* ---------------- PASSWORD RESET ---------------- */
  const handlePasswordReset = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await resetPasswordWithSecurity(securityData);
      showAlert("Password updated", "success");
      setShowPasswordModal(false);
    } catch {
      showAlert("Password reset failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="profile-wrapper"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="profile-compact-card">
        <header className="profile-header-slim">
          <h2>Profile</h2>
          <p>Security & Identity</p>
        </header>

        <form onSubmit={handleProfileUpdate} className="profile-form-compact">
          <div className="compact-input-group">
            <label>Full Name</label>
            <input
              value={formData.name}
              disabled={!isEditing}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>

          <div className="compact-input-group">
            <label>Mobile Number</label>
            <input
              value={formData.number}
              disabled={!isEditing}
              onChange={(e) =>
                setFormData({ ...formData, number: e.target.value })
              }
            />
          </div>

          <div className="profile-action-grid">
            {!isAppLockEnabled() ? (
              <button
                type="button"
                className="action-tile"
                onClick={() => setShowEnableLock(true)}
              >
                <i className="bi bi-shield-lock"></i>
                <span>Lock App</span>
              </button>
            ) : (
              <button
                type="button"
                className="action-tile active-tile"
                onClick={() => setShowPinModal(true)}
              >
                <i className="bi bi-key"></i>
                <span>Change PIN</span>
              </button>
            )}

            <button
              type="button"
              className="action-tile"
              onClick={() => setShowPasswordModal(true)}
            >
              <i className="bi bi-shield-check"></i>
              <span>Password</span>
            </button>

            {!isEditing ? (
              <button
                type="button"
                className="action-tile"
                onClick={() => {
                  setFormData({
                    name: user.name || "",
                    number: user.number || "",
                  });
                  setIsEditing(true);
                }}
              >
                <i className="bi bi-pencil"></i>
                <span>Edit Info</span>
              </button>
            ) : (
              <button type="submit" className="action-tile save-tile">
                <i className="bi bi-check-lg"></i>
                <span>Save</span>
              </button>
            )}

            <button
              type="button"
              className="action-tile logout-tile"
              onClick={handleLogout}
            >
              <i className="bi bi-box-arrow-right"></i>
              <span>Logout</span>
            </button>
          </div>
          {isBiometricSupported() && (
            <button
              className="action-tile"
              onClick={async () => {
                if (isBiometricEnabled()) {
                  disableBiometric();
                  showAlert("Biometric disabled", "info");
                } else {
                  await registerBiometric();
                  showAlert("Biometric enabled", "success");
                }
              }}
            >
              <i className="bi bi-fingerprint"></i>
              <span>
                {isBiometricEnabled()
                  ? "Disable Biometric"
                  : "Enable Biometric"}
              </span>
            </button>
          )}

          {isAppLockEnabled() && (
            <button
              type="button"
              className="disable-lock-link"
              onClick={handleDisableLock}
            >
              Disable App Lock
            </button>
          )}
        </form>
      </div>

      {/* ENABLE LOCK MODAL */}
      <AnimatePresence>
        {showEnableLock && (
          <motion.div className="modal-overlay">
            <motion.div className="modal-content">
              <h3>Enable App Lock</h3>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="Set 4-digit PIN"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
              />
              <button className="save-btn" onClick={handleEnableLock}>
                Enable
              </button>
              <button
                className="cancel-link"
                onClick={() => setShowEnableLock(false)}
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CHANGE PIN MODAL */}
      <AnimatePresence>
        {showPinModal && (
          <motion.div className="modal-overlay">
            <motion.div className="modal-content">
              <h3>Change App Lock PIN</h3>
              <input
                type="password"
                inputMode="numeric"
                placeholder="Current PIN"
                value={pinData.oldPin}
                onChange={(e) =>
                  setPinData({ ...pinData, oldPin: e.target.value })
                }
              />
              <input
                type="password"
                inputMode="numeric"
                placeholder="New PIN"
                value={pinData.newPin}
                onChange={(e) =>
                  setPinData({ ...pinData, newPin: e.target.value })
                }
              />
              <button className="save-btn" onClick={handleChangePin}>
                Update PIN
              </button>
              <button
                className="cancel-link"
                onClick={() => setShowPinModal(false)}
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PASSWORD RESET MODAL */}
      <AnimatePresence>
        {showPasswordModal && (
          <motion.div className="modal-overlay">
            <motion.div className="modal-content">
              <h3>Reset Password</h3>
              <p>{user.securityQuestion || "Answer your security question"}</p>
              <form onSubmit={handlePasswordReset} className="modal-step">
                <input
                  placeholder="Your Answer"
                  value={securityData.answer}
                  onChange={(e) =>
                    setSecurityData({
                      ...securityData,
                      answer: e.target.value,
                    })
                  }
                />
                <input
                  type="password"
                  placeholder="New Password"
                  value={securityData.newPassword}
                  onChange={(e) =>
                    setSecurityData({
                      ...securityData,
                      newPassword: e.target.value,
                    })
                  }
                />
                <button className="save-btn" disabled={loading}>
                  {loading ? "Updating..." : "Update Password"}
                </button>
                <button
                  type="button"
                  className="cancel-link"
                  onClick={() => setShowPasswordModal(false)}
                >
                  Cancel
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Profile;
