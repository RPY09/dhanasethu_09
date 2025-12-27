const mongoose = require("mongoose");
const { encrypt, decrypt } = require("../utils/crypto.utils");

const loanSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    person: { type: String, required: true },
    contact: { type: String }, // phone or email

    role: {
      type: String,
      enum: ["lent", "borrowed"],
      required: true,
    },

    amount: { type: String, required: true }, // encrypted
    interestRate: { type: String }, // encrypted
    interestAmount: { type: String }, // encrypted
    totalAmount: { type: String }, // encrypted

    interestType: {
      type: String,
      enum: ["simple", "monthly"],
      default: "simple",
    },

    startDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },

    settled: { type: Boolean, default: false },

    lastReminderStage: {
      type: String,
      enum: ["none", "7days", "3days", "duedate"],
      default: "none",
    },

    note: { type: String },
  },
  { timestamps: true }
);

/* 🔐 ENCRYPT BEFORE SAVE */
loanSchema.pre("save", function () {
  const fields = [
    "person",
    "contact",
    "amount",
    "interestRate",
    "interestAmount",
    "totalAmount",
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
    "interestAmount",
    "totalAmount",
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
