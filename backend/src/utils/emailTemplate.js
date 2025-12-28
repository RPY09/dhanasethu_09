const otpEmailTemplate = ({ name = "User", otp, purpose }) => {
  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <title>DhanaSethu OTP</title>
      <style>
        body {
          background-color: #f4f1ee;
          font-family: Arial, sans-serif;
          padding: 20px;
        }
        .card {
          max-width: 420px;
          margin: auto;
          background: #ffffff;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
        }
        .logo {
          font-size: 22px;
          font-weight: 800;
          color: #10232a;
          text-align: center;
          margin-bottom: 12px;
        }
        .logo span {
          color: #b58863;
        }
        h2 {
          text-align: center;
          color: #10232a;
        }
        p {
          color: #444;
          font-size: 14px;
          line-height: 1.6;
        }
        .otp-box {
          margin: 20px 0;
          text-align: center;
          font-size: 26px;
          font-weight: 800;
          letter-spacing: 6px;
          color: #10232a;
          background: #f4f1ee;
          padding: 12px;
          border-radius: 10px;
        }
        .footer {
          font-size: 12px;
          color: #777;
          text-align: center;
          margin-top: 20px;
        }
      </style>
    </head>

    <body>
      <div class="card">
        <div class="logo">
          Dhana<span>Sethu</span>
        </div>

        <h2>${purpose}</h2>

        <p>Hello <strong>${name}</strong>,</p>

        <p>
          Use the OTP below to complete your request.
          This OTP is valid for <strong>10 minutes</strong>.
        </p>

        <div class="otp-box">${otp}</div>

        <p>
          If you did not request this, please ignore this email.
        </p>

        <div class="footer">
          © ${new Date().getFullYear()} DhanaSethu · Secure Finance Tracking
        </div>
      </div>
    </body>
  </html>
  `;
};

module.exports = { otpEmailTemplate };
