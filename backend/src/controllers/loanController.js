const Loan = require("../models/LoanModel");
const Transaction = require("../models/TransactionModel");
const { decrypt } = require("../utils/crypto.utils");

exports.addLoan = async (req, res) => {
  try {
    const loanPayload = {
      ...req.body,
      user: req.user._id,
    };

    const loan = await Loan.create(loanPayload);

    const principal = Number(req.body.amount);
    const personPlain = req.body.person || "";
    const contactPlain = req.body.contact || "";

    if (loan.role === "lent") {
      await Transaction.create({
        user: req.user._id,
        loanId: loan._id,
        type: "expense",
        amount: principal,
        category: "loan principal",
        paymentMode: "loan",
        isPrincipal: true,
        note: `Loan given to ${personPlain}`,
      });
    }

    if (loan.role === "borrowed") {
      await Transaction.create({
        user: req.user._id,
        loanId: loan._id,
        type: "income",
        amount: principal,
        category: "Borrowed principal",
        paymentMode: "Borrow",
        isPrincipal: true,
        note: `Loan borrowed from ${personPlain}`,
      });
    }

    res.status(201).json(loan);
  } catch (err) {
    console.error("ADD LOAN ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};

/* GET USER LOANS */
exports.getLoans = async (req, res) => {
  try {
    const loans = await Loan.find({ user: req.user._id }).sort({
      dueDate: 1,
    });

    res.json(loans);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch loans" });
  }
};

/* MARK AS SETTLED */
exports.settleLoan = async (req, res) => {
  try {
    const { paidAmount } = req.body;

    const loan = await Loan.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!loan) return res.status(404).json({ message: "Loan not found" });
    if (loan.settled) return res.json({ message: "Already settled" });

    const paid = Number(paidAmount);
    const principal = Number(loan.amount);
    const interest = paid - principal;

    if (interest < 0) {
      return res.status(400).json({
        message: "Paid amount cannot be less than principal",
      });
    }

    if (loan.role === "borrowed") {
      // 🔹 PRINCIPAL OUT (balance ↓)
      await Transaction.create({
        user: req.user._id,
        loanId: loan._id,
        type: "expense",
        amount: principal,
        category: "Borrowed principal",
        paymentMode: "loan",
        isPrincipal: true,
        note: `Borrowed principal repaid to ${loan.person}`,
      });

      // 🔹 INTEREST OUT (expense)
      if (interest > 0) {
        await Transaction.create({
          user: req.user._id,
          loanId: loan._id,
          type: "expense",
          amount: interest,
          category: "Borrowed interest",
          paymentMode: "loan",
          isPrincipal: false,
          note: `Borrowed interest paid to ${loan.person}`,
        });
      }
    }

    if (loan.role === "lent") {
      // 🔹 PRINCIPAL IN (balance ↑)
      await Transaction.create({
        user: req.user._id,
        loanId: loan._id,
        type: "income",
        amount: principal,
        category: "loan principal",
        paymentMode: "loan",
        isPrincipal: true,
        note: `Loan principal received from ${loan.person}`,
      });

      // 🔹 INTEREST IN (income)
      if (interest > 0) {
        await Transaction.create({
          user: req.user._id,
          loanId: loan._id,
          type: "income",
          amount: interest,
          category: "loan interest",
          paymentMode: "loan",
          isPrincipal: false,
          note: `Loan interest received from ${loan.person}`,
        });
      }
    }

    loan.settled = true;
    await loan.save();

    res.json({ message: "Loan settled correctly" });
  } catch (err) {
    console.error("SETTLE LOAN ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};

// UPDATE LOAN
exports.updateLoan = async (req, res) => {
  try {
    const loan = await Loan.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true }
    );

    if (!loan) return res.status(404).json({ message: "Loan not found" });

    res.json(loan);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE LOAN
exports.deleteLoan = async (req, res) => {
  try {
    const loan = await Loan.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!loan) return res.status(404).json({ message: "Loan not found" });

    // ✅ DELETE RELATED TRANSACTIONS
    await Transaction.deleteMany({
      user: req.user._id,
      loanId: loan._id,
    });

    res.json({ message: "Loan & related transactions deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET ACTIVE LOAN SUMMARY (Dashboard)
exports.getLoanSummary = async (req, res) => {
  try {
    const loans = await Loan.find({
      user: req.user._id,
      settled: false,
    });

    let totalLent = 0;
    let totalBorrowed = 0;

    loans.forEach((l) => {
      const amt = Number(l.amount);
      if (l.role === "lent") totalLent += amt;
      if (l.role === "borrowed") totalBorrowed += amt;
    });

    res.json({
      lent: totalLent,
      borrowed: totalBorrowed,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch loan summary" });
  }
};
