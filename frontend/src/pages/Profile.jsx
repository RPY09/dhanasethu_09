import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  updateProfile,
  requestPasswordOtp,
  resetPasswordOtp,
} from "../api/auth.api";
import "./Profile.css";

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user") || "{}")
  );
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: user.name || "",
    number: user.number || "",
  });

  const [pwdData, setPwdData] = useState({ otp: "", newPassword: "" });

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      const res = await updateProfile(formData);
      const updatedUser = res.data.user;
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
      setIsEditing(false);
      alert("Profile updated successfully");
    } catch (err) {
      alert(
        err.response?.data?.message || "Update failed. Is the server running?"
      );
    }
  };

  const handleRequestOTP = async () => {
    setLoading(true);
    try {
      await requestPasswordOtp();
      setStep(2);
      alert("OTP sent to your registered email");
    } catch (err) {
      alert("Failed to send OTP. Check backend connection.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    try {
      await resetPasswordOtp(pwdData);
      setShowPasswordModal(false);
      setStep(1);
      setPwdData({ otp: "", newPassword: "" });
      alert("Password updated successfully");
    } catch (err) {
      alert(err.response?.data?.message || "Invalid OTP");
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
              name="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              disabled={!isEditing}
              className={!isEditing ? "readonly-input" : ""}
            />
          </div>

          <div className="input-group">
            <label>Email Address</label>
            <input value={user.email} disabled className="disabled-input" />
          </div>

          <div className="input-group">
            <label>Mobile Number</label>
            <input
              name="number"
              value={formData.number}
              onChange={(e) =>
                setFormData({ ...formData, number: e.target.value })
              }
              disabled={!isEditing}
              className={!isEditing ? "readonly-input" : ""}
            />
          </div>

          <div className="profile-actions">
            {!isEditing ? (
              <button
                type="button"
                className="edit-btn"
                onClick={() => setIsEditing(true)}
              >
                Edit Profile
              </button>
            ) : (
              <div className="row">
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
              </div>
            )}

            <button
              type="button"
              className="pwd-btn"
              onClick={() => setShowPasswordModal(true)}
            >
              Security & Password
            </button>

            <button type="button" className="logout-btn" onClick={handleLogout}>
              Logout Account
            </button>
          </div>
        </form>
      </div>

      <AnimatePresence>
        {showPasswordModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
            >
              <h3>Update Password</h3>
              {step === 1 ? (
                <div className="modal-step">
                  <p>
                    Request an OTP to your email: <br />
                    <strong>{user.email}</strong>
                  </p>
                  <button
                    onClick={handleRequestOTP}
                    className="save-btn"
                    disabled={loading}
                  >
                    {loading ? "Sending..." : "Send OTP"}
                  </button>
                  <button
                    onClick={() => setShowPasswordModal(false)}
                    className="cancel-link"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <form onSubmit={handlePasswordReset} className="modal-step">
                  <input
                    placeholder="6-Digit OTP"
                    value={pwdData.otp}
                    onChange={(e) =>
                      setPwdData({ ...pwdData, otp: e.target.value })
                    }
                    required
                  />
                  <input
                    type="password"
                    placeholder="New Password"
                    value={pwdData.newPassword}
                    onChange={(e) =>
                      setPwdData({ ...pwdData, newPassword: e.target.value })
                    }
                    required
                  />
                  <button type="submit" className="save-btn">
                    Reset Password
                  </button>
                  <button onClick={() => setStep(1)} className="cancel-link">
                    Back
                  </button>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Profile;
