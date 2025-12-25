const express = require("express");
const router = express.Router();
// ADD THESE IMPORTS
const {
  register,
  login,
  updateProfile,
  requestPasswordOtp,
  resetPasswordOtp,
} = require("../controllers/authController");
const protect = require("../middlewares/authMiddleware");

router.post("/register", register);
router.post("/login", login);
// These now have access to protect and the controller functions
router.put("/update-profile", protect, updateProfile);
router.post("/request-password-otp", protect, requestPasswordOtp);
router.post("/reset-password-otp", protect, resetPasswordOtp);

module.exports = router;
