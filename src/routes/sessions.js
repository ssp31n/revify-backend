import express from "express";
import { requireAuth } from "../middlewares/requireAuth.js";
import * as sessionController from "../controllers/sessionController.js";

const router = express.Router();

// 모든 세션 API는 기본적으로 인증 필요
router.use(requireAuth);

router.post("/", sessionController.createSession);
router.get("/", sessionController.getMySessions);
router.get("/:id", sessionController.getSessionById);
router.delete("/:id", sessionController.deleteSession);

// 설정 관련
router.get("/:id/settings", sessionController.getSessionSettings);
router.patch("/:id/settings", sessionController.updateSessionSettings);

export default router;
