import express from "express";
import { preRegister, verifyEmail, loginUser, getProfile } from "../controllers/auth.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";


const router = express.Router();

// Step 1: Request verification email
router.post("/pre-register", preRegister);

// Step 2: Verify email and create account
router.get("/verify/:token", verifyEmail);

// Existing routes
router.post("/login", loginUser);
router.get("/profile", verifyToken, getProfile);

export default router;