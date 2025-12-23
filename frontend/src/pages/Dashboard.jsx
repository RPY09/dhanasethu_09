import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { getTransactions } from "../api/transaction.api";
import "./Dashboard.css";

const parseNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const formatCurrency = (v) =>
  parseNumber(v).toLocaleString(undefined, { maximumFractionDigits: 2 });

const detectPaymentMode = (t = {}) => {
  const raw =
    t.paymentMode ||
    t.method ||
    t.paymentMethod ||
    t.paymentType ||
    (t.meta && (t.meta.paymentMode || t.meta.method)) ||
    "";
  return String(raw).toLowerCase();
};

const Dashboard = () => {
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const res = await getTransactions();
      setTransactions(res.data || []);
    } catch (err) {
      console.error("Failed to load transactions", err);
      setTransactions([]);
    }
  };

  // Current month/year
  const now = new Date();
  const currentMonthIndex = now.getMonth();
  const currentYear = now.getFullYear();

  // Only use transactions from the current month (user requirement)
  const monthTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const d = new Date(t.date);
      return (
        d.getMonth() === currentMonthIndex && d.getFullYear() === currentYear
      );
    });
  }, [transactions, currentMonthIndex, currentYear]);

  // Totals for current month
  const totalIncome = useMemo(
    () =>
      monthTransactions
        .filter((t) => t.type === "income")
        .reduce((s, t) => s + parseNumber(t.amount), 0),
    [monthTransactions]
  );

  const totalExpense = useMemo(
    () =>
      monthTransactions
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + parseNumber(t.amount), 0),
    [monthTransactions]
  );

  const totalInvestment = useMemo(
    () =>
      monthTransactions
        .filter((t) => t.type === "invest")
        .reduce((s, t) => s + parseNumber(t.amount), 0),
    [monthTransactions]
  );

  const balance = useMemo(
    () => totalIncome - totalExpense - totalInvestment,
    [totalIncome, totalExpense, totalInvestment]
  );

  // Cash vs Bank balances for current month (net)
  const { cashBalance, bankBalance } = useMemo(() => {
    let cashNet = 0;
    let bankNet = 0;

    monthTransactions.forEach((t) => {
      const mode = detectPaymentMode(t);
      const amt = parseNumber(t.amount);
      const signed =
        t.type === "income"
          ? amt
          : t.type === "expense" || t.type === "invest"
            ? -amt
            : 0;

      if (mode.includes("cash")) cashNet += signed;
      else bankNet += signed;
    });

    return { cashBalance: cashNet, bankBalance: bankNet };
  }, [monthTransactions]);

  // 5 most recent transactions from current month
  const recentTransactions = useMemo(() => {
    return monthTransactions
      .slice()
      .sort((a, b) => {
        const da = new Date(a.date).getTime() || 0;
        const db = new Date(b.date).getTime() || 0;
        return db - da;
      })
      .slice(0, 5);
  }, [monthTransactions]);

  // Animation Variants
  const containerVars = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const itemVars = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.45, ease: "easeOut" },
    },
  };

  return (
    <motion.div
      className="dashboard-container"
      initial="hidden"
      animate="visible"
      variants={containerVars}
    >
      <motion.header className="dashboard-header" variants={itemVars}>
        <h1>Overview</h1>
        <p className="date-display">
          {now.toLocaleString("default", { month: "long" })} {currentYear}
        </p>
      </motion.header>

      <motion.div className="stats-grid" variants={containerVars}>
        {/* Total Balance Card with Hover Scale */}
        <motion.div
          className="stat-card primary-card"
          variants={itemVars}
          whileHover={{ scale: 1.02, translateY: -5 }}
        >
          <h3>Balance</h3>
          <p className="amount">₹{formatCurrency(balance)}</p>
        </motion.div>

        {[
          {
            label: "Income",
            val: totalIncome,
            className: "income-text",
            prefix: "+",
          },
          {
            label: "Expenses",
            val: totalExpense,
            className: "expense-text",
            prefix: "-",
          },
          {
            label: "Investments",
            val: totalInvestment,
            className: "investment-text",
            prefix: "",
          },
        ].map((item, idx) => (
          <motion.div
            key={idx}
            className="stat-card"
            variants={itemVars}
            whileHover={{ scale: 1.02, translateY: -5 }}
          >
            <h3>{item.label}</h3>
            <p className={`amount ${item.className}`}>
              {item.prefix}₹{formatCurrency(item.val)}
            </p>
          </motion.div>
        ))}
      </motion.div>

      <motion.div className="secondary-stats" variants={itemVars}>
        <div className="mini-card">
          <i className="bi bi-cash-stack me-2"></i>
          <span>Cash</span>
          <strong>₹{formatCurrency(cashBalance)}</strong>
        </div>
        <div className="mini-card">
          <span>Bank</span>
          <strong>₹{formatCurrency(bankBalance)}</strong>
        </div>
      </motion.div>

      <motion.section className="recent-section" variants={itemVars}>
        <h3>Recent Activity (This Month)</h3>
        <div className="transaction-list">
          {recentTransactions.length === 0 ? (
            <div className="transaction-row">
              <div className="transaction-info">
                <span className="category">No transactions</span>
                <span className="type-tag">—</span>
              </div>
            </div>
          ) : (
            recentTransactions.map((t, i) => {
              const key = t._id || t.id || `${t.date}-${i}`;
              const amt = parseNumber(t.amount);
              const sign = t.type === "income" ? "+" : "-";
              return (
                <motion.div
                  key={key}
                  className="transaction-row"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.06 }}
                  whileHover={{ backgroundColor: "rgba(181, 136, 99, 0.05)" }}
                >
                  <div className="transaction-info">
                    <span className="category">{t.category || "—"}</span>
                    <span className="type-tag">
                      {(t.type || "").toUpperCase()}
                    </span>
                  </div>
                  <span className={`amount-tag ${t.type || ""}`}>
                    {sign}₹{formatCurrency(amt)}
                  </span>
                </motion.div>
              );
            })
          )}
        </div>
      </motion.section>
    </motion.div>
  );
};

export default Dashboard;
