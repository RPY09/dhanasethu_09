const Transaction = require("../models/TransactionModel");
const Loan = require("../models/LoanModel");
const User = require("../models/UserModel");
const normalizeName = (value) =>
  String(value || "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

exports.addTransaction = async (req, res) => {
  try {
    // create
    const created = await Transaction.create({
      ...req.body,
      user: req.user._id,
    });

    // Re-query so post("init") runs and fields (amount, category, note) are decrypted
    const fresh = await Transaction.findById(created._id);
    res.status(201).json(fresh);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const hasQuery =
      req.query &&
      Object.keys(req.query).some((key) =>
        ["page", "limit", "month", "year", "sort", "type", "search"].includes(
          key
        )
      );

    if (!hasQuery) {
      const transactions = await Transaction.find({ user: req.user._id }).sort({
        date: -1,
      });
      return res.json(transactions);
    }

    const toInt = (val, fallback) => {
      const parsed = Number.parseInt(val, 10);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
    };
    const parseAmount = (value) => {
      const n = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
      return Number.isFinite(n) ? n : 0;
    };

    const page = toInt(req.query.page, 1);
    const limit = toInt(req.query.limit, 20);
    const month = toInt(req.query.month, 0);
    const year = toInt(req.query.year, 0);
    const sort = String(req.query.sort || "newest");
    const selectedType = String(req.query.type || "all");
    const search = String(req.query.search || "").trim().toLowerCase();

    const query = { user: req.user._id };

    if (year && month >= 1 && month <= 12) {
      const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
      const end = new Date(year, month, 1, 0, 0, 0, 0);
      query.date = { $gte: start, $lt: end };
    }

    if (selectedType && selectedType !== "all") {
      if (selectedType === "loan") query.paymentMode = "loan";
      else if (selectedType === "borrowed") query.paymentMode = "borrow";
      else query.type = selectedType;
    }

    const transactions = await Transaction.find(query).sort({ date: -1 });

    const searched = search
      ? transactions.filter((t) => {
          const category = String(t.category || "").toLowerCase();
          const note = String(
            t.note || t.notes || t.description || ""
          ).toLowerCase();
          return category.includes(search) || note.includes(search);
        })
      : transactions;

    const sorted = searched.slice().sort((a, b) => {
      if (sort === "oldest") return new Date(a.date) - new Date(b.date);
      if (sort === "amount-desc")
        return parseAmount(b.amount) - parseAmount(a.amount);
      if (sort === "amount-asc")
        return parseAmount(a.amount) - parseAmount(b.amount);
      return new Date(b.date) - new Date(a.date);
    });

    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const startIndex = (page - 1) * limit;
    const pageItems = sorted.slice(startIndex, startIndex + limit);

    return res.json({
      data: pageItems,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: startIndex + pageItems.length < total,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch transactions" });
  }
};

exports.updateTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    Object.assign(transaction, req.body);
    await transaction.save();

    // Re-query to run post("init") decryption
    const fresh = await Transaction.findById(transaction._id);
    res.json(fresh);
  } catch (err) {
    res.status(500).json({ message: "Failed to update transaction" });
  }
};

exports.deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!transaction)
      return res.status(404).json({ message: "Transaction not found" });

    if (transaction.loanId) {
      await Loan.findOneAndDelete({
        _id: transaction.loanId,
        user: req.user._id,
      });
    }

    res.json({ message: "Transaction & related loan deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete transaction" });
  }
};

exports.getTransactionTypes = async (req, res) => {
  try {
    const transactions = await Transaction.find(
      { user: req.user._id },
      { type: 1, paymentMode: 1, _id: 0 }
    );

    const types = new Set();

    transactions.forEach((t) => {
      if (t.paymentMode === "loan") types.add("loan");
      else if (t.paymentMode === "borrow") types.add("borrowed");
      else if (t.type) types.add(t.type);
    });

    res.json([...types]);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch transaction types" });
  }
};

exports.getCustomCategories = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("customCategories");
    const categories = user?.customCategories || {
      expense: [],
      income: [],
      invest: [],
    };
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch custom categories" });
  }
};

