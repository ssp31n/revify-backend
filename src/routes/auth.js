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
  (req, res) => {
    // 세션을 명시적으로 저장한 뒤 리디렉션
    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res.redirect("/login-failed");
      }
      // 환경변수에서 클라이언트 URL 가져오기 (없으면 기본값)
      const clientUrl = process.env.CLIENT_URL || "https://revify.my";
      res.redirect(clientUrl);
    });
  }
);

// POST /auth/logout - 로그아웃
router.post("/logout", requireAuth, authController.logout);

// GET /auth/me - 내 정보 확인
router.get(
  "/me",
  (req, res, next) => {
    // 브라우저가 이 응답을 절대 캐시하지 못하게 설정
    res.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    next();
  },
  requireAuth,
  authController.getMe
);

export default router;
