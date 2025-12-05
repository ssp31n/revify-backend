import express from "express";
import { requireAuth } from "../middlewares/requireAuth.js";
import * as sessionController from "../controllers/sessionController.js";
import * as fileController from "../controllers/fileController.js";
import * as commentController from "../controllers/commentController.js";
import uploadRoutes from "./uploads.js";

const router = express.Router();

router.use(requireAuth);

// ... (기존 라우트들) ...
router.post("/", sessionController.createSession);
router.get("/", sessionController.getMySessions);
router.get("/:id", sessionController.getSessionById);
router.delete("/:id", sessionController.deleteSession);
router.get("/:id/settings", sessionController.getSessionSettings);
router.patch("/:id/settings", sessionController.updateSessionSettings);

// [추가] 초대 관련 라우트
router.get("/:id/invite-token", sessionController.getInviteToken); // 토큰 조회
router.post("/:id/invite-token", sessionController.refreshInviteToken); // 토큰 생성/갱신
router.post("/join/:token", sessionController.joinSession); // 링크 접속 (세션 ID 필요 없음, 토큰만으로 식별)

// ... (나머지 업로드, 파일, 코멘트 라우트 유지) ...
router.use("/:id/uploads", uploadRoutes);
router.get("/:id/tree", fileController.getFileTree);
router.get("/:id/file", fileController.getFileContent);
router.get("/:id/comments", commentController.getComments);
router.post("/:id/comments", commentController.createComment);
router.patch("/:id/comments/:commentId", commentController.updateComment);

export default router;
