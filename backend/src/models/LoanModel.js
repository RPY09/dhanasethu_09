const mongoose = require("mongoose");
const { encrypt, decrypt } = require("../utils/crypto.utils");

const loanSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    person: { type: String, required: true },
    contact: { type: String },

    role: {
      type: String,
      enum: ["lent", "borrowed"],
      required: true,
    },

    amount: { type: String, required: true }, // original principal (encrypted)
    principal: { type: Number, required: true }, // remaining principal
    paymentMethod: {
      type: String,
      enum: ["cash", "bank"],
      required: true,
    },

    interestRate: { type: String }, // encrypted
    interestType: {
      type: String,
      enum: ["simple", "monthly"],
      default: "simple",
    },

    interestAmount: { type: Number, required: true },
    interestPaid: {
      type: Number,
      default: 0,
    },
    interestLastPaidOn: {
      type: Date,
      default: null,
    },

    startDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },

    settled: { type: Boolean, default: false },

    note: { type: String },
  },
  { timestamps: true }
);

/* ENCRYPT BEFORE SAVE */
loanSchema.pre("save", function () {
  const fields = [
    "person",
    "contact",
    "amount",
    "interestRate",
    // "interestAmount",
    "note",
  ];

  fields.forEach((field) => {
    if (
      this.isModified(field) &&
      this[field] &&
      !String(this[field]).includes(":")
    ) {
      this[field] = encrypt(this[field]);
    }
  });
});

function decryptLoan(doc) {
  if (!doc) return;
  [
    "person",
    "contact",
    "amount",
    "interestRate",
    // "interestAmount",
    "note",
  ].forEach((field) => {
    if (
      doc[field] &&
      typeof doc[field] === "string" &&
      doc[field].includes(":")
    ) {
      try {
        doc[field] = decrypt(doc[field]);
      } catch {}
    }
  });
}

loanSchema.post("find", function (docs) {
  docs.forEach(decryptLoan);
});

loanSchema.post("findOne", decryptLoan);

module.exports = mongoose.model("Loan", loanSchema);
