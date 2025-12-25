// backend/src/models/TransactionModel.js
const mongoose = require("mongoose");
const { encrypt, decrypt } = require("../utils/crypto.utils");

const transactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: String, required: true },
    category: { type: String, required: true },
    note: { type: String },
    type: {
      type: String,
      enum: ["income", "expense", "invest"],
      required: true,
    },
    paymentMode: { type: String, required: true },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

transactionSchema.pre("save", function () {
  // Encrypt amount
  if (this.isModified("amount") && !String(this.amount).includes(":")) {
    this.amount = encrypt(this.amount);
  }

  // Encrypt category
  if (this.isModified("category") && !String(this.category).includes(":")) {
    this.category = encrypt(this.category);
  }

  // Encrypt note
  if (
    this.isModified("note") &&
    this.note &&
    !String(this.note).includes(":")
  ) {
    this.note = encrypt(this.note);
  }
});

// DECRYPT after fetching
transactionSchema.post("init", function (doc) {
  // Only decrypt if the string contains the IV separator ':'
  if (doc.amount && String(doc.amount).includes(":")) {
    doc.amount = decrypt(doc.amount);
  }
  if (doc.category && String(doc.category).includes(":")) {
    doc.category = decrypt(doc.category);
  }
  if (doc.note && String(doc.note).includes(":")) {
    doc.note = decrypt(doc.note);
  }
});

module.exports = mongoose.model("Transaction", transactionSchema);
