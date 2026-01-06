const Loan = require("../models/LoanModel");
const Transaction = require("../models/TransactionModel");
const { decrypt } = require("../utils/crypto.utils");

const checkAndCloseLoan = async (loan) => {
  const remainingInterest =
    Number(loan.interestAmount || 0) - Number(loan.interestPaid || 0);

  if (loan.principal <= 0 && remainingInterest <= 0) {
    loan.principal = 0;
    loan.settled = true;
    await loan.save();
    return true;
  }

  return false;
};

exports.addLoan = async (req, res) => {
  try {
    const amount = Number(req.body.amount);

    const loanPayload = {
      ...req.body,
      user: req.user._id,
      principal: amount,
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
        paymentMode: "borrow",
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
    const { paidAmount, paymentType } = req.body;

    const loan = await Loan.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!loan) {
      return res.status(404).json({ message: "Loan not found" });
    }

    if (loan.settled) {
      return res.status(400).json({ message: "Loan already settled" });
    }

    const paid = Number(paidAmount);
    if (!Number.isFinite(paid) || paid <= 0) {
      return res.status(400).json({ message: "Invalid paid amount" });
    }

    // SAFETY NORMALIZATION (fix old data)
    loan.principal = Number(loan.principal || 0);
    loan.interestAmount = Number(loan.interestAmount || 0);
    loan.interestPaid = Number(loan.interestPaid || 0);

    const remainingInterest = Math.max(
      loan.interestAmount - loan.interestPaid,
      0
    );
    const remainingPrincipal = Math.max(loan.principal, 0);

    /* ================= INTEREST ================= */
    if (paymentType === "interest") {
      if (remainingInterest <= 0) {
        return res.status(400).json({ message: "No interest remaining" });
      }

      const interestToPay = Math.min(paid, remainingInterest);

      await Transaction.create({
        user: req.user._id,
        loanId: loan._id,
        type: loan.role === "lent" ? "income" : "expense",
        amount: interestToPay,
        category: loan.role === "lent" ? "loan interest" : "borrowed interest",
        paymentMode: loan.role === "lent" ? "loan" : "borrow",
        isPrincipal: false,
      });

      loan.interestPaid += interestToPay;

      if (loan.principal === 0 && loan.interestPaid >= loan.interestAmount) {
        loan.settled = true;
      }

      await loan.save();
      return res.json({ message: "Interest payment recorded" });
    }

    /* ================= PRINCIPAL ================= */
    if (paymentType === "principal") {
      if (paid > remainingPrincipal) {
        return res
          .status(400)
          .json({ message: "Paid amount exceeds principal" });
      }

      await Transaction.create({
        user: req.user._id,
        loanId: loan._id,
        type: "transfer",
        amount: paid,
        category:
          loan.role === "lent" ? "loan principal" : "borrowed principal",
        paymentMode: loan.role === "lent" ? "loan" : "borrow",
        isPrincipal: true,
      });

      loan.principal -= paid;

      if (loan.principal === 0 && remainingInterest === 0) {
        loan.settled = true;
      }

      await loan.save();
      return res.json({ message: "Principal payment recorded" });
    }

    /* ================= FULL ================= */
    if (paymentType === "full") {
      const totalRemaining = remainingPrincipal + remainingInterest;

      if (paid < totalRemaining) {
        return res.status(400).json({
          message: "Paid amount is less than total outstanding",
        });
      }

      if (remainingPrincipal > 0) {
        await Transaction.create({
          user: req.user._id,
          loanId: loan._id,
          type: "transfer",
          amount: remainingPrincipal,
          category:
            loan.role === "lent" ? "loan principal" : "borrowed principal",
          paymentMode: loan.role === "lent" ? "loan" : "borrow",
          isPrincipal: true,
        });
      }

      if (remainingInterest > 0) {
        await Transaction.create({
          user: req.user._id,
          loanId: loan._id,
          type: loan.role === "lent" ? "income" : "expense",
          amount: remainingInterest,
          category:
            loan.role === "lent" ? "loan interest" : "borrowed interest",
          paymentMode: loan.role === "lent" ? "loan" : "borrow",
          isPrincipal: false,
        });
      }

      loan.principal = 0;
      loan.interestPaid = loan.interestAmount;
      loan.settled = true;

      await loan.save();
      return res.json({ message: "Loan fully settled" });
    }

    return res.status(400).json({ message: "Invalid payment type" });
  } catch (err) {
    console.error("SETTLE LOAN ERROR:", err);
    return res.status(500).json({
      message: err.message || "Internal Server Error",
    });
  }
};

// UPDATE LOAN
exports.updateLoan = async (req, res) => {
  try {
    const loan = await Loan.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!loan) {
      return res.status(404).json({ message: "Loan not found" });
    }

    const oldAmount = Number(loan.principal);

    // Update loan
    Object.assign(loan, req.body);
    loan.principal = Number(req.body.amount);
    await loan.save();

    await Transaction.findOneAndUpdate(
      {
        loanId: loan._id,
        user: req.user._id,
        isPrincipal: true,
        note: { $regex: /loan|borrowed/i },
      },
      {
        amount: loan.principal,
        note:
          loan.role === "lent"
            ? `Loan given to ${loan.person}`
            : `Loan borrowed from ${loan.person}`,
      }
    );

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

    //  DELETE RELATED TRANSACTIONS
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
