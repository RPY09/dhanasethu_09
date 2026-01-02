import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAlert } from "../components/Alert/AlertContext";

import {
  updateProfile,
  requestPasswordOtp,
  resetPasswordOtp,
} from "../api/auth.api";
import "./Profile.css";

const Profile = () => {
  const navigate = useNavigate();
  const { showAlert } = useAlert();

  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user") || "{}")
  );
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState([]);
  const [countrySearch, setCountrySearch] = useState("");
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  const [formData, setFormData] = useState({
    name: user.name || "",
    number: user.number || "",
    country: user.country || "IN",
    baseCurrency: user.baseCurrency || "INR",
    timezone: user.timezone || "",
  });

  const [pwdData, setPwdData] = useState({ otp: "", newPassword: "" });

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };
  useEffect(() => {
    fetch("https://restcountries.com/v3.1/all?fields=name,cca2,currencies,flag")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch countries");
        }
        return res.json();
      })
      .then((data) => {
        if (!Array.isArray(data)) {
          throw new Error("Invalid country data");
        }

        const formatted = data
          .filter((c) => c.currencies && c.cca2)
          .map((c) => ({
            name: c.name.common,
            code: c.cca2,
            currency: Object.keys(c.currencies)[0],
            flag: c.flag,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

        setCountries(formatted);
      })
      .catch((err) => {
        console.error("Country fetch error:", err);
        setCountries([]);
      });
  }, []);

  const filteredCountries = countries.filter((c) =>
    `${c.name} ${c.currency}`
      .toLowerCase()
      .includes(countrySearch.toLowerCase())
  );

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      const res = await updateProfile(formData);
      const updatedUser = res.data.user;
      localStorage.setItem("user", JSON.stringify(updatedUser));
      window.dispatchEvent(new Event("profile:updated"));

      setUser(updatedUser);
      setIsEditing(false);
      showAlert("Profile updated!", "success");
    } catch (err) {
      showAlert(
        err.response?.data?.message || "Update failed. Is the server running?",
        "error"
      );
    }
  };

  const handleRequestOTP = async () => {
    setLoading(true);
    try {
      await requestPasswordOtp();
      setStep(2);
      showAlert("OTP sent to your email", "success");
    } catch (err) {
      showAlert("Failed to send OTP. Check backend connection.", "error");
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
      showAlert("Password updated successfully", "success");
    } catch (err) {
      showAlert(err.response?.data?.message || "Invalid OTP", "error");
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
          {isEditing && (
            <div className="input-group">
              <label>Country</label>

              <input
                type="text"
                placeholder="Search country or currency"
                value={countrySearch}
                onFocus={(e) => {
                  e.target.select();
                  setShowCountryDropdown(true);
                }}
                onChange={(e) => setCountrySearch(e.target.value)}
              />

              {showCountryDropdown && (
                <div
                  style={{
                    maxHeight: "220px",
                    overflowY: "auto",
                    border: "1px solid #ddd",
                    borderRadius: "12px",
                    marginTop: "6px",
                    background: "#fff",
                    zIndex: 10,
                  }}
                >
                  {filteredCountries.length ? (
                    filteredCountries.map((c) => (
                      <div
                        key={c.code}
                        style={{
                          padding: "10px",
                          cursor: "pointer",
                          display: "flex",
                          gap: "8px",
                        }}
                        onClick={() => {
                          setFormData({
                            ...formData,
                            country: c.code,
                            baseCurrency: c.currency,
                          });

                          setCountrySearch(`${c.flag} ${c.name}`);
                          setShowCountryDropdown(false);
                        }}
                      >
                        <span>{c.flag}</span>
                        <span>{c.name}</span>
                        <span style={{ marginLeft: "auto", opacity: 0.6 }}>
                          {c.currency}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: "10px", opacity: 0.6 }}>
                      No country found
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <div className="input-group">
            <label>Currency</label>
            <input value={formData.baseCurrency || ""} disabled />
          </div>

          <div className="profile-actions">
            {!isEditing ? (
              <button
                type="button"
                className="edit-btn"
                onClick={() => {
                  setCountrySearch(
                    `${formData.country} - ${formData.currency}`
                  );
                  setIsEditing(true);
                }}
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
