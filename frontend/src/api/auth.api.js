import api from "./axios";

/* ================= AUTH ================= */

export const registerUser = (data) => api.post("/auth/register", data);

export const loginUser = (data) => api.post("/auth/login", data);

/* ================= PROFILE ================= */

export const updateProfile = (data) => api.put("/auth/update-profile", data);

/* ================= PASSWORD / OTP ================= */

//  email must be sent in body
export const requestPasswordOtp = (data) =>
  api.post("/auth/request-password-otp", data);

// optional (if you implement reset later)
export const resetPasswordOtp = (data) =>
  api.post("/auth/reset-password-otp", data);

// Forgot password (send OTP)
export const forgotPasswordRequest = (data) =>
  api.post("/auth/forgot-password-request", data);

// Login using OTP
export const loginViaOtp = (data) => api.post("/auth/login-otp", data);
