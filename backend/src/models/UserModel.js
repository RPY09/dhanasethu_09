const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    number: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    securityQuestion: { type: String },
    securityAnswer: { type: String }, // hashed

    country: {
      type: String,
      default: "IN",
    },
    baseCurrency: {
      type: String,
      default: "INR",
    },
    timezone: {
      type: String,
      default: "Asia/Kolkata",
    },
    customCategories: {
      expense: {
        type: [String],
        default: [],
      },
      income: {
        type: [String],
        default: [],
      },
      invest: {
        type: [String],
        default: [],
      },
    },
    customTypes: {
      type: [String],
      default: [],
    },
    customPaymentModes: {
      type: [String],
      default: [],
    },
  },

  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
