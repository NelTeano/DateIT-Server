import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import Match from "../models/match.model.js";
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

    const verifyLink = `https://dateitserver.vercel.app/api/auth/verify/${token}`;

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
    return res.redirect('https://dateit.vercel.app/auth');

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

// //**
//  * Get user suggestions (exclude liked, passed, and pending match users)
//  //*/
export const getSuggestions = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get current user to check their preferences
    const currentUser = await User.findById(userId);

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Find all pending matches where current user is involved
    const pendingMatches = await Match.find({
      $or: [
        { user1: userId, status: 'pending' },
        { user2: userId, status: 'pending' }
      ]
    });

    // Extract user IDs from pending matches
    const pendingUserIds = pendingMatches.map(match => {
      return match.user1.toString() === userId 
        ? match.user2.toString() 
        : match.user1.toString();
    });

    // Find all active or ended matches where current user is involved
    const existingMatches = await Match.find({
      $or: [
        { user1: userId, status: { $in: ['active', 'ended'] } },
        { user2: userId, status: { $in: ['active', 'ended'] } }
      ]
    });

    // Extract user IDs from existing matches
    const matchedUserIds = existingMatches.map(match => {
      return match.user1.toString() === userId 
        ? match.user2.toString() 
        : match.user1.toString();
    });

    // Build exclusion list: self + liked + passed + pending + matched users
    const excludedUserIds = [
      userId,
      ...currentUser.likedUsers.map(id => id.toString()),
      ...currentUser.passedUsers.map(id => id.toString()),
      ...pendingUserIds,
      ...matchedUserIds
    ];

    // Remove duplicates
    const uniqueExcludedIds = [...new Set(excludedUserIds)];

    // Build query based on gender preference
    let genderQuery = {};
    if (currentUser.findGender !== 'everyone') {
      genderQuery.gender = currentUser.findGender;
    }

    // Get suggestions
    const suggestions = await User.find({
      _id: { $nin: uniqueExcludedIds },
      ...genderQuery
    })
      .select('name age bio photoUrl gender')
      .limit(20);

    res.status(200).json({
      success: true,
      suggestions,
      count: suggestions.length
    });
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch suggestions",
      error: error.message
    });
  }
};

/**
 * Pass a user
 */
export const passUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const { passedUserId } = req.body;

    if (!passedUserId) {
      return res.status(400).json({
        success: false,
        message: "Passed user ID is required"
      });
    }

    // Add to passed users if not already there
    await User.findByIdAndUpdate(
      userId,
      { $addToSet: { passedUsers: passedUserId } }
    );

    res.status(200).json({
      success: true,
      message: "User passed successfully"
    });
  } catch (error) {
    console.error('Error passing user:', error);
    res.status(500).json({
      success: false,
      message: "Failed to pass user",
      error: error.message
    });
  }
};

/**
 * Like a user and create match
 */
export const likeUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const { likedUserId } = req.body;

    if (!likedUserId) {
      return res.status(400).json({
        success: false,
        message: "Liked user ID is required"
      });
    }

    // Add to liked users if not already there
    await User.findByIdAndUpdate(
      userId,
      { $addToSet: { likedUsers: likedUserId } }
    );

    // Check if the other user has already liked this user
    const otherUser = await User.findById(likedUserId);

    if (!otherUser) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const otherUserLikedBack = otherUser.likedUsers.some(
      id => id.toString() === userId
    );

    let isMatch = false;
    let match = null;

    if (otherUserLikedBack) {
      // It's a match! Create active match
      // Check if match already exists
      const existingMatch = await Match.findOne({
        $or: [
          { user1: userId, user2: likedUserId },
          { user1: likedUserId, user2: userId }
        ]
      });

      if (!existingMatch) {
        match = new Match({
          user1: userId,
          user2: likedUserId,
          status: 'active'
        });
        await match.save();
      } else {
        // Update existing match to active
        existingMatch.status = 'active';
        await existingMatch.save();
        match = existingMatch;
      }

      isMatch = true;
    } else {
      // Create pending match (one-sided like)
      const existingMatch = await Match.findOne({
        $or: [
          { user1: userId, user2: likedUserId },
          { user1: likedUserId, user2: userId }
        ]
      });

      if (!existingMatch) {
        match = new Match({
          user1: userId,
          user2: likedUserId,
          status: 'pending'
        });
        await match.save();
      }
    }

    res.status(200).json({
      success: true,
      message: isMatch ? "It's a match!" : "Like sent successfully",
      isMatch,
      matchId: match?._id
    });
  } catch (error) {
    console.error('Error liking user:', error);
    res.status(500).json({
      success: false,
      message: "Failed to like user",
      error: error.message
    });
  }
};