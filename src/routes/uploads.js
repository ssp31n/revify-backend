import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs-extra";
import { requireAuth } from "../middlewares/requireAuth.js";
import * as uploadController from "../controllers/uploadController.js";

const router = express.Router({ mergeParams: true }); // :id 파라미터 상속

// Multer 임시 저장소 설정
const uploadDir = path.join(process.cwd(), "data", "temp_uploads");
fs.ensureDirSync(uploadDir); // 폴더 생성

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 충돌 방지를 위해 timestamp + random 접미사
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + ".zip");
  },
});

// ZIP 파일만 허용
const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "application/zip" ||
    file.mimetype === "application/x-zip-compressed" ||
    path.extname(file.originalname).toLowerCase() === ".zip"
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only ZIP files are allowed"), false);
  }
};

const upload = multer({ storage, fileFilter });

// 업로드 엔드포인트
router.post(
  "/",
  requireAuth,
  upload.single("file"), // 'file'이라는 필드명으로 전송
  uploadController.uploadFile
);

// SSE 엔드포인트
router.get(
  "/:uploadId/events",
  // requireAuth는 선택사항 (uploadId가 난수라 보안성 있음)이지만 안전을 위해 추가 권장
  // 여기서는 브라우저 EventSource 연결의 편의상 쿠키 인증이 된다고 가정하고 추가
  requireAuth,
  uploadController.streamUploadEvents
);

export default router;
