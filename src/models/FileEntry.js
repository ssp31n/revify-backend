import mongoose from "mongoose";

const fileEntrySchema = new mongoose.Schema(
  {
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true,
      index: true,
    },
    // 파일의 전체 경로 (예: "src/components/Button.jsx")
    path: {
      type: String,
      required: true,
      index: true,
    },
    // 파일명 (예: "Button.jsx")
    name: {
      type: String,
      required: true,
    },
    // 디렉토리 여부
    isDirectory: {
      type: Boolean,
      default: false,
    },
    // 파일 크기 (바이트)
    size: {
      type: Number,
      default: 0,
    },
    // 프로그래밍 언어 감지 (확장자 기반 등, 추후 분석용)
    language: {
      type: String,
    },
    // 실제 저장소에서의 키 (로컬의 경우 파일 경로, S3의 경우 Object Key)
    storageKey: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// 한 세션 내에서 경로는 유일해야 함
fileEntrySchema.index({ session: 1, path: 1 }, { unique: true });

const FileEntry = mongoose.model("FileEntry", fileEntrySchema);
export default FileEntry;
