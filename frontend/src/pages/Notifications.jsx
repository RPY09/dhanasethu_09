import { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getLoans, settleLoan, deleteLoan } from "../api/loan.api";
import { useAlert } from "../components/Alert/AlertContext";

import "./Notifications.css";

const ITEMS_PER_PAGE = 5;

const Notifications = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showAlert } = useAlert();

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
  const getPostPaymentState = (loan, paid, type) => {
    let remainingInterest =
      Number(loan.interestAmount || 0) - Number(loan.interestPaid || 0);
    let remainingPrincipal = Number(loan.principal || 0);
    let remainingTotal = remainingInterest + remainingPrincipal;

    if (type === "interest") {
      remainingInterest = Math.max(remainingInterest - paid, 0);
    }

    if (type === "principal") {
      remainingPrincipal = Math.max(remainingPrincipal - paid, 0);
    }

    if (type === "full") {
      remainingInterest = 0;
      remainingPrincipal = 0;
    }

    return { remainingInterest, remainingPrincipal, remainingTotal };
  };
  const getDateTimeString = () => {
    const now = new Date();
    return now.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const sendWhatsAppMessage = (loan, paidAmount, type) => {
    if (!loan?.contact) return;

    const paid = Number(paidAmount);
    const timestamp = getDateTimeString();

    const { remainingInterest, remainingPrincipal } = getPostPaymentState(
      loan,
      paid,
      type
    );

    const remainingTotal = remainingInterest + remainingPrincipal;

    let message = "";

    if (loan.role === "borrowed") {
      if (type === "interest") {
        message = `Hello ${loan.person},

₹${paid} interest payment paid to you.

===== Date & Time: ${timestamp} =====

• Remaining Interest: ₹${remainingInterest}
• Remaining Principal: ₹${remainingPrincipal}
• Total Due: ₹${remainingTotal}

Thank you.`;
      }

      if (type === "principal") {
        message = `Hello ${loan.person},

₹${paid} principal payment paid to you.

===== Date & Time: ${timestamp} =====

• Remaining Principal: ₹${remainingPrincipal}
• Remaining Interest: ₹${remainingInterest}
• Total Due: ₹${remainingTotal}

Thank you.`;
      }

      if (type === "full") {
        message = `Hello ${loan.person},

The loan has been fully settled.

===== Date & Time: ${timestamp} =====

-> Remaining Principal: ₹0
-> Remaining Interest: ₹0
-> Total Due: ₹0

Thank you.`;
      }
    }

    if (loan.role === "lent") {
      if (type === "interest") {
        message = `Hello ${loan.person},

₹${paid} interest payment recorded.

===== Date & Time: ${timestamp} =====

• Remaining Interest: ₹${remainingInterest}
• Remaining Principal: ₹${remainingPrincipal}
• Total Due: ₹${remainingTotal}`;
      }

      if (type === "principal") {
        message = `Hello ${loan.person},

₹${paid} principal payment recorded.

===== Date & Time: ${timestamp} =====

• Remaining Principal: ₹${remainingPrincipal}
• Remaining Interest: ₹${remainingInterest}
• Total Due: ₹${remainingTotal}`;
      }

      if (type === "full") {
        message = `Hello ${loan.person},

The loan has been fully settled.

===== Date & Time: ${timestamp} =====

-> Remaining Principal: ₹0
-> Remaining Interest: ₹0
-> Total Due: ₹0`;
      }
    }

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/91${loan.contact}?text=${encoded}`, "_blank");
  };

  const sendWhatsAppReminder = (loan) => {
    if (!loan?.contact) return;

    const takenDate = new Date(loan.startDate).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const dueDate = new Date(loan.dueDate).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const interestRemaining =
      Number(loan.interestAmount || 0) - Number(loan.interestPaid || 0);

    const principalRemaining = Number(loan.principal || 0);
    const totalRemaining = principalRemaining + Math.max(interestRemaining, 0);

    const message = `Hello ${loan.person},

You have taken an amount of ₹${principalRemaining} on ${takenDate}.

-> Current Loan Summary:
• Principal Remaining: ₹${principalRemaining}
• Interest Remaining: ₹${Math.max(interestRemaining, 0)}
• Total Amount Due: ₹${totalRemaining}

-> Important Dates:
• Due Date: ${dueDate}

=> Please let me know when you will pay the amount.

Thank you.`;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/91${loan.contact}?text=${encoded}`, "_blank");
  };

  const confirmSettle = async () => {
    if (!paidAmount || Number(paidAmount) <= 0) {
      showAlert("Enter a valid amount", "warning");
      return;
    }

    try {
      await settleLoan(selectedLoan._id, {
        paidAmount: Number(paidAmount),
        paymentType,
      });

      sendWhatsAppMessage(selectedLoan, paidAmount, paymentType);

      setShowSettleModal(false);
      fetchLoans();

      window.dispatchEvent(new Event("transactions:changed"));
      window.dispatchEvent(new Event("loans:changed"));
    } catch (err) {
      showAlert(err.response?.data?.message || "Settlement failed", "error");
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
                      onClick={() => sendWhatsAppReminder(selectedLoan)}
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
                    onClick={() => {
                      showAlert(
                        "Do you want to delete this loan record?",
                        "error",
                        true,
                        async () => {
                          await deleteLoan(selectedLoan._id);
                          fetchLoans();
                          window.dispatchEvent(new Event("loans:changed"));
                          setShowSettleModal(false);
                          showAlert("Loan deleted", "success");
                        }
                      );
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
