const Transaction = require("../models/TransactionModel");
const Loan = require("../models/LoanModel");
const User = require("../models/UserModel");

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
    const transactions = await Transaction.find({ user: req.user._id }).sort({
      date: -1,
    });

    res.json(transactions);
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
