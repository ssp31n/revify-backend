import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/User.js";
import dotenv from "dotenv";

dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || "/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      console.log("🔥 [DEBUG] Google Strategy Callback 진입");
      console.log("🔥 [DEBUG] Profile ID:", profile.id);

      try {
        const { id, displayName, emails, photos, provider } = profile;
        const email = emails?.[0]?.value;
        const avatarUrl = photos?.[0]?.value;

        // DB 연결 상태 확인 (User 모델이 동작하는지)
        console.log("🔥 [DEBUG] DB에서 사용자 검색 시도...");
        let user = await User.findOne({ provider, providerId: id });

        if (!user) {
          console.log("🔥 [DEBUG] 사용자가 없음 -> 신규 생성 시도");
          user = await User.create({
            provider,
            providerId: id,
            displayName,
            email,
            avatarUrl,
          });
          console.log("🔥 [DEBUG] 신규 사용자 생성 완료:", user._id);
        } else {
          console.log("🔥 [DEBUG] 기존 사용자 찾음:", user._id);
          user.displayName = displayName;
          user.avatarUrl = avatarUrl;
          await user.save();
          console.log("🔥 [DEBUG] 사용자 정보 업데이트 완료");
        }

        return done(null, user);
      } catch (err) {
        console.error("❌ [ERROR] Passport 내부 에러:", err);
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

export default passport;
