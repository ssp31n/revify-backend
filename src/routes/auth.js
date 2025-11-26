import express from "express";
import passport from "passport";
import * as authController from "../controllers/authController.js";
import { requireAuth } from "../middlewares/requireAuth.js";

const router = express.Router();

// GET /auth/google - 구글 로그인 시작
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// GET /auth/google/callback - 구글 로그인 콜백
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login-failed" }),
  authController.googleCallback
);

// POST /auth/logout - 로그아웃
router.post("/logout", requireAuth, authController.logout);

// GET /auth/me - 내 정보 확인
router.get("/me", requireAuth, authController.getMe);

export default router;
