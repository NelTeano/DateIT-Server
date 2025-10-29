import User from "../models/user.model.js";
import bcrypt from "bcryptjs";

// 🟢 Create User
export const createUser = async (req, res) => {
  try {
    const { name, email, password, bio, age, photoUrl } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ success: false, message: "Email already exists" });

    const newUser = await User.create({ name, email, password, bio, age, photoUrl });
    res.status(201).json({ success: true, user: newUser });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 🟡 Get All Users
export const getUsers = async (req, res) => {
  try {
    const users = await User.find().populate("likedUsers", "name email").populate("matches", "user1 user2");
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 🟣 Get Single User by ID
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate("likedUsers", "name email")
      .populate("matches", "user1 user2");

    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 🟠 Update User
export const updateUser = async (req, res) => {
  try {
    const { name, email, password, bio, age, photoUrl } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // Update fields
    user.name = name ?? user.name;
    user.email = email ?? user.email;
    user.bio = bio ?? user.bio;
    user.age = age ?? user.age;
    user.photoUrl = photoUrl ?? user.photoUrl;

    // Rehash password if changed
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    await user.save();
    res.json({ success: true, message: "User updated successfully", user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 🔴 Delete User
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
