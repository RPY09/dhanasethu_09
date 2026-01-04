import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAlert } from "../components/Alert/AlertContext";
import api from "../api/axios";
import "../pages/auth/Auth.css";

const SECURITY_QUESTIONS = [
  { value: "birth_city", label: "What is your birth city?" },
  { value: "school_name", label: "What is your school name?" },
  { value: "fav_number", label: "What is your favorite number?" },
];

const SetupSecurity = () => {
  const navigate = useNavigate();
  const { showAlert } = useAlert();

  const [form, setForm] = useState({
    securityQuestion: "",
    answer: "",
    confirmAnswer: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.answer !== form.confirmAnswer) {
      return showAlert("Answers do not match", "error");
    }

    try {
      setLoading(true);

      await api.post("/auth/setup-security", {
        securityQuestion: form.securityQuestion,
        securityAnswer: form.answer,
      });

      // update local user state
      const user = JSON.parse(localStorage.getItem("user"));
      localStorage.setItem(
        "user",
        JSON.stringify({ ...user, needsSecuritySetup: false })
      );

      showAlert("Security setup completed", "success");
      navigate("/dashboard");
    } catch (err) {
      showAlert(
        err.response?.data?.message || "Security setup failed",
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
        <header className="auth-header">
          <h2>Secure Your Account</h2>
          <p>This is required for account recovery</p>
        </header>

        <form className="auth-form" onSubmit={handleSubmit}>
          {/* SECURITY QUESTION */}
          <div className="input-field">
            <select
              name="securityQuestion"
              value={form.securityQuestion}
              onChange={handleChange}
              required
            >
              <option value="">Select a security question</option>
              {SECURITY_QUESTIONS.map((q) => (
                <option key={q.value} value={q.value}>
                  {q.label}
                </option>
              ))}
            </select>
          </div>

          {/* ANSWER */}
          <div className="input-field">
            <input
              name="answer"
              placeholder="Your Answer"
              onChange={handleChange}
              required
            />
          </div>

          {/* CONFIRM ANSWER */}
          <div className="input-field">
            <input
              name="confirmAnswer"
              placeholder="Confirm Answer"
              onChange={handleChange}
              required
            />
          </div>

          <motion.button
            type="submit"
            className="auth-submit"
            disabled={loading}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? "Saving..." : "Save & Continue"}
          </motion.button>
        </form>
      </div>
    </motion.div>
  );
};

export default SetupSecurity;
