import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import appIcon from "../assets/dhanasethuIconWithName.png";
import "./Home.css";
// import { useCurrency } from "../context/CurrencyContext";

const Home = () => {
  const isLoggedIn = Boolean(localStorage.getItem("token"));

  return (
    <div className="home-wrapper">
      {/* Hero Section */}
      <section className="hero-section">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="hero-content"
        >
          <div className="home-logo-wrap">
            <img
              src={appIcon}
              alt="DhanaSethu Logo"
              className="home-brand-icon"
            />
          </div>
          <h1>
            Track Your Money. <br />
            <span>Build Your Future.</span>
          </h1>
          <p>
            DhanaSethu is your premium personal finance bridge, simplifying how
            you track expenses, manage loans, and visualize your path to wealth.
          </p>
          <div className="hero-btns">
            {isLoggedIn ? (
              <>
                <Link to="/dashboard">
                  <button className="btn-primary">Dashboard</button>
                </Link>
                <Link to="/add-transaction">
                  <button className="btn-secondary">Add Transaction</button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/login">
                  <button className="btn-primary">Get Started</button>
                </Link>
                <Link to="/register">
                  <button className="btn-secondary">Create Account</button>
                </Link>
              </>
            )}
          </div>
        </motion.div>
      </section>

      {/* About Section */}
      <section className="about-section">
        <div className="section-header">
          <h2>What is DhanaSethu?</h2>
          <div className="underline"></div>
        </div>
        <p>
          DhanaSethu is a comprehensive wealth management tool designed for the
          modern individual. Unlike simple trackers, we focus on the "Flow" of
          your money—balancing daily spending with long-term investments and
          private lending/borrowing records.
        </p>

        <div className="feature-grid">
          <div className="feature-card">
            <i className="bi bi-graph-up-arrow"></i>
            <h3>Advanced Analytics</h3>
            <p>
              Visualize Income vs. Expense and Category breakdowns with
              precision.
            </p>
          </div>
          <div className="feature-card">
            <i className="bi bi-safe"></i>
            <h3>Loan Management</h3>
            <p>
              Track principal and interest for money lended or borrowed with
              automated dues alerts.
            </p>
          </div>
          <div className="feature-card">
            <i className="bi bi-shield-lock"></i>
            <h3>Secure Access</h3>
            <p>
              Encrypted authentication ensures your financial data stays private
              and secure.
            </p>
          </div>
        </div>
      </section>

      {/* How to Use Section */}
      <section className="how-to-use">
        <h2>How to Use DhanaSethu</h2>
        <div className="step-container">
          <div className="step">
            <div className="step-num">1</div>
            <h4>Record Entry</h4>
            <p>
              Use the "Add" button to log daily expenses, income, or
              investments.
            </p>
          </div>
          <div className="step">
            <div className="step-num">2</div>
            <h4>Manage Dues</h4>
            <p>
              Log money lended or borrowed in the "Dues" section to track
              interest flow.
            </p>
          </div>
          <div className="step">
            <div className="step-num">3</div>
            <h4>Review Stats</h4>
            <p>
              Check "Stats" for monthly breakdowns and payment method analysis.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <div className="footer-content">
          <div className="footer-logo">
            Dhana<span>Sethu</span>
          </div>
          <p>Your Financial Bridge.</p>
          <div className="footer-links">
            {isLoggedIn ? (
              <>
                <Link to="/dashboard">Dashboard</Link>
                <Link to="/profile">Profile</Link>
              </>
            ) : (
              <>
                <Link to="/login">Login</Link>
                <Link to="/register">Register</Link>
              </>
            )}
            <a href="#about">Privacy Policy</a>
          </div>

          <div className="copyright">
            <p>R.P.Y</p>
            &copy; {new Date().getFullYear()} DhanaSethu. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
