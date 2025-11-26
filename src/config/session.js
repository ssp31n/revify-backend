import session from "express-session";
import { RedisStore } from "connect-redis"; // 수정됨: Named Import 사용
import redisClient from "./redis.js";
import dotenv from "dotenv";

dotenv.config();

// 세션 미들웨어 설정 생성 함수
export const sessionConfig = session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET || "dev_secret_key",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7일
    sameSite: "lax",
  },
});
