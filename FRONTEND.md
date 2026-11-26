# Paperly 프론트엔드

Node.js 20.19+와 pnpm 사용. `pnpm install`, `pnpm dev`, `pnpm test`, `pnpm build`로 실행/검사한다.

로그인 화면과 통신 모듈은 분리되어 있다. 이메일 인증은 feature/API에 있고, 소셜 공통 기반에서 Google/Kakao 기능 브랜치를 각각 분기했다. 둘 다 쓰려면 **feature/login-social**을 선택한다.

최신 로컬 실행/제공자 콘솔 설정은 [소셜 로그인 안내](docs/SOCIAL_LOGIN.md), HTTP/JWT 처리 구조는 [연동 안내](docs/INTEGRATION.md)를 참고한다.

기존 업로드 화면은 feature/upload에 있으며 아직 이 로그인 화면과 통합하지 않았다. 비밀번호 재설정 API와 약관 문서는 미제공 상태다.
