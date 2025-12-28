const express = require("express");
const router = express.Router();
const {
  refreshToken,
  register,
  login,
  updateProfile,
  requestPasswordOtp,
  resetPasswordOtp,
  forgotPasswordRequest,
  loginViaOtp,
} = require("../controllers/authController");
const protect = require("../middlewares/authMiddleware");
router.get("/refresh-token", protect, refreshToken);

router.post("/register", register);
router.post("/login", login);

// New Public OTP Login Routes
router.post("/forgot-password-request", forgotPasswordRequest);
router.post("/login-otp", loginViaOtp);

// Authenticated Routes
router.put("/update-profile", protect, updateProfile);
router.post("/request-password-otp", protect, requestPasswordOtp);
router.post("/reset-password-otp", protect, resetPasswordOtp);

module.exports = router;
