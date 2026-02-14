import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  addTransaction,
  addCustomCategory,
  deleteCustomCategory,
  getCustomCategories,
  getTransactions,
} from "../api/transaction.api";
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
  const [categoryUsage, setCategoryUsage] = useState({
    expense: {},
    income: {},
    invest: {},
  });
  const normalizeCategories = (source) => ({
    expense: Array.isArray(source?.expense) ? source.expense : [],
    income: Array.isArray(source?.income) ? source.income : [],
    invest: Array.isArray(source?.invest) ? source.invest : [],
  });
  const today = new Date().toISOString().split("T")[0];
  const CATEGORY_CUSTOM_KEY = "category_custom_v1";
  const CATEGORY_ALIAS_KEY = "category_aliases_v1";
  const [form, setForm] = useState({
    amount: "",
    type: "expense",
    category: "",
    paymentMode: "online",
    date: today,
    note: "",
  });
  const activeCategories = useMemo(() => {
    const base = categoriesByType[form.type] || categoriesByType.expense;
    const custom = customCategories[form.type] || [];
    return [...base, ...custom];
  }, [form.type, customCategories]);
  const rankedCategories = useMemo(() => {
    const usage = categoryUsage[form.type] || {};
    return [...activeCategories].sort((a, b) => {
      const usageDiff =
        (usage[b.toLowerCase()] || 0) - (usage[a.toLowerCase()] || 0);
      if (usageDiff !== 0) return usageDiff;
      return a.localeCompare(b);
    });
  }, [activeCategories, categoryUsage, form.type]);
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
    if (!search) return rankedCategories;

    const aliases = mergedAliases;
    return rankedCategories.filter((cat) => {
      const nameMatch = cat.toLowerCase().includes(search);
      if (nameMatch) return true;

      const words = aliases[cat] || [];
      return words.some((w) => w.toLowerCase().includes(search));
    });
  }, [rankedCategories, categorySearch, mergedAliases]);
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
  const customCategorySet = useMemo(
    () =>
      new Set(
        (customCategories[form.type] || []).map((cat) => cat.toLowerCase()),
      ),
    [customCategories, form.type],
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
    const buildUsageMap = (items) => {
      const usageMap = { expense: {}, income: {}, invest: {} };
      (items || []).forEach((tx) => {
        const type = String(tx?.type || "").toLowerCase();
        const category = String(tx?.category || "")
          .trim()
          .toLowerCase();
        if (!usageMap[type] || !category) return;
        usageMap[type][category] = (usageMap[type][category] || 0) + 1;
      });
      return usageMap;
    };

    const loadCategories = async () => {
      try {
        const aliasStored = JSON.parse(
          localStorage.getItem(CATEGORY_ALIAS_KEY) || "{}",
        );
        setCustomAliases({
          expense: aliasStored.expense || {},
          income: aliasStored.income || {},
          invest: aliasStored.invest || {},
        });
      } catch {
        setCustomAliases({ expense: {}, income: {}, invest: {} });
      }

      try {
        const remote = await getCustomCategories();
        const normalized = normalizeCategories(remote);
        setCustomCategories(normalized);
        localStorage.setItem(CATEGORY_CUSTOM_KEY, JSON.stringify(normalized));
      } catch {
        try {
          const customStored = JSON.parse(
            localStorage.getItem(CATEGORY_CUSTOM_KEY) || "{}",
          );
          setCustomCategories(normalizeCategories(customStored));
        } catch {
          setCustomCategories({ expense: [], income: [], invest: [] });
        }
      }

      try {
        const transactions = await getTransactions();
        setCategoryUsage(buildUsageMap(transactions));
      } catch {
        setCategoryUsage({ expense: {}, income: {}, invest: {} });
      }
    };

    loadCategories();

    const onTransactionsChanged = async () => {
      try {
        const transactions = await getTransactions();
        setCategoryUsage(buildUsageMap(transactions));
      } catch {}
    };

    window.addEventListener("transactions:changed", onTransactionsChanged);
    return () => {
      window.removeEventListener("transactions:changed", onTransactionsChanged);
    };
  }, []);

  const handleCategorySelect = (category) => {
    setForm((prev) => ({ ...prev, category }));
    setShowCategoryOverlay(false);
    setCategorySearch("");
  };

  const handleAddCategory = async () => {
    if (!canAddCategory) return;
    const newCategory = normalizedCategorySearch;

    try {
      const res = await addCustomCategory({
        type: form.type,
        name: newCategory,
      });
      const next = normalizeCategories(res?.categories);
      setCustomCategories(next);
      localStorage.setItem(CATEGORY_CUSTOM_KEY, JSON.stringify(next));
    } catch {
      setCustomCategories((prev) => {
        const next = {
          ...prev,
          [form.type]: [...(prev[form.type] || []), newCategory],
        };
        localStorage.setItem(CATEGORY_CUSTOM_KEY, JSON.stringify(next));
        return next;
      });
    }

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

  const handleRemoveCategory = (category) => {
    showAlert(
      `Delete "${category}" from custom categories?`,
      "warning",
      true,
      async () => {
        try {
          const res = await deleteCustomCategory({
            type: form.type,
            name: category,
          });
          const next = normalizeCategories(res?.categories);
          setCustomCategories(next);
          localStorage.setItem(CATEGORY_CUSTOM_KEY, JSON.stringify(next));
        } catch {
          setCustomCategories((prev) => {
            const next = {
              ...prev,
              [form.type]: (prev[form.type] || []).filter(
                (cat) => cat.toLowerCase() !== category.toLowerCase(),
              ),
            };
            localStorage.setItem(CATEGORY_CUSTOM_KEY, JSON.stringify(next));
            return next;
          });
        }

        setCustomAliases((prev) => {
          const nextTypeAliases = { ...(prev[form.type] || {}) };
          delete nextTypeAliases[category];
          const next = {
            ...prev,
            [form.type]: nextTypeAliases,
          };
          localStorage.setItem(CATEGORY_ALIAS_KEY, JSON.stringify(next));
          return next;
        });

        setForm((prev) =>
          prev.category.toLowerCase() === category.toLowerCase()
            ? { ...prev, category: "" }
            : prev,
        );
        showAlert(`Deleted "${category}"`, "success");
      },
    );
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
                  <div className="category-item-row" key={cat}>
                    <button
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
                    {customCategorySet.has(cat.toLowerCase()) && (
                      <button
                        type="button"
                        className="category-item-remove"
                        aria-label={`Delete ${cat}`}
                        title={`Delete ${cat}`}
                        onClick={() => handleRemoveCategory(cat)}
                      >
                        <i className="bi bi-x-lg"></i>
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <p className="category-empty">
                  No categories found you can "add(+)"
                </p>
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
                    {rankedCategories.map((cat) => (
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
