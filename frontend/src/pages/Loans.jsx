import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { addLoan, getLoans } from "../api/loan.api";
import { useNavigate } from "react-router-dom";
import { useAlert } from "../components/Alert/AlertContext";
import { useCurrency } from "../context/CurrencyContext";
import {
  addCustomPaymentMode,
  deleteCustomPaymentMode,
  getUserPreferences,
} from "../api/transaction.api";

import "./Loans.css";

const DEFAULT_PAYMENT_MODES = ["cash", "upi"];
const ROLE_OPTIONS = [
  { value: "lent", label: "Lends" },
  { value: "borrowed", label: "Borrows" },
];
const INTEREST_TYPE_OPTIONS = [
  { value: "simple", label: "Simple" },
  { value: "monthly", label: "Compound" },
];
const PAYMENT_CUSTOM_KEY = "payment_custom_v1";
const PAYMENT_OVERLAY_DEBOUNCE_MS = 550;
const OVERLAY_SWITCH_DELAY = 120;
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
const getMostUsedValue = (items = [], fieldName, fallback) => {
  const counts = {};
  (items || []).forEach((item) => {
    const value = normalizeValue(item?.[fieldName]);
    if (!value) return;
    counts[value] = (counts[value] || 0) + 1;
  });

  const sorted = Object.entries(counts).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return a[0].localeCompare(b[0]);
  });
  return sorted.length ? sorted[0][0] : fallback;
};

