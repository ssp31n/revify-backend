import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // 내 세션 목록 조회 성능 향상
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxLength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxLength: 500,
    },
    visibility: {
      type: String,
      enum: ["private", "link", "public"],
      default: "link",
    },
    commentPermission: {
      type: String,
      enum: ["owner", "invited", "everyone"], // 'anyoneWithLink'를 everyone으로 간소화
      default: "everyone",
    },
    status: {
      type: String,
      enum: ["created", "uploading", "ready", "error"],
      default: "created",
    },
    // TTL: 세션 만료 시간 (기본 7일 후)
    expiresAt: {
      type: Date,
      default: () => new Date(+new Date() + 7 * 24 * 60 * 60 * 1000),
      index: { expires: "0s" }, // 이 시간이 되면 자동 삭제
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

const Session = mongoose.model("Session", sessionSchema);
export default Session;
