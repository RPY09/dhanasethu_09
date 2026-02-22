const express = require("express");
const router = express.Router();
const protect = require("../middlewares/authMiddleware");
const {
  addTransaction,
  getTransactions,
  updateTransaction,
  deleteTransaction,
  getTransactionTypes,
  getCustomCategories,
  addCustomCategory,
  deleteCustomCategory,
  getUserPreferences,
  addCustomType,
  deleteCustomType,
  addCustomPaymentMode,
  deleteCustomPaymentMode,
} = require("../controllers/transactionController");

router.post("/", protect, addTransaction);
router.get("/", protect, getTransactions);
router.get("/categories", protect, getCustomCategories);
router.post("/categories", protect, addCustomCategory);
router.delete("/categories", protect, deleteCustomCategory);
router.get("/preferences", protect, getUserPreferences);
router.post("/preferences/types", protect, addCustomType);
router.delete("/preferences/types", protect, deleteCustomType);
router.post("/preferences/payment-modes", protect, addCustomPaymentMode);
router.delete("/preferences/payment-modes", protect, deleteCustomPaymentMode);
router.put("/:id", protect, updateTransaction);
router.delete("/:id", protect, deleteTransaction);
router.get("/types", protect, getTransactionTypes);

module.exports = router;