const Loans = () => {
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const [quickDuration, setQuickDuration] = useState(null);
  const [loading, setLoading] = useState(false);
  const { baseSymbol, baseCurrency, baseCountry } = useCurrency();
  const [paymentMethod, setPaymentMethod] = useState("");
  const [showPaymentOverlay, setShowPaymentOverlay] = useState(false);
  const [showRoleOverlay, setShowRoleOverlay] = useState(false);
  const [showInterestTypeOverlay, setShowInterestTypeOverlay] = useState(false);
  const [paymentSearch, setPaymentSearch] = useState("");
  const [customPaymentModes, setCustomPaymentModes] = useState([]);
  const promptedForPaymentRef = useRef(false);
  const paymentOverlayTimerRef = useRef(null);

  const [form, setForm] = useState({
    person: "",
    contact: "",
    role: "lent",
    amount: "",
    interestRate: "",
    interestType: "simple",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    note: "",
  });
  const LOAN_QUEUE_KEY = "unsynced_loans";
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
    [customPaymentModes, paymentMethod],
  );
  const normalizedPaymentSearch = canonicalPaymentMode(paymentSearch);
  const filteredPayments = useMemo(() => {
    if (!normalizedPaymentSearch) return paymentOptions;
    return paymentOptions.filter((item) =>
      canonicalPaymentMode(item).includes(normalizedPaymentSearch),
    );
  }, [paymentOptions, normalizedPaymentSearch]);
  const canAddPayment =
    normalizedPaymentSearch.length > 0 &&
    !paymentOptions.some(
      (item) => canonicalPaymentMode(item) === normalizedPaymentSearch,
    );
  const customPaymentSet = useMemo(
    () =>
      new Set(
        (customPaymentModes || []).map((item) => canonicalPaymentMode(item)),
      ),
    [customPaymentModes],
  );

  const getLoanQueue = () =>
    JSON.parse(localStorage.getItem(LOAN_QUEUE_KEY)) || [];

  const saveLoanQueue = (q) =>
    localStorage.setItem(LOAN_QUEUE_KEY, JSON.stringify(q));

  const handleRoleSelect = (role) => {
    const nextRole = normalizeValue(role);
    setForm((prev) => ({ ...prev, role: nextRole }));
    setShowRoleOverlay(false);
    setTimeout(() => {
      setShowInterestTypeOverlay(true);
    }, OVERLAY_SWITCH_DELAY);
  };

  const handleInterestTypeSelect = (interestType) => {
    const nextInterestType = normalizeValue(interestType);
    setForm((prev) => ({ ...prev, interestType: nextInterestType }));
    setShowInterestTypeOverlay(false);
  };

  const handlePaymentSelect = (mode) => {
    setPaymentMethod(canonicalPaymentMode(mode));
    setShowPaymentOverlay(false);
    setPaymentSearch("");
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
    if (Number(form.amount) > 0) promptedForPaymentRef.current = false;
  };

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

  useEffect(() => {
    const applyMostUsedDefaults = async () => {
      try {
        const loans = await getLoans();
        const list = Array.isArray(loans) ? loans : [];
        const mostUsedRole = getMostUsedValue(list, "role", "lent");
        const mostUsedInterestType = getMostUsedValue(
          list,
          "interestType",
          "simple",
        );
        setForm((prev) => ({
          ...prev,
          role: mostUsedRole || prev.role,
          interestType: mostUsedInterestType || prev.interestType,
        }));
      } catch {
        // keep form defaults
      }
    };

    applyMostUsedDefaults();
  }, []);

  useEffect(() => {
    if (showPaymentOverlay || showRoleOverlay || showInterestTypeOverlay)
      document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [showPaymentOverlay, showRoleOverlay, showInterestTypeOverlay]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });

    if (name === "amount") {
      if (paymentOverlayTimerRef.current) {
        clearTimeout(paymentOverlayTimerRef.current);
        paymentOverlayTimerRef.current = null;
      }

      const hasAmount = Number(value) > 0;
      if (!hasAmount) {
        promptedForPaymentRef.current = false;
        return;
      }

      if (
        !paymentMethod &&
        !showPaymentOverlay &&
        !showRoleOverlay &&
        !showInterestTypeOverlay &&
        !promptedForPaymentRef.current
      ) {
        paymentOverlayTimerRef.current = setTimeout(() => {
          promptedForPaymentRef.current = true;
          setShowPaymentOverlay(true);
          paymentOverlayTimerRef.current = null;
        }, PAYMENT_OVERLAY_DEBOUNCE_MS);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (paymentOverlayTimerRef.current) {
        clearTimeout(paymentOverlayTimerRef.current);
      }
    };
  }, []);

  const addDurationToDate = (start, type) => {
    const d = new Date(start);
    if (type === "month") d.setMonth(d.getMonth() + 1);
    if (type === "year") d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split("T")[0];
  };

  const calculateMonths = (start, end) => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    let months =
      (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
    if (e.getDate() > s.getDate()) months += 1;
    return Math.max(months, 1);
  };

  const calculateYears = (start, end) => {
    const s = new Date(start);
    const e = new Date(end);
    let years = e.getFullYear() - s.getFullYear();
    if (
      e.getMonth() < s.getMonth() ||
      (e.getMonth() === s.getMonth() && e.getDate() < s.getDate())
    ) {
      years -= 1;
    }
    return Math.max(years, 1);
  };

  const interestAmount = useMemo(() => {
    const p = Number(form.amount);
    const r = Number(form.interestRate);

    if (!p || !r || !form.startDate || !form.endDate) return 0;

    // Always calculate both, then choose based on the toggle
    const months = calculateMonths(form.startDate, form.endDate);
    const years = calculateYears(form.startDate, form.endDate);

    // If quickDuration is null (initial state), default to months
    const selectedUnit = quickDuration === "year" ? "year" : "month";
    const timePeriod = selectedUnit === "year" ? years : months;

    if (form.interestType === "simple") {
      return Number(((p * r * timePeriod) / 100).toFixed(2));
    }

    if (form.interestType === "monthly") {
      return Number((p * Math.pow(1 + r / 100, timePeriod) - p).toFixed(2));
    }

    return 0;
  }, [
    form.amount,
    form.interestRate,
    form.startDate,
    form.endDate,
    form.interestType,
    quickDuration,
  ]);
  const totalAmount = Number(form.amount || 0) + Number(interestAmount || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.contact) return showAlert("Phone number is required", "warning");
    if (!paymentMethod) {
      setShowPaymentOverlay(true);
      return showAlert("Select payment mode", "warning");
    }

    setLoading(true);

    const payload = {
      ...form,
      paymentMethod: canonicalPaymentMode(paymentMethod),
      amount: String(form.amount),
      interestRate: String(form.interestRate),
      interestAmount: String(interestAmount),
      totalAmount: String(totalAmount),
      dueDate: form.endDate,
    };

    const localLoan = {
      id: crypto.randomUUID(),
      payload,
      createdAt: Date.now(),
    };

    const queue = getLoanQueue();
    queue.push(localLoan);
    saveLoanQueue(queue);

    const targetTab = form.role === "borrowed" ? "borrowed" : "lent";
    navigate("/notifications", { state: { activeTab: targetTab } });

    try {
      await addLoan(payload);

      const updatedQueue = getLoanQueue().filter((l) => l.id !== localLoan.id);
      saveLoanQueue(updatedQueue);

      window.dispatchEvent(new Event("loans:changed"));
      window.dispatchEvent(new Event("transactions:changed"));
    } catch {
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="loan-wrapper"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="loan-card">
        <header className="loan-header">
          <h2>Lending / Borrowing</h2>
          <p>Track money flows with interest</p>
        </header>

        <form onSubmit={handleSubmit} className="loan-form">
          <div className="input-group">
            <label>Name</label>
            <input
              name="person"
              placeholder="Person's name"
              required
              onChange={handleChange}
            />
          </div>

          <div className="input-group">
            <label>Phone Number (Required)</label>
            <div className="input-with-icon">
              <i className="bi bi-telephone"></i>
              <input
                name="contact"
                type="tel"
                placeholder="10-digit mobile number"
                required
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="row">
            <div className="input-group">
              <div className="date-header">
                <label>Principal</label>
                {paymentMethod ? (
                  <span className="loan-mode-pill">
                    {toTitleCase(paymentMethod)}
                  </span>
                ) : null}
              </div>

              <input
                type="number"
                name="amount"
                placeholder={`${baseSymbol}0`}
                required
                onChange={handleChange}
              />
            </div>
            <div className="input-group">
              <label>Interest %</label>
              <input
                type="number"
                name="interestRate"
                placeholder="e.g. 2"
                onChange={handleChange}
              />
            </div>
          </div>
          <div className="row">
            <div className="input-group">
              <label>Type</label>
              <button
                type="button"
                className="loan-mode-pills"
                onClick={() => setShowRoleOverlay(true)}
              >
                {toTitleCase(form.role)}
              </button>
            </div>
            <div className="input-group">
              <label>Interest Type</label>
              <button
                type="button"
                className="loan-mode-pills"
                onClick={() => setShowInterestTypeOverlay(true)}
              >
                {form.interestType === "monthly"
                  ? "Compound"
                  : toTitleCase(form.interestType)}
              </button>
            </div>
          </div>

          <div className="row">
            <div className="input-group">
              <label>Start Date</label>
              <input
                className="dates"
                type="date"
                name="startDate"
                value={form.startDate}
                onChange={handleChange}
              />
            </div>
            {/* End Date Section */}
            <div className="input-group date-group">
              <div className="date-header">
                <label>End Date</label>
                {/* The toggle is now positioned absolutely relative to this header */}
                <div className="duration-toggle">
                  <div
                    className={`toggle-slider ${quickDuration === "year" ? "slide-right" : "slide-left"}`}
                  />
                  <button
                    type="button"
                    className={`toggle-btn ${quickDuration === "month" ? "active" : ""}`}
                    onClick={() => {
                      setQuickDuration("month");
                      setForm((f) => ({
                        ...f,
                        endDate: addDurationToDate(f.startDate, "month"),
                      }));
                    }}
                  >
                    Month
                  </button>
                  <button
                    type="button"
                    className={`toggle-btn ${quickDuration === "year" ? "active" : ""}`}
                    onClick={() => {
                      setQuickDuration("year");
                      setForm((f) => ({
                        ...f,
                        endDate: addDurationToDate(f.startDate, "year"),
                      }));
                    }}
                  >
                    Year
                  </button>
                </div>
              </div>

              <input
                className="dates"
                type="date"
                name="endDate"
                value={form.endDate}
                required
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="loan-summary">
            <div className="summary-item">
              <span>Interest</span>
              <strong>
                {baseSymbol} {interestAmount}
              </strong>
            </div>
            <div className="summary-item total">
              <span>Total Due</span>
              <strong>
                {baseSymbol} {totalAmount}
              </strong>
            </div>
          </div>

          <div className="input-group">
            <label>Notes</label>
            <textarea
              name="note"
              placeholder="Optional details..."
              onChange={handleChange}
            />
          </div>

          <motion.button
            type="submit"
            className="loan-submit"
            disabled={loading}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? <span className="spinner"></span> : "Save Entry"}
          </motion.button>
        </form>
      </div>
      {showPaymentOverlay && (
        <div
          className="loan-overlay"
          onClick={() => {
            setShowPaymentOverlay(false);
            setPaymentSearch("");
          }}
        >
          <div className="loan-modal" onClick={(e) => e.stopPropagation()}>
            <div className="loan-modal-head">
              <h3>Select Payment Mode</h3>
              <button
                type="button"
                className="loan-close"
                onClick={() => {
                  setShowPaymentOverlay(false);
                  setPaymentSearch("");
                }}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <input
              type="text"
              placeholder="Search (or) Add payment mode..."
              value={paymentSearch}
              onChange={(e) => setPaymentSearch(e.target.value)}
              className="loan-search"
            />
            <div className="loan-list">
              {filteredPayments.length ? (
                filteredPayments.map((item) => {
                  const normalizedItem = canonicalPaymentMode(item);
                  return (
                    <div className="loan-item-row" key={normalizedItem}>
                      <button
                        type="button"
                        className={`loan-item ${
                          canonicalPaymentMode(paymentMethod) === normalizedItem
                            ? "active"
                            : ""
                        }`}
                        onClick={() => handlePaymentSelect(normalizedItem)}
                      >
                        {toTitleCase(item)}
                      </button>
                      {customPaymentSet.has(normalizedItem) && (
                        <button
                          type="button"
                          className="loan-item-remove"
                          aria-label={`Delete ${item}`}
                          title={`Delete ${item}`}
                          onClick={() => handleRemovePayment(normalizedItem)}
                        >
                          <i className="bi bi-x-lg"></i>
                        </button>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="loan-empty">
                  No payment modes found you can "add(+)"
                </p>
              )}
              {canAddPayment && (
                <button
                  type="button"
                  className="loan-item add-new"
                  onClick={handleAddPayment}
                  title={`Add ${normalizedPaymentSearch} to Payment Modes`}
                >
                  + "{normalizedPaymentSearch}"
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {showRoleOverlay && (
        <div
          className="loan-overlay"
          onClick={() => {
            setShowRoleOverlay(false);
          }}
        >
          <div className="loan-modal" onClick={(e) => e.stopPropagation()}>
            <div className="loan-modal-head">
              <h3>Select Loan Type</h3>
              <button
                type="button"
                className="loan-close"
                onClick={() => setShowRoleOverlay(false)}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div className="loan-list">
              {ROLE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`loan-item ${
                    normalizeValue(form.role) === option.value ? "active" : ""
                  }`}
                  onClick={() => handleRoleSelect(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {showInterestTypeOverlay && (
        <div
          className="loan-overlay"
          onClick={() => {
            setShowInterestTypeOverlay(false);
          }}
        >
          <div className="loan-modal" onClick={(e) => e.stopPropagation()}>
            <div className="loan-modal-head">
              <h3>Select Interest Type</h3>
              <button
                type="button"
                className="loan-close"
                onClick={() => setShowInterestTypeOverlay(false)}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div className="loan-list">
              {INTEREST_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`loan-item ${
                    normalizeValue(form.interestType) === option.value
                      ? "active"
                      : ""
                  }`}
                  onClick={() => handleInterestTypeSelect(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default Loans;
