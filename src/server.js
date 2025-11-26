import app from "./app.js";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js"; // 방금 만든 파일 import

dotenv.config();

const PORT = process.env.PORT || 3000;

// DB 연결 후 서버 시작 (비동기 처리)
const startServer = async () => {
  try {
    await connectDB(); // DB 연결 대기

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

startServer();
