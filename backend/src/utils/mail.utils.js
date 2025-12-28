const nodemailer = require("nodemailer");

const sendEmail = async ({ email, subject, html }) => {
  const transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.BREVO_USER,
      pass: process.env.BREVO_PASS,
    },
  });

  const info = await transporter.sendMail({
    from: `"DhanaSethu" <no-reply@dhanasethu.app>`,
    to: email,
    subject,
    html,
  });

  console.log("Brevo email sent:", info.messageId);
};

module.exports = { sendEmail };
