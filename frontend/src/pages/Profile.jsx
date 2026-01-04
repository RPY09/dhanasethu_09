import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAlert } from "../components/Alert/AlertContext";
import { updateProfile, resetPasswordWithSecurity } from "../api/auth.api";
import {
  isAppLockEnabled,
  changeAppLockPin,
  disableAppLock,
} from "../utils/appLock";
import { enableAppLock } from "../utils/appLock";

import "./Profile.css";

const Profile = () => {
  const navigate = useNavigate();
  const { showAlert } = useAlert();

  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user") || "{}")
  );
  const [showEnableLock, setShowEnableLock] = useState(false);
  const [newPin, setNewPin] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: user.name || "",
    number: user.number || "",
    country: user.country || "IN",
    baseCurrency: user.baseCurrency || "INR",
    timezone: user.timezone || "",
  });

  const [securityData, setSecurityData] = useState({
    answer: "",
    newPassword: "",
  });

  const [pinData, setPinData] = useState({
    oldPin: "",
    newPin: "",
  });

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      const res = await updateProfile(formData);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      setUser(res.data.user);
      setIsEditing(false);
      showAlert("Profile updated successfully", "success");
    } catch {
      showAlert("Profile update failed", "error");
    }
  };

  const handleChangePin = () => {
    if (!pinData.oldPin || !pinData.newPin) {
      return showAlert("Enter both PIN fields", "error");
    }

    if (!changeAppLockPin(pinData.oldPin, pinData.newPin)) {
      return showAlert("Incorrect current PIN", "error");
    }

    setPinData({ oldPin: "", newPin: "" });
    setShowPinModal(false);
    showAlert("App Lock PIN updated", "success");
  };

  const handleDisableLock = () => {
    disableAppLock();
    showAlert("App Lock disabled", "success");
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();

    if (!securityData.answer || !securityData.newPassword) {
      return showAlert("All fields are required", "error");
    }

    try {
      setLoading(true);

      await resetPasswordWithSecurity({
        email: user.email,
        answer: securityData.answer,
        newPassword: securityData.newPassword,
      });

      setShowPasswordModal(false);
      setSecurityData({ answer: "", newPassword: "" });
      showAlert("Password updated successfully", "success");
    } catch (err) {
      showAlert(
        err.response?.data?.message || "Password reset failed",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="profile-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="profile-card">
        <header className="profile-header">
          <h2>Account Settings</h2>
          <p>Manage your identity and security</p>
        </header>

        <form onSubmit={handleProfileUpdate} className="profile-form">
          <div className="input-group">
            <label>Full Name</label>
            <input
              value={formData.name}
              disabled={!isEditing}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>

          <div className="input-group">
            <label>Email</label>
            <input value={user.email} disabled className="disabled-input" />
          </div>

          <div className="input-group">
            <label>Mobile Number</label>
            <input
              value={formData.number}
              disabled={!isEditing}
              onChange={(e) =>
                setFormData({ ...formData, number: e.target.value })
              }
            />
          </div>

          <div className="profile-actions">
            {isAppLockEnabled() && (
              <>
                <button
                  type="button"
                  className="pwd-btn"
                  onClick={() => setShowPinModal(true)}
                >
                  Change App Lock PIN
                </button>

                <button
                  type="button"
                  className="logout-btn"
                  onClick={handleDisableLock}
                >
                  Disable App Lock
                </button>
              </>
            )}

            {!isEditing ? (
              <button
                type="button"
                className="edit-btn"
                onClick={() => setIsEditing(true)}
              >
                Edit Profile
              </button>
            ) : (
              <>
                <button type="submit" className="save-btn">
                  Save
                </button>
                <button
                  type="button"
                  className="cancel-link"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </button>
              </>
            )}
            <div className="security-section">
              {/* <h4>App Lock</h4> */}

              {!isAppLockEnabled() ? (
                <button
                  type="button"
                  className="pwd-btn"
                  onClick={() => setShowEnableLock(true)}
                >
                  Enable App Lock
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="pwd-btn"
                    onClick={() => setShowPinModal(true)}
                  >
                    Change App Lock PIN
                  </button>

                  <button
                    type="button"
                    className="logout-btn"
                    onClick={handleDisableLock}
                  >
                    Disable App Lock
                  </button>
                </>
              )}
            </div>
            <button
              type="button"
              className="pwd-btn"
              onClick={() => setShowPasswordModal(true)}
            >
              Security & Password
            </button>

            <button className="logout-btn" onClick={handleLogout}>
              Logout Account
            </button>
          </div>
        </form>
      </div>
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

              <button
                className="save-btn"
                onClick={() => {
                  if (newPin.length !== 4) {
                    return showAlert("PIN must be 4 digits", "error");
                  }
                  enableAppLock(newPin);
                  setNewPin("");
                  setShowEnableLock(false);
                  showAlert("App Lock enabled", "success");
                }}
              >
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
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div className="modal-content">
              <h3>Change App Lock PIN</h3>
              <div className="modal-step">
                <input
                  type="password"
                  placeholder="Current PIN"
                  value={pinData.oldPin}
                  onChange={(e) =>
                    setPinData({ ...pinData, oldPin: e.target.value })
                  }
                />
                <input
                  type="password"
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
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PASSWORD RESET MODAL */}
      <AnimatePresence>
        {showPasswordModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div className="modal-content">
              <h3>Reset Password</h3>
              <p>{user.securityQuestion || "Answer your security question"}</p>

              <form onSubmit={handlePasswordReset} className="modal-step">
                <input
                  placeholder="Your Answer"
                  value={securityData.answer}
                  onChange={(e) =>
                    setSecurityData({ ...securityData, answer: e.target.value })
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
