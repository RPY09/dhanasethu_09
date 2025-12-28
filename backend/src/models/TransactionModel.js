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
    isPrincipal: {
      type: Boolean,
      default: false,
    },
    loanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Loan",
      default: null,
    },

    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

function isEncryptedBlob(str) {
  if (!str || typeof str !== "string") return false;
  const parts = str.split(":");
  if (parts.length < 2) return false;
  const iv = parts.shift();
  const cipher = parts.join(":");
  // iv must be exactly 32 hex chars (16 bytes)
  if (!/^[0-9a-fA-F]{32}$/.test(iv)) return false;
  if (!/^[0-9a-fA-F]+$/.test(cipher)) return false;
  return true;
}

transactionSchema.pre("save", function () {
  try {
    if (
      this.isModified("amount") &&
      this.amount != null &&
      !isEncryptedBlob(String(this.amount))
    ) {
      this.amount = encrypt(this.amount);
    }

    if (
      this.isModified("category") &&
      this.category != null &&
      !isEncryptedBlob(String(this.category))
    ) {
      this.category = encrypt(this.category);
    }

    if (
      this.isModified("note") &&
      this.note != null &&
      !isEncryptedBlob(String(this.note))
    ) {
      this.note = encrypt(this.note);
    }
  } catch (err) {
    throw new Error(
      "Encryption failed: " + (err && err.message ? err.message : err)
    );
  }
});

// DECRYPT after fetching (defensive): only attempt decrypt when the value is a full encrypted blob
transactionSchema.post("init", function (doc) {
  try {
    if (doc.amount && isEncryptedBlob(String(doc.amount))) {
      try {
        doc.amount = decrypt(doc.amount);
      } catch (err) {
        console.warn(
          "Failed to decrypt transaction.amount for doc",
          doc._id,
          err && err.message ? err.message : err
        );
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
    if (doc.category && isEncryptedBlob(String(doc.category))) {
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
    if (doc.note && isEncryptedBlob(String(doc.note))) {
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
