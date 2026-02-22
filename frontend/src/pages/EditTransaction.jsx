import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  updateTransaction,
  addCustomCategory,
  addCustomPaymentMode,
  addCustomType,
  deleteCustomPaymentMode,
  deleteCustomCategory,
  deleteCustomType,
  getCustomCategories,
  getUserPreferences,
} from "../api/transaction.api";
import { useAlert } from "../components/Alert/AlertContext";
import { useCurrency } from "../context/CurrencyContext";
import { categoriesByType, categoryAliasesByType } from "../utils/categories";

import "./AddTransaction.css";

const DEFAULT_TYPES = ["expense", "income", "invest"];
const DEFAULT_PAYMENT_MODES = ["cash", "upi"];
const CATEGORY_CUSTOM_KEY = "category_custom_v1";
const CATEGORY_ALIAS_KEY = "category_aliases_v1";
const TYPE_CUSTOM_KEY = "type_custom_v1";
const PAYMENT_CUSTOM_KEY = "payment_custom_v1";

const normalizeValue = (value = "") =>
  String(value)
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
const canonicalPaymentMode = (value = "") => {
  const normalized = normalizeValue(value);
  if (normalized === "online" || normalized === "upi") return "upi";
  return normalized;
};
const toTitleCase = (value = "") =>
  String(value)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());

