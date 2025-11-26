import request from "supertest";
import app from "../src/app.js";
import redisClient from "../src/config/redis.js";
import mongoose from "mongoose";

// 테스트 종료 후 리소스 정리
afterAll(async () => {
  await redisClient.disconnect();
  // mongoose 연결이 있다면 종료 (현재 단계에서는 mock이 없으면 연결 시도 안할 수 있으나 안전하게)
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});

describe("Auth Endpoints", () => {
  // 1. 미인증 상태 테스트
  describe("GET /auth/me (Unauthenticated)", () => {
    it("should return 401 Unauthorized", async () => {
      const res = await request(app).get("/auth/me");
      expect(res.statusCode).toEqual(401);
      expect(res.body.success).toBe(false);
    });
  });

  // 2. 로그아웃 테스트 (미인증 상태에서 호출 시 requireAuth에 걸림)
  describe("POST /auth/logout", () => {
    it("should return 401 if not logged in", async () => {
      const res = await request(app).post("/auth/logout");
      expect(res.statusCode).toEqual(401);
    });
  });

  // 3. OAuth 리다이렉트 테스트
  describe("GET /auth/google", () => {
    it("should redirect to Google OAuth page", async () => {
      const res = await request(app).get("/auth/google");
      expect(res.statusCode).toEqual(302); // 리다이렉트
      expect(res.headers.location).toMatch(/accounts\.google\.com/);
    });
  });
});
