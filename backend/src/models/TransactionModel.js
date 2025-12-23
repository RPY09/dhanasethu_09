const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
<<<<<<< HEAD
enum: ["income", "expense", "investment", "invest"],      required: true,
=======
      enum: ["income", "expense", "invest"],
      required: true,
>>>>>>> e59c53f77c3081fe6746be29489c71b7e23f2b18
    },
    category: {
      type: String,
      required: true,
    },
    paymentMode: {
      type: String,
<<<<<<< HEAD
enum: ["cash", "online", "Cash", "Online"],      required: true,
=======
      enum: ["cash", "online"],
      required: true,
>>>>>>> e59c53f77c3081fe6746be29489c71b7e23f2b18
    },
    date: {
      type: Date,
      default: Date.now,
    },
    note: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);
