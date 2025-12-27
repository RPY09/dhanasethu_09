import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getLoans, settleLoan, deleteLoan } from "../api/loan.api";
import "./Notifications.css";

const ITEMS_PER_PAGE = 5;

const Notifications = () => {
  const navigate = useNavigate();

  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [paidAmount, setPaidAmount] = useState("");
  const [page, setPage] = useState(1);
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(
    location.state?.activeTab || "lent"
  );

  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.state]);

  useEffect(() => {
    fetchLoans();
  }, []);

  const fetchLoans = async () => {
    try {
      const data = await getLoans();
      setLoans(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch loans", err);
    } finally {
      setLoading(false);
    }
  };

  /* ---------- DATE HELPERS ---------- */
  const getDiffDays = (dueDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(dueDate);
    end.setHours(0, 0, 0, 0);
    return Math.ceil((end - today) / (1000 * 60 * 60 * 24));
  };

  const getDueLabel = (dueDate) => {
    const diff = getDiffDays(dueDate);
    if (diff < 0)
      return { text: `Overdue ${Math.abs(diff)}d`, type: "overdue" };
    if (diff === 0) return { text: "Due today", type: "today" };
    return { text: `Due in ${diff}d`, type: "soon" };
  };

  const getUrgencyScore = (dueDate) => {
    const diff = getDiffDays(dueDate);
    if (diff < 0) return 1000 + Math.abs(diff);
    if (diff === 0) return 500;
    return 100 - diff;
  };

  const visibleLoans = loans.filter((loan) =>
    activeTab === "lent"
      ? loan.role === "lent" && !loan.settled
      : loan.role === "borrowed" && !loan.settled
  );

  const sortedLoans = [...visibleLoans].sort(
    (a, b) => getUrgencyScore(b.dueDate) - getUrgencyScore(a.dueDate)
  );
  const totalPages = Math.ceil(sortedLoans.length / ITEMS_PER_PAGE);
  const paginatedLoans = sortedLoans.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  const sendWhatsApp = (loan) => {
    const phone = (loan.contact || "").replace(/\D/g, "");
    if (phone.length < 10) return alert("Invalid phone number");
    const msg = `Hi ${loan.person}, reminder for ₹${loan.totalAmount}. Thank you.`;
    window.open(
      `https://wa.me/91${phone}?text=${encodeURIComponent(msg.trim())}`,
      "_blank"
    );
  };

  const openSettleModal = (loan) => {
    setSelectedLoan(loan);
    setPaidAmount(loan.totalAmount);
    setShowSettleModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this loan?")) return;
    await deleteLoan(id);
    window.dispatchEvent(new Event("loans:changed"));
    fetchLoans();
  };

  const confirmSettle = async () => {
    if (!paidAmount || Number(paidAmount) <= 0)
      return alert("Enter valid amount");
    try {
      await settleLoan(selectedLoan._id, { paidAmount });
      window.dispatchEvent(new Event("loans:changed"));
      window.dispatchEvent(new Event("transactions:changed"));
      setShowSettleModal(false);
      fetchLoans();
    } catch (err) {
      alert("Failed to settle loan");
    }
  };

  return (
    <motion.div
      className="notify-wrapper"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <header className="notify-header">
        <h2>Reminders</h2>
        <p>Manage your pending dues</p>
      </header>

      <div className="notify-tabs">
        <button
          className={activeTab === "lent" ? "active" : ""}
          onClick={() => setActiveTab("lent")}
        >
          Loans
        </button>
        <button
          className={activeTab === "borrowed" ? "active" : ""}
          onClick={() => setActiveTab("borrowed")}
        >
          Borrowings
        </button>
      </div>

      <div className="notify-list">
        {loading ? (
          <div className="loader-box">
            <div className="spinner"></div>
          </div>
        ) : paginatedLoans.length === 0 ? (
          <p className="empty">No pending {activeTab} records found</p>
        ) : (
          paginatedLoans.map((loan) => {
            const due = getDueLabel(loan.dueDate);
            return (
              <motion.div
                key={loan._id}
                className="notify-card"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
              >
                <div className="card-info">
                  <span className="person-name">{loan.person}</span>
                  <span className="amount-text">₹{loan.totalAmount}</span>
                  <span className={`due-badge ${due.type}`}>{due.text}</span>
                </div>

                <div className="card-actions">
                  {loan.role === "lent" && (
                    <button
                      className="icon-btn whatsapp"
                      onClick={() => sendWhatsApp(loan)}
                    >
                      <i className="bi bi-whatsapp"></i>
                    </button>
                  )}
                  <button
                    className="icon-btn edit"
                    onClick={() => navigate(`/edit/${loan._id}`)}
                  >
                    <i className="bi bi-pencil-square"></i>
                  </button>
                  <button
                    className="icon-btn delete"
                    onClick={() => handleDelete(loan._id)}
                  >
                    <i className="bi bi-trash3"></i>
                  </button>
                  <button
                    className="icon-btn settle"
                    onClick={() => openSettleModal(loan)}
                  >
                    <i className="bi bi-check-circle-fill"></i>
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={page === 1} onClick={() => setPage(page - 1)}>
            <i className="bi bi-chevron-left"></i>
          </button>
          <span>
            {page} / {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            <i className="bi bi-chevron-right"></i>
          </button>
        </div>
      )}

      <AnimatePresence>
        {showSettleModal && selectedLoan && (
          <motion.div
            className="settle-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="settle-modal"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
            >
              <h3>Settle Loan</h3>
              <p>
                Confirming payment for <strong>{selectedLoan.person}</strong>
              </p>

              <div className="input-field-group">
                <label>Amount Paid (₹)</label>
                <input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                />
              </div>

              <div className="modal-footer">
                <button
                  className="cancel-link"
                  onClick={() => setShowSettleModal(false)}
                >
                  Cancel
                </button>
                <button className="confirm-btn" onClick={confirmSettle}>
                  Confirm Settlement
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Notifications;
