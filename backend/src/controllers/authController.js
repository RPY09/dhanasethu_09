const User = require("../models/UserModel");
const Otp = require("../models/OtpModel");
const { sendEmail } = require("../utils/mail.utils");
const { otpEmailTemplate } = require("../utils/emailTemplate");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.register = async (req, res) => {
  try {
    console.log("REGISTER BODY:", req.body);

    const { name, email, number, password } = req.body;

    if (!name || !email || !password || !number) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      number,
      password: hashedPassword,
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
      },
    });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({
      message: "Registration failed",
      error: err.message,
    });
  }
};

exports.login = async (req, res) => {
  try {
    console.log("LOGIN BODY:", req.body);

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

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ message: "Login failed" });
  }
};
exports.updateProfile = async (req, res) => {
  try {
    const { name, number } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, number },
      { new: true }
    ).select("-password");

    res.json({ message: "Profile updated", user });
  } catch (err) {
    res.status(500).json({ message: "Update failed" });
  }
};

exports.requestPasswordOtp = async (req, res) => {
  try {
    const email = req.body?.email;

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

    return res.json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error("REQUEST OTP ERROR:", err);
    return res.status(500).json({
      message: "Failed to send OTP",
      error: err.message,
    });
  }
};

exports.forgotPasswordRequest = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ message: "No account found with this email" });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await Otp.create({ email, otp });

    // Send OTP via email
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
    res.status(500).json({ message: "Failed to send OTP" });
  }
};

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

    // Generate JWT for the user
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // Delete OTP record after successful use
    await Otp.deleteOne({ _id: otpRecord._id });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        number: user.number,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Login failed" });
  }
};
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
// console.log("sendEmail type:", typeof sendEmail);
