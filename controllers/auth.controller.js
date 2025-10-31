import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import { sendEmail } from "../services/sendEmail.js";

console.log("✅ bcrypt imported:", typeof bcrypt.hash, "from", import.meta.url);

const generateToken = (payload, expiresIn = "7d") =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });

console.log(generateToken);

// STEP 1: Pre-register (send verification email)
export const preRegister = async (req, res) => {
  try {
    const { name, email, password, age, bio, photoUrl, gender, findGender } = req.body;

    // Validate required fields
    if (!gender || !findGender) {
      return res.status(400).json({ 
        message: "Gender and gender preference (findGender) are required." 
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email is already registered." });

    const token = generateToken(
      { name, email, password, age, bio, photoUrl, gender, findGender },
      "15m"
    );

    const verifyLink = `http://localhost:3100/api/auth/verify/${token}`;

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
          <p>If the button doesn't work, copy and paste this link:</p>
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

    const { default: bcryptjs } = await import("bcryptjs");
    console.log("🔐 bcryptjs dynamically imported:", typeof bcryptjs.hash);

    const { token } = req.params;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    console.log("🪪 Decoded Token Data:", decoded);

    const { name, email, password, age, bio, photoUrl, gender, findGender } = decoded;

    if (!password) {
      return res.status(400).json({ message: "Invalid or missing password in token." });
    }

    if (!gender || !findGender) {
      return res.status(400).json({ message: "Invalid or missing gender preferences in token." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email is already verified and registered." });
    }

    const hashedPassword = await bcryptjs.hash(password, 10);
    console.log("🔑 Password successfully hashed:", hashedPassword.substring(0, 10) + "...");

    const newUser = await User.create({
      name,
      email,
      password,
      age,
      bio,
      photoUrl,
      gender,
      findGender,
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
      gender: user.gender,
      findGender: user.findGender,
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

// STEP 5: Update Profile
export const updateProfile = async (req, res) => {
  try {
    const { name, bio, age, photoUrl, gender, findGender } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Update fields if provided
    if (name) user.name = name;
    if (bio !== undefined) user.bio = bio;
    if (age) user.age = age;
    if (photoUrl) user.photoUrl = photoUrl;
    if (gender) user.gender = gender;
    if (findGender) user.findGender = findGender;

    await user.save();

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        bio: user.bio,
        age: user.age,
        photoUrl: user.photoUrl,
        gender: user.gender,
        findGender: user.findGender,
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to update profile", error: error.message });
  }
};

// STEP 6: Get Matching Suggestions
export const getSuggestions = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) return res.status(404).json({ message: "User not found" });

    // Build filter criteria
    const filter = {
      _id: { 
        $nin: [
          currentUser._id,
          ...currentUser.likedUsers,
          ...currentUser.passedUsers,
          ...currentUser.matches
        ]
      }
    };

    // Filter by gender preference
    if (currentUser.findGender !== "everyone") {
      filter.gender = currentUser.findGender;
    }

    // Find matching users
    const suggestions = await User.find(filter)
      .select("-password -likedUsers -passedUsers -matches")
      .limit(20);

    res.status(200).json({
      suggestions,
      total: suggestions.length
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Failed to fetch suggestions", 
      error: error.message 
    });
  }
};

// STEP 7: Pass a user (swipe left)
export const passUser = async (req, res) => {
  try {
    const { passedUserId } = req.body;

    if (!passedUserId) {
      return res.status(400).json({ message: "passedUserId is required" });
    }

    const currentUser = await User.findById(req.user.id);
    if (!currentUser) return res.status(404).json({ message: "User not found" });

    // Check if user already passed
    if (currentUser.passedUsers.includes(passedUserId)) {
      return res.status(400).json({ message: "User already passed" });
    }

    // Add to passedUsers
    currentUser.passedUsers.push(passedUserId);
    await currentUser.save();

    res.status(200).json({ 
      message: "User passed successfully",
      passedUserId 
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Failed to pass user", 
      error: error.message 
    });
  }
};