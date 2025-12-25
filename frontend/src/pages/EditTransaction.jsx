import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion"; // Consistency with other pages
import { updateTransaction } from "../api/transaction.api";
import "./AddTransaction.css";

const EditTransaction = () => {
  const { state } = useLocation();
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    amount: state.amount,
    type: state.type,
    category: state.category,
    paymentMode: state.paymentMode,
    date: state.date.split("T")[0],
    note: state.note || "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateTransaction(id, form);
      navigate("/transactions");
    } catch (err) {
      alert("Failed to update transaction");
    }
  };

  return (
    <motion.div
      className="form-container"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="form-card">
        <header className="form-header">
          <h2>Edit Transaction</h2>
          <p>Update the details of your entry</p>
        </header>

        <form onSubmit={handleSubmit} className="modern-form">
          <div className="input-group">
            <label>Amount (INR)</label>
            <div className="main-input-wrap">
              <input
                type="number"
                name="amount"
                placeholder="0"
                value={form.amount} // for Edit page
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
              <label>Payment Mode</label>
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

          <div className="input-group">
            <label>Category</label>
            <input
              name="category"
              value={form.category}
              onChange={handleChange}
              required
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
              value={form.note}
              onChange={handleChange}
              placeholder="Add a note..."
            />
          </div>

          <motion.button
            type="submit"
            className="submit-btn update"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Update Transaction
          </motion.button>

          <button
            type="button"
            className="cancel-btn"
            onClick={() => navigate(-1)}
          >
            Discard Changes
          </button>
        </form>
      </div>
    </motion.div>
  );
};

export default EditTransaction;
