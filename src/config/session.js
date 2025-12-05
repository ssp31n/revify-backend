import session from "express-session";
import { RedisStore } from "connect-redis";
import redisClient from "./redis.js";
import dotenv from "dotenv";

dotenv.config();

// 배포 환경(production)인지 확인
const isProduction = process.env.NODE_ENV === "production";

export const sessionConfig = session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET || "dev_secret_key",
  resave: false,
  saveUninitialized: false,
  proxy: true,
  cookie: {
    // [핵심 수정] 프로덕션(HTTPS)일 때만 true, 로컬(HTTP)일 때는 false
    secure: isProduction,
    httpOnly: true,
    // [핵심 수정] 로컬에서는 'lax', 배포(Cross-site)에서는 'none' 또는 'lax'
    // 보통 lax로 통일해도 되지만, 확실하게 하기 위해 조건부 설정
    sameSite: isProduction ? "lax" : "lax",
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7일
  },
});
