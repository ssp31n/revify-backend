import express from "express";
import { requireAuth } from "../middlewares/requireAuth.js";
import * as sessionController from "../controllers/sessionController.js";
import * as fileController from "../controllers/fileController.js";
import * as commentController from "../controllers/commentController.js";
import uploadRoutes from "./uploads.js";

const router = express.Router();

// 인증 미들웨어 (모든 세션 관련 요청에 적용)
router.use(requireAuth);

// 세션 기본 CRUD
router.post("/", sessionController.createSession);
router.get("/", sessionController.getMySessions);
router.get("/:id", sessionController.getSessionById);
router.delete("/:id", sessionController.deleteSession);
router.get("/:id/settings", sessionController.getSessionSettings);
router.patch("/:id/settings", sessionController.updateSessionSettings);

// 하위 라우트: 업로드
router.use("/:id/uploads", uploadRoutes);

// 파일 관련 엔드포인트
router.get("/:id/tree", fileController.getFileTree);
router.get("/:id/file", fileController.getFileContent); // query param: ?path=...

// 코멘트 관련 엔드포인트
router.get("/:id/comments", commentController.getComments);
router.post("/:id/comments", commentController.createComment);
router.patch("/:id/comments/:commentId", commentController.updateComment);

export default router;