const EditTransaction = () => {
  const { state } = useLocation();
  const { showAlert } = useAlert();
  const { baseSymbol, baseCurrency, baseCountry } = useCurrency();

  const { id } = useParams();
  const [submitting, setSubmitting] = useState(false);
  const [showCategoryOverlay, setShowCategoryOverlay] = useState(false);
  const [showTypeOverlay, setShowTypeOverlay] = useState(false);
  const [showPaymentOverlay, setShowPaymentOverlay] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [typeSearch, setTypeSearch] = useState("");
  const [paymentSearch, setPaymentSearch] = useState("");
  const [customTypes, setCustomTypes] = useState([]);
  const [customPaymentModes, setCustomPaymentModes] = useState([]);
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
  const normalizeCategories = (source) => {
    const next = {};
    if (!source || typeof source !== "object") return next;
    Object.entries(source).forEach(([key, value]) => {
      const normalizedKey = normalizeValue(key);
      if (!normalizedKey) return;
      next[normalizedKey] = Array.isArray(value) ? value : [];
    });
    return next;
  };
  const navigate = useNavigate();

  const [form, setForm] = useState({
    amount: state?.amount ?? "",
    type: normalizeValue(state?.type ?? "expense"),
    category: state?.category ?? "",
    paymentMode: canonicalPaymentMode(state?.paymentMode ?? "cash"),
    date:
      state?.date?.split?.("T")?.[0] || new Date().toISOString().split("T")[0],
    note: state?.note || "",
  });
  const typeOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...DEFAULT_TYPES,
          normalizeValue(form.type),
          ...(customTypes || []).map((item) => normalizeValue(item)),
        ]),
      ).filter(Boolean),
    [customTypes, form.type],
  );
  const paymentOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...DEFAULT_PAYMENT_MODES,
          canonicalPaymentMode(form.paymentMode),
          ...(customPaymentModes || []).map((item) =>
            canonicalPaymentMode(item),
          ),
        ]),
      ).filter(Boolean),
    [customPaymentModes, form.paymentMode],
  );
  const activeCategories = useMemo(() => {
    const base = categoriesByType[form.type] || [];
    const custom = customCategories[form.type] || [];
    return Array.from(new Set([...base, ...custom]));
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

    return activeCategories.filter((cat) => {
      const nameMatch = cat.toLowerCase().includes(search);
      if (nameMatch) return true;

      const words = mergedAliases[cat] || [];
      return words.some((w) => w.toLowerCase().includes(search));
    });
  }, [activeCategories, categorySearch, mergedAliases]);

  const normalizedCategorySearch = categorySearch.trim();
  const normalizedTypeSearch = normalizeValue(typeSearch);
  const normalizedPaymentSearch = canonicalPaymentMode(paymentSearch);
  const filteredTypes = useMemo(() => {
    if (!normalizedTypeSearch) return typeOptions;
    return typeOptions.filter((item) =>
      normalizeValue(item).includes(normalizedTypeSearch),
    );
  }, [typeOptions, normalizedTypeSearch]);
  const filteredPayments = useMemo(() => {
    if (!normalizedPaymentSearch) return paymentOptions;
    return paymentOptions.filter((item) =>
      canonicalPaymentMode(item).includes(normalizedPaymentSearch),
    );
  }, [paymentOptions, normalizedPaymentSearch]);
  const canAddCategory =
    normalizedCategorySearch.length > 0 &&
    !activeCategories.some(
      (cat) => cat.toLowerCase() === normalizedCategorySearch.toLowerCase(),
    );
  const canAddType =
    normalizedTypeSearch.length > 0 &&
    !typeOptions.some((item) => normalizeValue(item) === normalizedTypeSearch);
  const canAddPayment =
    normalizedPaymentSearch.length > 0 &&
    !paymentOptions.some(
      (item) => canonicalPaymentMode(item) === normalizedPaymentSearch,
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
  const customTypeSet = useMemo(
    () => new Set((customTypes || []).map((item) => normalizeValue(item))),
    [customTypes],
  );
  const customPaymentSet = useMemo(
    () =>
      new Set(
        (customPaymentModes || []).map((item) => canonicalPaymentMode(item)),
      ),
    [customPaymentModes],
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  useEffect(() => {
    if (!state) {
      showAlert("Open edit from transactions list", "error");
      navigate("/transactions");
    }
  }, [state, navigate, showAlert]);

  useEffect(() => {
    if (showCategoryOverlay || showTypeOverlay || showPaymentOverlay)
      document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [showCategoryOverlay, showTypeOverlay, showPaymentOverlay]);

  useEffect(() => {
    const loadLocal = () => {
      try {
        const savedTypes = JSON.parse(
          localStorage.getItem(TYPE_CUSTOM_KEY) || "[]",
        );
        setCustomTypes(
          Array.isArray(savedTypes)
            ? savedTypes.map((item) => normalizeValue(item)).filter(Boolean)
            : [],
        );
      } catch {
        setCustomTypes([]);
      }

      try {
        const savedPayments = JSON.parse(
          localStorage.getItem(PAYMENT_CUSTOM_KEY) || "[]",
        );
        setCustomPaymentModes(
          Array.isArray(savedPayments)
            ? savedPayments
                .map((item) => canonicalPaymentMode(item))
                .filter(Boolean)
            : [],
        );
      } catch {
        setCustomPaymentModes([]);
      }
    };

    const loadRemote = async () => {
      try {
        const prefs = await getUserPreferences();
        const types = Array.isArray(prefs?.types)
          ? prefs.types.map((item) => normalizeValue(item)).filter(Boolean)
          : [];
        const paymentModes = Array.isArray(prefs?.paymentModes)
          ? prefs.paymentModes
              .map((item) => canonicalPaymentMode(item))
              .filter(Boolean)
          : [];

        setCustomTypes(types);
        setCustomPaymentModes(paymentModes);
        localStorage.setItem(TYPE_CUSTOM_KEY, JSON.stringify(types));
        localStorage.setItem(PAYMENT_CUSTOM_KEY, JSON.stringify(paymentModes));
      } catch {
        loadLocal();
      }
    };

    loadRemote();
  }, []);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const aliasStored = JSON.parse(
          localStorage.getItem(CATEGORY_ALIAS_KEY) || "{}",
        );
        setCustomAliases(
          aliasStored && typeof aliasStored === "object" ? aliasStored : {},
        );
      } catch {
        setCustomAliases({});
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
          setCustomCategories({});
        }
      }
    };

    loadCategories();
  }, []);

  const handleCategorySelect = (category) => {
    setForm((prev) => ({ ...prev, category }));
    setShowCategoryOverlay(false);
    setCategorySearch("");
  };

  const handleTypeSelect = (type) => {
    const nextType = normalizeValue(type);
    setForm((prev) => ({ ...prev, type: nextType, category: "" }));
    setShowTypeOverlay(false);
    setTypeSearch("");
  };

  const handlePaymentSelect = (paymentMode) => {
    const nextMode = canonicalPaymentMode(paymentMode);
    setForm((prev) => ({ ...prev, paymentMode: nextMode }));
    setShowPaymentOverlay(false);
    setPaymentSearch("");
  };

  const handleAddCategory = async () => {
    if (!canAddCategory) return;
    const newCategory = normalizedCategorySearch;
    const isDefaultType = DEFAULT_TYPES.includes(normalizeValue(form.type));

    if (isDefaultType) {
      try {
        const res = await addCustomCategory({ type: form.type, name: newCategory });
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
    } else {
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

  const handleAddType = async () => {
    if (!canAddType) return;
    const name = normalizeValue(normalizedTypeSearch);

    try {
      const res = await addCustomType({ name });
      const next = Array.isArray(res?.types)
        ? res.types.map((item) => normalizeValue(item)).filter(Boolean)
        : Array.from(new Set([...(customTypes || []), name]));
      setCustomTypes(next);
      localStorage.setItem(TYPE_CUSTOM_KEY, JSON.stringify(next));
    } catch {
      const next = Array.from(new Set([...(customTypes || []), name]));
      setCustomTypes(next);
      localStorage.setItem(TYPE_CUSTOM_KEY, JSON.stringify(next));
    }

    handleTypeSelect(name);
  };

  const handleAddPayment = async () => {
    if (!canAddPayment) return;
    const name = canonicalPaymentMode(normalizedPaymentSearch);

    try {
      const res = await addCustomPaymentMode({ name });
      const next = Array.isArray(res?.paymentModes)
        ? res.paymentModes
            .map((item) => canonicalPaymentMode(item))
            .filter(Boolean)
        : Array.from(new Set([...(customPaymentModes || []), name]));
      setCustomPaymentModes(next);
      localStorage.setItem(PAYMENT_CUSTOM_KEY, JSON.stringify(next));
    } catch {
      const next = Array.from(new Set([...(customPaymentModes || []), name]));
      setCustomPaymentModes(next);
      localStorage.setItem(PAYMENT_CUSTOM_KEY, JSON.stringify(next));
    }

    handlePaymentSelect(name);
  };

  const handleRemoveType = async (type) => {
    const key = normalizeValue(type);
    if (!customTypeSet.has(key)) return;

    try {
      const res = await deleteCustomType({ name: key });
      const next = Array.isArray(res?.types)
        ? res.types.map((item) => normalizeValue(item)).filter(Boolean)
        : (customTypes || []).filter((item) => normalizeValue(item) !== key);
      setCustomTypes(next);
      localStorage.setItem(TYPE_CUSTOM_KEY, JSON.stringify(next));
    } catch {
      const next = (customTypes || []).filter(
        (item) => normalizeValue(item) !== key,
      );
      setCustomTypes(next);
      localStorage.setItem(TYPE_CUSTOM_KEY, JSON.stringify(next));
    }

    setCustomCategories((prev) => {
      const updated = { ...(prev || {}) };
      delete updated[key];
      localStorage.setItem(CATEGORY_CUSTOM_KEY, JSON.stringify(updated));
      return updated;
    });
    setCustomAliases((prev) => {
      const updated = { ...(prev || {}) };
      delete updated[key];
      localStorage.setItem(CATEGORY_ALIAS_KEY, JSON.stringify(updated));
      return updated;
    });
    setForm((prev) =>
      normalizeValue(prev.type) === key
        ? { ...prev, type: DEFAULT_TYPES[0], category: "" }
        : prev,
    );
  };

  const handleRemovePayment = async (paymentMode) => {
    const key = canonicalPaymentMode(paymentMode);
    if (!customPaymentSet.has(key)) return;

    try {
      const res = await deleteCustomPaymentMode({ name: key });
      const next = Array.isArray(res?.paymentModes)
        ? res.paymentModes
            .map((item) => canonicalPaymentMode(item))
            .filter(Boolean)
        : (customPaymentModes || []).filter(
            (item) => canonicalPaymentMode(item) !== key,
          );
      setCustomPaymentModes(next);
      localStorage.setItem(PAYMENT_CUSTOM_KEY, JSON.stringify(next));
    } catch {
      const next = (customPaymentModes || []).filter(
        (item) => canonicalPaymentMode(item) !== key,
      );
      setCustomPaymentModes(next);
      localStorage.setItem(PAYMENT_CUSTOM_KEY, JSON.stringify(next));
    }

    setForm((prev) =>
      canonicalPaymentMode(prev.paymentMode) === key
        ? { ...prev, paymentMode: DEFAULT_PAYMENT_MODES[0] }
        : prev,
    );
  };

  const handleRemoveCategory = (category) => {
    showAlert(
      `Delete "${category}" from custom categories?`,
      "warning",
      true,
      async () => {
        const isDefaultType = DEFAULT_TYPES.includes(normalizeValue(form.type));

        if (isDefaultType) {
          try {
            const res = await deleteCustomCategory({ type: form.type, name: category });
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
        } else {
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
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        type: normalizeValue(form.type),
        paymentMode: canonicalPaymentMode(form.paymentMode),
        category: form.category.trim().toLowerCase(),
      };
      await updateTransaction(id, payload);
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
            <label>Amount ({baseCurrency})</label>
            <div className="main-input-wrap">
              <input
                type="number"
                name="amount"
                placeholder={`${baseSymbol}0`}
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
              <button
                type="button"
                className="category-trigger"
                onClick={() => setShowTypeOverlay(true)}
              >
                <span>{toTitleCase(form.type) || "Type"}</span>
              </button>
            </div>
            <div className="input-group">
              <label>Mode</label>
              <button
                type="button"
                className="category-trigger"
                onClick={() => setShowPaymentOverlay(true)}
              >
                <span>{toTitleCase(form.paymentMode) || "Payment Mode"}</span>
              </button>
            </div>
          </div>

          {/* Row 3: Category & Date (New Row to save space) */}
          <div className="row">
            <div className="input-group">
              <label>Category</label>
              <button
                type="button"
                className="category-trigger"
                onClick={() => setShowCategoryOverlay(true)}
              >
                <span>{form.category || "Category"}</span>
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
      {showTypeOverlay && (
        <div
          className="category-overlay"
          onClick={() => {
            setShowTypeOverlay(false);
            setTypeSearch("");
          }}
        >
          <div className="category-modal" onClick={(e) => e.stopPropagation()}>
            <div className="category-modal-head">
              <h3>Select Type</h3>
              <button
                type="button"
                className="category-close"
                onClick={() => {
                  setShowTypeOverlay(false);
                  setTypeSearch("");
                }}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <input
              type="text"
              placeholder="Search type..."
              value={typeSearch}
              onChange={(e) => setTypeSearch(e.target.value)}
              className="category-search"
            />
            <div className="category-list">
              {filteredTypes.length ? (
                filteredTypes.map((item) => {
                  const normalizedItem = normalizeValue(item);
                  return (
                    <div className="category-item-row" key={normalizedItem}>
                      <button
                        type="button"
                        className={`category-item ${
                          normalizeValue(form.type) === normalizedItem
                            ? "active"
                            : ""
                        }`}
                        onClick={() => handleTypeSelect(normalizedItem)}
                      >
                        {toTitleCase(item)}
                      </button>
                      {customTypeSet.has(normalizedItem) && (
                        <button
                          type="button"
                          className="category-item-remove"
                          aria-label={`Delete ${item}`}
                          title={`Delete ${item}`}
                          onClick={() => handleRemoveType(normalizedItem)}
                        >
                          <i className="bi bi-x-lg"></i>
                        </button>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="category-empty">No types found you can "add(+)"</p>
              )}
              {canAddType && (
                <button
                  type="button"
                  className="category-item add-new"
                  onClick={handleAddType}
                  title={`Add ${normalizedTypeSearch} to Types`}
                >
                  + "{normalizedTypeSearch}"
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {showPaymentOverlay && (
        <div
          className="category-overlay"
          onClick={() => {
            setShowPaymentOverlay(false);
            setPaymentSearch("");
          }}
        >
          <div className="category-modal" onClick={(e) => e.stopPropagation()}>
            <div className="category-modal-head">
              <h3>Select Payment Mode</h3>
              <button
                type="button"
                className="category-close"
                onClick={() => {
                  setShowPaymentOverlay(false);
                  setPaymentSearch("");
                }}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <input
              type="text"
              placeholder="Search payment mode..."
              value={paymentSearch}
              onChange={(e) => setPaymentSearch(e.target.value)}
              className="category-search"
            />
            <div className="category-list">
              {filteredPayments.length ? (
                filteredPayments.map((item) => {
                  const normalizedItem = canonicalPaymentMode(item);
                  return (
                    <div className="category-item-row" key={normalizedItem}>
                      <button
                        type="button"
                        className={`category-item ${
                          canonicalPaymentMode(form.paymentMode) === normalizedItem
                            ? "active"
                            : ""
                        }`}
                        onClick={() => handlePaymentSelect(normalizedItem)}
                      >
                        {toTitleCase(item)}
                      </button>
                      {customPaymentSet.has(normalizedItem) && (
                        <button
                          type="button"
                          className="category-item-remove"
                          aria-label={`Delete ${item}`}
                          title={`Delete ${item}`}
                          onClick={() => handleRemovePayment(normalizedItem)}
                        >
                          <i className="bi bi-x-lg"></i>
                        </button>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="category-empty">
                  No payment modes found you can "add(+)"
                </p>
              )}
              {canAddPayment && (
                <button
                  type="button"
                  className="category-item add-new"
                  onClick={handleAddPayment}
                  title={`Add ${normalizedPaymentSearch} to Payment Modes`}
                >
                  + "{normalizedPaymentSearch}"
                </button>
              )}
            </div>
          </div>
        </div>
      )}
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
              <h3>Select Category</h3>
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
                <p className="category-empty">No categories found</p>
              )}
              {canAddCategory && (
                <button
                  type="button"
                  className="category-item add-new"
                  onClick={handleAddCategory}
                >
                  + "{normalizedCategorySearch}"
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default EditTransaction;
