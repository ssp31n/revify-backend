import express from "express";
import healthRoutes from "./health.js";
import authRoutes from "./auth.js";

const router = express.Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);

export default router;
