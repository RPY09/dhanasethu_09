const axios = require("axios");

exports.detectLocation = async (req) => {
  try {
    const res = await axios.get("https://ipapi.co/json/");
    return {
      country: res.data.country || "IN",
      currency: res.data.currency || "INR",
      timezone: res.data.timezone || "Asia/Kolkata",
    };
  } catch {
    return {
      country: "IN",
      currency: "INR",
      timezone: "Asia/Kolkata",
    };
  }
};
