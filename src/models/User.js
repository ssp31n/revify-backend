import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      required: true,
      enum: ["google"], // 추후 github 등 확장 가능
      description: "OAuth 제공자 (예: google)",
    },
    providerId: {
      type: String,
      required: true,
      description: "제공자로부터 받은 고유 ID",
    },
    displayName: {
      type: String,
      required: true,
      description: "사용자 표시 이름",
    },
    email: {
      type: String,
      required: true,
      description: "사용자 이메일",
    },
    avatarUrl: {
      type: String,
      description: "프로필 이미지 URL",
    },
  },
  {
    timestamps: true, // createdAt, updatedAt 자동 생성
  }
);

// 동일한 provider 내에서 providerId는 유일해야 함
userSchema.index({ provider: 1, providerId: 1 }, { unique: true });

const User = mongoose.model("User", userSchema);

export default User;
