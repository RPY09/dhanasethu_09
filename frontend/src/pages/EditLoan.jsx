import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { getLoans, updateLoan } from "../api/loan.api";
import { useAlert } from "../components/Alert/AlertContext";

import "./Loans.css";

const EditLoan = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const [quickDuration, setQuickDuration] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  // New state to track the submission process
  const [submitting, setSubmitting] = useState(false);

  // Load loan data
  useEffect(() => {
    const fetchLoan = async () => {
      try {
        const loans = await getLoans();
        const loan = loans.find((l) => l._id === id);

        if (!loan) {
          showAlert("Loan not found", "warning");
          navigate("/notifications");
          return;
        }

        setForm({
          person: loan.person || "",
          contact: loan.contact || "",
          role: loan.role,
          amount: loan.amount,
          interestRate: loan.interestRate || "",
          interestType: loan.interestType || "simple",
          startDate: loan.startDate?.slice(0, 10),
          endDate: loan.dueDate?.slice(0, 10),
          note: loan.note || "",
        });
      } catch (err) {
        console.error(err);
        showAlert("Failed to load loan", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchLoan();
  }, [id, navigate]);

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

  const totalAmount = Number(form?.amount || 0) + Number(interestAmount || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true); // Start the loading effect

    try {
      const payload = {
        ...form,
        amount: String(form.amount),
        interestRate: String(form.interestRate),
        interestAmount: String(interestAmount),
        totalAmount: String(totalAmount),
        dueDate: form.endDate,
      };

      await updateLoan(id, payload);
      window.dispatchEvent(new Event("loans:changed"));
      window.dispatchEvent(new Event("transactions:changed"));
      showAlert("Loan updated successfully", "success");
      navigate("/notifications");
    } catch (err) {
      console.error(err);
      showAlert("Failed to update loan", "error");
      setSubmitting(false); // Reset if there is an error to allow retry
    }
  };

  if (loading || !form) return <p>Loading...</p>;

  return (
    <motion.div
      className="loan-wrapper"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="loan-card">
        <header className="loan-header">
          <h2>Edit Loan</h2>
          <p>Update lending or borrowing details</p>
        </header>

        <form onSubmit={handleSubmit} className="loan-form">
          {/* ... (input groups for person, contact, etc. remain the same) */}
          <div className="input-group">
            <label>Name</label>
            <input
              name="person"
              value={form.person}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-group">
            <label>Phone or Email</label>
            <input
              name="contact"
              value={form.contact}
              onChange={handleChange}
            />
          </div>

          <div className="row">
            <div className="input-group">
              <label>Principal Amount</label>
              <input
                type="number"
                name="amount"
                value={form.amount}
                onChange={handleChange}
                required
              />
            </div>
            <div className="input-group">
              <label>Interest %</label>
              <input
                type="number"
                name="interestRate"
                value={form.interestRate}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="row">
            <div className="input-group">
              <label>Type</label>
              <select name="role" value={form.role} onChange={handleChange}>
                <option value="lent">I Lent</option>
                <option value="borrowed">I Borrowed</option>
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
            <div>
              <span>Interest</span>
              <strong>₹ {interestAmount}</strong>
            </div>
            <div>
              <span>Total Amount</span>
              <strong>₹ {totalAmount}</strong>
            </div>
          </div>

          <div className="input-group">
            <label>Notes</label>
            <textarea name="note" value={form.note} onChange={handleChange} />
          </div>

          {/* Updated button with spinner logic */}
          <motion.button
            type="submit"
            className="loan-submit"
            disabled={submitting} // Disable to prevent multiple clicks
            whileTap={{ scale: 0.97 }}
          >
            {submitting ? <span className="spinner"></span> : "Update Loan"}
          </motion.button>
        </form>
      </div>
    </motion.div>
  );
};

export default EditLoan;
