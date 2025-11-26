// Google 로그인 리다이렉트 (Passport가 처리하므로 컨트롤러 로직은 없음)
export const googleLogin = (req, res) => {
  // passport.authenticate 미들웨어가 처리
};

// Google 로그인 콜백 처리
export const googleCallback = (req, res) => {
  // 로그인 성공 시 프론트엔드로 리다이렉트
  // 실제 운영 환경에서는 CLIENT_URL 환경변수 사용
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  res.redirect(clientUrl);
};

// 로그아웃
export const logout = (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    // 세션 삭제
    req.session.destroy((err) => {
      if (err) {
        return next(err);
      }
      res.clearCookie("connect.sid"); // 기본 세션 쿠키 이름
      res
        .status(200)
        .json({ success: true, message: "Logged out successfully" });
    });
  });
};

// 현재 로그인 사용자 정보 조회
export const getMe = (req, res) => {
  // requireAuth를 통과했다면 req.user가 존재함
  res.status(200).json({
    success: true,
    user: req.user,
  });
};
