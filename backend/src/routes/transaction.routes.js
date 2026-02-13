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
} = require("../controllers/transactionController");

router.post("/", protect, addTransaction);
router.get("/", protect, getTransactions);
router.get("/categories", protect, getCustomCategories);
router.post("/categories", protect, addCustomCategory);
router.delete("/categories", protect, deleteCustomCategory);
router.put("/:id", protect, updateTransaction);
router.delete("/:id", protect, deleteTransaction);
router.get("/types", protect, getTransactionTypes);

module.exports = router;
