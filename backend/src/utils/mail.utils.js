const axios = require("axios");

const sendEmail = async ({ email, subject, html }) => {
  try {
    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          name: "DhanaSethu",
          email: "no-reply@dhanasethu.app",
        },
        to: [{ email }],
        subject,
        htmlContent: html,
      },
      {
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json",
          accept: "application/json",
        },
        timeout: 10000, // safety
      }
    );

    console.log("Brevo API email sent:", response.data.messageId);
  } catch (error) {
    console.error("Brevo API ERROR:", error.response?.data || error.message);
    throw new Error("Email service failed");
  }
};

module.exports = { sendEmail };
