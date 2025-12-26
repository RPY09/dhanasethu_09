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
  try {
    if (
      this.isModified("amount") &&
      this.amount != null &&
      !String(this.amount).includes(":")
    ) {
      this.amount = encrypt(this.amount);
    }

    // Encrypt category
    if (
      this.isModified("category") &&
      this.category != null &&
      !String(this.category).includes(":")
    ) {
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
  } catch (err) {
    // If encryption fails for some reason, surface a clear error
    // so save() will fail and callers can handle it
    throw new Error(
      "Encryption failed: " + (err && err.message ? err.message : err)
    );
  }
});

// DECRYPT after fetching (defensive)
transactionSchema.post("init", function (doc) {
  // Only attempt to decrypt if field is present and contains the IV separator ':'
  try {
    if (doc.amount && String(doc.amount).includes(":")) {
      try {
        doc.amount = decrypt(doc.amount);
      } catch (err) {
        console.warn(
          "Failed to decrypt transaction.amount for doc",
          doc._id,
          err && err.message ? err.message : err
        );
        // leave doc.amount as-is (encrypted value) to avoid throwing
      }
    }
  } catch (err) {
    console.warn(
      "Unexpected error while processing amount decryption for doc",
      doc._id,
      err && err.message ? err.message : err
    );
  }

  try {
    if (doc.category && String(doc.category).includes(":")) {
      try {
        doc.category = decrypt(doc.category);
      } catch (err) {
        console.warn(
          "Failed to decrypt transaction.category for doc",
          doc._id,
          err && err.message ? err.message : err
        );
      }
    }
  } catch (err) {
    console.warn(
      "Unexpected error while processing category decryption for doc",
      doc._id,
      err && err.message ? err.message : err
    );
  }

  try {
    if (doc.note && String(doc.note).includes(":")) {
      try {
        doc.note = decrypt(doc.note);
      } catch (err) {
        console.warn(
          "Failed to decrypt transaction.note for doc",
          doc._id,
          err && err.message ? err.message : err
        );
      }
    }
  } catch (err) {
    console.warn(
      "Unexpected error while processing note decryption for doc",
      doc._id,
      err && err.message ? err.message : err
    );
  }
});

module.exports = mongoose.model("Transaction", transactionSchema);
