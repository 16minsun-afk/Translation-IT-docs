# VS Code에서 소셜 로그인 실행하기

## 브랜치 구성

- `feature/API`: 기존 이메일 로그인, JWT, 공통 fetch API.
- `feature/auth-social-base`: 위 브랜치에서 분기한 SDK 로더 및 공통 UI 연결. 제공자 버튼은 아직 비활성.
- `feature/login-google`: 공통 기반 + Google Identity Services 팝업 ID-token 버튼.
- `feature/login-kakao`: 공통 기반 + Kakao SDK 팝업 access-token 버튼.
- `feature/login-social`: 구글·카카오 모두 포함한 실행용 통합 브랜치. 이메일 로그인도 유지.

구글/카카오는 같은 기반에서 독립적으로 검토할 수 있고 서로 다른 어댑터/버튼을 변경하므로 기능 통합 시 충돌을 줄인다. main/feature/API/feature/login/feature/upload는 이번 작업에서 변경하지 않는다. 업로드 화면 자체를 합치는 작업은 별도다.

## 1. VS Code 터미널

Node.js 20.19+ 및 pnpm 설치 후:

```sh
git clone https://github.com/16minsun-afk/Translation-IT-docs.git
cd Translation-IT-docs
git switch feature/login-social
pnpm install
```

이미 clone했다면 변경 사항을 먼저 커밋/보관한 뒤 `git fetch origin` 및 `git switch feature/login-social`을 실행한다. VS Code에서 이 폴더를 연다. `.env.example`을 `.env`로 복사하고 아래 공개 설정값을 입력한다. macOS/Linux/Git Bash는 `cp .env.example .env`, PowerShell은 `Copy-Item .env.example .env`.

```dotenv
VITE_API_BASE_URL=/api
API_PROXY_TARGET=http://localhost:8080
VITE_GOOGLE_CLIENT_ID=142317490993-hj3283vukns16ku0rmno1ruimmimff1n.apps.googleusercontent.com
VITE_KAKAO_JAVASCRIPT_KEY=카카오_앱의_JavaScript_키
```

백엔드가 다른 포트/호스트라면 API_PROXY_TARGET을 바꾼다. 8080은 확인된 서버 주소가 아닌 기본 예시다. 백엔드에서 `app.auth.enabled=true`를 활성화하고 실행한다. 설정 변경 후 Vite를 다시 시작한다.

```sh
pnpm dev
```

브라우저에서 **http://localhost:5173**을 연다. VS Code 안에서 인증이 되는 것이 아니라, VS Code로 실행한 앱의 브라우저 팝업에서 로그인한다. 127.0.0.1·다른 포트·VS Code 원격 미리보기 주소는 다른 origin이며 제공자 콘솔에 별도 등록해야 한다. 팝업을 허용하고 일반 브라우저에서 시험한다.

## 2. Google 설정

API.md에 공개된 Web Client ID를 예시에 넣었다. 백엔드가 검증하는 클라이언트와 같아야 한다. Google Cloud의 OAuth Web Client **승인된 JavaScript 원본**에 http://localhost:5173이 필요하다. 테스트 앱이면 테스트 사용자도 등록한다. GIS가 만든 공식 버튼을 사용하며 ux_mode는 popup이다. One Tap의 prompt()나 OAuth access-token 클라이언트를 ID-token 대신 사용하지 않는다.

팝업 결과의 `credential`만 `POST /api/auth/google`의 `{ idToken }`으로 보낸다. 사용자가 팝업을 닫으면 인증/백엔드 요청 없이 기존 화면에 머문다. 백엔드 요청 중에만 공통 busy 상태가 된다.

## 3. Kakao 설정과 SDK 제약

카카오 Developers에서 같은 앱의 **JavaScript 키**를 입력한다. REST API 키·Admin 키·client secret을 입력하지 않는다. 키는 제공되지 않았으므로 예시에 실제 값을 넣지 않았다. 카카오 로그인 활성화, Web 플랫폼/JavaScript SDK 도메인에 http://localhost:5173 등록, 필요한 닉네임 동의 항목 설정이 필요하다. 테스트 앱/권한 제한이 있다면 테스트 사용자도 등록한다.

이번 백엔드 계약은 프론트가 팝업으로 access token을 받는 방식이므로 공식 CDN의 **Kakao JavaScript SDK 1.44.0**을 명시적으로 고정해 `Kakao.Auth.login`을 호출한다. `throughTalk: false`로 웹 팝업을 사용한다. SDK 2.x의 `Auth.authorize`는 redirect/code 흐름이며 이 콜백 API로 바로 교체할 수 없다. 구형 1.x 의존성이므로 실제 앱에서 허용/동작하는지 확인해야 하며, 앱 정책이 최신 2.x를 요구한다면 백엔드에 authorization-code 교환 및 popup callback 설계가 추가로 필요하다. 프론트에 client secret을 넣어 우회하지 않는다.

카카오 팝업 결과의 access token을 `POST /api/auth/kakao`의 `{ accessToken }`으로 보낸다. SDK에 남은 제공자 토큰은 로컬에서 정리하며 원격 카카오 로그아웃은 하지 않는다. 팝업 닫힘이 실패 콜백으로 오지 않으면 최대 2분 후 재시도할 수 있다.

## 4. 공통 처리와 확인

서버의 `{ token, member }`를 기존 인증 모듈이 검증한다. 제공자 토큰은 저장하지 않으며 **서비스 JWT만** 로그인 유지 여부에 따라 sessionStorage/localStorage에 보관한다. 이후 보호 API에 `Authorization: Bearer <서비스 JWT>`를 보낸다. 새로고침 시 `/api/members/me`로 복원, 401이면 재로그인, 로그아웃 시 로컬 JWT 삭제. 카카오 임시 이메일 대신 nickname만 표시한다. 성공 화면은 인증 확인 패널이며 업로드 화면 통합은 별도다.

```sh
pnpm test
pnpm build
```

테스트는 SDK 대역과 HTTP 응답 대역을 사용한다. 실제 Google/Kakao 계정, 앱 콘솔, 실행 중인 Spring Boot까지 통과했다는 의미는 아니다. 실서버 주소/카카오 키/테스트 계정은 이 작업에 제공되지 않았다.

브라우저 Network에서 다음을 확인한다. 토큰/비밀번호를 캡처해 공유하지 않는다.

1. Google: `/api/auth/google` 요청에 `idToken`, 응답에 서비스 token/member.
2. Kakao: `/api/auth/kakao` 요청에 `accessToken`, 응답에 서비스 token/member.
3. 새로고침: `/api/members/me`의 Bearer 값은 제공자 토큰이 아니라 서비스 JWT.
4. 팝업 취소/차단, 401, 서버 중단, 로그인 유지, 로그아웃.
5. 배포는 HTTPS. Vite proxy는 개발용이며 배포에는 reverse proxy 또는 API URL/CORS 설정이 필요하다.

.env는 Git에서 제외되어 있다. 공개 클라이언트 ID/JavaScript 키도 사용 origin을 제한하고, 비밀 키/토큰은 저장소에 커밋하지 않는다.
