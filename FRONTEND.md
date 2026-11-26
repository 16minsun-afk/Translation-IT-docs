# Paperly 로그인 UI

`feature/login`은 로그인 화면만 담당합니다. React + Vite, Node.js 20.19+와 pnpm을 사용합니다.

```sh
pnpm install
pnpm dev
pnpm build
```

기본 주소: http://localhost:5173

- `src/features/auth/LoginForm.jsx`: 상태/요청 구현과 분리된 로그인 폼. `onSubmit`, `busy`, `error`를 외부에서 주입합니다.
- `src/App.jsx`: 화면 구성. UI 브랜치에서는 실제 로그인 성공을 가장하지 않고 연동 안내를 표시합니다.
- `src/index.css`: 반응형 스타일, 키보드 포커스, 입력/오류 상태.
- 소셜 로그인 버튼은 제공자 설정 전까지 비활성화합니다. 로고는 UI 문자 표기이며 공식 브랜드 에셋으로 교체할 수 있습니다.
- 비밀번호 재설정 API와 약관 문서가 제공되지 않았으므로 가짜 링크를 연결하지 않습니다.

## 브랜치와 모듈

`feature/login`에서 `feature/API`를 분기해 공통 HTTP, 인증 서비스, 세션 저장, 화면 연결을 추가합니다. API 브랜치의 PR은 먼저 로그인 브랜치를 대상으로 리뷰하거나, 로그인 UI가 main에 머지된 뒤 main을 대상으로 합니다. 브랜치는 기능별 작업 단위이며 장기적인 실행 환경 경계가 아닙니다. 머지 후 역할 분리는 폴더/모듈이 담당합니다.

`feature/upload`는 별도의 기존 브랜치이며 변경하지 않습니다. 업로드 화면과 합칠 때 루트 App 및 스타일의 충돌은 두 화면을 라우트/페이지로 구성해 해결하세요. 이 브랜치는 업로드 화면을 대체하거나 자동 통합하지 않습니다.
