import express from "express";
import { requireAuth } from "../middlewares/requireAuth.js";
import * as sessionController from "../controllers/sessionController.js";
import uploadRoutes from "./uploads.js"; // 추가

const router = express.Router();

router.use(requireAuth);

router.post("/", sessionController.createSession);
router.get("/", sessionController.getMySessions);
router.get("/:id", sessionController.getSessionById);
router.delete("/:id", sessionController.deleteSession);
router.get("/:id/settings", sessionController.getSessionSettings);
router.patch("/:id/settings", sessionController.updateSessionSettings);

// 세션 하위의 업로드 라우트 연결 (/sessions/:id/uploads)
router.use("/:id/uploads", uploadRoutes); // 추가

export default router;
