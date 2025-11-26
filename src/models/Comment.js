import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true,
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // 파일 경로 (FileEntry의 path와 일치)
    filePath: {
      type: String,
      required: true,
    },
    // 라인 번호 (0이면 파일 전체 코멘트, 범위 선택 시 start/end)
    startLine: {
      type: Number,
      default: 0,
    },
    endLine: {
      type: Number,
      default: 0,
    },
    content: {
      type: String,
      required: true,
      maxLength: 2000,
    },
    // 해결 여부 (코드 리뷰 완료 표시)
    resolved: {
      type: Boolean,
      default: false,
    },
    // 대댓글 (부모 코멘트 ID, 최상위는 null)
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const Comment = mongoose.model("Comment", commentSchema);
export default Comment;
