const User = require("../models/UserModel");
const Otp = require("../models/OtpModel");
const sendEmail = require("../utils/mail.utils");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.register = async (req, res) => {
  try {
    console.log("REGISTER BODY:", req.body); // 👈 ADD

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
    console.error("REGISTER ERROR:", err); // 👈 VERY IMPORTANT
    res.status(500).json({
      message: "Registration failed",
      error: err.message, // 👈 send error message
    });
  }
};

exports.login = async (req, res) => {
  try {
    console.log("LOGIN BODY:", req.body); // 👈 ADD

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
    console.error("LOGIN ERROR:", err); // 👈 ADD
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

// REQUEST OTP
exports.requestPasswordOtp = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in DB
    await Otp.create({ email: user.email, otp });

    // Send Mail
    await sendEmail({
      email: user.email,
      subject: "DhanaSethu Password Reset OTP",
      message: `Your OTP for password reset is: ${otp}. This is valid for 10 minutes.`,
    });

    res.json({ message: "OTP sent to registered email" });
  } catch (err) {
    res.status(500).json({ message: "Failed to send OTP" });
  }
};

// RESET PASSWORD WITH OTP
exports.resetPasswordOtp = async (req, res) => {
  try {
    const { otp, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    const otpRecord = await Otp.findOne({ email: user.email, otp });

    if (!otpRecord) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    // Delete used OTP
    await Otp.deleteOne({ _id: otpRecord._id });

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Password reset failed" });
  }
};
