import express from "express";
import { getMyProfile, updateMyProfile } from "../controllers/user.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Get my profile
router.get("/profile", verifyToken, getMyProfile);

// Update my profile
router.put("/profile", verifyToken, updateMyProfile);

export default router;