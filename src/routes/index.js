import express from "express";
import healthRoutes from "./health.js";

const router = express.Router();

// 헬스 체크 라우트 등록
router.use("/health", healthRoutes);

export default router;
