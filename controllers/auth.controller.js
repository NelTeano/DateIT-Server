import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import { sendEmail } from "../services/sendEmail.js";

console.log("✅ bcrypt imported:", typeof bcrypt.hash, "from", import.meta.url);

const generateToken = (payload, expiresIn = "7d") =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });

// STEP 1: Pre-register (send verification email)
export const preRegister = async (req, res) => {
  try {
    const { name, email, password, age, bio, photoUrl } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email is already registered." });

    const token = generateToken(
      { name, email, password, age, bio, photoUrl },
      "15m"
    );

    const verifyLink = `http://localhost:5000/api/auth/verify/${token}`;

    await sendEmail(
      email,
      "Verify your account",
      `
        <div style="font-family:Arial,sans-serif; line-height:1.5;">
          <h2 style="color:#e63946;">Welcome to DateIt 💖</h2>
          <p>Hi ${name},</p>
          <p>Click below to verify your email and complete registration:</p>
          <a href="${verifyLink}"
            style="display:inline-block;background-color:#e63946;color:#fff;
                   padding:10px 20px;text-decoration:none;border-radius:5px;font-weight:bold;"
            target="_blank">
            Verify My Account
          </a>
          <p>If the button doesn’t work, copy and paste this link:</p>
          <p><a href="${verifyLink}" target="_blank">${verifyLink}</a></p>
          <p>This link expires in 15 minutes.</p>
        </div>
      `
    );

    console.log("📧 Verification link:", verifyLink);

    res
      .status(200)
      .json({ message: "Verification email sent. Please check your inbox." });
  } catch (error) {
    res.status(500).json({
      message: "Failed to send verification email",
      error: error.message,
    });
  }
};

// STEP 2: Verify email & register user
export const verifyEmail = async (req, res) => {
  try {
    console.log("📂 Running verifyEmail from:", import.meta.url);

    // Dynamically import bcrypt to ensure it's defined in this scope
    const { default: bcryptjs } = await import("bcryptjs");
    console.log("🔐 bcryptjs dynamically imported:", typeof bcryptjs.hash);

    const { token } = req.params;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    console.log("🪪 Decoded Token Data:", decoded);

    const { name, email, password, age, bio, photoUrl } = decoded;

    if (!password) {
      return res.status(400).json({ message: "Invalid or missing password in token." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email is already verified and registered." });
    }

    // ✅ Use bcryptjs for hashing here
    const hashedPassword = await bcryptjs.hash(password, 10);
    console.log("🔑 Password successfully hashed:", hashedPassword.substring(0, 10) + "...");

    const newUser = await User.create({
      name,
      email,
      password, // plain password — will be hashed automatically by Mongoose
      age,
      bio,
      photoUrl,
    });

    console.log("✅ User Created:", newUser.email);
    res.status(201).json({ message: "Email verified. Account created successfully!" });

  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(400).json({ message: "Verification link expired. Please register again." });
    }
    console.error("❌ Verification Error:", error);
    res.status(500).json({ message: "Verification failed", error: error.message });
  }
};

// STEP 3: Login
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "User not found. Please register first." });

    const isMatch = await user.matchPassword(password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials." });

    const token = generateToken({ id: user._id });
    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      bio: user.bio,
      age: user.age,
      photoUrl: user.photoUrl,
      token,
    });
  } catch (error) {
    res.status(500).json({ message: "Login failed", error: error.message });
  }
};

// STEP 4: Get Profile
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch profile", error: error.message });
  }
};