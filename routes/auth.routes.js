import express from "express";
import { preRegister, verifyEmail, loginUser, getProfile, updateProfile, getSuggestions, passUser, likeUser } from "../controllers/auth.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Step 1: Request verification email
router.post("/pre-register", preRegister);

// Step 2: Verify email and create account
router.get("/verify/:token", verifyEmail);

// Existing routes
router.post("/login", loginUser);

// Protected routes (require authentication)
router.get("/profile", verifyToken, getProfile);
router.put("/profile", verifyToken, updateProfile);
router.get("/suggestions", verifyToken, getSuggestions);
router.post("/pass", verifyToken, passUser);
router.post("/like", verifyToken, likeUser);

export default router;