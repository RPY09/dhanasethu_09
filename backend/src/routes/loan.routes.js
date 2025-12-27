const express = require("express");
const router = express.Router();
const protect = require("../middlewares/authMiddleware");
const {
  addLoan,
  getLoans,
  settleLoan,
  updateLoan,
  deleteLoan,
  getLoanSummary,
} = require("../controllers/loanController");

router.post("/", protect, addLoan);
router.get("/", protect, getLoans);
router.put("/:id/settle", protect, settleLoan);
router.put("/:id", protect, updateLoan);
router.delete("/:id", protect, deleteLoan);
router.get("/summary", protect, getLoanSummary);

module.exports = router;
