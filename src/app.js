import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import routes from "./routes/index.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";

const app = express();

// 기본 미들웨어 설정
app.use(helmet()); // 보안 헤더
app.use(cors()); // CORS 허용 (추후 배포 시 특정 도메인으로 제한 필요)
app.use(express.json()); // JSON 파싱
app.use(express.urlencoded({ extended: true }));

// 로깅 (테스트 환경이 아닐 때만)
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// 라우트 연결
app.use("/", routes);

// 404 처리
app.use(notFoundHandler);

// 공통 에러 처리
app.use(errorHandler);

export default app;
