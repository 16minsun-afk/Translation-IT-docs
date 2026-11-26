# 인증 API 연동

기존 feature/API에서 공통 HTTP/JWT, 이메일 로그인·가입·로그아웃·회원 조회를 구현했다. 이번 소셜 브랜치는 이를 재사용하며, 최신 실행/브랜치/제공자 설정은 [SOCIAL_LOGIN.md](SOCIAL_LOGIN.md)에 있다.

## 구조

- `src/features/auth/LoginForm.jsx`, `SignupForm.jsx`: 입력 UI.
- `src/features/auth/social`: SDK 로더, 제공자 어댑터, 소셜 버튼. 기능 브랜치에서 제공자별 구현을 활성화한다.
- `src/features/auth/authApi.js`: 이메일/구글/카카오 토큰 교환, 가입, 회원 조회, 로그아웃 및 응답 검증.
- `src/shared/api/client.js`: fetch, JSON/FormData, Bearer, HTTP 오류, 취소, 15초 timeout, blob 다운로드.
- `src/shared/api/session.js`: 서비스 JWT 저장/삭제. 로그인 유지 미선택은 sessionStorage, 선택은 localStorage. 저장소 제한 시 메모리 fallback. 비밀번호와 제공자 토큰은 저장하지 않는다.
- `src/shared/api/resources.js`: 문서·번역·요약·용어집 호출. UI 폴링/다운로드 저장은 화면 책임.
- `src/App.jsx`: 화면 전환, 로그인/가입/로그아웃/새로고침 복원.

## 계약

API.md 회원 절과 사용자가 확인한 JWT 계약이 기준이다. 이메일 `{email,password}`, 구글 `{idToken}`, 카카오 `{accessToken}`을 각각 인증 endpoint로 보내고 `{token,member}`를 검증한다. 보호 API에는 서비스 JWT를 Bearer로 부착한다. 인증/가입/로그아웃은 Bearer 없이 요청한다.

새로고침 시 `/api/members/me`. 현재 토큰의 401은 저장소를 지우고 재로그인시킨다. 24시간 JWT이며 refresh endpoint가 없어 자동 갱신은 없다. 로그아웃은 서버 요청 실패와 무관하게 로컬 JWT를 지운다. 카카오 회원은 임시 email 대신 nickname을 표시한다.

localStorage는 XSS 위험이 있으므로 배포 전 CSP/의존성 보안 점검이 필요하다. HttpOnly cookie 사용은 백엔드 계약 변경이 필요하다. HTTPS를 사용한다. 개발 proxy는 배포에 포함되지 않으며 배포 시 reverse proxy 또는 API URL/CORS 설정이 필요하다.

실제 제공자/백엔드 통합 성공은 외부 앱 설정과 서버를 이용해 별도로 확인해야 한다. 자동 테스트는 대역을 사용하며 실계정 로그인을 증명하지 않는다.
