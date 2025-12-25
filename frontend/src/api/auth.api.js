import api from "./axios";

export const registerUser = (data) => api.post("/auth/register", data);

export const loginUser = (data) => api.post("/auth/login", data);
export const updateProfile = (data) => api.put("/auth/update-profile", data);
export const requestPasswordOtp = () => api.post("/auth/request-password-otp");
export const resetPasswordOtp = (data) =>
  api.post("/auth/reset-password-otp", data);
