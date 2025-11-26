import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/User.js";
import dotenv from "dotenv";

dotenv.config();

// Google OAuth 전략 설정
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || "/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const { id, displayName, emails, photos, provider } = profile;
        const email = emails?.[0]?.value;
        const avatarUrl = photos?.[0]?.value;

        // DB에서 사용자 조회 또는 생성 (Upsert)
        let user = await User.findOne({ provider, providerId: id });

        if (!user) {
          user = await User.create({
            provider,
            providerId: id,
            displayName,
            email,
            avatarUrl,
          });
        } else {
          // 정보 업데이트 (선택 사항)
          user.displayName = displayName;
          user.avatarUrl = avatarUrl;
          await user.save();
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// 세션에 사용자 ID 저장
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// 세션의 ID로 사용자 정보 복원
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

export default passport;
