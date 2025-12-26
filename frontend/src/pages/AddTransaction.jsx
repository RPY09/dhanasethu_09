import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { addTransaction } from "../api/transaction.api";
import "./AddTransaction.css";

const AddTransaction = () => {
  const navigate = useNavigate();
  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    amount: "",
    type: "expense",
    category: "",
    paymentMode: "cash",
    date: today,
    note: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      ...form,
      category: form.category.trim().toLowerCase(), // ✅ SAFE
    };

    try {
      await addTransaction(payload);
      window.dispatchEvent(new Event("transactions:changed"));
      navigate("/transactions");
    } catch (err) {
      alert("Failed to add transaction");
    }
  };

  return (
    <motion.div
      className="form-container"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="form-card">
        <header className="form-header">
          <h2>New Entry</h2>
          <p>Record your financial activity</p>
        </header>

        <form onSubmit={handleSubmit} className="modern-form">
          <div className="input-group">
            <label>Amount (INR)</label>
            <div className="main-input-wrap">
              <input
                type="number"
                name="amount"
                placeholder="₹0.00"
                value={form.amount}
                required
                onChange={handleChange}
                className="main-input"
              />
            </div>
          </div>

          <div className="row">
            <div className="input-group">
              <label>Type</label>
              <select name="type" value={form.type} onChange={handleChange}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
                <option value="invest">Invest</option>
              </select>
            </div>
            <div className="input-group">
              <label>Mode</label>
              <select
                name="paymentMode"
                value={form.paymentMode}
                onChange={handleChange}
              >
                <option value="cash">Cash</option>
                <option value="online">Online</option>
              </select>
            </div>
          </div>

          <div className="row">
            <div className="input-group">
              <label>Category</label>
              <input
                name="category"
                placeholder="Food, Rent..."
                required
                onChange={handleChange}
              />
            </div>
            <div className="input-group">
              <label>Date</label>
              <input
                type="date"
                name="date"
                value={form.date}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="input-group">
            <label>Notes</label>
            <textarea
              name="note"
              placeholder="Brief description..."
              onChange={handleChange}
            />
          </div>

          <div className="actionbtns">
            <motion.button
              type="submit"
              className="submit-btn"
              whileTap={{ scale: 0.98 }}
            >
              Save Transaction
            </motion.button>

            <button
              type="button"
              className="cancel-btn"
              onClick={() => navigate(-1)}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};

export default AddTransaction;
