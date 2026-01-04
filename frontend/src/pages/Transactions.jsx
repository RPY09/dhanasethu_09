import { useEffect, useRef, useState } from "react";
import { getTransactions, deleteTransaction } from "../api/transaction.api";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getTransactionTypes } from "../api/transaction.api";
import { useAlert } from "../components/Alert/AlertContext";
import "./Transactions.css";
import { useCurrency } from "../context/CurrencyContext";

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
    note.includes("principal") ||
    note.includes("repaid") ||
    note.includes("interest")
  );
};

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const { showAlert } = useAlert();
  const { symbol, convert } = useCurrency();

  // Filters & Sort
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [sortBy, setSortBy] = useState("newest");
  const [types, setTypes] = useState([]);
  const [selectedType, setSelectedType] = useState("all");

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
  }, [selectedYear, selectedMonth, sortBy, selectedType]);

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
  //for types
  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const data = await getTransactionTypes();
        setTypes(data || []);
      } catch (err) {
        console.error("Failed to load transaction types", err);
      }
    };

    fetchTypes();
  }, []);

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

      const filteredByType =
        selectedType === "all"
          ? filteredByDate
          : filteredByDate.filter((t) => {
              if (selectedType === "loan") return t.paymentMode === "loan";
              if (selectedType === "borrowed")
                return t.paymentMode === "borrow";
              return t.type === selectedType; // income / expense
            });

      // sort & normalize
      const processedData = filteredByType.slice().sort((a, b) => {
        if (sortBy === "newest") return parseDate(b.date) - parseDate(a.date);
        if (sortBy === "oldest") return parseDate(a.date) - parseDate(b.date);
        if (sortBy === "amount-desc")
          return parseAmount(b.amount) - parseAmount(a.amount);
        if (sortBy === "amount-asc")
          return parseAmount(a.amount) - parseAmount(b.amount);
        return 0;
      });

      setTransactions((prev) =>
        isReset ? processedData : [...prev, ...processedData]
      );

      setHasMore(processedData.length === DEFAULT_LIMIT);

      setPage(pageNum);
    } catch (err) {
      console.error("Load failed", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id) => {
    showAlert(
      "Are you sure? This transaction will be removed permanently.",
      "error",
      true,
      async () => {
        try {
          await deleteTransaction(id);
          showAlert("Transaction deleted", "success");
          setTransactions([]);
          setPage(1);
          setHasMore(true);
          loadPage(1, true, {
            month: selectedMonth,
            year: selectedYear,
          });
        } catch (err) {
          showAlert("Failed to delete", "error");
        }
      }
    );
  };

  const sortedTransactions = [...transactions].sort((a, b) => {
    if (sortBy === "newest") return parseDate(b.date) - parseDate(a.date);
    if (sortBy === "oldest") return parseDate(a.date) - parseDate(b.date);
    if (sortBy === "amount-desc")
      return parseAmount(b.amount) - parseAmount(a.amount);
    if (sortBy === "amount-asc")
      return parseAmount(a.amount) - parseAmount(b.amount);
    return 0;
  });

  const EmptyState = () => (
    <div
      style={{
        marginTop: 60,
        textAlign: "center",
        color: "var(--text-muted)",
      }}
    >
      <div
        style={{
          fontSize: 42,
          marginBottom: 12,
        }}
      >
        <i class="bi bi-mailbox-flag"></i>
      </div>

      <h3
        style={{
          fontSize: 18,
          fontWeight: 800,
          color: "var(--primary)",
          marginBottom: 6,
        }}
      >
        No transactions yet
      </h3>

      <p
        style={{
          fontSize: 14,
          marginBottom: 20,
        }}
      >
        Start by adding your first income or expense.
      </p>

      <button
        className="tx-add-fab"
        style={{
          borderRadius: 14,
          width: "auto",
          height: "auto",
          padding: "10px 18px",
          fontSize: 14,
        }}
        onClick={() => navigate("/add-transaction")}
      >
        + Add Transaction
      </button>
    </div>
  );

  const SkeletonTransaction = () => (
    <div className="tx-card skeleton-card">
      <div className="tx-card-left">
        <div className="skeleton skeleton-date"></div>
        <div>
          <div className="skeleton skeleton-text"></div>
          <div className="skeleton skeleton-text sm"></div>
        </div>
      </div>
      <div className="tx-card-right">
        <div className="skeleton skeleton-amount"></div>
      </div>
    </div>
  );

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
        {loading ? (
          <>
            <div className="tx-select-group">
              <div className="skeleton skeleton-select"></div>
              <div className="skeleton skeleton-select"></div>
            </div>
            <div className="tx-select-group">
              <div className="skeleton skeleton-select"></div>
              <div className="skeleton skeleton-select"></div>
            </div>
          </>
        ) : (
          <>
            {/* TIME FILTERS */}
            <div className="tx-select-group">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i} value={i}>
                    {new Date(0, i).toLocaleString("default", {
                      month: "short",
                    })}
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

            {/* TYPE + SORT */}
            <div className="tx-select-group">
              <select
                value={selectedType}
                onChange={(e) => {
                  setSelectedType(e.target.value);
                  setTransactions([]);
                  setPage(1);
                  setHasMore(true);
                  loadPage(1, true);
                }}
              >
                <option value="all">All Transactions</option>
                {types.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="amount-desc">Highest Amount</option>
                <option value="amount-asc">Lowest Amount</option>
              </select>
            </div>
          </>
        )}
      </div>

      <div className="tx-list" ref={containerRef}>
        {loading ? (
          [...Array(6)].map((_, i) => <SkeletonTransaction key={i} />)
        ) : sortedTransactions.length === 0 ? (
          <EmptyState />
        ) : (
          <AnimatePresence mode="popLayout">
            {sortedTransactions.map((t, i) => (
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
                    {(t.type || "").toLowerCase() === "income" ? "+" : "-"}
                    {symbol} {convert(parseAmount(t.amount)).toLocaleString()}
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
                      (t.paymentMode === "loan" ||
                        t.paymentMode === "borrow") &&
                      isSettlementTransaction(t)
                    ) && (
                      <button
                        className="del"
                        onClick={() => handleDelete(t._id)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        {/* {loading && <div className="tx-loader">Updating list...</div>} */}
      </div>
    </motion.div>
  );
};

export default Transactions;
