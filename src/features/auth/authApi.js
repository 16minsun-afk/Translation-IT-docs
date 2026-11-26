import { ApiError } from '../../shared/api/client.js';

function validMember(member) {
  return member && (typeof member.id === 'number' || typeof member.id === 'string') && typeof member.email === 'string' && typeof member.nickname === 'string';
}

export function createAuthApi(request, session) {
  async function exchange(path, body, remember) {
    const data = await request(path, { method: 'POST', body, auth: false });
    if (typeof data?.token !== 'string' || !data.token || !validMember(data.member)) throw new ApiError(200, 'INVALID_RESPONSE', '로그인 응답 형식을 확인해 주세요.');
    session.save(data.token, remember);
    return data.member;
  }
  return {
    login: ({ email, password, remember }) => exchange('/auth/login', { email, password }, remember),
    google: (idToken, remember = false) => exchange('/auth/google', { idToken }, remember),
    kakao: (accessToken, remember = false) => exchange('/auth/kakao', { accessToken }, remember),
    signup: ({ email, password, nickname }) => request('/members', { method: 'POST', auth: false, body: { email, password, nickname } }),
    async me(options = {}) {
      const member = await request('/members/me', options);
      if (!validMember(member)) throw new ApiError(200, 'INVALID_RESPONSE', '회원 응답 형식을 확인해 주세요.');
      return member;
    },
    async logout() {
      // 먼저 로컬 인증을 끝냅니다. 서버 실패로 토큰이 남지 않게 합니다.
      session.clear();
      return request('/auth/logout', { method: 'POST', auth: false });
    }
  };
}

const messages = {
  INVALID_CREDENTIALS: '이메일 또는 비밀번호를 확인해 주세요.',
  EMAIL_ALREADY_EXISTS: '이미 가입된 이메일입니다.',
  VALIDATION_FAILED: '입력 값을 확인해 주세요. 회원가입 비밀번호는 8자 이상이어야 합니다.',
  LOGIN_REQUIRED: '로그인이 필요합니다.',
  INVALID_TOKEN: '로그인이 만료되었습니다. 다시 로그인해 주세요.',
  INVALID_GOOGLE_TOKEN: '구글 인증을 확인할 수 없습니다.',
  INVALID_KAKAO_TOKEN: '카카오 인증을 확인할 수 없습니다.'
};
export function authErrorMessage(error) {
  return messages[error?.code] || (error?.status === 0 ? error.message : '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.');
}
