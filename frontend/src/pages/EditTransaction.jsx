import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";
import { updateTransaction } from "../api/transaction.api";
import { useAlert } from "../components/Alert/AlertContext";

import "./AddTransaction.css";

const EditTransaction = () => {
  const { state } = useLocation();
  const { showAlert } = useAlert();

  const { id } = useParams();
  const [submitting, setSubmitting] = useState(false);
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
    setSubmitting(true);
    try {
      await updateTransaction(id, form);
      showAlert("Update successfull", "success");
      navigate("/transactions");
    } catch (err) {
      showAlert("Failed to update transaction", "error");
      setSubmitting(false); // Only reset if failed, otherwise we navigate away
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
          {/* Row 1: Amount */}
          <div className="input-group">
            <label>Amount (INR)</label>
            <div className="main-input-wrap">
              <input
                type="number"
                name="amount"
                placeholder="0"
                value={form.amount}
                required
                onChange={handleChange}
                className="main-input"
              />
            </div>
          </div>

          {/* Row 2: Type & Payment Mode */}
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

          {/* Row 3: Category & Date (New Row to save space) */}
          <div className="row">
            <div className="input-group">
              <label>Category</label>
              <input
                name="category"
                placeholder="Food..."
                value={form.category}
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

          {/* Row 4: Notes */}
          <div className="input-group">
            <label>Notes</label>
            <textarea
              name="note"
              placeholder="Brief description..."
              value={form.note}
              onChange={handleChange}
            />
          </div>

          {/* Actions */}
          <div className="actionbtns">
            <motion.button
              type="submit"
              className="submit-btn"
              disabled={submitting}
            >
              {submitting ? (
                <span className="spinner"></span>
              ) : state ? (
                "Update Transaction"
              ) : (
                "Save Transaction"
              )}
            </motion.button>

            <button
              type="button"
              className="cancel-btn"
              onClick={() => navigate(-1)}
            >
              {state ? "Discard Changes" : "Cancel"}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};

export default EditTransaction;
