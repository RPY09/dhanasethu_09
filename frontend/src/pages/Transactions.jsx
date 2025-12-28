import { useEffect, useRef, useState } from "react";
import { getTransactions, deleteTransaction } from "../api/transaction.api";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import "./Transactions.css";

const DEFAULT_LIMIT = 20;

const parseDate = (d) => {
  const t = Date.parse(d);
  return Number.isFinite(t) ? t : 0;
};
const parseAmount = (v) => {
  if (v == null) return 0;

  const n = Number(String(v).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const normalizeResponse = (res) => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  if (res.data && Array.isArray(res.data.transactions))
    return res.data.transactions;
  if (res.data && Array.isArray(res.data.data)) return res.data.data;
  return [];
};
const isSettlementTransaction = (t) => {
  if (!t.loanId) return false;

  const note = (t.note || "").toLowerCase();

  return (
    note.includes("received") ||
    note.includes("repaid") ||
    note.includes("interest")
  );
};

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Filters & Sort
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [sortBy, setSortBy] = useState("newest");

  const [availableYears, setAvailableYears] = useState([]);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  // Reset and reload when filters/sort change
  useEffect(() => {
    setTransactions([]);
    setPage(1);
    setHasMore(true);
    loadPage(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, selectedMonth, sortBy]);

  useEffect(() => {
    fetchAvailableYears();
    // also re-load when other pages signal changes (e.g., add/delete)
    const onChanged = () => loadPage(1, true);
    window.addEventListener("transactions:changed", onChanged);
    return () => window.removeEventListener("transactions:changed", onChanged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchAvailableYears() {
    try {
      const res = await getTransactions({ page: 1, limit: 500 });
      const data = normalizeResponse(res);
      if (Array.isArray(data)) {
        const years = [
          ...new Set(data.map((t) => new Date(t.date).getFullYear())),
        ].sort((a, b) => b - a);
        setAvailableYears(years.length ? years : [new Date().getFullYear()]);
      }
    } catch (err) {
      console.warn("fetchAvailableYears failed", err);
    }
  }

  const loadPage = async (pageNum = 1, isReset = false) => {
    if (loading && !isReset) return;
    setLoading(true);
    try {
      const params = {
        page: pageNum,
        limit: DEFAULT_LIMIT,
        month: selectedMonth + 1,
        year: selectedYear,
        sort: sortBy,
      };

      let res;
      try {
        res = await getTransactions(params);
      } catch (err) {
        // fallback to unpaged fetch
        res = await getTransactions();
      }

      const serverData = normalizeResponse(res);
      const filteredByDate = serverData.filter((t) => {
        const d = new Date(t.date);
        return (
          d.getFullYear() === selectedYear && d.getMonth() === selectedMonth
        );
      });

      // sort & normalize
      const processedData = filteredByDate.slice().sort((a, b) => {
        if (sortBy === "newest") return parseDate(b.date) - parseDate(a.date);
        if (sortBy === "oldest") return parseDate(a.date) - parseDate(b.date);
        if (sortBy === "amount-desc")
          return parseAmount(b.amount) - parseAmount(a.amount);
        if (sortBy === "amount-asc")
          return parseAmount(a.amount) - parseAmount(b.amount);
        return 0;
      });
      setTransactions((prev) => {
        const merged = isReset ? processedData : [...prev, ...processedData];

        return merged.slice().sort((a, b) => {
          if (sortBy === "newest") return parseDate(b.date) - parseDate(a.date);
          if (sortBy === "oldest") return parseDate(a.date) - parseDate(b.date);
          if (sortBy === "amount-desc")
            return parseAmount(b.amount) - parseAmount(a.amount);
          if (sortBy === "amount-asc")
            return parseAmount(a.amount) - parseAmount(b.amount);
          return 0;
        });
      });

      setHasMore(serverData.length === DEFAULT_LIMIT);
      setPage(pageNum);
    } catch (err) {
      console.error("Load failed", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this transaction?")) return;

    await deleteTransaction(id);

    // notify dashboard FIRST
    window.dispatchEvent(new Event("transactions:changed"));

    // then reload list
    loadPage(1, true);
  };

  return (
    <motion.div
      className="tx-wrapper"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <header className="tx-header">
        <div className="tx-titles">
          <h1>Activity</h1>
          <p>
            {new Date(selectedYear, selectedMonth).toLocaleString("default", {
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <button
          className="tx-add-fab"
          onClick={() => navigate("/add-transaction")}
        >
          +
        </button>
      </header>

      <div className="tx-controls">
        <div className="tx-select-group">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <option key={i} value={i}>
                {new Date(0, i).toLocaleString("default", { month: "short" })}
              </option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <select
          className="tx-sort-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="amount-desc">Highest Amount</option>
          <option value="amount-asc">Lowest Amount</option>
        </select>
      </div>

      <div className="tx-list" ref={containerRef}>
        <AnimatePresence mode="popLayout">
          {transactions.map((t, i) => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              key={t._id || i}
              className="tx-card"
            >
              <div className="tx-card-left">
                <div className="tx-date-box">
                  <span className="tx-day">{new Date(t.date).getDate()}</span>
                  <span className="tx-month">
                    {new Date(t.date).toLocaleString("default", {
                      month: "short",
                    })}
                  </span>
                </div>
                <div className="tx-info">
                  <span className="tx-category">{t.category}</span>
                  <span className="tx-meta">
                    {t.paymentMode} • {t.type}
                  </span>
                  {t.note || t.notes || t.description ? (
                    <div
                      className="note"
                      style={{ marginTop: 8, fontSize: 13 }}
                    >
                      {t.note || t.notes || t.description}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="tx-card-right">
                <span className={`tx-amount ${t.type}`}>
                  {(t.type || "").toLowerCase() === "income" ? "+" : "-"}₹
                  {parseAmount(t.amount).toLocaleString()}
                </span>
                <div className="tx-actions">
                  {/* Edit allowed only for non-loan & non-borrow */}
                  {t.paymentMode !== "loan" && t.paymentMode !== "borrow" && (
                    <button
                      onClick={() =>
                        navigate(`/edit-transaction/${t._id}`, { state: t })
                      }
                    >
                      Edit
                    </button>
                  )}
                  {!(
                    (t.paymentMode === "loan" || t.paymentMode === "borrow") &&
                    isSettlementTransaction(t)
                  ) && (
                    <button className="del" onClick={() => handleDelete(t._id)}>
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {loading && <div className="tx-loader">Updating list...</div>}
      </div>
    </motion.div>
  );
};

export default Transactions;
