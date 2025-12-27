import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { addLoan } from "../api/loan.api";
import { useNavigate } from "react-router-dom";
import "./Loans.css";

const Loans = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    person: "",
    contact: "", // Now mandatory phone number
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

  const calculateMonths = (start, end) => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    let months =
      (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
    if (e.getDate() > s.getDate()) months += 1;
    return Math.max(months, 1);
  };

  const interestAmount = useMemo(() => {
    const p = Number(form.amount);
    const r = Number(form.interestRate);
    if (!p || !r || !form.startDate || !form.endDate) return 0;
    const months = calculateMonths(form.startDate, form.endDate);
    if (form.interestType === "simple")
      return Math.round((p * r * months) / 100);
    if (form.interestType === "monthly")
      return Math.round(p * Math.pow(1 + r / 100, months) - p);
    return 0;
  }, [
    form.amount,
    form.interestRate,
    form.startDate,
    form.endDate,
    form.interestType,
  ]);

  const totalAmount = Number(form.amount || 0) + Number(interestAmount || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.contact) return alert("Phone number is required");

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
      window.dispatchEvent(new Event("loans:changed"));
      window.dispatchEvent(new Event("transactions:changed"));

      // Redirect logic: pass the tab name to Notifications.jsx via state
      const targetTab = form.role === "borrowed" ? "borrowed" : "lent";
      navigate("/notifications", { state: { activeTab: targetTab } });
    } catch (err) {
      alert("Failed to save loan");
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
              <label>Type</label>
              <select name="role" value={form.role} onChange={handleChange}>
                <option value="lent">I Lent (Receive)</option>
                <option value="borrowed">I Borrowed (Pay)</option>
              </select>
            </div>
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
          </div>

          <div className="row">
            <div className="input-group">
              <label>Interest %</label>
              <input
                type="number"
                name="interestRate"
                placeholder="e.g. 2"
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
            whileTap={{ scale: 0.98 }}
          >
            Save Entry
          </motion.button>
        </form>
      </div>
    </motion.div>
  );
};

export default Loans;
