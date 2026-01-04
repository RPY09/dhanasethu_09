const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const protect = require("../middlewares/authMiddleware");

/* ================= PUBLIC ROUTES ================= */

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/forgot-password-request", authController.forgotPasswordRequest);
router.post("/login-security", authController.loginWithSecurityAnswer);
router.post(
  "/reset-password-security",
  authController.resetPasswordWithSecurity
);
router.post("/setup-security", protect, authController.setupSecurity);

router.post("/login-otp", authController.loginViaOtp);
router.post("/request-password-otp", authController.requestPasswordOtp);

/* ================= PROTECTED ROUTES ================= */

router.get("/refresh-token", protect, authController.refreshToken);
router.put("/update-profile", protect, authController.updateProfile);

module.exports = router;
