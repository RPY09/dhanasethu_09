import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { addLoan } from "../api/loan.api";
import { useNavigate } from "react-router-dom";
import { useAlert } from "../components/Alert/AlertContext";

import "./Loans.css";

const Loans = () => {
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const [quickDuration, setQuickDuration] = useState(null);
  const [loading, setLoading] = useState(false);
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

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

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
    setLoading(true);
    try {
      const payload = {
        ...form,
        amount: String(form.amount),
        interestRate: String(form.interestRate),
        interestAmount: String(interestAmount),
        totalAmount: String(totalAmount),
        dueDate: form.endDate,
      };

      await addLoan(payload);
      showAlert("New loan entry created.", "success");
      window.dispatchEvent(new Event("loans:changed"));
      window.dispatchEvent(new Event("transactions:changed"));

      const targetTab = form.role === "borrowed" ? "borrowed" : "lent";
      navigate("/notifications", { state: { activeTab: targetTab } });
    } catch (err) {
      showAlert("Error saving loan.", "error");
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
              <label>Principal (₹)</label>
              <input
                type="number"
                name="amount"
                placeholder="0"
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
              <select name="role" value={form.role} onChange={handleChange}>
                <option value="lent">Lends</option>
                <option value="borrowed">Borrowes</option>
              </select>
            </div>
            <div className="input-group">
              <label>Interest Type</label>
              <select
                name="interestType"
                value={form.interestType}
                onChange={handleChange}
              >
                <option value="simple">Simple</option>
                <option value="monthly">Compound</option>
              </select>
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
                    M
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
                    Y
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
              <strong>₹ {interestAmount}</strong>
            </div>
            <div className="summary-item total">
              <span>Total Due</span>
              <strong>₹ {totalAmount}</strong>
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
    </motion.div>
  );
};

export default Loans;
