const User = require("../models/UserModel");
const Otp = require("../models/OtpModel");
const { sendEmail } = require("../utils/mail.utils");
const { otpEmailTemplate } = require("../utils/emailTemplate");
const { detectLocation } = require("../utils/location.utils");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

/* ================= REGISTER ================= */

exports.register = async (req, res) => {
  try {
    const { name, email, number, password } = req.body;

    if (!name || !email || !password || !number) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const location = await detectLocation(req);
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      number,
      password: hashedPassword,
      ...location,
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        number: user.number,
        country: user.country,
        currency: user.currency,
        timezone: user.timezone,
      },
    });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({ message: "Registration failed" });
  }
};

/* ================= LOGIN ================= */

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (!user.baseCurrency || !user.country) {
      const location = await detectLocation(req);
      user.country = location.country;
      user.baseCurrency = location.currency;
      user.timezone = location.timezone;
      await user.save();
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        number: user.number,
        country: user.country,
        baseCurrency: user.baseCurrency,
        timezone: user.timezone,
      },
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ message: "Login failed" });
  }
};

/* ================= LOGIN VIA OTP ================= */

exports.loginViaOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const otpRecord = await Otp.findOne({ email, otp });
    if (!otpRecord) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.baseCurrency || !user.country) {
      const location = await detectLocation(req);
      user.country = location.country;
      user.baseCurrency = location.currency;
      user.timezone = location.timezone;
      await user.save();
    }

    await Otp.deleteOne({ _id: otpRecord._id });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        number: user.number,
        country: user.country,
        baseCurrency: user.baseCurrency,
        timezone: user.timezone,
      },
    });
  } catch (err) {
    console.error("LOGIN OTP ERROR:", err);
    res.status(500).json({ message: "Login failed" });
  }
};

/* ================= PROFILE ================= */

exports.updateProfile = async (req, res) => {
  try {
    const { name, number, country, baseCurrency, timezone } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        name,
        number,
        country,
        baseCurrency,
        timezone,
      },
      { new: true }
    ).select("-password");

    res.json({ message: "Profile updated", user });
  } catch (err) {
    console.error("UPDATE PROFILE ERROR:", err);
    res.status(500).json({ message: "Update failed" });
  }
};

/* ================= TOKEN ================= */

exports.refreshToken = async (req, res) => {
  try {
    const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: "Token refresh failed" });
  }
};
/* ================= REQUEST PASSWORD OTP ================= */

exports.requestPasswordOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await Otp.deleteMany({ email });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await Otp.create({ email, otp });

    await sendEmail({
      email,
      subject: "DhanaSethu OTP Verification",
      html: otpEmailTemplate({
        name: user.name,
        otp,
        purpose: "Password Reset Verification",
      }),
    });

    res.json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error("REQUEST OTP ERROR:", err);
    res.status(500).json({ message: "Failed to send OTP" });
  }
};

/* ================= FORGOT PASSWORD ================= */

exports.forgotPasswordRequest = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ message: "No account found with this email" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await Otp.create({ email, otp });

    await sendEmail({
      email: user.email,
      subject: "DhanaSethu OTP Verification",
      html: otpEmailTemplate({
        name: user.name,
        otp,
        purpose: "Login Verification",
      }),
    });

    res.json({ message: "OTP sent to your email" });
  } catch (err) {
    console.error("FORGOT PASSWORD ERROR:", err);
    res.status(500).json({ message: "Failed to send OTP" });
  }
};
