/**
 * 세션 접근 권한 체크 서비스
 */
export const permissionService = {
  // 조회 권한
  canView: (session, user) => {
    // 1. Public 또는 Link 방식이면 누구나 가능
    if (session.visibility === "public" || session.visibility === "link") {
      return true;
    }

    // 2. Private인 경우
    if (!user) return false; // 비로그인 절대 불가

    // 2-1. 소유자 확인
    if (session.owner.equals(user._id)) return true;

    // 2-2. [추가됨] 초대된 유저 목록 확인
    if (session.invitedUsers && session.invitedUsers.includes(user._id)) {
      return true;
    }

    return false;
  },

  // 코멘트 작성 권한
  canComment: (session, user) => {
    if (!user) return false;

    if (session.owner.equals(user._id)) return true;

    switch (session.commentPermission) {
      case "everyone":
        return true;
      case "invited": // [추가됨] 초대된 사람만 가능
        return session.invitedUsers && session.invitedUsers.includes(user._id);
      case "owner":
        return false;
      default:
        return false;
    }
  },

  // 관리 권한
  canManage: (session, user) => {
    if (!user) return false;
    return session.owner.equals(user._id);
  },
};