exports.addCustomCategory = async (req, res) => {
  try {
    const rawType = String(req.body?.type || "").toLowerCase();
    const rawName = String(req.body?.name || "").trim();
    const type = ["expense", "income", "invest"].includes(rawType)
      ? rawType
      : null;

    if (!type || !rawName) {
      return res
        .status(400)
        .json({ message: "Both type and name are required" });
    }

    const user = await User.findById(req.user._id).select("customCategories");
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.customCategories) {
      user.customCategories = { expense: [], income: [], invest: [] };
    }

    const existing = user.customCategories[type] || [];
    const duplicate = existing.some(
      (c) => String(c).toLowerCase() === rawName.toLowerCase()
    );
    if (!duplicate) {
      user.customCategories[type].push(rawName);
    }

    await user.save();
    res.status(201).json({
      type,
      name: rawName,
      categories: user.customCategories,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to add custom category" });
  }
};

exports.deleteCustomCategory = async (req, res) => {
  try {
    const rawType = String(req.body?.type || "").toLowerCase();
    const rawName = String(req.body?.name || "").trim();
    const type = ["expense", "income", "invest"].includes(rawType)
      ? rawType
      : null;

    if (!type || !rawName) {
      return res
        .status(400)
        .json({ message: "Both type and name are required" });
    }

    const user = await User.findById(req.user._id).select("customCategories");
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.customCategories) {
      user.customCategories = { expense: [], income: [], invest: [] };
    }

    const existing = user.customCategories[type] || [];
    user.customCategories[type] = existing.filter(
      (c) => String(c).toLowerCase() !== rawName.toLowerCase()
    );

    await user.save();
    res.json({
      type,
      name: rawName,
      categories: user.customCategories,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete custom category" });
  }
};

exports.getUserPreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      "customTypes customPaymentModes"
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      types: Array.isArray(user.customTypes) ? user.customTypes : [],
      paymentModes: Array.isArray(user.customPaymentModes)
        ? user.customPaymentModes
        : [],
    });
  } catch {
    res.status(500).json({ message: "Failed to fetch preferences" });
  }
};

exports.addCustomType = async (req, res) => {
  try {
    const name = normalizeName(req.body?.name);
    if (!name) {
      return res.status(400).json({ message: "Type name is required" });
    }

    const user = await User.findById(req.user._id).select("customTypes");
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!Array.isArray(user.customTypes)) user.customTypes = [];
    const exists = user.customTypes.some(
      (item) => normalizeName(item) === normalizeName(name)
    );
    if (!exists) user.customTypes.push(name);

    await user.save();
    res.status(201).json({ name, types: user.customTypes });
  } catch {
    res.status(500).json({ message: "Failed to add type" });
  }
};

exports.deleteCustomType = async (req, res) => {
  try {
    const name = normalizeName(req.body?.name);
    if (!name) {
      return res.status(400).json({ message: "Type name is required" });
    }

    const user = await User.findById(req.user._id).select("customTypes");
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!Array.isArray(user.customTypes)) user.customTypes = [];
    user.customTypes = user.customTypes.filter(
      (item) => normalizeName(item) !== name
    );

    await user.save();
    res.json({ name, types: user.customTypes });
  } catch {
    res.status(500).json({ message: "Failed to delete type" });
  }
};

exports.addCustomPaymentMode = async (req, res) => {
  try {
    const name = normalizeName(req.body?.name);
    if (!name) {
      return res.status(400).json({ message: "Payment mode is required" });
    }

    const user = await User.findById(req.user._id).select("customPaymentModes");
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!Array.isArray(user.customPaymentModes)) user.customPaymentModes = [];
    const exists = user.customPaymentModes.some(
      (item) => normalizeName(item) === normalizeName(name)
    );
    if (!exists) user.customPaymentModes.push(name);

    await user.save();
    res.status(201).json({ name, paymentModes: user.customPaymentModes });
  } catch {
    res.status(500).json({ message: "Failed to add payment mode" });
  }
};

exports.deleteCustomPaymentMode = async (req, res) => {
  try {
    const name = normalizeName(req.body?.name);
    if (!name) {
      return res.status(400).json({ message: "Payment mode is required" });
    }

    const user = await User.findById(req.user._id).select("customPaymentModes");
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!Array.isArray(user.customPaymentModes)) user.customPaymentModes = [];
    user.customPaymentModes = user.customPaymentModes.filter(
      (item) => normalizeName(item) !== name
    );

    await user.save();
    res.json({ name, paymentModes: user.customPaymentModes });
  } catch {
    res.status(500).json({ message: "Failed to delete payment mode" });
  }
};
