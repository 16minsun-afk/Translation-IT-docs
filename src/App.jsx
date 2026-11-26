import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LoginForm } from './features/auth/LoginForm.jsx';
import { SignupForm } from './features/auth/SignupForm.jsx';
import { createAuthApi, authErrorMessage } from './features/auth/authApi.js';
import { createBrowserSession } from './shared/api/session.js';
import { createClient } from './shared/api/client.js';

const session = createBrowserSession();

export default function App() {
  const [member, setMember] = useState(null);
  const [mode, setMode] = useState('login');
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(Boolean(session.getToken()));
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const lock = useRef(false);
  const auth = useMemo(() => createAuthApi(createClient({
    baseUrl: import.meta.env.VITE_API_BASE_URL || '/api', session,
    onUnauthorized: () => { setMember(null); setMode('login'); setError('로그인이 만료되었습니다. 다시 로그인해 주세요.'); }
  }), session), []);
  useEffect(() => {
    if (!session.getToken()) { setChecking(false); return; }
    const controller = new AbortController();
    auth.me({ signal: controller.signal }).then(data => { if (!controller.signal.aborted) setMember(data); }).catch(e => { if (!controller.signal.aborted) setError(authErrorMessage(e)); }).finally(() => { if (!controller.signal.aborted) setChecking(false); });
    return () => controller.abort();
  }, [auth]);
  async function run(action) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await action(); } catch (e) { setError(authErrorMessage(e)); }
    finally { lock.current = false; setBusy(false); }
  }
  function changeMode(next) { setError(''); setNotice(''); setMode(next); }
  const title = member ? `${member.nickname}님, 반가워요` : mode === 'signup' ? 'Paperly 시작하기' : '다시 만나 반가워요';
  return <div className="app-shell">
    <header className="site-header"><a className="brand" href="/" aria-label="Paperly 홈"><span className="brand-symbol" aria-hidden="true">Aa</span>paperly <span className="beta">BETA</span></a><button className="quiet" onClick={() => setNotice('IT 기술 문서를 번역하고 요약하는 서비스입니다. 현재 로그인 연동 화면이며, 문서 업로드 화면은 feature/upload와 통합 후 이용할 수 있습니다.')}>이용 가이드</button></header>
    <main><section className="auth-card" aria-labelledby="login-title"><h1 id="login-title">{title}</h1><p className="subtitle">{member ? '로그인이 완료되었습니다.' : mode === 'signup' ? '계정을 만들고 연구를 이어가세요.' : '로그인하고, 읽던 연구를 이어가세요.'}</p>
      {notice && <p className="status" role="status">{notice}</p>}
      {checking ? <p role="status">로그인 상태 확인 중…</p> : member ? <div className="member-panel"><p>인증된 회원: <strong>{member.nickname}</strong></p><p className="status">서버와 인증 데이터를 주고받았습니다. 문서 화면은 별도 업로드 브랜치와 통합해야 합니다.</p>{error && <p className="error" role="alert">{error}</p>}<button className="primary" disabled={busy} onClick={() => run(async () => { try { await auth.logout(); } finally { setMember(null); setMode('login'); setNotice('로그아웃되었습니다.'); } })}>{busy ? '로그아웃 중…' : '로그아웃'}</button></div> : mode === 'signup' ? <SignupForm busy={busy} error={error} onBack={() => changeMode('login')} onSubmit={values => run(async () => { await auth.signup(values); setMode('login'); setNotice('가입이 완료되었습니다. 이메일과 비밀번호로 로그인해 주세요.'); })} /> : <LoginForm busy={busy} error={error} onSubmit={values => run(async () => { const data = await auth.login(values); setMember(data); setNotice(''); })} onHelp={() => setNotice('비밀번호 재설정 API는 아직 제공되지 않습니다. 서비스 관리자에게 문의해 주세요.')} onSignup={() => changeMode('signup')} />}
    </section></main><footer><span>© Paperly. 연구를 이해하는 더 쉬운 방법</span><span>이용약관 · 개인정보처리방침</span></footer>
  </div>;
}
