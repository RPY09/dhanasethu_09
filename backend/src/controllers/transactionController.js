const Transaction = require("../models/TransactionModel");
const Loan = require("../models/LoanModel");

exports.addTransaction = async (req, res) => {
  try {
    console.log("USER:", req.user);

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

    Object.assign(transaction, req.body);

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
