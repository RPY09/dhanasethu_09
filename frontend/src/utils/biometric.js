export const isBiometricSupported = () => {
  return (
    window.PublicKeyCredential &&
    typeof window.PublicKeyCredential === "function"
  );
};

export const registerBiometric = async () => {
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: "DhanaSethu" },
      user: {
        id: crypto.getRandomValues(new Uint8Array(16)),
        name: "DhanaSethu User",
        displayName: "DhanaSethu User",
      },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
      },
      timeout: 60000,
    },
  });

  localStorage.setItem("biometric_enabled", "true");
  localStorage.setItem("biometric_id", credential.id);
};

export const verifyBiometric = async () => {
  const credentialId = localStorage.getItem("biometric_id");
  if (!credentialId) return false;

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [
        {
          id: Uint8Array.from(atob(credentialId), (c) => c.charCodeAt(0)),
          type: "public-key",
        },
      ],
      userVerification: "required",
      timeout: 60000,
    },
  });

  return !!assertion;
};

export const isBiometricEnabled = () =>
  localStorage.getItem("biometric_enabled") === "true";

export const disableBiometric = () => {
  localStorage.removeItem("biometric_enabled");
  localStorage.removeItem("biometric_id");
};
