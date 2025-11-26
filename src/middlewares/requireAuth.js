import User from "../models/User.js";

export const requireAuth = async (req, res, next) => {
  // 1. 실제 세션 인증 확인
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }

  // 2. [테스트 전용] 테스트 환경에서 헤더로 인증 우회
  if (process.env.NODE_ENV === "test" && req.headers["x-test-user-id"]) {
    try {
      const user = await User.findById(req.headers["x-test-user-id"]);
      if (user) {
        req.user = user;
        return next();
      }
    } catch (err) {
      // 무시하고 401 처리
    }
  }

  // 3. 인증 실패
  res.status(401).json({
    success: false,
    message: "Unauthorized access. Please log in.",
  });
};
