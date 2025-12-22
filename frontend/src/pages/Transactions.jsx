import { useEffect, useMemo, useRef, useState } from "react";
import { getTransactions, deleteTransaction } from "../api/transaction.api";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion"; // For smooth list transitions
import "./Transactions.css";

const DEFAULT_LIMIT = 20;

const parseNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const Transactions = () => {
  const [transactions, setTransactions] = useState([]); // appended pages (visible)
  const [page, setPage] = useState(1);
  const [limit] = useState(DEFAULT_LIMIT);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // filters & sort
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 0-11
  const [sortBy, setSortBy] = useState("newest"); // newest | oldest | amount-asc | amount-desc

  const [availableYears, setAvailableYears] = useState([]);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  // Internal flag to indicate if API supports server paging/filtering
  const apiSupportsPagingRef = useRef(null);

  // Reset & load when filters or sort change
  useEffect(() => {
    setTransactions([]);
    setPage(1);
    setHasMore(true);
    loadPage(1, { reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, selectedMonth, sortBy]);

  // initial fetch for available years (we try to fetch first page and also infer years)
  useEffect(() => {
    fetchAvailableYears();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onScroll = () => {
      if (!hasMore || loading) return;
      const threshold = 200; // px from bottom
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - threshold) {
        loadPage(page + 1);
      }
    };

    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, hasMore, loading]);

  async function fetchAvailableYears() {
    // Try to ask API for years — if your endpoint supports it you can replace this with a dedicated call.
    // Otherwise we'll infer from the first page / fallback.
    try {
      const res = await getTransactions({ page: 1, limit: 200 });
      const data = res && res.data ? res.data : res;
      if (Array.isArray(data)) {
        const set = new Set();
        data.forEach((t) => {
          const d = new Date(t.date);
          const y = d.getFullYear();
          if (!Number.isNaN(y)) set.add(y);
        });
        const arr = Array.from(set).sort((a, b) => b - a);
        if (arr.length) {
          setAvailableYears(arr);
          // keep current selectedYear if present, otherwise set to latest
          if (!arr.includes(selectedYear)) setSelectedYear(arr[0]);
        }
      }
      // If API returned paged structure, try to infer from response.data as well
    } catch (err) {
      // ignore - it's non-critical; user can still use selects
      console.warn("fetchAvailableYears failed", err);
    }
  }

  // Load one page (pageNum). Options: { reset }
  const loadPage = async (pageNum = 1, opts = {}) => {
    if (loading) return;
    setLoading(true);
    try {
      // Compose backend params - many APIs accept page/limit/month/year/sort
      const params = {
        page: pageNum,
        limit,
        month: selectedMonth, // 0-11; adjust if your API expects 1-12
        year: selectedYear,
        sort: sortBy,
      };

      // Attempt server-side paging first (best for large data)
      let res;
      try {
        res = await getTransactions(params);
        // if getTransactions returns array directly or { data: [] }
      } catch (err) {
        // If wrapper doesn't accept params, try fallback to calling getTransactions() without args
        console.warn(
          "getTransactions(params) failed, falling back to unpaged fetch",
          err
        );
        res = await getTransactions();
      }

      const serverData = res && res.data ? res.data : res;
      if (!Array.isArray(serverData)) {
        // If unexpected, stop here
        console.warn("Unexpected transactions response shape", res);
        setHasMore(false);
        setLoading(false);
        return;
      }

      // If server already returned filtered/paged results matching params (API supports paging/filtering),
      // detect that behavior: if pageNum === 1 and serverData.length <= limit -> we assume server filtered/paged.
      const usedServerPaging =
        apiSupportsPagingRef.current === true ||
        (pageNum === 1 && serverData.length <= limit && serverData.length > 0);

      if (apiSupportsPagingRef.current === null) {
        // first time detection: if server returned less or equal to limit and params were sent, assume paging supported
        apiSupportsPagingRef.current = usedServerPaging;
      }

      if (apiSupportsPagingRef.current) {
        // Server side paging: append results and set hasMore depending on count
        setTransactions((prev) =>
          pageNum === 1 && opts.reset ? serverData : [...prev, ...serverData]
        );
        setPage(pageNum);
        if (serverData.length < limit) setHasMore(false);
      } else {
        // Server did not support paging/filtering; serverData likely contains ALL transactions.
        // We'll filter, sort and do client-side paging.
        // Filter by month/year:
        const filtered = serverData.filter((t) => {
          const d = new Date(t.date);
          return (
            d.getFullYear() === selectedYear && d.getMonth() === selectedMonth
          );
        });

        // Apply sort
        const sorted = filtered.sort((a, b) => {
          if (sortBy === "newest") return new Date(b.date) - new Date(a.date);
          if (sortBy === "oldest") return new Date(a.date) - new Date(b.date);
          if (sortBy === "amount-asc")
            return parseNumber(a.amount) - parseNumber(b.amount);
          if (sortBy === "amount-desc")
            return parseNumber(b.amount) - parseNumber(a.amount);
          return 0;
        });

        // client paging
        const start = (pageNum - 1) * limit;
        const pageSlice = sorted.slice(start, start + limit);

        setTransactions((prev) =>
          pageNum === 1 && opts.reset ? pageSlice : [...prev, ...pageSlice]
        );
        setPage(pageNum);
        if (start + limit >= sorted.length) setHasMore(false);
      }
    } catch (err) {
      console.error("Failed to load transactions page", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactionsAndRefresh = async () => {
    // Utility used after delete
    setTransactions([]);
    setPage(1);
    setHasMore(true);
    loadPage(1, { reset: true });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this transaction?")) return;
    try {
      await deleteTransaction(id);
      // After delete, refresh the current page (reset to 1)
      fetchTransactionsAndRefresh();
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  // options for years and months UI
  const monthOptions = Array.from({ length: 12 }).map((_, i) => ({
    label: new Date(0, i).toLocaleString("default", { month: "long" }),
    value: i,
  }));

  const sortOptions = [
    { label: "Newest", value: "newest" },
    { label: "Oldest", value: "oldest" },
    { label: "Amount ↑", value: "amount-asc" },
    { label: "Amount ↓", value: "amount-desc" },
  ];

  return (
    <motion.div
      className="transactions-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <header className="transactions-header">
        <div>
          <h2>History</h2>
          <p>View and manage recent activity</p>
        </div>
        <button
          className="add-btn"
          onClick={() => navigate("/add-transaction")}
        >
          + New
        </button>
      </header>

      {/* controls: month/year filters, sort */}
      <div className="controls-row">
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
        >
          {/* years derived from availableYears; if empty show current year */}
          {(availableYears.length
            ? availableYears
            : [new Date().getFullYear()]
          ).map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(Number(e.target.value))}
        >
          {monthOptions.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>

        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          {sortOptions.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <button
          onClick={() => {
            // reset filters to current month/year
            const now = new Date();
            setSelectedYear(now.getFullYear());
            setSelectedMonth(now.getMonth());
            setSortBy("newest");
          }}
        >
          Reset
        </button>
      </div>

      {/* scrollable list */}
      <div
        ref={containerRef}
        className="transactions-list"
        role="list"
        aria-label="Transactions"
      >
        <AnimatePresence>
          {transactions.length === 0 && !loading ? (
            <div className="transaction-item" key="empty">
              <div className="details">
                <span className="category">
                  No transactions found for selected month
                </span>
              </div>
            </div>
          ) : (
            transactions.map((t, index) => {
              const key = t._id || t.id || `${t.date}-${index}`;
              return (
                <motion.div
                  className="transaction-item"
                  key={key}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <div className="date-badge">
                    <span className="day">{new Date(t.date).getDate()}</span>
                    <span className="month">
                      {new Date(t.date).toLocaleString("default", {
                        month: "short",
                      })}
                    </span>
                  </div>

                  <div className="details">
                    <span className="category">{t.category || "—"}</span>
                    <div className="meta">
                      <span className="mode">{t.paymentMode || "-"}</span>
                      <span className="dot">•</span>
                      <span className="type">{t.type || "-"}</span>
                    </div>
                  </div>

                  <div className="amount-section">
                    <span className={`amount ${t.type || ""}`}>
                      {t.type === "income" ? "+" : "-"}₹
                      {parseNumber(t.amount).toLocaleString()}
                    </span>
                  </div>

                  <div className="actions">
                    <button
                      className="action-btn edit"
                      onClick={() =>
                        navigate(`/edit-transaction/${t._id}`, { state: t })
                      }
                    >
                      Edit
                    </button>
                    <button
                      className="action-btn delete"
                      onClick={() => handleDelete(t._id)}
                    >
                      Delete
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>

        {/* footer area inside scroll container */}
        <div className="list-footer">
          {loading ? (
            <div>Loading…</div>
          ) : hasMore ? (
            <div>Scroll to load more</div>
          ) : (
            <div>No more transactions</div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default Transactions;
