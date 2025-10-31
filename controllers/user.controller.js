import User from "../models/user.model.js";
import bcrypt from "bcryptjs";

export const getMyProfile = async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware

    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: "User not found" 
      });
    }

    res.status(200).json({
      success: true,
      _id: user._id,
      name: user.name,
      email: user.email,
      age: user.age,
      bio: user.bio,
      photoUrl: user.photoUrl,
      gender: user.gender,
      findGender: user.findGender,
      createdAt: user.createdAt
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch profile", 
      error: error.message 
    });
  }
};

/**
 * Update current user's profile
 */
export const updateMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, age, bio, photoUrl, gender, findGender } = req.body;

    // Validate required fields
    if (!name || !gender || !findGender) {
      return res.status(400).json({
        success: false,
        message: "Name, gender, and gender preference are required"
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: "User not found" 
      });
    }

    // Update fields
    user.name = name;
    user.gender = gender;
    user.findGender = findGender;
    
    // Optional fields
    if (age !== undefined) user.age = age;
    if (bio !== undefined) user.bio = bio;
    if (photoUrl !== undefined) user.photoUrl = photoUrl;

    await user.save();

    // Return updated user without password
    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        age: user.age,
        bio: user.bio,
        photoUrl: user.photoUrl,
        gender: user.gender,
        findGender: user.findGender
      }
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ 
      success: false,
      message: "Failed to update profile", 
      error: error.message 
    });
  }
};