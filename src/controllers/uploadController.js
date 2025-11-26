import { v4 as uuidv4 } from "uuid";
import Session from "../models/Session.js";
import { uploadService } from "../services/uploadService.js";

// POST /sessions/:id/uploads
export const uploadFile = async (req, res, next) => {
  try {
    const sessionId = req.params.id;
    const file = req.file; // multer가 처리한 파일

    if (!file) {
      const error = new Error("No file uploaded");
      error.statusCode = 400;
      throw error;
    }

    const session = await Session.findById(sessionId);
    if (!session) {
      const error = new Error("Session not found");
      error.statusCode = 404;
      throw error;
    }

    // 권한 체크: 오너만 업로드 가능
    if (!session.owner.equals(req.user._id)) {
      const error = new Error("Not authorized to upload to this session");
      error.statusCode = 403;
      throw error;
    }

    // 업로드 작업 ID 발급
    const uploadId = uuidv4();

    // 백그라운드 처리 시작 (await 하지 않음)
    uploadService.processUpload(uploadId, sessionId, file.path);

    // 즉시 응답 반환 (202 Accepted)
    res.status(202).json({
      success: true,
      data: {
        uploadId,
        message: "File accepted. Processing started.",
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /sessions/:id/uploads/:uploadId/events
export const streamUploadEvents = (req, res) => {
  const { uploadId } = req.params;

  // SSE 헤더 설정
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  // 서비스에 리스너 등록
  uploadService.subscribe(uploadId, res);
};
