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

const normalizePaymentMode = (value = "") => {
  const mode = String(value).trim().toLowerCase();
  if (!mode) return "unknown";

  if (mode === "loan" || mode === "borrow") return mode;
  if (mode === "cash") return "cash";

  if (mode === "bank" || mode === "netbanking" || mode === "net banking") {
    return "bank";
  }
  if (mode === "online" || mode === "upi") return "upi";

  return mode;
};
const paymentModeLabel = (value = "") =>
  normalizePaymentMode(value)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

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
  const [hideAmounts, setHideAmounts] = useState(() => {
    try {
      return localStorage.getItem("dashboard_hide_amounts") === "1";
    } catch {
      return false;
    }
  });
  const [hideProgress, setHideProgress] = useState(() => (hideAmounts ? 1 : 0));
  const hideProgressRef = useRef(hideAmounts ? 1 : 0);

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

  useEffect(() => {
    try {
      localStorage.setItem("dashboard_hide_amounts", hideAmounts ? "1" : "0");
    } catch {
      // ignore storage failures
    }
  }, [hideAmounts]);

  useEffect(() => {
    const target = hideAmounts ? 1 : 0;
    const from = hideProgressRef.current;

    if (Math.abs(target - from) < 0.001) {
      setHideProgress(target);
      hideProgressRef.current = target;
      return;
    }

    const controls = animate(from, target, {
      duration: 0.8,
      ease: [0.25, 0.1, 0.25, 1],
      onUpdate: (v) => {
        hideProgressRef.current = v;
        setHideProgress(v);
      },
      onComplete: () => {
        hideProgressRef.current = target;
        setHideProgress(target);
      },
    });

    return () => controls.stop();
  }, [hideAmounts]);

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
    const paymentBalances = {};

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

      const pm = normalizePaymentMode(
        t.paymentMethod || t.method || t.paymentMode,
      );
      if (pm === "loan" || pm === "borrow" || pm === "unknown") return;
      paymentBalances[pm] = (paymentBalances[pm] || 0) + signed;
    });
    const totalBalance = Object.values(paymentBalances).reduce(
      (sum, value) => sum + Number(value || 0),
      0,
    );

    return {
      balance: totalBalance,
      cashBalance: paymentBalances.cash || 0,
      bankBalance: paymentBalances.bank || 0,
      paymentBalances,
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
  const effectivePaymentBalances = summary?.paymentBalances || {};
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
  const usedPaymentModes = useMemo(() => {
    const modes = new Set();
    (transactions || []).forEach((t) => {
      const mode = normalizePaymentMode(
        t?.paymentMethod || t?.method || t?.paymentMode,
      );
      if (mode === "loan" || mode === "borrow" || mode === "unknown") return;
      modes.add(mode);
    });
    return Array.from(modes);
  }, [transactions]);
  const paymentModesToShow = useMemo(() => {
    const ordered = ["cash", "bank"];
    const extra = usedPaymentModes.filter(
      (mode) => mode !== "cash" && mode !== "bank",
    );
    return [
      ...ordered.filter((mode) => usedPaymentModes.includes(mode)),
      ...extra,
    ];
  }, [usedPaymentModes]);

  /* ------------------ Skeleton decision ------------------ */

  const showSkeleton = loading && !summary;

  /* ------------------ Recent transactions shown from live state (not cached summary) */
  const recentTransactions = transactions.slice(0, 5);

  const displayAmount = (val) => {
    const visible = `${symbol} ${formatCurrency(val)}`;

    if (hideProgress <= 0.001) return visible;
    if (hideProgress >= 0.999) return `${symbol} ****`;

    const chars = visible.split("");
    const digitPositions = [];
    for (let i = 0; i < chars.length; i += 1) {
      if (/\d/.test(chars[i])) digitPositions.push(i);
    }

    if (!digitPositions.length) return visible;

    const encryptedSet =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    const amountSeed = Math.abs(Math.trunc(Number(val) || 0));
    const stagger = 0.22;
    for (let i = 0; i < digitPositions.length; i += 1) {
      const pos = digitPositions[digitPositions.length - 1 - i];
      const maxIndex = Math.max(digitPositions.length - 1, 1);
      const startOffset = (i / maxIndex) * stagger;
      const localProgress = Math.min(
        1,
        Math.max(0, (hideProgress - startOffset) / (1 - stagger)),
      );

      if (localProgress <= 0) continue;

      const seed = amountSeed + pos * 17 + i * 7;
      const encryptedChar = encryptedSet[seed % encryptedSet.length];
      chars[pos] = localProgress < 0.6 ? encryptedChar : "*";
    }

    return chars.join("");
  };

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
              <div className="tx-card-actions">
                <button
                  type="button"
                  className="visibility-trigger"
                  onClick={() => setHideAmounts((prev) => !prev)}
                  aria-label={hideAmounts ? "Show amounts" : "Hide amounts"}
                  title={hideAmounts ? "Show amounts" : "Hide amounts"}
                >
                  <i
                    className={`bi ${hideAmounts ? "bi-eye-slash" : "bi-eye"}`}
                  ></i>
                </button>
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
            </div>

            <div className="tx-balance-amount">
              {displayAmount(animatedBalance)}
            </div>

            <div className="tx-monthly-grid">
              {[
                ["Monthly Income", animatedIncome, "income"],
                ["Expenses", animatedExpense, "expense"],
                ["Invested", animatedInvest, "invest"],
              ].map(([label, val, cls]) => (
                <div key={label} className="tx-month-stat">
                  <span>{label}</span>
                  <strong className={cls}>{displayAmount(val)}</strong>
                </div>
              ))}
            </div>
          </motion.div>

          {paymentModesToShow.length > 0 && (
            <div className="txs-controls" style={{ marginBottom: 24 }}>
              {paymentModesToShow.map((mode) => {
                const value = Number(effectivePaymentBalances?.[mode] || 0);
                return (
                  <div className="tx-mini-card" key={mode}>
                    <span className="tx-meta">
                      {paymentModeLabel(mode)} BALANCE
                    </span>
                    <span className="tx-category">
                      {displayAmount(convert(value))}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="txs-controls" style={{ marginBottom: 24 }}>
            <div className="tx-mini-card">
              <span className="tx-meta">LOANS GIVEN</span>
              <span className="tx-category">{displayAmount(animatedLent)}</span>
            </div>
            <div className="tx-mini-card">
              <span className="tx-meta">BORROWED</span>
              <span className="tx-category">
                {displayAmount(animatedBorrowed)}
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
