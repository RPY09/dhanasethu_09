import CryptoJS from "crypto-js";

const SECRET = "DHANASETHU_APP_LOCK";

/* Enable App Lock */
export const enableAppLock = (pin) => {
  const encrypted = CryptoJS.AES.encrypt(pin, SECRET).toString();
  localStorage.setItem("app_lock_enabled", "true");
  localStorage.setItem("app_lock_pin", encrypted);
};

/* Verify PIN */
export const verifyAppLockPin = (pin) => {
  const encrypted = localStorage.getItem("app_lock_pin");
  if (!encrypted) return false;

  const decrypted = CryptoJS.AES.decrypt(encrypted, SECRET).toString(
    CryptoJS.enc.Utf8
  );

  return pin === decrypted;
};

/* Disable App Lock */
export const disableAppLock = () => {
  localStorage.removeItem("app_lock_enabled");
  localStorage.removeItem("app_lock_pin");
  sessionStorage.removeItem("app_unlocked");
};

/* Lock App */
export const lockApp = () => {
  sessionStorage.removeItem("app_unlocked");
};

/* Unlock App */
export const unlockApp = () => {
  sessionStorage.setItem("app_unlocked", "true");
};

/* Change PIN */
export const changeAppLockPin = (oldPin, newPin) => {
  if (!verifyAppLockPin(oldPin)) return false;
  enableAppLock(newPin);
  return true;
};

/* Reset PIN (after security question) */
export const resetAppLockPin = (newPin) => {
  enableAppLock(newPin);
};

/* Helpers */
export const isAppLockEnabled = () =>
  localStorage.getItem("app_lock_enabled") === "true";

export const isAppUnlocked = () =>
  sessionStorage.getItem("app_unlocked") === "true";
