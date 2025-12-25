import { useState } from "react";
import { registerUser } from "../../api/auth.api";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import "./Auth.css";

const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    number: "",
    password: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await registerUser(form);
      localStorage.setItem("token", res.data.token);
      alert("Registration successful");
      navigate("/dashboard");
    } catch (err) {
      alert(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <motion.div
      className="auth-page"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="auth-card">
        <header className="auth-header">
          <h2>Get Started</h2>
          <p>Join DhanaSethu and Manage Wealth</p>
        </header>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="input-field">
            <i className="bi bi-person"></i>
            <input
              name="name"
              placeholder="Full Name"
              onChange={handleChange}
              required
            />
          </div>
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
          <div className="input-field">
            <i className="bi bi-phone"></i>
            <input
              name="number"
              placeholder="Mobile Number"
              onChange={handleChange}
              required
            />
          </div>
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

          <motion.button
            type="submit"
            className="auth-submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Register
          </motion.button>
        </form>

        <footer className="auth-footer">
          Already have an account? <Link to="/login">Sign In</Link>
        </footer>
      </div>
    </motion.div>
  );
};

export default Register;
