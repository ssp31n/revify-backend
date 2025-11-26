import Comment from "../models/Comment.js";
import Session from "../models/Session.js";
import { permissionService } from "../services/permissionService.js";

// GET /sessions/:id/comments
export const getComments = async (req, res, next) => {
  try {
    const { id } = req.params;
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

    const comments = await Comment.find({ session: id })
      .populate("author", "displayName avatarUrl")
      .sort({ createdAt: 1 }); // 시간순 정렬

    res.status(200).json({
      success: true,
      data: comments,
    });
  } catch (error) {
    next(error);
  }
};

// POST /sessions/:id/comments
export const createComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { filePath, startLine, endLine, content, parentComment } = req.body;

    const session = await Session.findById(id);
    if (!session) {
      const error = new Error("Session not found");
      error.statusCode = 404;
      throw error;
    }

    if (!permissionService.canComment(session, req.user)) {
      const error = new Error("You do not have permission to comment");
      error.statusCode = 403;
      throw error;
    }

    const newComment = await Comment.create({
      session: id,
      author: req.user._id,
      filePath,
      startLine,
      endLine,
      content,
      parentComment: parentComment || null,
    });

    // 작성자 정보 채워서 반환
    await newComment.populate("author", "displayName avatarUrl");

    res.status(201).json({
      success: true,
      data: newComment,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /sessions/:id/comments/:commentId
export const updateComment = async (req, res, next) => {
  try {
    const { id, commentId } = req.params;
    const { content, resolved } = req.body;

    const session = await Session.findById(id);
    const comment = await Comment.findById(commentId);

    if (!session || !comment) {
      const error = new Error("Resource not found");
      error.statusCode = 404;
      throw error;
    }

    const isOwner = permissionService.canManage(session, req.user);
    const isAuthor = comment.author.equals(req.user._id);

    // 내용 수정: 작성자만 가능
    if (content !== undefined) {
      if (!isAuthor) {
        const error = new Error("Only the author can edit the comment");
        error.statusCode = 403;
        throw error;
      }
      comment.content = content;
    }

    // 해결 상태 변경: 작성자 또는 세션 주인만 가능
    if (resolved !== undefined) {
      if (!isAuthor && !isOwner) {
        const error = new Error("Not authorized to resolve this comment");
        error.statusCode = 403;
        throw error;
      }
      comment.resolved = resolved;
    }

    await comment.save();
    await comment.populate("author", "displayName avatarUrl");

    res.status(200).json({
      success: true,
      data: comment,
    });
  } catch (error) {
    next(error);
  }
};
