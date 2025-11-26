import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

export const connectDB = async () => {
  try {
    let dbUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/revify";

    // 테스트 환경 감지 및 DB 이름 변경
    if (process.env.NODE_ENV === "test") {
      console.log("🧪 [TEST MODE] Detected. Switching Database...");

      // 1. URL 끝의 슬래시(/) 제거
      if (dbUri.endsWith("/")) {
        dbUri = dbUri.slice(0, -1);
      }

      // 2. 쿼리 파라미터가 없는 경우, DB명 뒤에 _test 붙이기
      if (!dbUri.includes("?")) {
        const parts = dbUri.split("/");
        const dbName = parts.pop(); // 마지막 부분이 DB 이름

        if (dbName && !dbName.includes("_test")) {
          dbUri = `${parts.join("/")}/${dbName}_test`;
        }
      }

      console.log(`🧪 [TEST MODE] Connecting to: ${dbUri}`);
    }

    const conn = await mongoose.connect(dbUri);

    if (process.env.NODE_ENV !== "test") {
      console.log(`MongoDB Connected: ${conn.connection.host}`);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};
