/* ---------- helpers ---------- */
const bufferToBase64 = (buffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buffer)));

const base64ToBuffer = (base64) =>
  Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

/* ---------- capability ---------- */
export const isBiometricSupported = () => {
  return (
    window.PublicKeyCredential &&
    typeof window.PublicKeyCredential === "function"
  );
};

export const isBiometricEnabled = () =>
  localStorage.getItem("biometric_enabled") === "true";

/* ---------- register ---------- */
export const registerBiometric = async () => {
  if (!isBiometricSupported()) {
    throw new Error("Biometric not supported");
  }

  const credential = await navigator.credentials.create({
    publicKey: {
      // use ArrayBuffer for challenge and user.id to be explicit
      challenge: crypto.getRandomValues(new Uint8Array(32)).buffer,
      rp: { name: "DhanaSethu" },
      user: {
        id: crypto.getRandomValues(new Uint8Array(16)).buffer,
        name: "DhanaSethu User",
        displayName: "DhanaSethu User",
      },
      // include both ES256 (-7) and RS256 (-257) to avoid registration failures
      pubKeyCredParams: [
        { type: "public-key", alg: -7 }, // ES256
        { type: "public-key", alg: -257 }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
      },
      timeout: 60000,
    },
  });

  localStorage.setItem("biometric_enabled", "true");
  localStorage.setItem("biometric_raw_id", bufferToBase64(credential.rawId));
};

/* ---------- verify ---------- */
export const verifyBiometric = async () => {
  try {
    const rawIdBase64 = localStorage.getItem("biometric_raw_id");
    if (!rawIdBase64) return false;

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)).buffer,
        allowCredentials: [
          {
            // convert stored base64 back to an ArrayBuffer-view
            id: base64ToBuffer(rawIdBase64).buffer,
            type: "public-key",
          },
        ],
        userVerification: "required",
        timeout: 60000,
      },
    });

    return !!assertion;
  } catch {
    // user cancelled / biometric failed
    return false;
  }
};

/* ---------- disable ---------- */
export const disableBiometric = () => {
  localStorage.removeItem("biometric_enabled");
  localStorage.removeItem("biometric_raw_id");
};
