# 백엔드 연동 안내

## 브랜치

- `feature/login`: 현재 Figma 로그인 화면의 React UI. 가짜 로그인 성공을 반환하지 않음.
- `feature/API`: 로그인 브랜치에서 분기. 공통 HTTP, JWT 세션, 인증/문서/용어집 서비스와 로그인/회원가입 화면 연결.
- `main`, `feature/upload`는 변경하지 않음. feature/API를 별도 영구 서비스처럼 운영하지 말고 리뷰 후 통합할 것.

## 실행

Node.js 20.19+와 pnpm 사용.

```sh
pnpm install
cp .env.example .env
# .env의 API_PROXY_TARGET을 실제 Spring Boot 주소로 수정
pnpm dev
pnpm test
pnpm build
```

개발 주소는 http://localhost:5173. 기본 백엔드 대상 http://localhost:8080은 편의를 위한 설정값이지 확인된 서버 주소가 아니다. Vite가 `/api`를 전달한다. 배포 시에는 `/api` reverse proxy를 구성하거나 `VITE_API_BASE_URL=https://백엔드주소/api`를 빌드 전에 지정한다. 개발 proxy는 production preview에서 동작하지 않는다. 직접 다른 origin에 연결하면 백엔드가 해당 origin과 Authorization 헤더를 CORS 허용해야 한다. 배포는 HTTPS를 사용한다.

## API 계약 기준

첨부 API.md는 첫머리/미정 항목에 세션 vs JWT가 남아 있지만, 회원 절에는 JWT와 구체적인 요청/응답이 있다. 본 구현은 **회원 절**을 따른다. PRD의 인증 미정 문구는 구현 근거로 덮어쓰지 않았다.

- 백엔드에서 `app.auth.enabled=true`를 켠다.
- `POST /api/auth/login`에 `{ email, password }` 전송.
- `{ token, member: { id, email, nickname } }` 응답을 검증 후 처리.
- 보호 API에 `Authorization: Bearer <token>`을 자동 부착.
- `GET /api/members/me`로 새로고침 후 회원 상태 복원.
- `POST /api/members`로 회원가입. 자동 로그인은 명세에 없어 가입 후 로그인 화면으로 돌아감.
- `POST /api/auth/logout`은 토큰 없이 호출. 서버 요청 성공 여부와 무관하게 로컬 토큰 제거.
- 401이면 현재 토큰 제거 후 재로그인 안내. 로그인 실패 401은 기존 세션을 지우지 않음.
- 토큰 유효 시간 24시간. refresh API가 없어 자동 갱신 없음.
- 로그인 유지 미선택: sessionStorage. 선택: localStorage. 양쪽 동시 보관하지 않음. 비밀번호/회원정보 저장 안 함.
- localStorage는 XSS에 취약하므로 제품 배포 전 CSP 및 의존성 보안 점검이 필요. 더 안전한 HttpOnly cookie 전환은 백엔드 계약 변경이 필요.

## 역할 분리

- `src/features/auth/LoginForm.jsx`, `SignupForm.jsx`: 입력 UI. HTTP를 직접 호출하지 않음.
- `src/features/auth/authApi.js`: 인증 요청/응답 검증과 오류 문구.
- `src/shared/api/client.js`: base URL, JSON/FormData, Bearer, 오류, 취소, 15초 timeout.
- `src/shared/api/session.js`: 토큰 저장/삭제, 저장소 제한 시 메모리 fallback.
- `src/shared/api/resources.js`: 문서·번역·요약·용어집 API. 업로드 UI에 연결된 것은 아니며 폴링/파일 저장은 호출하는 화면 책임.
- `src/App.jsx`: 화면 전환, 로그인/가입/로그아웃/회원 복원.

다른 화면에서는 같은 세션과 클라이언트를 주입해 `createResources(request)`를 사용한다. FormData에는 Content-Type을 수동 지정하지 않으며 다운로드는 `{ blob, disposition }`을 반환한다. 인증이 필요한 다운로드에 단순 `<a href>`를 쓰면 Bearer가 빠지므로 이 모듈로 받은 Blob을 저장해야 한다.

## 미구현/외부 설정

- 이메일 로그인/회원가입을 구현했다. Google/Kakao 버튼은 비활성 상태다. 서비스에는 명세대로 토큰 교환 함수가 있으나 제공자 SDK/콜백은 아직 연결하지 않았다. 구글 ID token과 카카오 access token을 직접 수집하려면 제공자 설정을 확인하고 별도 연동해야 한다. 카카오 JavaScript 앱 키는 제공되지 않았다. 비밀 키를 VITE 환경변수에 넣지 않는다.
- 카카오의 임시 email을 화면에 노출하지 않고 nickname만 표시한다.
- 비밀번호 재설정, 약관/개인정보 문서 경로는 제공되지 않았다.
- `feature/upload`의 화면은 이 브랜치에 통합하지 않았다. 인증 성공 패널은 실제 서비스 대시보드가 아니다.
- 실행 가능한 백엔드 주소/계정이 제공되지 않았으므로 실제 서버 로그인 성공은 검증할 수 없다. 자동 테스트는 HTTP 대역이며 실서버 검증을 대체하지 않는다.

## 실서버 확인 순서

1. Spring Boot 실행, 인증 활성화, DB 연결 확인.
2. 개발 proxy 대상 지정 후 localhost:5173 접속.
3. 회원가입 → 이메일 로그인 → 응답 token/member 확인. 비밀번호/토큰은 로그나 PR에 붙이지 않는다.
4. 새로고침 시 `/members/me`와 Authorization 확인.
5. 잘못된 비밀번호 401, 만료된 토큰 401, 서버 중단, 로그아웃 204 확인.
6. 로그인 유지 체크/미체크 저장소 및 로그아웃 시 양쪽 제거 확인.
7. 업로드 화면 통합 시 문서/용어집 호출에 동일 클라이언트 사용.
