// src/routes/index.js (수정)
import express from "express";
import healthRoutes from "./health.js";
import authRoutes from "./auth.js";
import sessionRoutes from "./sessions.js"; // 추가

const router = express.Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/sessions", sessionRoutes); // 추가

export default router;
