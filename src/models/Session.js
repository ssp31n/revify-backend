import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
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
      enum: ["owner", "invited", "everyone"],
      default: "everyone",
    },
    status: {
      type: String,
      enum: ["created", "uploading", "ready", "error"],
      default: "created",
    },
    // [추가됨] 초대된 사용자 목록 (Private 세션 접근 가능)
    invitedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    // [추가됨] 초대 링크용 토큰 (이 토큰을 가진 링크로 접속하면 invitedUsers에 추가됨)
    inviteToken: {
      type: String,
      select: false, // 기본 조회 시에는 노출되지 않도록 설정 (보안)
    },
    expiresAt: {
      type: Date,
      default: () => new Date(+new Date() + 7 * 24 * 60 * 60 * 1000),
      index: { expires: "0s" },
    },
  },
  {
    timestamps: true,
  }
);

const Session = mongoose.model("Session", sessionSchema);
export default Session;
