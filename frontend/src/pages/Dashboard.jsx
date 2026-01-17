import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { getTransactions } from "../api/transaction.api";
import { getLoanSummary } from "../api/loan.api";
import { useCurrency } from "../context/CurrencyContext";
import CountryCurrencyDropdown from "../components/CountryCurrencyDropdown";
import { animate } from "framer-motion";
import "./Dashboard.css";

/* ------------------ Utils ------------------ */
const parseNumber = (v) => {
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const formatCurrency = (v) =>
  parseNumber(v).toLocaleString("en-IN", { maximumFractionDigits: 0 });

const detectPaymentMode = (t = {}) => {
  const raw = t.paymentMethod || t.method || t.paymentMode || "";

  const val = String(raw).toLowerCase();

  if (val.includes("cash")) return "cash";
  if (
    val.includes("bank") ||
    val.includes("online") ||
    val.includes("upi") ||
    val.includes("card")
  )
    return "bank";

  return "unknown";
};

/* ------------------ Component ------------------ */
const Dashboard = () => {
  const { convert, displayCountry, symbol } = useCurrency();

  const [transactions, setTransactions] = useState([]);
  const [loanSummary, setLoanSummary] = useState(() => {
    try {
      const cached = localStorage.getItem("loan_cache");
      return cached ? JSON.parse(cached) : { lent: 0, borrowed: 0 };
    } catch {
      return { lent: 0, borrowed: 0 };
    }
  });

  const [loading, setLoading] = useState(true);
  const [isColdStart, setIsColdStart] = useState(false);
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);

  // Read cached summary from localStorage at init (may be null)
  const [summary, setSummary] = useState(() => {
    try {
      const cached = localStorage.getItem("dashboard_summary");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  /* ------------------ Count Animation Hook ------------------ */
  function useAnimatedNumber(value, duration = 0.8) {
    // Ensure numeric input
    const target = Number(value) || 0;
    const firstRenderRef = useRef(true);
    const prevRef = useRef(target);
    const [display, setDisplay] = useState(target);

    useEffect(() => {
      if (firstRenderRef.current) {
        setDisplay(target);
        prevRef.current = target;
        firstRenderRef.current = false;
        return;
      }

      const from = Number(prevRef.current) || 0;
      const to = Number(target) || 0;

      if (from === to) {
        prevRef.current = to;
        setDisplay(to);
        return;
      }

      if (typeof motionAnimate === "function") {
        const controls = motionAnimate(from, to, {
          duration,
          ease: [0.22, 0.61, 0.36, 1],
          onUpdate: (v) => setDisplay(v),
        });
        prevRef.current = to;
        return () => controls.stop();
      }

      let rafId = 0;
      const start = performance.now();
      const diff = to - from;
      const step = (now) => {
        const elapsed = (now - start) / 1000;
        const t = Math.min(elapsed / duration, 1);

        const eased = 1 - Math.pow(1 - t, 3);
        setDisplay(from + diff * eased);
        if (t < 1) rafId = requestAnimationFrame(step);
      };
      rafId = requestAnimationFrame(step);
      prevRef.current = to;
      return () => cancelAnimationFrame(rafId);
    }, [value, duration]);

    return display;
  }

  // When modal open prevent page scroll
  useEffect(() => {
    if (showCurrencyDropdown) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showCurrencyDropdown]);

  /* ------------------ Fetch Loans (cache first for loan summary) ------------------ */
  useEffect(() => {
    const fetchLoans = async () => {
      try {
        const data = await getLoanSummary();

        setLoanSummary((prev) => {
          const prevLent = Number(prev?.lent || 0);
          const prevBorrowed = Number(prev?.borrowed || 0);
          const nextLent = Number(data?.lent || 0);
          const nextBorrowed = Number(data?.borrowed || 0);

          if (prevLent === nextLent && prevBorrowed === nextBorrowed) {
            return prev;
          }

          return { lent: nextLent, borrowed: nextBorrowed };
        });

        localStorage.setItem("loan_cache", JSON.stringify(data || {}));
      } catch {
        const cached = localStorage.getItem("loan_cache");
        if (cached) setLoanSummary(JSON.parse(cached));
      }
    };

    fetchLoans();
  }, []);

  /* ------------------ Summary computation helper ------------------ */
  const computeSummaryFrom = (txs = [], loanSum = { lent: 0, borrowed: 0 }) => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    let monthlyIncome = 0;
    let monthlyExpense = 0;
    let monthlyInvest = 0;
    let cash = 0;
    let bank = 0;

    (Array.isArray(txs) ? txs : []).forEach((t) => {
      const d = new Date(t.date);
      const amt = parseNumber(t.amount);
      const type = (t.type || "").toLowerCase();

      // Monthly stats — skip principal transactions (isPrincipal === true)
      if (d.getMonth() === month && d.getFullYear() === year) {
        if (!t.isPrincipal) {
          if (type === "income") monthlyIncome += amt;
          else if (type === "expense") monthlyExpense += amt;
          else if (type === "investment" || type === "invest")
            monthlyInvest += amt;
        }
      }

      // Balance logic
      let signed = 0;

      if (type === "income") {
        signed = amt;
      } else if (type === "expense") {
        signed = -amt;
      } else if (type === "transfer") {
        if (t.paymentMode === "loan") signed = -amt;
        else if (t.paymentMode === "borrow") signed = +amt;
      } else if (type === "investment" || type === "invest") {
        signed = -amt;
      }

      const pm = detectPaymentMode(t);

      if (pm === "cash") cash += signed;
      else if (pm === "bank") bank += signed;
    });

    return {
      balance: cash + bank,
      cashBalance: cash,
      bankBalance: bank,
      monthlyIncome,
      monthlyExpense,
      monthlyInvest,
      loansGiven: loanSum.lent || 0,
      borrowed: loanSum.borrowed || 0,
      updatedAt: Date.now(),
    };
  };

  /* ------------------ Fetch Transactions ------------------ */
  const fetchTransactions = useCallback(async () => {
    const start = Date.now();
    try {
      const data = await getTransactions();
      const arr = Array.isArray(data) ? data : [];
      const sorted = arr
        .filter((t) => t?.date && !isNaN(Date.parse(t.date)))
        .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));

      setTransactions(sorted);

      // compute new summary (use current loanSummary)
      const newSummary = computeSummaryFrom(sorted, loanSummary);
      setSummary(newSummary);
      try {
        localStorage.setItem("dashboard_summary", JSON.stringify(newSummary));
      } catch (e) {
        // ignore storage failures
      }
    } catch (err) {
      console.warn("Failed to fetch transactions:", err);
    } finally {
      if (Date.now() - start > 4000) setIsColdStart(true);
      setLoading(false);
    }
  }, [loanSummary]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);
  useEffect(() => {
    const onLoansChanged = () => {
      // refetch loan summary only
      (async () => {
        try {
          const data = await getLoanSummary();
          setLoanSummary({
            lent: data?.lent || 0,
            borrowed: data?.borrowed || 0,
          });
          localStorage.setItem("loan_cache", JSON.stringify(data || {}));
        } catch {}
      })();
    };

    window.addEventListener("loans:changed", onLoansChanged);
    window.addEventListener("transactions:changed", fetchTransactions);

    return () => {
      window.removeEventListener("loans:changed", onLoansChanged);
      window.removeEventListener("transactions:changed", fetchTransactions);
    };
  }, [fetchTransactions]);

  /* ------------------ Derived values (use cached summary if present) ------------------ */
  const effectiveBalance = summary?.balance ?? 0;
  const effectiveIncome = summary?.monthlyIncome ?? 0;
  const effectiveExpense = summary?.monthlyExpense ?? 0;
  const effectiveInvest = summary?.monthlyInvest ?? 0;
  const effectiveCash = summary?.cashBalance ?? 0;
  const effectiveBank = summary?.bankBalance ?? 0;
  const effectiveLent = summary?.loansGiven ?? 0;
  const effectiveBorrowed = summary?.borrowed ?? 0;

  /* ------------------ Animated Numbers ------------------ */

  const animatedBalance = useAnimatedNumber(
    convert(Number(effectiveBalance) || 0),
  );
  const animatedIncome = useAnimatedNumber(
    convert(Number(effectiveIncome) || 0),
  );
  const animatedExpense = useAnimatedNumber(
    convert(Number(effectiveExpense) || 0),
  );
  const animatedInvest = useAnimatedNumber(
    convert(Number(effectiveInvest) || 0),
  );
  const animatedCash = useAnimatedNumber(convert(Number(effectiveCash) || 0));
  const animatedBank = useAnimatedNumber(convert(Number(effectiveBank) || 0));
  const animatedLent = useAnimatedNumber(convert(Number(effectiveLent) || 0));
  const animatedBorrowed = useAnimatedNumber(
    convert(Number(effectiveBorrowed) || 0),
  );

  /* ------------------ Skeleton decision ------------------ */

  const showSkeleton = loading && !summary;

  /* ------------------ Recent transactions shown from live state (not cached summary) */
  const recentTransactions = transactions.slice(0, 5);

  /* ------------------ Render ------------------ */
  const now = new Date();
  const year = now.getFullYear();

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

      {showSkeleton ? (
        <DashboardSkeleton />
      ) : (
        <>
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
              {symbol} {formatCurrency(animatedBalance)}
            </div>

            <div className="tx-monthly-grid">
              {[
                ["Monthly Income", animatedIncome, "income"],
                ["Expenses", animatedExpense, "expense"],
                ["Invested", animatedInvest, "invest"],
              ].map(([label, val, cls]) => (
                <div key={label} className="tx-month-stat">
                  <span>{label}</span>
                  <strong className={cls}>
                    {symbol} {formatCurrency(val)}
                  </strong>
                </div>
              ))}
            </div>
          </motion.div>

          <div className="txs-controls" style={{ marginBottom: 24 }}>
            <div className="tx-mini-card">
              <span className="tx-meta">CASH BALANCE</span>
              <span className="tx-category">
                {symbol} {formatCurrency(animatedCash)}
              </span>
            </div>
            <div className="tx-mini-card">
              <span className="tx-meta">BANK BALANCE</span>
              <span className="tx-category">
                {symbol} {formatCurrency(animatedBank)}
              </span>
            </div>
          </div>

          <div className="txs-controls" style={{ marginBottom: 24 }}>
            <div className="tx-mini-card">
              <span className="tx-meta">LOANS GIVEN</span>
              <span className="tx-category">
                {symbol} {formatCurrency(animatedLent)}
              </span>
            </div>
            <div className="tx-mini-card">
              <span className="tx-meta">BORROWED</span>
              <span className="tx-category">
                {symbol} {formatCurrency(animatedBorrowed)}
              </span>
            </div>
          </div>

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
