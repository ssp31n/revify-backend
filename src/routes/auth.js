import express from "express";
import passport from "passport";
import * as authController from "../controllers/authController.js";
import { requireAuth } from "../middlewares/requireAuth.js";

const router = express.Router();

// GET /auth/google
router.get("/google", (req, res, next) => {
  // 1. 프론트에서 보낸 returnTo 파라미터를 확인
  const returnTo = req.query.returnTo || "";

  // 2. 이 정보를 Base64로 인코딩해서 'state' 파라미터로 만듦
  // state는 구글이 인증 후 그대로 다시 돌려주는 값입니다.
  const state = Buffer.from(JSON.stringify({ returnTo })).toString("base64");

  // 3. Passport에 state 옵션을 전달하여 구글로 보냄
  passport.authenticate("google", {
    scope: ["profile", "email"],
    state: state,
  })(req, res, next);
});

// GET /auth/google/callback
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login-failed" }),
  (req, res) => {
    let redirectPath = "";

    // 4. 구글이 돌려준 state 파라미터에서 returnTo 주소를 복원
    try {
      const state = req.query.state;
      if (state) {
        const decoded = JSON.parse(
          Buffer.from(state, "base64").toString("utf-8")
        );
        redirectPath = decoded.returnTo || "";
      }
    } catch (e) {
      console.error("State decode error:", e);
    }

    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res.redirect("/login-failed");
      }

      const clientUrl = process.env.CLIENT_URL || "https://revify.my";
      // 5. 복원한 주소로 리디렉션
      res.redirect(`${clientUrl}${redirectPath}`);
    });
  }
);

router.post("/logout", requireAuth, authController.logout);

router.get(
  "/me",
  (req, res, next) => {
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
