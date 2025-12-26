import { useEffect, useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { getTransactions } from "../api/transaction.api";
import "./Dashboard.css";

const parseNumber = (v) => {
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const formatCurrency = (v) =>
  parseNumber(v).toLocaleString("en-IN", { maximumFractionDigits: 0 });

const detectPaymentMode = (t = {}) => {
  const raw = t.paymentMode || t.method || t.paymentMethod || "";
  return String(raw).toLowerCase();
};

const Dashboard = () => {
  const [transactions, setTransactions] = useState([]);

  const fetchTransactions = useCallback(async () => {
    try {
      const data = await getTransactions(); // already pure data array

      const sorted = (Array.isArray(data) ? data : [])
        .filter((t) => t?.date && !isNaN(Date.parse(t.date)))
        .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));

      setTransactions(sorted);
    } catch (err) {
      console.error("Failed to load transactions", err);
      setTransactions([]);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
    // re-fetch when other pages signal changes (add / edit / delete)
    const onChanged = () => fetchTransactions();
    window.addEventListener("transactions:changed", onChanged);
    return () => window.removeEventListener("transactions:changed", onChanged);
  }, [fetchTransactions]);

  const now = new Date();
  const currentMonthIndex = now.getMonth();
  const currentYear = now.getFullYear();

  // --- MONTHLY STATS (Income/Expense/Investment) ---
  const { monthlyIncome, monthlyExpense, monthlyInvest } = useMemo(() => {
    return transactions.reduce(
      (acc, t) => {
        const d = new Date(t.date);
        if (
          d.getMonth() === currentMonthIndex &&
          d.getFullYear() === currentYear
        ) {
          const amt = parseNumber(t.amount);
          if ((t.type || "").toLowerCase() === "income")
            acc.monthlyIncome += amt;
          else if ((t.type || "").toLowerCase() === "expense")
            acc.monthlyExpense += amt;
          else if (
            ["investment", "invest"].includes((t.type || "").toLowerCase())
          )
            acc.monthlyInvest += amt;
        }
        return acc;
      },
      { monthlyIncome: 0, monthlyExpense: 0, monthlyInvest: 0 }
    );
  }, [transactions, currentMonthIndex, currentYear]);

  // --- OVERALL TOTALS (Balance, Cash, Bank) ---
  const { balance, cashBalance, bankBalance } = useMemo(() => {
    let cash = 0;
    let bank = 0;

    transactions.forEach((t) => {
      const mode = detectPaymentMode(t);
      const amt = parseNumber(t.amount);
      const signed = (t.type || "").toLowerCase() === "income" ? amt : -amt;

      if (String(mode).includes("cash")) cash += signed;
      else bank += signed;
    });

    return {
      cashBalance: cash,
      bankBalance: bank,
      balance: cash + bank,
    };
  }, [transactions]);

  const recentTransactions = useMemo(() => {
    return transactions.filter((t) => t?.date).slice(0, 5);
  }, [transactions]);

  return (
    <motion.div
      className="tx-wrapper"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <header className="tx-header">
        <div className="tx-titles">
          <h1>Overview</h1>
          <p>
            {now.toLocaleString("default", { month: "long" })} {currentYear}
          </p>
        </div>
        <div className="tx-date-box">
          <span className="tx-day">{now.getDate()}</span>
          <span className="tx-month">
            {now.toLocaleString("default", { month: "short" })}
          </span>
        </div>
      </header>

      <motion.div className="tx-primary-card" whileHover={{ scale: 1.01 }}>
        <div className="tx-balance-label">OVERALL BALANCE</div>
        <div className="tx-balance-amount">₹{formatCurrency(balance)}</div>

        <div className="tx-monthly-grid">
          <div className="tx-month-stat">
            <span>Monthly Income</span>
            <strong className="income">₹{formatCurrency(monthlyIncome)}</strong>
          </div>
          <div className="tx-month-stat">
            <span>Expenses</span>
            <strong className="expense">
              ₹{formatCurrency(monthlyExpense)}
            </strong>
          </div>
          <div className="tx-month-stat">
            <span>Invested</span>
            <strong className="invest">₹{formatCurrency(monthlyInvest)}</strong>
          </div>
        </div>
      </motion.div>

      <div className="txs-controls" style={{ marginBottom: "24px" }}>
        <div className="tx-mini-card">
          <span className="tx-meta">CASH BALANCE</span>
          <span className="tx-category">₹{formatCurrency(cashBalance)}</span>
        </div>
        <div className="tx-mini-card">
          <span className="tx-meta">BANK BALANCE</span>
          <span className="tx-category">₹{formatCurrency(bankBalance)}</span>
        </div>
      </div>

      <section className="tx-recent">
        <h3
          className="tx-meta"
          style={{ marginBottom: "12px", fontSize: "13px" }}
        >
          RECENT ACTIVITY
        </h3>
        <div className="tx-list">
          {recentTransactions.map((t, i) => (
            <div key={t._id || i} className="tx-card">
              <div className="tx-card-left">
                <div className="tx-info">
                  <span className="tx-category">{t.category}</span>
                  <span className="tx-meta">
                    {t.paymentMode} • {new Date(t.date).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <span className={`tx-amount ${t.type}`}>
                {(t.type || "").toLowerCase() === "income" ? "+" : "-"}₹
                {parseNumber(t.amount).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </section>
    </motion.div>
  );
};

export default Dashboard;
