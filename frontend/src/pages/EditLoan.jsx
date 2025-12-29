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

  // ... (calculateMonths logic remains the same)

  const interestAmount = useMemo(() => {
    // ... (interestAmount logic remains the same)
    const p = Number(form?.amount);
    const r = Number(form?.interestRate);

    if (!p || !r || !form?.startDate || !form?.endDate) return 0;

    const months = ((start, end) => {
      const s = new Date(start);
      const e = new Date(end);
      let m =
        (e.getFullYear() - s.getFullYear()) * 12 +
        (e.getMonth() - s.getMonth());
      if (e.getDate() > s.getDate()) m += 1;
      return Math.max(m, 1);
    })(form.startDate, form.endDate);

    if (form.interestType === "simple") {
      if (months >= 12) {
        const years = months / 12;
        return Number(((p * r * years) / 100).toFixed(2));
      }
      return Number(((p * r * months) / 100).toFixed(2));
    }

    if (form.interestType === "monthly") {
      const total = p * Math.pow(1 + r / 100, months);
      return Number((total - p).toFixed(2));
    }

    return 0;
  }, [
    form?.amount,
    form?.interestRate,
    form?.startDate,
    form?.endDate,
    form?.interestType,
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
              <label>Type</label>
              <select name="role" value={form.role} onChange={handleChange}>
                <option value="lent">I Lent</option>
                <option value="borrowed">I Borrowed</option>
              </select>
            </div>
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
          </div>

          <div className="row">
            <div className="input-group">
              <label>Interest %</label>
              <input
                type="number"
                name="interestRate"
                value={form.interestRate}
                onChange={handleChange}
              />
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
                type="date"
                name="startDate"
                value={form.startDate}
                onChange={handleChange}
              />
            </div>
            <div className="input-group">
              <label>End Date</label>
              <input
                type="date"
                name="endDate"
                value={form.endDate}
                onChange={handleChange}
                required
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
