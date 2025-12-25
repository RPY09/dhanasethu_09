const Transaction = require("../models/TransactionModel");

exports.addTransaction = async (req, res) => {
  try {
    console.log("USER:", req.user); // 👈 ADD THIS

    const transaction = await Transaction.create({
      ...req.body,
      user: req.user._id,
    });

    res.status(201).json(transaction);
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

    // Merge new data into existing document
    Object.assign(transaction, req.body);

    // .save() triggers the encryption middleware
    await transaction.save();

    res.json(transaction);
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

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    res.json({ message: "Transaction deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete transaction" });
  }
};
