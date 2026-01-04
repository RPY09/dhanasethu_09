import { useState } from "react";
import { loginUser, loginWithSecurityAnswer } from "../../api/auth.api";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAlert } from "../../components/Alert/AlertContext";
import appIcon from "../../assets/dhanasethuIconWithName.png";
import "./Auth.css";

const Login = () => {
  const navigate = useNavigate();
  const { showAlert } = useAlert();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [securityMode, setSecurityMode] = useState(false);
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let res;

      if (securityMode) {
        // Login using security question
        res = await loginWithSecurityAnswer({
          email: form.email,
          answer,
        });
      } else {
        // Normal login
        res = await loginUser({
          email: form.email,
          password: form.password,
        });
      }

      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));

        if (res.data.user.needsSecuritySetup) {
          navigate("/setup-security");
        } else {
          navigate("/dashboard");
        }
      }
    } catch (err) {
      showAlert(
        err.response?.data?.message || "Authentication failed",
        "error"
      );
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
          <h2>{securityMode ? "Verify Identity" : "Welcome Back"}</h2>
          <p>
            {securityMode
              ? "Answer your security question"
              : "Secure access to your wealth"}
          </p>
        </header>

        <form className="auth-form" onSubmit={handleSubmit}>
          {/* EMAIL */}
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
            {!securityMode ? (
              /* PASSWORD LOGIN */
              <motion.div
                key="password"
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
                    onClick={() => setSecurityMode(true)}
                  >
                    Forgot password?
                  </span>
                </div>
              </motion.div>
            ) : (
              /* SECURITY QUESTION LOGIN */
              <motion.div
                key="security"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <p className="security-question">
                  {securityQuestion || "Answer your security question"}
                </p>

                <div className="input-field">
                  <i className="bi bi-shield-lock"></i>
                  <input
                    placeholder="Your Answer"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    required
                  />
                </div>

                <div style={{ textAlign: "center", marginTop: "12px" }}>
                  <span
                    className="cancel-link"
                    onClick={() => {
                      setSecurityMode(false);
                      setAnswer("");
                    }}
                  >
                    Back to password login
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading ? <span className="spinner"></span> : "Sign In"}
          </motion.button>
        </form>

        <footer className="auth-footer">
          Don’t have an account? <Link to="/register">Create one</Link>
        </footer>
      </div>
    </motion.div>
  );
};

export default Login;
