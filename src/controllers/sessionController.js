import Session from "../models/Session.js";

// 공통 응답 헬퍼 (파일 내부에 둠)
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
    const sessions = await Session.find({ owner: req.user._id })
      .sort({ createdAt: -1 }) // 최신순
      .limit(50); // 개수 제한

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

    // 권한 체크: Private이면서 주인이 아닌 경우 접근 불가
    // (Link나 Public은 로그인한 누구나 볼 수 있다고 가정 - 기획서 상 '공유' 목적)
    if (
      session.visibility === "private" &&
      !session.owner._id.equals(req.user._id)
    ) {
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

    // 권한 체크: 주인만 삭제 가능
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

// GET /sessions/:id/settings - 설정 조회 (주인만)
// (사실 getSessionById로 충분할 수 있으나, 명시적인 설정 뷰를 위해 분리 가능. 여기선 간단히 구현)
export const getSessionSettings = async (req, res, next) => {
  // getSessionById와 유사하지만, 여기서는 무조건 주인인지 체크
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

    // 필드 업데이트
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
