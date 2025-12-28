const sendEmail = async ({ email, subject, html }) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"DhanaSethu Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject,
      html,
    });

    console.log("EMAIL SENT:", info.response);
  } catch (err) {
    console.error("EMAIL ERROR:", err);
    throw err; // 🔴 this is what causes 500
  }
};
