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

    // [수정] dbName 옵션 추가: URI 파싱 실패를 대비해 DB 이름을 명시적으로 지정
    const conn = await mongoose.connect(dbUri, {
      dbName: "revify", // <-- 이 옵션이 있으면 URI 뒤에 뭐가 붙든 무조건 revify DB를 씁니다.
    });

    if (process.env.NODE_ENV !== "test") {
      console.log(`MongoDB Connected: ${conn.connection.host}`);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};
