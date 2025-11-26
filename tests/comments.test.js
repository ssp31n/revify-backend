import request from "supertest";
import mongoose from "mongoose";
import app from "../src/app.js";
import User from "../src/models/User.js";
import Session from "../src/models/Session.js";
import Comment from "../src/models/Comment.js";
import redisClient from "../src/config/redis.js";

let owner, commenter, session;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI);
  }
  await User.deleteMany({});
  await Session.deleteMany({});
  await Comment.deleteMany({});

  // 유저 생성
  owner = await User.create({
    provider: "google",
    providerId: "owner_1",
    displayName: "Owner",
    email: "owner@test.com",
  });

  commenter = await User.create({
    provider: "google",
    providerId: "commenter_1",
    displayName: "Commenter",
    email: "commenter@test.com",
  });

  // 세션 생성 (Everyone can comment)
  session = await Session.create({
    owner: owner._id,
    title: "Comment Test Session",
    visibility: "public",
    commentPermission: "everyone",
  });
});

afterAll(async () => {
  await User.deleteMany({});
  await Session.deleteMany({});
  await Comment.deleteMany({});
  await mongoose.connection.close();
  await redisClient.disconnect();
});

describe("Comment API", () => {
  let commentId;

  // 1. 코멘트 생성 테스트
  it("should allow creating a comment", async () => {
    const res = await request(app)
      .post(`/sessions/${session._id}/comments`)
      .set("x-test-user-id", commenter._id.toString())
      .send({
        filePath: "src/index.js",
        startLine: 10,
        endLine: 12,
        content: "This looks buggy.",
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body.data.content).toBe("This looks buggy.");
    commentId = res.body.data._id;
  });

  // 2. 코멘트 조회 테스트
  it("should get all comments for session", async () => {
    const res = await request(app)
      .get(`/sessions/${session._id}/comments`)
      .set("x-test-user-id", owner._id.toString());

    expect(res.statusCode).toEqual(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].filePath).toBe("src/index.js");
  });

  // 3. 코멘트 수정 (작성자)
  it("should allow author to edit comment", async () => {
    const res = await request(app)
      .patch(`/sessions/${session._id}/comments/${commentId}`)
      .set("x-test-user-id", commenter._id.toString())
      .send({ content: "Fixed typo." });

    expect(res.statusCode).toEqual(200);
    expect(res.body.data.content).toBe("Fixed typo.");
  });

  // 4. 코멘트 수정 권한 체크 (다른 사람)
  it("should forbid non-author from editing content", async () => {
    const res = await request(app)
      .patch(`/sessions/${session._id}/comments/${commentId}`)
      .set("x-test-user-id", owner._id.toString()) // Owner tries to edit content
      .send({ content: "I am hacking." });

    expect(res.statusCode).toEqual(403);
  });

  // 5. 코멘트 해결 (Owner는 가능)
  it("should allow owner to resolve comment", async () => {
    const res = await request(app)
      .patch(`/sessions/${session._id}/comments/${commentId}`)
      .set("x-test-user-id", owner._id.toString())
      .send({ resolved: true });

    expect(res.statusCode).toEqual(200);
    expect(res.body.data.resolved).toBe(true);
  });
});
