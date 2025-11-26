import session from "express-session";
import { RedisStore } from "connect-redis";
import redisClient from "./redis.js";
import dotenv from "dotenv";

dotenv.config();

// 환경 변수 체크: 배포 환경이어도 HTTPS가 아니면 secure를 꺼야 함
const isProduction = process.env.NODE_ENV === "production";

export const sessionConfig = session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET || "dev_secret_key",
  resave: false,
  saveUninitialized: false,
  proxy: true, // [추가됨] 프록시 환경에서 쿠키 설정 허용
  cookie: {
    // [수정됨] 로컬 Docker 환경(http://localhost)에서는 secure가 false여야 함
    // 실제 배포 시 SSL을 적용한다면 true로 해야 하지만,
    // 지금은 Nginx가 80포트(HTTP)를 쓰고 있으므로 false로 강제하거나 조건을 풉니다.
    secure: false, // 일단 확실한 동작을 위해 false로 변경 (나중에 SSL 적용 시 true로 변경)
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7일
    sameSite: "lax", // CSRF 보호 수준
  },
});
