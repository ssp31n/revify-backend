import { v4 as uuidv4 } from "uuid";
import fs from "fs-extra"; // [필수] fs-extra 설치 필요 (npm i fs-extra)
import path from "path";
import Session from "../models/Session.js";
import FileEntry from "../models/FileEntry.js";
import Comment from "../models/Comment.js";
import { permissionService } from "../services/permissionService.js";

const sendResponse = (res, statusCode, data) => {
  res.status(statusCode).json({
    success: true,
    data,
  });
};

// POST /sessions - 세션 생성
export const createSession = async (req, res, next) => {
  try {
    const { title, description, visibility, commentPermission } = req.body;

    // [수정] 생성 시 바로 초대 토큰 발급
    const inviteToken = uuidv4();

    const newSession = await Session.create({
      owner: req.user._id,
      title,
      description,
      visibility,
      commentPermission,
      inviteToken, // 토큰 저장
    });

    await newSession.populate("owner", "displayName avatarUrl");

    // 응답에도 토큰 포함 (클라이언트가 바로 쓸 수 있게)
    const sessionData = newSession.toObject();
    sessionData.inviteToken = inviteToken;

    sendResponse(res, 201, sessionData);
  } catch (error) {
    next(error);
  }
};

// GET /sessions - 내 세션 목록 조회
export const getMySessions = async (req, res, next) => {
  try {
    const sessions = await Session.find({
      $or: [{ owner: req.user._id }, { invitedUsers: req.user._id }],
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("owner", "displayName avatarUrl")
      .select("+inviteToken"); // [수정] 목록 조회 시 inviteToken을 포함하여 반환 (오너에게 필요)

    sendResponse(res, 200, sessions);
  } catch (error) {
    next(error);
  }
};

// ... (나머지 getSessionById, deleteSession, updateSessionSettings 등은 기존 유지) ...
export const getSessionById = async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id).populate(
      "owner",
      "displayName avatarUrl"
    );
    if (!session) {
      const error = new Error("Session not found");
      error.statusCode = 404;
      throw error;
    }
    if (!permissionService.canView(session, req.user)) {
      const error = new Error(
        "You do not have permission to view this session"
      );
      error.statusCode = 403;
      throw error;
    }
    sendResponse(res, 200, session);
  } catch (error) {
    next(error);
  }
};

export const deleteSession = async (req, res, next) => {
  try {
    // 1. 세션 찾기
    const session = await Session.findById(req.params.id);
    if (!session) {
      const error = new Error("Session not found");
      error.statusCode = 404;
      throw error;
    }

    // 2. 권한 확인
    if (!session.owner.equals(req.user._id)) {
      const error = new Error("Only the owner can delete this session");
      error.statusCode = 403;
      throw error;
    }

    // 3. [중요] 자식 데이터(파일 엔트리, 댓글) 먼저 삭제
    // 여기서 에러가 나면 세션도 삭제되지 않으므로 데이터 불일치를 막을 수 있습니다.
    // 주의: FileEntry 스키마에 'sessionId' 필드가 있어야 합니다.
    await Promise.all([
      FileEntry.deleteMany({ session: session._id }),
      Comment.deleteMany({ session: session._id }),
    ]);

    // 4. 물리적 파일 폴더 삭제 (실패해도 DB 삭제는 진행하도록 try-catch 감싸기 가능)
    try {
      const uploadPath = path.join(
        process.cwd(),
        "data",
        "uploads",
        "sessions",
        session._id.toString()
      );
      await fs.remove(uploadPath); // 폴더가 없어도 에러 안 남
    } catch (fsError) {
      console.error("Failed to delete session files:", fsError);
      // 파일 삭제 실패는 치명적이지 않으므로 계속 진행
    }

    // 5. 마지막으로 세션 삭제
    await session.deleteOne();

    sendResponse(res, 200, {
      message: "Session and all related data deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getSessionSettings = async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) {
      const error = new Error("Session not found");
      error.statusCode = 404;
      throw error;
    }
    if (!session.owner.equals(req.user._id)) {
      const error = new Error("Not authorized");
      error.statusCode = 403;
      throw error;
    }
    sendResponse(res, 200, session);
  } catch (error) {
    next(error);
  }
};

export const updateSessionSettings = async (req, res, next) => {
  try {
    const { title, description, visibility, commentPermission } = req.body;
    const session = await Session.findById(req.params.id);
    if (!session) {
      const error = new Error("Session not found");
      error.statusCode = 404;
      throw error;
    }
    if (!session.owner.equals(req.user._id)) {
      const error = new Error("Only the owner can update settings");
      error.statusCode = 403;
      throw error;
    }
    if (title !== undefined) session.title = title;
    if (description !== undefined) session.description = description;
    if (visibility !== undefined) session.visibility = visibility;
    if (commentPermission !== undefined)
      session.commentPermission = commentPermission;

    // [수정] 만약 inviteToken이 없는데 Private으로 바꿨다면 생성
    if (visibility === "private" && !session.inviteToken) {
      session.inviteToken = uuidv4();
    }

    await session.save();
    await session.populate("owner", "displayName avatarUrl");
    sendResponse(res, 200, session);
  } catch (error) {
    next(error);
  }
};

export const refreshInviteToken = async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) {
      const error = new Error("Session not found");
      error.statusCode = 404;
      throw error;
    }
    if (!session.owner.equals(req.user._id)) {
      const error = new Error("Not authorized");
      error.statusCode = 403;
      throw error;
    }
    const token = uuidv4();
    session.inviteToken = token;
    await session.save();
    res.status(200).json({ success: true, data: { inviteToken: token } });
  } catch (error) {
    next(error);
  }
};

export const joinSession = async (req, res, next) => {
  try {
    const { token } = req.params;
    const session = await Session.findOne({ inviteToken: token });
    if (!session) {
      const error = new Error("Invalid or expired invite link");
      error.statusCode = 404;
      throw error;
    }
    if (session.invitedUsers.includes(req.user._id)) {
      return res.status(200).json({
        success: true,
        data: { sessionId: session._id, message: "Already joined" },
      });
    }
    if (session.owner.equals(req.user._id)) {
      return res
        .status(200)
        .json({ success: true, data: { sessionId: session._id } });
    }
    session.invitedUsers.push(req.user._id);
    await session.save();
    res.status(200).json({
      success: true,
      data: {
        sessionId: session._id,
        message: "Successfully joined session",
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getInviteToken = async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id).select(
      "+inviteToken"
    );
    if (!session) {
      const error = new Error("Session not found");
      error.statusCode = 404;
      throw error;
    }
    if (!session.owner.equals(req.user._id)) {
      const error = new Error("Not authorized");
      error.statusCode = 403;
      throw error;
    }
    res
      .status(200)
      .json({ success: true, data: { inviteToken: session.inviteToken } });
  } catch (error) {
    next(error);
  }
};
