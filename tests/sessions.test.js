import request from "supertest";
import mongoose from "mongoose";
import app from "../src/app.js";
import User from "../src/models/User.js";
import Session from "../src/models/Session.js";
import redisClient from "../src/config/redis.js";
import { connectDB } from "../src/config/db.js";

// 테스트 데이터
let userA, userB;
let tokenUserA, tokenUserB; // 헤더값 (ID)

beforeAll(async () => {
  // [수정됨] mongoose.connect 대신 connectDB() 사용
  await connectDB();

  // 테스트 유저 생성
  await User.deleteMany({});
  await Session.deleteMany({});

  userA = await User.create({
    provider: "google",
    providerId: "test_1",
    displayName: "User A",
    email: "a@test.com",
  });

  userB = await User.create({
    provider: "google",
    providerId: "test_2",
    displayName: "User B",
    email: "b@test.com",
  });
});

afterAll(async () => {
  await User.deleteMany({});
  await Session.deleteMany({});
  await mongoose.connection.close();
  await redisClient.disconnect();
});

describe("Session API", () => {
  let createdSessionId;

  // 1. 미인증 접근 차단
  it("should return 401 if not authenticated", async () => {
    const res = await request(app).post("/sessions").send({ title: "Fail" });
    expect(res.statusCode).toEqual(401);
  });

  // 2. 세션 생성 (User A)
  it("should create a session for authenticated user", async () => {
    const res = await request(app)
      .post("/sessions")
      .set("x-test-user-id", userA._id.toString()) // Mock Auth
      .send({
        title: "User A Session",
        description: "Test Description",
        visibility: "public",
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe("User A Session");
    expect(res.body.data.owner).toBe(userA._id.toString());

    createdSessionId = res.body.data._id;
  });

  // 3. 내 세션 목록 조회
  it("should list my sessions", async () => {
    const res = await request(app)
      .get("/sessions")
      .set("x-test-user-id", userA._id.toString());

    expect(res.statusCode).toEqual(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0]._id).toBe(createdSessionId);
  });

  // 4. 권한 체크: 다른 유저(User B)가 A의 세션 설정 수정 시도 -> 실패
  it("should forbid non-owner from updating settings", async () => {
    const res = await request(app)
      .patch(`/sessions/${createdSessionId}/settings`)
      .set("x-test-user-id", userB._id.toString())
      .send({ title: "Hacked Title" });

    expect(res.statusCode).toEqual(403);
  });

  // 5. 권한 체크: 주인(User A)이 세션 삭제 -> 성공
  it("should allow owner to delete session", async () => {
    const res = await request(app)
      .delete(`/sessions/${createdSessionId}`)
      .set("x-test-user-id", userA._id.toString());

    expect(res.statusCode).toEqual(200);

    // DB에서 삭제 확인
    const session = await Session.findById(createdSessionId);
    expect(session).toBeNull();
  });
});
