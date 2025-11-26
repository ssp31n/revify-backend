/**
 * 세션 접근 권한 체크 서비스
 */
export const permissionService = {
  // 조회 권한 (Private이면 오너만)
  canView: (session, user) => {
    if (session.visibility === "public" || session.visibility === "link") {
      return true;
    }
    // private인 경우
    return user && session.owner.equals(user._id);
  },

  // 코멘트 작성 권한
  canComment: (session, user) => {
    if (!user) return false; // 로그인 필수

    // 오너는 항상 가능
    if (session.owner.equals(user._id)) return true;

    // 설정에 따른 분기
    switch (session.commentPermission) {
      case "everyone": // 로그인한 누구나 (link/public 접근 가능자)
        return true;
      case "invited": // (추후 구현) 초대된 사람만
        return false;
      case "owner": // 오너만
        return false;
      default:
        return false;
    }
  },

  // 관리 권한 (삭제, 설정 변경, 코멘트 해결 처리 등)
  canManage: (session, user) => {
    if (!user) return false;
    return session.owner.equals(user._id);
  },
};
