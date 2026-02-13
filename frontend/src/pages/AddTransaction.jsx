import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { addTransaction } from "../api/transaction.api";
import { useAlert } from "../components/Alert/AlertContext";
import { useCurrency } from "../context/CurrencyContext";
import { categoriesByType, categoryAliasesByType } from "../utils/categories";

import "./AddTransaction.css";

const AddTransaction = () => {
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const { baseSymbol, baseCurrency, baseCountry } = useCurrency();

  const [loading, setLoading] = useState(false);
  const [showCategoryOverlay, setShowCategoryOverlay] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [customCategories, setCustomCategories] = useState({
    expense: [],
    income: [],
    invest: [],
  });
  const [customAliases, setCustomAliases] = useState({
    expense: {},
    income: {},
    invest: {},
  });
  const today = new Date().toISOString().split("T")[0];
  const CATEGORY_ALIAS_KEY = "category_aliases_v1";
  const [form, setForm] = useState({
    amount: "",
    type: "expense",
    category: "",
    paymentMode: "cash",
    date: today,
    note: "",
  });
  const activeCategories = useMemo(() => {
    const base = categoriesByType[form.type] || categoriesByType.expense;
    const custom = customCategories[form.type] || [];
    return [...base, ...custom];
  }, [form.type, customCategories]);
  const mergedAliases = useMemo(() => {
    const base = categoryAliasesByType[form.type] || {};
    const custom = customAliases[form.type] || {};
    const merged = { ...base };

    Object.keys(custom).forEach((category) => {
      const baseWords = merged[category] || [];
      const customWords = custom[category] || [];
      merged[category] = Array.from(new Set([...baseWords, ...customWords]));
    });

    return merged;
  }, [form.type, customAliases]);
  const filteredCategories = useMemo(() => {
    const search = categorySearch.trim().toLowerCase();
    if (!search) return activeCategories;

    const aliases = mergedAliases;
    return activeCategories.filter((cat) => {
      const nameMatch = cat.toLowerCase().includes(search);
      if (nameMatch) return true;

      const words = aliases[cat] || [];
      return words.some((w) => w.toLowerCase().includes(search));
    });
  }, [activeCategories, categorySearch, mergedAliases]);
  const normalizedCategorySearch = categorySearch.trim();
  const canAddCategory =
    normalizedCategorySearch.length > 0 &&
    !activeCategories.some(
      (cat) => cat.toLowerCase() === normalizedCategorySearch.toLowerCase(),
    );
  const canMapKeyword =
    normalizedCategorySearch.length > 0 &&
    !activeCategories.some((cat) =>
      cat.toLowerCase().includes(normalizedCategorySearch.toLowerCase()),
    );
  const QUEUE_KEY = "unsynced_transactions";

  const getQueue = () => JSON.parse(localStorage.getItem(QUEUE_KEY)) || [];

  const saveQueue = (q) => localStorage.setItem(QUEUE_KEY, JSON.stringify(q));

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "type") {
      setForm((prev) => ({ ...prev, type: value, category: "" }));
      return;
    }
    setForm({ ...form, [name]: value });
  };

  useEffect(() => {
    if (showCategoryOverlay) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [showCategoryOverlay]);

  useEffect(() => {
    try {
      const stored = JSON.parse(
        localStorage.getItem(CATEGORY_ALIAS_KEY) || "{}",
      );
      setCustomAliases({
        expense: stored.expense || {},
        income: stored.income || {},
        invest: stored.invest || {},
      });
    } catch {
      setCustomAliases({ expense: {}, income: {}, invest: {} });
    }
  }, []);

  const handleCategorySelect = (category) => {
    setForm((prev) => ({ ...prev, category }));
    setShowCategoryOverlay(false);
    setCategorySearch("");
  };

  const handleAddCategory = () => {
    if (!canAddCategory) return;
    const newCategory = normalizedCategorySearch;
    setCustomCategories((prev) => ({
      ...prev,
      [form.type]: [...(prev[form.type] || []), newCategory],
    }));
    handleCategorySelect(newCategory);
  };

  const handleMapKeywordToCategory = (category) => {
    const keyword = normalizedCategorySearch.trim().toLowerCase();
    if (!keyword || !category) return;

    setCustomAliases((prev) => {
      const next = {
        ...prev,
        [form.type]: {
          ...(prev[form.type] || {}),
          [category]: Array.from(
            new Set([...(prev[form.type]?.[category] || []), keyword]),
          ),
        },
      };
      localStorage.setItem(CATEGORY_ALIAS_KEY, JSON.stringify(next));
      return next;
    });

    handleCategorySelect(category);
    showAlert(`Mapped "${keyword}" to ${category}`, "success");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.category.trim()) {
      showAlert("Please select a category", "error");
      return;
    }
    setLoading(true);

    const payload = {
      ...form,
      category: form.category.trim().toLowerCase(),
    };

    const localTx = {
      id: crypto.randomUUID(),
      payload,
      createdAt: Date.now(),
    };

    const queue = getQueue();
    queue.push(localTx);
    saveQueue(queue);

    navigate("/transactions");

    try {
      await addTransaction(payload);
      window.dispatchEvent(new Event("transactions:changed"));

      const updatedQueue = getQueue().filter((t) => t.id !== localTx.id);
      saveQueue(updatedQueue);
    } catch (err) {
    } finally {
      setLoading(false);
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
            <label>Amount ({baseCurrency})</label>
            <div className="main-input-wrap">
              <input
                type="number"
                name="amount"
                placeholder={`${baseSymbol}0.00`}
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
              <button
                type="button"
                className="category-trigger"
                onClick={() => setShowCategoryOverlay(true)}
              >
                <span>{form.category || "Category"}</span>
                {/* <i className="bi bi-chevron-down"></i> */}
              </button>
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
              disabled={loading} // Disable while loading
              whileTap={{ scale: 0.98 }}
            >
              {loading ? <span className="spinner"></span> : "Save Transaction"}
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
      {showCategoryOverlay && (
        <div
          className="category-overlay"
          onClick={() => {
            setShowCategoryOverlay(false);
            setCategorySearch("");
          }}
        >
          <div className="category-modal" onClick={(e) => e.stopPropagation()}>
            <div className="category-modal-head">
              {/* <h3>Select Category</h3> */}
              <button
                type="button"
                className="category-close"
                onClick={() => {
                  setShowCategoryOverlay(false);
                  setCategorySearch("");
                }}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <input
              type="text"
              placeholder="Search category..."
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              className="category-search"
            />
            <div className="category-list">
              {filteredCategories.length ? (
                filteredCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`category-item ${
                      form.category.toLowerCase() === cat.toLowerCase()
                        ? "active"
                        : ""
                    }`}
                    onClick={() => handleCategorySelect(cat)}
                  >
                    {cat}
                  </button>
                ))
              ) : (
                <p className="category-empty">No categories found</p>
              )}
              {canAddCategory && (
                <button
                  type="button"
                  className="category-item add-new"
                  onClick={handleAddCategory}
                  title={`Add ${normalizedCategorySearch} to Category`}
                >
                  + "{normalizedCategorySearch}"
                </button>
              )}
              {canMapKeyword && (
                <div className="category-map-wrap">
                  <p className="category-map-title">
                    Map "{normalizedCategorySearch}" to:
                  </p>
                  <div className="category-map-grid">
                    {activeCategories.map((cat) => (
                      <button
                        key={`map-${cat}`}
                        type="button"
                        className="category-map-item"
                        onClick={() => handleMapKeywordToCategory(cat)}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default AddTransaction;
