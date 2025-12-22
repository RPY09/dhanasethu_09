import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion"; // Consistent with Dashboard animations
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
    try {
      await addTransaction(form);
      navigate("/transactions");
    } catch (err) {
      alert("Failed to add transaction");
    }
  };

  return (
    <motion.div
      className="form-container"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="form-card">
        <header className="form-header">
          <h2>New Transaction</h2>
          <p>Record your income or expenses</p>
        </header>

        <form onSubmit={handleSubmit} className="modern-form">
          <div className="input-group">
            <label>Amount</label>
            <input
              type="number"
              name="amount"
              placeholder="0.00"
              required
              onChange={handleChange}
              className="main-input"
            />
          </div>

          <div className="row">
            <div className="input-group">
              <label>Type</label>
              <select name="type" onChange={handleChange}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
                <option value="invest">Invest</option>
              </select>
            </div>

            <div className="input-group">
              <label>Payment Mode</label>
              <select name="paymentMode" onChange={handleChange}>
                <option value="cash">Cash</option>
                <option value="online">Online</option>
              </select>
            </div>
          </div>

          <div className="input-group">
            <label>Category</label>
            <input
              name="category"
              placeholder="e.g. Food, Rent, Salary"
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

          <div className="input-group">
            <label>Notes</label>
            <textarea
              name="note"
              placeholder="Add a brief description..."
              onChange={handleChange}
            />
          </div>

          <motion.button
            type="submit"
            className="submit-btn"
            whileHover={{ scale: 1.02 }}
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
        </form>
      </div>
    </motion.div>
  );
};

export default AddTransaction;
