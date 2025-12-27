import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { getLoans, updateLoan } from "../api/loan.api";
import "./Loans.css";

const EditLoan = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load loan data
  useEffect(() => {
    const fetchLoan = async () => {
      try {
        const loans = await getLoans();
        const loan = loans.find((l) => l._id === id);

        if (!loan) {
          alert("Loan not found");
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
        alert("Failed to load loan");
      } finally {
        setLoading(false);
      }
    };

    fetchLoan();
  }, [id, navigate]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };
  const calculateMonths = (start, end) => {
    if (!start || !end) return 0;

    const s = new Date(start);
    const e = new Date(end);

    let months =
      (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());

    // count partial month as full
    if (e.getDate() > s.getDate()) {
      months += 1;
    }

    return Math.max(months, 1);
  };

  const interestAmount = useMemo(() => {
    const p = Number(form?.amount);
    const r = Number(form?.interestRate);

    if (!p || !r || !form?.startDate || !form?.endDate) return 0;

    const months = calculateMonths(form.startDate, form.endDate);

    // SIMPLE monthly interest
    if (form.interestType === "simple") {
      return Math.round((p * r * months) / 100);
    }

    // MONTHLY compound interest
    if (form.interestType === "monthly") {
      const total = p * Math.pow(1 + r / 100, months);
      return Math.round(total - p);
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
      // window.dispatchEvent(new Event("transactions:changed"));
      alert("Loan updated successfully");
      navigate("/notifications");
    } catch (err) {
      console.error(err);
      alert("Failed to update loan");
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
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>

          {/* Dates side by side */}
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

          <motion.button
            type="submit"
            className="loan-submit"
            whileTap={{ scale: 0.97 }}
          >
            Update Loan
          </motion.button>
        </form>
      </div>
    </motion.div>
  );
};

export default EditLoan;
