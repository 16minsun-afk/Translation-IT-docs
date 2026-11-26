import React, { useState } from 'react';
import { LoginForm } from './features/auth/LoginForm.jsx';

export default function App() {
  const [notice, setNotice] = useState('');
  return <div className="app-shell">
    <header className="site-header"><a className="brand" href="/" aria-label="Paperly 홈"><span className="brand-symbol" aria-hidden="true">Aa</span>paperly <span className="beta">BETA</span></a><button className="quiet" onClick={() => setNotice('Paperly는 IT 기술 문서를 번역하고 요약하는 서비스입니다. 로그인 후 문서 업로드 화면에서 시작하세요.')}>이용 가이드</button></header>
    <main><section className="auth-card" aria-labelledby="login-title"><h1 id="login-title">다시 만나 반가워요</h1><p className="subtitle">로그인하고, 읽던 연구를 이어가세요.</p><LoginForm onSubmit={async () => setNotice('이 브랜치는 UI 전용입니다. 실제 로그인은 feature/API 브랜치에서 연결됩니다.')} onHelp={() => setNotice('비밀번호 재설정 API는 아직 제공되지 않습니다. 서비스 관리자에게 문의해 주세요.')} onSignup={() => setNotice('회원가입 연동은 feature/API 브랜치에서 제공됩니다.')} /></section></main>
    <footer><span>© Paperly. 연구를 이해하는 더 쉬운 방법</span><span>이용약관 · 개인정보처리방침</span></footer>
    {notice && <div className="dialog-backdrop"><section className="notice-dialog" role="dialog" aria-modal="true" aria-label="안내"><p>{notice}</p><button className="primary" autoFocus onClick={() => setNotice('')}>확인</button></section></div>}
  </div>;
}
