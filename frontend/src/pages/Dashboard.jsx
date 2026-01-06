import { useEffect, useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { getTransactions } from "../api/transaction.api";
import { getLoanSummary } from "../api/loan.api";
import { useCurrency } from "../context/CurrencyContext";
import CountryCurrencyDropdown from "../components/CountryCurrencyDropdown";
import "./Dashboard.css";

/* ------------------ Utils ------------------ */
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

/* ------------------ Component ------------------ */
const Dashboard = () => {
  const { convert, displayCountry, symbol } = useCurrency();

  const [transactions, setTransactions] = useState([]);
  const [loanSummary, setLoanSummary] = useState({ lent: 0, borrowed: 0 });

  const [loading, setLoading] = useState(true);
  const [isColdStart, setIsColdStart] = useState(false);
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);

  /* ------------------ Fetch Loans ------------------ */
  useEffect(() => {
    const fetchLoans = async () => {
      try {
        const data = await getLoanSummary();
        setLoanSummary(data);
        localStorage.setItem("loan_cache", JSON.stringify(data));
      } catch {
        const cached = localStorage.getItem("loan_cache");
        if (cached) setLoanSummary(JSON.parse(cached));
      }
    };
    fetchLoans();
  }, []);

  /* ------------------ Fetch Transactions ------------------ */
  const fetchTransactions = useCallback(async () => {
    const start = Date.now();
    try {
      const data = await getTransactions();
      const sorted = (Array.isArray(data) ? data : [])
        .filter((t) => t?.date && !isNaN(Date.parse(t.date)))
        .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));

      setTransactions(sorted);
      localStorage.setItem("dashboard_cache", JSON.stringify(sorted));
    } catch {
      const cached = localStorage.getItem("dashboard_cache");
      if (cached) setTransactions(JSON.parse(cached));
    } finally {
      if (Date.now() - start > 4000) setIsColdStart(true);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  /* ------------------ Calculations ------------------ */
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  const { monthlyIncome, monthlyExpense, monthlyInvest } = useMemo(() => {
    return transactions.reduce(
      (acc, t) => {
        const d = new Date(t.date);
        if (d.getMonth() === month && d.getFullYear() === year) {
          const amt = parseNumber(t.amount);
          const type = (t.type || "").toLowerCase();
          if (type === "income") acc.monthlyIncome += amt;
          else if (type === "expense") acc.monthlyExpense += amt;
          else if (type === "investment" || type === "invest")
            acc.monthlyInvest += amt;
        }
        return acc;
      },
      { monthlyIncome: 0, monthlyExpense: 0, monthlyInvest: 0 }
    );
  }, [transactions, month, year]);

  const { balance, cashBalance, bankBalance } = useMemo(() => {
    let cash = 0;
    let bank = 0;

    transactions.forEach((t) => {
      const amt = parseNumber(t.amount);
      const signed = (t.type || "").toLowerCase() === "income" ? amt : -amt;
      detectPaymentMode(t).includes("cash")
        ? (cash += signed)
        : (bank += signed);
    });

    return { balance: cash + bank, cashBalance: cash, bankBalance: bank };
  }, [transactions]);

  const recentTransactions = useMemo(
    () => transactions.slice(0, 5),
    [transactions]
  );
  /* ------------------ Cache First ------------------ */
  const dashboardSummary = useMemo(
    () => ({
      balance,
      cashBalance,
      bankBalance,
      monthlyIncome,
      monthlyExpense,
      monthlyInvest,
      loansGiven: loanSummary.lent,
      borrowed: loanSummary.borrowed,
    }),
    [
      balance,
      cashBalance,
      bankBalance,
      monthlyIncome,
      monthlyExpense,
      monthlyInvest,
      loanSummary,
    ]
  );

  useEffect(() => {
    const cached = localStorage.getItem("dashboard_summary");
    if (cached) {
      const data = JSON.parse(cached);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loading) return;

    localStorage.setItem(
      "dashboard_summary",
      JSON.stringify({
        ...dashboardSummary,
        updatedAt: Date.now(),
      })
    );
  }, [dashboardSummary, loading]);

  /* ------------------ Skeleton ------------------ */
  const DashboardSkeleton = () => (
    <>
      <div className="tx-primary-card">
        <div className="skeleton-dark" style={{ height: 14, width: 120 }} />
        <div
          className="skeleton-dark"
          style={{ height: 42, width: 220, margin: "16px 0" }}
        />
        <div className="tx-monthly-grid">
          {[...Array(3)].map((_, i) => (
            <div key={i}>
              <div
                className="skeleton-dark"
                style={{ height: 10, width: 80, marginBottom: 6 }}
              />
              <div
                className="skeleton-dark"
                style={{ height: 16, width: 100 }}
              />
            </div>
          ))}
        </div>
      </div>

      {[...Array(2)].map((_, i) => (
        <div key={i} className="txs-controls" style={{ marginBottom: 24 }}>
          {[...Array(2)].map((__, j) => (
            <div key={j} className="tx-mini-card">
              <div
                className="skeleton-light"
                style={{ height: 10, width: 90, marginBottom: 8 }}
              />
              <div
                className="skeleton-light"
                style={{ height: 16, width: 120 }}
              />
            </div>
          ))}
        </div>
      ))}

      <div className="tx-list">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="tx-card">
            <div
              className="skeleton-light"
              style={{ height: 14, width: 140 }}
            />
            <div className="skeleton-light" style={{ height: 14, width: 80 }} />
          </div>
        ))}
      </div>
    </>
  );

  /* ------------------ Render ------------------ */
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
            {now.toLocaleString("default", { month: "long" })} {year}
          </p>
        </div>
        <div className="tx-date-box">
          <span className="tx-day">{now.getDate()}</span>
          <span className="tx-month">
            {now.toLocaleString("default", { month: "short" })}
          </span>
        </div>
      </header>

      {loading && isColdStart && (
        <div className="cold-start-msg">
          🚀 Waking up server… first load may take 20–30 seconds
        </div>
      )}

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* PRIMARY CARD */}
          <motion.div className="tx-primary-card" whileHover={{ scale: 1.01 }}>
            <div className="tx-balance-label">
              <span>OVERALL BALANCE</span>
              <div
                className="currency-trigger"
                onClick={() => setShowCurrencyDropdown(true)}
              >
                <img
                  src={`https://flagcdn.com/w40/${displayCountry.toLowerCase()}.png`}
                  alt={displayCountry}
                  className="currency-flag-img"
                />
                <i className="bi bi-chevron-down flag-chevron"></i>
              </div>
            </div>

            <div className="tx-balance-amount">
              {symbol} {formatCurrency(convert(balance))}
            </div>

            <div className="tx-monthly-grid">
              {[
                ["Monthly Income", monthlyIncome, "income"],
                ["Expenses", monthlyExpense, "expense"],
                ["Invested", monthlyInvest, "invest"],
              ].map(([label, val, cls]) => (
                <div key={label} className="tx-month-stat">
                  <span>{label}</span>
                  <strong className={cls}>
                    {symbol} {formatCurrency(convert(val))}
                  </strong>
                </div>
              ))}
            </div>
          </motion.div>

          {/* CASH / BANK */}
          <div className="txs-controls" style={{ marginBottom: 24 }}>
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

          {/* LOANS */}
          <div className="txs-controls" style={{ marginBottom: 24 }}>
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

          {/* RECENT */}
          <section className="tx-recent">
            <h3 className="tx-meta" style={{ marginBottom: 12 }}>
              RECENT ACTIVITY
            </h3>
            <div className="tx-list">
              {recentTransactions.map((t, i) => (
                <div key={i} className="tx-card">
                  <div>
                    <span className="tx-category">{t.category}</span>
                    <span className="tx-meta">
                      {t.paymentMode} • {new Date(t.date).toLocaleDateString()}
                    </span>
                  </div>
                  <span className={`tx-amount ${t.type}`}>
                    {(t.type || "").toLowerCase() === "income" ? "+" : "-"}
                    {symbol} {formatCurrency(convert(parseNumber(t.amount)))}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {showCurrencyDropdown && (
        <div className="currency-overlay">
          <div className="currency-modal">
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
