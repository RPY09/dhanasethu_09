import { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getLoans, settleLoan, deleteLoan } from "../api/loan.api";
import "./Notifications.css";

const ITEMS_PER_PAGE = 5;

const Notifications = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [paidAmount, setPaidAmount] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeTab, setActiveTab] = useState(
    location.state?.activeTab || "lent"
  );
  const [paymentType, setPaymentType] = useState("full");

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

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

  /* ---------- HELPER CALCULATIONS ---------- */
  const getTimeRemaining = (dueDate) => {
    const today = new Date();
    const end = new Date(dueDate);
    const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0)
      return { label: `${Math.abs(diffDays)}d overdue`, color: "overdue" };
    if (diffDays === 0) return { label: "Ends today", color: "today" };
    return { label: `${diffDays} days left`, color: "soon" };
  };

  const getRemainingInterest = (loan) =>
    Math.max(Number(loan.interestAmount) - Number(loan.interestPaid || 0), 0);
  const getMonthlyInterest = (loan) => {
    const remaining = getRemainingInterest(loan);
    if (remaining <= 0) return 0;
    const months =
      (new Date(loan.dueDate).getFullYear() -
        new Date(loan.startDate).getFullYear()) *
        12 +
        (new Date(loan.dueDate).getMonth() -
          new Date(loan.startDate).getMonth()) || 1;
    return Math.min(
      Math.round(Number(loan.interestAmount) / months),
      remaining
    );
  };
  const getRemainingPrincipal = (loan) =>
    Math.max(Number(loan.principal || 0), 0);

  const getRemainingTotal = (loan) =>
    Number(loan.principal || 0) + getRemainingInterest(loan);

  const filteredLoans = useMemo(
    () =>
      loans.filter((loan) => {
        const matchesTab =
          activeTab === "lent"
            ? loan.role === "lent"
            : loan.role === "borrowed";
        return (
          matchesTab &&
          !loan.settled &&
          loan.person.toLowerCase().includes(debouncedSearch.toLowerCase())
        );
      }),
    [loans, activeTab, debouncedSearch]
  );

  /* ---------- ACTIONS ---------- */
  useEffect(() => {
    if (!selectedLoan) return;
    if (paymentType === "interest")
      setPaidAmount(getMonthlyInterest(selectedLoan));
    else if (paymentType === "principal")
      setPaidAmount(getRemainingPrincipal(selectedLoan));
    else setPaidAmount(getRemainingTotal(selectedLoan));
  }, [paymentType, selectedLoan]);

  const handleInterestChange = (e) => {
    const valString = e.target.value;

    // Allow backspacing completely (empty string)
    if (valString === "") {
      setPaidAmount("");
      return;
    }

    const val = Number(valString);
    const maxInt = getRemainingInterest(selectedLoan);

    // Enforce max limit: if typed > max, reset to max
    if (val > maxInt) {
      setPaidAmount(maxInt);
    } else {
      setPaidAmount(val);
    }
  };

  const handlePrincipalChange = (e) => {
    const valStr = e.target.value;

    if (valStr === "") {
      setPaidAmount("");
      return;
    }

    const val = Number(valStr);
    const max = getRemainingPrincipal(selectedLoan);

    if (val < 0) return;

    setPaidAmount(Math.min(val, max));
  };

  const sendWhatsAppToLender = (loan, amount, type) => {
    if (loan.role !== "borrowed") return;
    if (!loan.contact) return;

    let message = "";

    if (type === "interest") {
      message = `Hello ${loan.person}, I have paid ₹${amount} towards interest for the loan.`;
    } else if (type === "principal") {
      message = `Hello ${loan.person}, I have repaid ₹${amount} towards the principal amount.`;
    } else {
      message = `Hello ${loan.person}, I have fully settled the loan. Thank you.`;
    }

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/91${loan.contact}?text=${encoded}`, "_blank");
  };

  const confirmSettle = async () => {
    try {
      await settleLoan(selectedLoan._id, {
        paidAmount,
        paymentType,
      });

      sendWhatsAppToLender(selectedLoan, paidAmount, paymentType);

      setShowSettleModal(false);
      fetchLoans();

      window.dispatchEvent(new Event("transactions:changed"));
      window.dispatchEvent(new Event("loans:changed"));
    } catch (err) {
      alert("Settlement failed");
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
        <p>Your pending financial commitments</p>
      </header>

      <div className="search-container">
        <i className="bi bi-search"></i>
        <input
          type="text"
          placeholder="Search name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="notify-tabs">
        <button
          className={activeTab === "lent" ? "active" : ""}
          onClick={() => setActiveTab("lent")}
        >
          Lent
        </button>
        <button
          className={activeTab === "borrowed" ? "active" : ""}
          onClick={() => setActiveTab("borrowed")}
        >
          Borrowed
        </button>
      </div>

      <div className="notify-list">
        {loading ? (
          <div className="spinner"></div>
        ) : (
          filteredLoans.map((loan) => {
            const time = getTimeRemaining(loan.dueDate);
            return (
              <div key={loan._id} className="notify-card">
                <div className="card-info">
                  <span className="person-name">{loan.person}</span>
                  <span className="amount-text">
                    ₹{getRemainingTotal(loan)}
                  </span>
                  <span className={`time-tag ${time.color}`}>{time.label}</span>
                </div>
                <button
                  className="manage-btn"
                  onClick={() => {
                    setSelectedLoan(loan);
                    setShowSettleModal(true);
                  }}
                >
                  Manage
                </button>
              </div>
            );
          })
        )}
      </div>

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
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
            >
              <div className="modal-top">
                <h3>{selectedLoan.person}</h3>
                <div className="quick-actions">
                  {selectedLoan.role === "lent" && (
                    <button
                      className="q-icon wa"
                      onClick={() =>
                        window.open(`https://wa.me/91${selectedLoan.contact}`)
                      }
                    >
                      <i className="bi bi-whatsapp"></i>
                    </button>
                  )}
                  <button
                    className="q-icon edit"
                    onClick={() => navigate(`/edit/${selectedLoan._id}`)}
                  >
                    <i className="bi bi-pencil"></i>
                  </button>
                  <button
                    className="q-icon del"
                    onClick={async () => {
                      if (confirm("Delete?"))
                        await deleteLoan(selectedLoan._id);
                      fetchLoans();
                      setShowSettleModal(false);
                    }}
                  >
                    <i className="bi bi-trash"></i>
                  </button>
                </div>
              </div>

              <div className="payment-options">
                <label
                  className={`option-card ${paymentType === "interest" ? "active" : ""} ${getRemainingInterest(selectedLoan) <= 0 ? "disabled" : ""}`}
                >
                  <input
                    type="radio"
                    name="pType"
                    value="interest"
                    disabled={getRemainingInterest(selectedLoan) <= 0}
                    onChange={(e) => {
                      setPaymentType(e.target.value);
                      setPaidAmount(getMonthlyInterest(selectedLoan)); // Initialize with monthly amount
                    }}
                  />
                  <div className="opt-label">
                    <span>Interest Amount</span>
                    {paymentType === "interest" ? (
                      <div className="edit-container">
                        <input
                          type="number"
                          className="inline-edit"
                          value={paidAmount}
                          onChange={handleInterestChange}
                          onFocus={(e) => e.target.select()} // Highlights text on click for easy backspace
                          autoFocus
                        />
                        <i className="bi bi-pencil-fill edit-hint-icon"></i>
                      </div>
                    ) : (
                      <strong
                        className="clickable-hint"
                        onClick={() => {
                          setPaymentType("interest");
                          setPaidAmount(getMonthlyInterest(selectedLoan));
                        }}
                      >
                        ₹{getMonthlyInterest(selectedLoan)}
                      </strong>
                    )}
                  </div>
                </label>
                <label
                  className={`option-card ${paymentType === "principal" ? "active" : ""}`}
                >
                  <input
                    type="radio"
                    name="pType"
                    value="principal"
                    onChange={() => {
                      setPaymentType("principal");
                      setPaidAmount(getRemainingPrincipal(selectedLoan));
                    }}
                  />

                  <div className="opt-label">
                    <span>Principal Amount</span>

                    {paymentType === "principal" ? (
                      <div className="edit-container">
                        <input
                          type="number"
                          className="inline-edit"
                          value={paidAmount}
                          onChange={handlePrincipalChange}
                          onFocus={(e) => e.target.select()}
                          autoFocus
                        />
                        <i className="bi bi-pencil-fill edit-hint-icon"></i>
                      </div>
                    ) : (
                      <strong
                        className="clickable-hint"
                        onClick={() => {
                          setPaymentType("principal");
                          setPaidAmount(getRemainingPrincipal(selectedLoan));
                        }}
                      >
                        ₹{getRemainingPrincipal(selectedLoan)}
                      </strong>
                    )}
                  </div>
                </label>

                <label
                  className={`option-card ${paymentType === "full" ? "active" : ""}`}
                >
                  <input
                    type="radio"
                    name="pType"
                    value="full"
                    onChange={(e) => setPaymentType(e.target.value)}
                  />
                  <div className="opt-label">
                    <span>Full Settlement</span>
                    <strong>₹{getRemainingTotal(selectedLoan)}</strong>
                  </div>
                </label>
              </div>

              <div className="modal-footer">
                <button
                  className="btn-secondary"
                  onClick={() => setShowSettleModal(false)}
                >
                  Back
                </button>
                <button className="btn-primary" onClick={confirmSettle}>
                  Confirm Paid
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
