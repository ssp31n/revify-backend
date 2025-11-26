import FileEntry from "../models/FileEntry.js";
import Session from "../models/Session.js";
import fs from "fs-extra";
import { permissionService } from "../services/permissionService.js";

// GET /sessions/:id/tree
export const getFileTree = async (req, res, next) => {
  try {
    const { id } = req.params;
    const session = await Session.findById(id);

    if (!session) {
      const error = new Error("Session not found");
      error.statusCode = 404;
      throw error;
    }

    if (!permissionService.canView(session, req.user)) {
      const error = new Error("Not authorized to view this session");
      error.statusCode = 403;
      throw error;
    }

    // 모든 파일 엔트리를 가져와서 Path 기준으로 정렬
    // 프론트엔드가 트리 구조를 만들기 쉽도록 Flat List로 반환
    const files = await FileEntry.find({ session: id })
      .select("path name isDirectory size language updatedAt")
      .sort({ path: 1 });

    res.status(200).json({
      success: true,
      data: files,
    });
  } catch (error) {
    next(error);
  }
};

// GET /sessions/:id/file?path=...
export const getFileContent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const filePath = req.query.path;

    if (!filePath) {
      const error = new Error("File path is required");
      error.statusCode = 400;
      throw error;
    }

    const session = await Session.findById(id);
    if (!session) {
      const error = new Error("Session not found");
      error.statusCode = 404;
      throw error;
    }

    if (!permissionService.canView(session, req.user)) {
      const error = new Error("Not authorized");
      error.statusCode = 403;
      throw error;
    }

    const fileEntry = await FileEntry.findOne({ session: id, path: filePath });
    if (!fileEntry || fileEntry.isDirectory) {
      const error = new Error("File not found or is a directory");
      error.statusCode = 404;
      throw error;
    }

    // 파일 크기 제한 (예: 1MB)
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (fileEntry.size > MAX_SIZE) {
      return res.status(413).json({
        success: false,
        error: {
          message: "File too large to view directly",
          code: "FILE_TOO_LARGE",
        },
      });
    }

    // 실제 파일 읽기
    // storageKey는 로컬 절대 경로로 저장되어 있음
    try {
      const content = await fs.readFile(fileEntry.storageKey, "utf-8");
      res.status(200).json({
        success: true,
        data: {
          content,
          language: fileEntry.language,
          size: fileEntry.size,
        },
      });
    } catch (err) {
      // 바이너리 파일이거나 읽기 실패 시
      const error = new Error(
        "Could not read file content (binary or corrupted)"
      );
      error.statusCode = 422;
      throw error;
    }
  } catch (error) {
    next(error);
  }
};
