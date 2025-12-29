const express = require("express");
const router = express.Router();
const protect = require("../middlewares/authMiddleware");
const {
  addTransaction,
  getTransactions,
  updateTransaction,
  deleteTransaction,
  getTransactionTypes,
} = require("../controllers/transactionController");

router.post("/", protect, addTransaction);
router.get("/", protect, getTransactions);
router.put("/:id", protect, updateTransaction);
router.delete("/:id", protect, deleteTransaction);
router.get("/types", protect, getTransactionTypes);

module.exports = router;
