import { useEffect, useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { getTransactions } from "../api/transaction.api";
import { getLoanSummary } from "../api/loan.api";
import { useAlert } from "../components/Alert/AlertContext";
import { useCurrency } from "../context/CurrencyContext";
import CountryCurrencyDropdown from "../components/CountryCurrencyDropdown";

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
  const { showAlert } = useAlert();
  const { convert, displayCountry, displayCurrency, symbol } = useCurrency();

  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);

  const [loanSummary, setLoanSummary] = useState({
    lent: 0,
    borrowed: 0,
  });
  useEffect(() => {
    const fetchLoans = async () => {
      try {
        const data = await getLoanSummary();
        setLoanSummary(data);
      } catch (e) {
        console.error("Loan summary failed");
      }
    };

    fetchLoans();
  }, []);

  const fetchTransactions = useCallback(async () => {
    try {
      const data = await getTransactions();

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

    const onTxChanged = () => fetchTransactions();
    const onLoanChanged = async () => {
      fetchTransactions();
      const data = await getLoanSummary();
      setLoanSummary(data);
    };

    window.addEventListener("transactions:changed", onTxChanged);
    window.addEventListener("loans:changed", onLoanChanged);

    return () => {
      window.removeEventListener("transactions:changed", onTxChanged);
      window.removeEventListener("loans:changed", onLoanChanged);
    };
  }, [fetchTransactions]);

  const now = new Date();
  const currentMonthIndex = now.getMonth();
  const currentYear = now.getFullYear();
  const isPrincipalTxn = (t) =>
    t.isPrincipal === true || t.isPrincipal === "true";

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
          if ((t.type || "").toLowerCase() === "income" && !isPrincipalTxn(t)) {
            acc.monthlyIncome += amt;
          } else if (
            (t.type || "").toLowerCase() === "expense" &&
            !isPrincipalTxn(t)
          ) {
            acc.monthlyExpense += amt;
          } else if (
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
        <div className="tx-balance-label">
          <span>OVERALL BALANCE</span>
          <motion.div
            className="currency-trigger"
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCurrencyDropdown(true)}
          >
            <img
              src={`https://flagcdn.com/w40/${displayCountry.toLowerCase()}.png`}
              alt={displayCountry}
              className="currency-flag-img"
            />
            <i className="bi bi-chevron-down flag-chevron"></i>
          </motion.div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span className="tx-balance-amount">
            {symbol} {formatCurrency(convert(balance))}
          </span>
        </div>

        <div className="tx-monthly-grid">
          <div className="tx-month-stat">
            <span>Monthly Income</span>
            <strong className="income">
              {symbol} {formatCurrency(convert(monthlyIncome))}
            </strong>
          </div>
          <div className="tx-month-stat">
            <span>Expenses</span>
            <strong className="expense">
              {symbol} {formatCurrency(convert(monthlyExpense))}
            </strong>
          </div>
          <div className="tx-month-stat">
            <span>Invested</span>
            <strong className="invest">
              {symbol} {formatCurrency(convert(monthlyInvest))}
            </strong>
          </div>
        </div>
      </motion.div>

      <div className="txs-controls" style={{ marginBottom: "24px" }}>
        <div className="tx-mini-card">
          <span className="tx-meta">CASH BALANCE</span>
          <span className="tx-category">
            {symbol} {formatCurrency(convert(cashBalance))}
          </span>
        </div>
        <div className="tx-mini-card">
          <span className="tx-meta">BANK BALANCE</span>
          <span className="tx-category">
            {symbol} {formatCurrency(convert(bankBalance))}
          </span>
        </div>
      </div>
      <div className="txs-controls" style={{ marginBottom: "24px" }}>
        <div className="tx-mini-card">
          <span className="tx-meta">LOANS GIVEN</span>
          <span className="tx-category">
            {symbol} {formatCurrency(convert(loanSummary.lent))}
          </span>
        </div>

        <div className="tx-mini-card">
          <span className="tx-meta">BORROWED</span>
          <span className="tx-category">
            {symbol} {formatCurrency(convert(loanSummary.borrowed))}
          </span>
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
                {(t.type || "").toLowerCase() === "income" ? "+" : "-"}
                {symbol} {formatCurrency(convert(parseNumber(t.amount)))}
              </span>
            </div>
          ))}
        </div>
      </section>
      {showCurrencyDropdown && (
        <div className="currency-overlay">
          <div className="currency-modal" onClick={(e) => e.stopPropagation()}>
            <CountryCurrencyDropdown
              onClose={() => setShowCurrencyDropdown(false)}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default Dashboard;
