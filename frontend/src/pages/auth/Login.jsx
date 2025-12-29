import { useState } from "react";
import {
  loginUser,
  loginViaOtp,
  forgotPasswordRequest,
} from "../../api/auth.api";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAlert } from "../../components/Alert/AlertContext";
import appIcon from "../../assets/dhanasethuIconWithName.png";
import "./Auth.css";

const Login = () => {
  const [form, setForm] = useState({ email: "", password: "", otp: "" });
  const [loading, setLoading] = useState(false);
  const [isOtpMode, setIsOtpMode] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const { showAlert } = useAlert();

  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSendOtp = async () => {
    if (!form.email) return alert("Please enter your email first");
    try {
      setLoading(true);
      await forgotPasswordRequest({ email: form.email });
      setOtpSent(true);
      alert("OTP sent to your email");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let res;
      if (isOtpMode) {
        res = await loginViaOtp({ email: form.email, otp: form.otp });
      } else {
        res = await loginUser({ email: form.email, password: form.password });
      }

      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        navigate("/dashboard");
      }
    } catch (error) {
      alert(error.response?.data?.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="auth-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="auth-card">
        <div className="auth-logo-wrap">
          <img src={appIcon} alt="DhanaSethu" className="auth-brand-icon" />
        </div>
        <header className="auth-header">
          <h2>{isOtpMode ? "OTP Login" : "Welcome Back"}</h2>
          <p>
            {isOtpMode
              ? "Login via email verification"
              : "Secure Access to your wealth"}
          </p>
        </header>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="input-field">
            <i className="bi bi-envelope"></i>
            <input
              name="email"
              type="email"
              placeholder="Email Address"
              onChange={handleChange}
              required
            />
          </div>

          <AnimatePresence mode="wait">
            {!isOtpMode ? (
              <motion.div
                key="pass"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="input-field">
                  <i className="bi bi-lock"></i>
                  <input
                    name="password"
                    type="password"
                    placeholder="Password"
                    onChange={handleChange}
                    required
                  />
                </div>
                <div style={{ textAlign: "right", marginTop: "8px" }}>
                  <span
                    className="cancel-link"
                    onClick={() => setIsOtpMode(true)}
                  >
                    Forgot Password?
                  </span>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="otp"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {otpSent ? (
                  <div className="input-field">
                    <i className="bi bi-shield-check"></i>
                    <input
                      name="otp"
                      placeholder="Enter 6-digit OTP"
                      onChange={handleChange}
                      required
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    className="pwd-btn"
                    style={{ width: "100%" }}
                    onClick={handleSendOtp}
                    disabled={loading}
                  >
                    {loading ? "Sending..." : "Send Login OTP"}
                  </button>
                )}
                <div style={{ textAlign: "center", marginTop: "12px" }}>
                  <span
                    className="cancel-link"
                    onClick={() => {
                      setIsOtpMode(false);
                      setOtpSent(false);
                    }}
                  >
                    Back to Password Login
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {(!isOtpMode || (isOtpMode && otpSent)) && (
            <motion.button
              type="submit"
              className="auth-submit"
              disabled={loading}
            >
              {loading ? <span className="spinner"></span> : "Sign In"}
            </motion.button>
          )}
        </form>

        <footer className="auth-footer">
          Don't have an account? <Link to="/register">Create one</Link>
        </footer>
      </div>
    </motion.div>
  );
};

export default Login;
