const Loan = require("../models/LoanModel");
const Transaction = require("../models/TransactionModel");
const normalizePaymentMethod = (value) =>
  String(value || "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

// Helper: try to close loan when fully repaid
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

/* ========== ADD LOAN ========== */
exports.addLoan = async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    const paymentMethod = normalizePaymentMethod(req.body.paymentMethod);

    if (!paymentMethod) {
      return res.status(400).json({ message: "Invalid payment method" });
    }

    const loanPayload = {
      ...req.body,
      user: req.user._id,
      principal: amount,
      paymentMethod,
    };

    const loan = await Loan.create(loanPayload);
    const personPlain = req.body.person || "Unknown";

    await Transaction.create({
      user: req.user._id,
      loanId: loan._id,
      type: "transfer",
      amount,
      category: loan.role === "lent" ? "Loan given" : "Loan borrowed",
      paymentMode: loan.role === "lent" ? "loan" : "borrow",
      paymentMethod,
      note:
        loan.role === "lent"
          ? `Loan given to ${personPlain}`
          : `Loan borrowed from ${personPlain}`,
      isPrincipal: true,
    });

    res.status(201).json(loan);
  } catch (err) {
    console.error("ADD LOAN ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};

/* ========== GET USER LOANS ========== */
exports.getLoans = async (req, res) => {
  try {
    const loans = await Loan.find({ user: req.user._id }).sort({
      dueDate: 1,
    });

    res.json(loans);
  } catch (err) {
    console.error("GET LOANS ERROR:", err);
    res.status(500).json({ message: "Failed to fetch loans" });
  }
};

/* ========== SETTLE LOAN ========== */
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

    // determine paymentMethod: prefer client-provided, otherwise fallback to loan.paymentMethod
    const paymentMethod = normalizePaymentMethod(
      req.body.paymentMethod || loan.paymentMethod
    );
    if (!paymentMethod) {
      return res.status(400).json({ message: "Invalid payment method" });
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

    /* ===== INTEREST PAYMENT =====
       Interest payments SHOULD count as income (for lenders) or expense (for borrowers).
       They use type income/expense and isPrincipal: false so Dashboard will include them
       in monthlyIncome/monthlyExpense.
    */
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
        category:
          loan.role === "lent"
            ? "Loan interest earned"
            : "Borrowed interest paid",
        paymentMode: loan.role === "lent" ? "loan" : "borrow",
        paymentMethod,
        isPrincipal: false,
      });

      loan.interestPaid += interestToPay;

      if (loan.principal === 0 && loan.interestPaid >= loan.interestAmount) {
        loan.settled = true;
      }

      await loan.save();
      return res.json({ message: "Interest payment recorded" });
    }

    /* ===== PRINCIPAL PAYMENT =====
       Principal repayments should update balances but NOT be counted as income/expense.
       We'll create transfer transactions with isPrincipal: true and set paymentMode so
       computeSummaryFrom signs them correctly:
         - If user.role === 'lent' (you lent money), receiving principal is a positive inflow:
             create type: "transfer", paymentMode: "borrow"  => signed = +amt
         - If user.role === 'borrowed' (you borrowed), repaying principal is an outflow:
             create type: "transfer", paymentMode: "loan" => signed = -amt
    */
    if (paymentType === "principal") {
      if (paid > remainingPrincipal) {
        return res
          .status(400)
          .json({ message: "Paid amount exceeds principal" });
      }

      if (loan.role === "lent") {
        // Lender receives principal back -> create transfer with paymentMode 'borrow' to make it positive
        await Transaction.create({
          user: req.user._id,
          loanId: loan._id,
          type: "transfer",
          amount: paid,
          category: "Loan principal received",
          paymentMode: "borrow",
          paymentMethod,
          isPrincipal: true,
        });
      } else {
        // Borrower repays principal -> create transfer with paymentMode 'loan' to make it negative
        await Transaction.create({
          user: req.user._id,
          loanId: loan._id,
          type: "transfer",
          amount: paid,
          category: "Borrowed principal repaid",
          paymentMode: "loan",
          paymentMethod,
          isPrincipal: true,
        });
      }

      loan.principal -= paid;

      if (loan.principal === 0 && remainingInterest === 0) {
        loan.settled = true;
      }

      await loan.save();
      return res.json({ message: "Principal payment recorded" });
    }

    /* ===== FULL SETTLEMENT =====
       Apply same principal logic for the principal portion, and keep interest as income/expense.
    */
    if (paymentType === "full") {
      const totalRemaining = remainingPrincipal + remainingInterest;

      if (paid < totalRemaining) {
        return res.status(400).json({
          message: "Paid amount is less than total outstanding",
        });
      }

      // Principal portion
      if (remainingPrincipal > 0) {
        if (loan.role === "lent") {
          await Transaction.create({
            user: req.user._id,
            loanId: loan._id,
            type: "transfer",
            amount: remainingPrincipal,
            category: "loan principal",
            paymentMode: "borrow",
            paymentMethod,
            isPrincipal: true,
          });
        } else {
          await Transaction.create({
            user: req.user._id,
            loanId: loan._id,
            type: "transfer",
            amount: remainingPrincipal,
            category: "borrowed principal",
            paymentMode: "loan",
            paymentMethod,
            isPrincipal: true,
          });
        }
      }

      // Interest portion (counts as income/expense)
      if (remainingInterest > 0) {
        await Transaction.create({
          user: req.user._id,
          loanId: loan._id,
          type: loan.role === "lent" ? "income" : "expense",
          amount: remainingInterest,
          category:
            loan.role === "lent" ? "loan interest" : "borrowed interest",
          paymentMode: loan.role === "lent" ? "loan" : "borrow",
          paymentMethod,
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

/* ========== UPDATE LOAN ========== */
exports.updateLoan = async (req, res) => {
  try {
    const loan = await Loan.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!loan) {
      return res.status(404).json({ message: "Loan not found" });
    }

    // Update loan fields from body
    Object.assign(loan, req.body);

    // Keep principal in sync with amount if amount provided
    if (req.body.amount != null) {
      loan.principal = Number(req.body.amount);
    }

    await loan.save();

    // Update the related principal transaction (if exists)
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
    console.error("UPDATE LOAN ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};

/* ========== DELETE LOAN ========== */
exports.deleteLoan = async (req, res) => {
  try {
    const loan = await Loan.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!loan) return res.status(404).json({ message: "Loan not found" });

    // Delete related transactions
    await Transaction.deleteMany({
      user: req.user._id,
      loanId: loan._id,
    });

    res.json({ message: "Loan & related transactions deleted" });
  } catch (err) {
    console.error("DELETE LOAN ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};

/* ========== GET ACTIVE LOAN SUMMARY ========== */
exports.getLoanSummary = async (req, res) => {
  try {
    const loans = await Loan.find({
      user: req.user._id,
      settled: false,
    });

    let totalLent = 0;
    let totalBorrowed = 0;

    loans.forEach((l) => {
      const remaining = Number(l.principal || 0);
      if (l.role === "lent") totalLent += remaining;
      if (l.role === "borrowed") totalBorrowed += remaining;
    });

    res.json({
      lent: totalLent,
      borrowed: totalBorrowed,
    });
  } catch (err) {
    console.error("GET LOAN SUMMARY ERROR:", err);
    res.status(500).json({ message: "Failed to fetch loan summary" });
  }
};
