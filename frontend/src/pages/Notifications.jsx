import { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getLoans, settleLoan, deleteLoan } from "../api/loan.api";
import {
  addCustomPaymentMode,
  deleteCustomPaymentMode,
  getUserPreferences,
} from "../api/transaction.api";
import { useAlert } from "../components/Alert/AlertContext";
import { useCurrency } from "../context/CurrencyContext";

import "./Notifications.css";

const ITEMS_PER_PAGE = 5;
const DEFAULT_PAYMENT_MODES = ["cash", "upi"];
const PAYMENT_CUSTOM_KEY = "payment_custom_v1";
const normalizeValue = (value = "") =>
  String(value)
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
const canonicalPaymentMode = (value = "") => {
  const normalized = normalizeValue(value);
  if (normalized === "online" || normalized === "upi") return "upi";
  return normalized;
};
const toTitleCase = (value = "") =>
  String(value)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());

const Notifications = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showAlert } = useAlert();
  const { symbol, convert } = useCurrency();
  const [page, setPage] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [showPaymentOverlay, setShowPaymentOverlay] = useState(false);
  const [paymentSearch, setPaymentSearch] = useState("");
  const [customPaymentModes, setCustomPaymentModes] = useState([]);
  const [pendingConfirm, setPendingConfirm] = useState(false);

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
  const paymentOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...DEFAULT_PAYMENT_MODES,
          canonicalPaymentMode(paymentMethod),
          ...(customPaymentModes || []).map((item) =>
            canonicalPaymentMode(item),
          ),
        ]),
      ).filter(Boolean),
    [customPaymentModes, paymentMethod]
  );
  const normalizedPaymentSearch = canonicalPaymentMode(paymentSearch);
  const filteredPayments = useMemo(() => {
    if (!normalizedPaymentSearch) return paymentOptions;
    return paymentOptions.filter((item) =>
      canonicalPaymentMode(item).includes(normalizedPaymentSearch)
    );
  }, [paymentOptions, normalizedPaymentSearch]);
  const canAddPayment =
    normalizedPaymentSearch.length > 0 &&
    !paymentOptions.some(
      (item) => canonicalPaymentMode(item) === normalizedPaymentSearch
    );
  const customPaymentSet = useMemo(
    () =>
      new Set(
        (customPaymentModes || []).map((item) => canonicalPaymentMode(item))
      ),
    [customPaymentModes]
  );

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    fetchLoans();
  }, []);

  useEffect(() => {
    const loadLocal = () => {
      try {
        const savedPayments = JSON.parse(
          localStorage.getItem(PAYMENT_CUSTOM_KEY) || "[]",
        );
        setCustomPaymentModes(
          Array.isArray(savedPayments)
            ? savedPayments
                .map((item) => canonicalPaymentMode(item))
                .filter(Boolean)
            : [],
        );
      } catch {
        setCustomPaymentModes([]);
      }
    };

    const loadRemote = async () => {
      try {
        const prefs = await getUserPreferences();
        const paymentModes = Array.isArray(prefs?.paymentModes)
          ? prefs.paymentModes
              .map((item) => canonicalPaymentMode(item))
              .filter(Boolean)
          : [];
        setCustomPaymentModes(paymentModes);
        localStorage.setItem(PAYMENT_CUSTOM_KEY, JSON.stringify(paymentModes));
      } catch {
        loadLocal();
      }
    };

    loadRemote();
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
  const paginatedLoans = useMemo(() => {
    return filteredLoans.slice(0, page * ITEMS_PER_PAGE);
  }, [filteredLoans, page]);

  /* ---------- ACTIONS ---------- */
  useEffect(() => {
    if (!selectedLoan) return;
    setPaymentMethod(canonicalPaymentMode(selectedLoan.paymentMethod || "cash"));
    if (paymentType === "interest")
      setPaidAmount(getMonthlyInterest(selectedLoan));
    else if (paymentType === "principal")
      setPaidAmount(getRemainingPrincipal(selectedLoan));
    else setPaidAmount(getRemainingTotal(selectedLoan));
  }, [paymentType, selectedLoan]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, debouncedSearch]);

  const handlePaymentSelect = (mode) => {
    const nextMode = canonicalPaymentMode(mode);
    setPaymentMethod(nextMode);
    setShowPaymentOverlay(false);
    setPaymentSearch("");
    if (pendingConfirm) {
      setPendingConfirm(false);
      confirmSettle(nextMode);
    }
  };

  const handleAddPayment = async () => {
    if (!canAddPayment) return;
    const name = canonicalPaymentMode(normalizedPaymentSearch);
    try {
      const res = await addCustomPaymentMode({ name });
      const next = Array.isArray(res?.paymentModes)
        ? res.paymentModes
            .map((item) => canonicalPaymentMode(item))
            .filter(Boolean)
        : Array.from(new Set([...(customPaymentModes || []), name]));
      setCustomPaymentModes(next);
      localStorage.setItem(PAYMENT_CUSTOM_KEY, JSON.stringify(next));
    } catch {
      const next = Array.from(new Set([...(customPaymentModes || []), name]));
      setCustomPaymentModes(next);
      localStorage.setItem(PAYMENT_CUSTOM_KEY, JSON.stringify(next));
    }
    handlePaymentSelect(name);
  };

  const handleRemovePayment = async (mode) => {
    const key = canonicalPaymentMode(mode);
    if (!customPaymentSet.has(key)) return;
    try {
      const res = await deleteCustomPaymentMode({ name: key });
      const next = Array.isArray(res?.paymentModes)
        ? res.paymentModes
            .map((item) => canonicalPaymentMode(item))
            .filter(Boolean)
        : (customPaymentModes || []).filter(
            (item) => canonicalPaymentMode(item) !== key,
          );
      setCustomPaymentModes(next);
      localStorage.setItem(PAYMENT_CUSTOM_KEY, JSON.stringify(next));
    } catch {
      const next = (customPaymentModes || []).filter(
        (item) => canonicalPaymentMode(item) !== key,
      );
      setCustomPaymentModes(next);
      localStorage.setItem(PAYMENT_CUSTOM_KEY, JSON.stringify(next));
    }
    if (canonicalPaymentMode(paymentMethod) === key) setPaymentMethod("");
  };

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
  const money = (val) => `${symbol}${convert(val).toLocaleString()}`;

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

• Remaining Interest: ${money(remainingInterest)}
• Remaining Principal: ${money(remainingPrincipal)}
• Total Due: ${money(remainingTotal)}

Thank you.`;
      }

      if (type === "principal") {
        message = `Hello ${loan.person},

${money(paid)} principal payment paid to you.

===== Date & Time: ${timestamp} =====

• Remaining Principal: ${money(remainingPrincipal)}
• Remaining Interest: ${money(remainingInterest)}
• Total Due: ${money(remainingTotal)}

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

${money(paid)} interest payment recorded.

===== Date & Time: ${timestamp} =====

• Remaining Interest: ${money(remainingInterest)}
• Remaining Principal: ${money(remainingPrincipal)}
• Total Due: ${money(remainingTotal)}`;
      }

      if (type === "principal") {
        message = `Hello ${loan.person},

${money(paid)} principal payment recorded.

===== Date & Time: ${timestamp} =====

• Remaining Principal: ${money(remainingPrincipal)}
• Remaining Interest: ${money(remainingInterest)}
• Total Due: ${money(remainingTotal)}`;
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
• Principal Remaining: ${money(principalRemaining)}
• Interest Remaining: ${money(Math.max(interestRemaining, 0))}
• Total Amount Due: ${money(totalRemaining)}

-> Important Dates:
• Due Date: ${dueDate}

=> Please let me know when you will pay the amount.

Thank you.`;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/91${loan.contact}?text=${encoded}`, "_blank");
  };

  const confirmSettle = async (methodOverride) => {
    if (!paidAmount || Number(paidAmount) <= 0) {
      showAlert("Enter a valid amount", "warning");
      return;
    }
    const method = canonicalPaymentMode(methodOverride || paymentMethod);
    if (!method) {
      setPendingConfirm(true);
      setShowPaymentOverlay(true);
      showAlert("Select payment mode", "warning");
      return;
    }

    try {
      await settleLoan(selectedLoan._id, {
        paidAmount: Number(paidAmount),
        paymentType,
        paymentMethod: method,
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

  const SkeletonNotification = () => (
    <div className="notify-card skeleton-card">
      <div className="card-info">
        <div className="skeleton skeleton-name"></div>
        <div className="skeleton skeleton-amount"></div>
        <div className="skeleton skeleton-tag"></div>
      </div>
      <div className="skeleton skeleton-btn"></div>
    </div>
  );

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

      {loading ? (
        <>
          <div
            className="skeleton skeleton-search"
            style={{ marginBottom: 20 }}
          ></div>
          <div className="notify-tabs">
            <div className="skeleton skeleton-tab"></div>
            <div className="skeleton skeleton-tab"></div>
          </div>
        </>
      ) : (
        <>
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
        </>
      )}

      <div className="notify-list">
        {loading ? (
          [...Array(5)].map((_, i) => <SkeletonNotification key={i} />)
        ) : filteredLoans.length === 0 ? (
          <p style={{ textAlign: "center", color: "var(--text-muted)" }}>
            No reminders found
          </p>
        ) : (
          paginatedLoans.map((loan) => {
            const time = getTimeRemaining(loan.dueDate);
            return (
              <div key={loan._id} className="notify-card">
                <div className="card-info">
                  <span className="person-name">{loan.person}</span>
                  <span className="amount-text">
                    {symbol} {convert(getRemainingTotal(loan)).toLocaleString()}
                  </span>
                  <span className={`time-tag ${time.color}`}>{time.label}</span>
                </div>
                <button
                  className="manage-btn"
                  onClick={() => {
                    setSelectedLoan(loan);
                    setPaymentSearch("");
                    setPendingConfirm(false);
                    setShowPaymentOverlay(false);
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
      {!loading && paginatedLoans.length < filteredLoans.length && (
        <button
          style={{
            margin: "20px auto",
            display: "block",
            padding: "10px 20px",
            borderRadius: "14px",
            border: "none",
            background: "var(--primary)",
            color: "white",
            fontWeight: 700,
          }}
          onClick={() => setPage((p) => p + 1)}
        >
          Load More
        </button>
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
                          setShowPaymentOverlay(false);
                          setPendingConfirm(false);
                          showAlert("Loan deleted", "success");
                        }
                      );
                    }}
                  >
                    <i className="bi bi-trash"></i>
                  </button>
                </div>
              </div>
              {paymentMethod ? (
                <p className="notify-payment-pill">
                  Payment mode: <strong>{toTitleCase(paymentMethod)}</strong>
                </p>
              ) : null}
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
                  onClick={() => {
                    setShowSettleModal(false);
                    setShowPaymentOverlay(false);
                    setPendingConfirm(false);
                  }}
                >
                  Back
                </button>
                <button
                  className="btn-primary"
                  onClick={() => {
                    setPendingConfirm(true);
                    setShowPaymentOverlay(true);
                  }}
                >
                  Confirm Paid
                </button>
              </div>
              <AnimatePresence>
                {showPaymentOverlay && (
                  <motion.div
                    className="notify-payment-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <motion.div
                      className="notify-payment-modal"
                      initial={{ scale: 0.95, y: 12 }}
                      animate={{ scale: 1, y: 0 }}
                    >
                      <div className="notify-payment-head">
                        <h4>Select Payment Mode</h4>
                        <button
                          type="button"
                          className="notify-payment-close"
                          onClick={() => {
                            setShowPaymentOverlay(false);
                            setPendingConfirm(false);
                            setPaymentSearch("");
                          }}
                        >
                          <i className="bi bi-x-lg"></i>
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="Search payment mode..."
                        value={paymentSearch}
                        onChange={(e) => setPaymentSearch(e.target.value)}
                        className="notify-payment-search"
                      />
                      <div className="notify-payment-list">
                        {filteredPayments.length ? (
                          filteredPayments.map((item) => {
                            const normalizedItem = canonicalPaymentMode(item);
                            return (
                              <div
                                className="notify-payment-row"
                                key={normalizedItem}
                              >
                                <button
                                  type="button"
                                  className={`notify-payment-item ${
                                    canonicalPaymentMode(paymentMethod) ===
                                    normalizedItem
                                      ? "active"
                                      : ""
                                  }`}
                                  onClick={() =>
                                    handlePaymentSelect(normalizedItem)
                                  }
                                >
                                  {toTitleCase(item)}
                                </button>
                                {customPaymentSet.has(normalizedItem) && (
                                  <button
                                    type="button"
                                    className="notify-payment-remove"
                                    onClick={() =>
                                      handleRemovePayment(normalizedItem)
                                    }
                                  >
                                    <i className="bi bi-x-lg"></i>
                                  </button>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <p className="notify-payment-empty">
                            No payment modes found you can "add(+)"
                          </p>
                        )}
                        {canAddPayment && (
                          <button
                            type="button"
                            className="notify-payment-item add-new"
                            onClick={handleAddPayment}
                          >
                            + "{normalizedPaymentSearch}"
                          </button>
                        )}
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Notifications;
