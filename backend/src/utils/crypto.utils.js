const crypto = require("crypto");

const algorithm = "aes-256-cbc";
const ivSize = 16;

exports.encrypt = (text) => {
  if (text === null || text === undefined) return text;

  // Ensure key is exactly 32 bytes
  const keyString = process.env.ENCRYPTION_KEY || "";
  const key = Buffer.alloc(32, keyString, "utf-8"); // Force strictly 32 bytes

  const iv = crypto.randomBytes(ivSize);
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  let encrypted = cipher.update(String(text));
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  return iv.toString("hex") + ":" + encrypted.toString("hex");
};

exports.decrypt = (text) => {
  // If text is falsy or doesn't look encrypted (no ':'), return as-is
  if (!text || !String(text).includes(":")) return text;

  try {
    const keyString = process.env.ENCRYPTION_KEY || "";
    const key = Buffer.alloc(32, keyString, "utf-8"); // Force strictly 32 bytes

    const textParts = String(text).split(":");
    const iv = Buffer.from(textParts.shift(), "hex");
    const encryptedText = Buffer.from(textParts.join(":"), "hex");

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString();
  } catch (err) {
    // Log the error and return original value to avoid throwing in request handlers
    console.warn(
      "crypto.decrypt failed — returning raw value. Error:",
      err && err.message ? err.message : err
    );
    return text;
  }
};
