import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import passport from "passport";
import { sessionConfig } from "./config/session.js";
import "./config/passport.js"; // Passport 설정 로드
import routes from "./routes/index.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";

const app = express();

app.set("trust proxy", 1);

app.use(helmet());

const allowedOrigins = [
  process.env.CLIENT_URL, // 배포 주소 (https://revify.my)
  "http://localhost:5173", // 로컬 프론트엔드
  "http://127.0.0.1:5173",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // origin이 없으면(서버간 통신 등) 허용, 리스트에 있으면 허용
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true, // 쿠키 전달 허용 필수
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// 세션 및 인증 미들웨어 (라우트보다 먼저 선언되어야 함)
app.use(sessionConfig);
app.use(passport.initialize());
app.use(passport.session());

app.use("/", routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
