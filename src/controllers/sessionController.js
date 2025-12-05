import { v4 as uuidv4 } from "uuid";
import Session from "../models/Session.js";
import { permissionService } from "../services/permissionService.js";

// 공통 응답 헬퍼
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

    const newSession = await Session.create({
      owner: req.user._id,
      title,
      description,
      visibility,
      commentPermission,
    });

    sendResponse(res, 201, newSession);
  } catch (error) {
    next(error);
  }
};

// GET /sessions - 내 세션 목록 조회
export const getMySessions = async (req, res, next) => {
  try {
    // 내가 만든 세션 + 내가 초대된 세션 모두 조회
    const sessions = await Session.find({
      $or: [{ owner: req.user._id }, { invitedUsers: req.user._id }],
    })
      .sort({ createdAt: -1 })
      .limit(50);

    sendResponse(res, 200, sessions);
  } catch (error) {
    next(error);
  }
};

// GET /sessions/:id - 세션 상세 조회
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

// DELETE /sessions/:id - 세션 삭제
export const deleteSession = async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      const error = new Error("Session not found");
      error.statusCode = 404;
      throw error;
    }

    if (!session.owner.equals(req.user._id)) {
      const error = new Error("Only the owner can delete this session");
      error.statusCode = 403;
      throw error;
    }

    await session.deleteOne();

    sendResponse(res, 200, { message: "Session deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// GET /sessions/:id/settings - 설정 조회
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

// PATCH /sessions/:id/settings - 설정 수정
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

    await session.save();

    sendResponse(res, 200, session);
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------
// [추가된 기능] 초대 관련 컨트롤러
// ---------------------------------------------------------

// POST /sessions/:id/invite-token (초대 링크 생성/재생성)
export const refreshInviteToken = async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) {
      const error = new Error("Session not found");
      error.statusCode = 404;
      throw error;
    }

    // 오너만 초대 링크 생성 가능
    if (!session.owner.equals(req.user._id)) {
      const error = new Error("Not authorized");
      error.statusCode = 403;
      throw error;
    }

    // 새 토큰 생성
    const token = uuidv4();
    session.inviteToken = token;
    await session.save();

    res.status(200).json({
      success: true,
      data: { inviteToken: token },
    });
  } catch (error) {
    next(error);
  }
};

// POST /sessions/join/:token (초대 링크로 참여)
export const joinSession = async (req, res, next) => {
  try {
    const { token } = req.params;

    // 토큰으로 세션 찾기
    const session = await Session.findOne({ inviteToken: token });
    if (!session) {
      const error = new Error("Invalid or expired invite link");
      error.statusCode = 404;
      throw error;
    }

    // 이미 초대된 유저인지 확인
    if (session.invitedUsers.includes(req.user._id)) {
      return res.status(200).json({
        success: true,
        data: { sessionId: session._id, message: "Already joined" },
      });
    }

    // 오너가 자기 링크를 누른 경우 (그냥 통과)
    if (session.owner.equals(req.user._id)) {
      return res.status(200).json({
        success: true,
        data: { sessionId: session._id },
      });
    }

    // 유저 추가
    session.invitedUsers.push(req.user._id);
    await session.save();

    res.status(200).json({
      success: true,
      data: { sessionId: session._id, message: "Successfully joined session" },
    });
  } catch (error) {
    next(error);
  }
};

// GET /sessions/:id/invite-token (오너용 토큰 조회)
export const getInviteToken = async (req, res, next) => {
  try {
    // inviteToken은 select: false이므로 명시적으로 select 해야 함
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

    res.status(200).json({
      success: true,
      data: { inviteToken: session.inviteToken },
    });
  } catch (error) {
    next(error);
  }
};
