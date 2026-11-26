import React, { useState } from 'react';
import { SocialLoginButtons } from './social/SocialLoginButtons.jsx';

export function LoginForm({ onSubmit, onHelp, onSignup, busy = false, error = '', onSocial, onSocialError }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  async function submit(event) {
    event.preventDefault();
    if (!busy) await onSubmit({ email: email.trim(), password, remember });
  }
  return <form onSubmit={submit} aria-busy={busy}>
    <fieldset disabled={busy}><div className="fields"><label htmlFor="email">이메일<input id="email" name="email" type="email" placeholder="name@example.com" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required maxLength={254} /></label><label htmlFor="password">비밀번호<input id="password" name="password" type="password" placeholder="비밀번호를 입력하세요" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required /></label></div>
    <div className="form-options"><label className="remember"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />로그인 유지</label><button className="text-button" type="button" onClick={onHelp}>비밀번호 찾기</button></div>
    {error && <p className="error" role="alert">{error}</p>}
    <button className="primary" type="submit">{busy ? '로그인 중…' : '로그인'}</button>
    <SocialLoginButtons busy={busy} remember={remember} onSocial={onSocial} onError={onSocialError}/>
    <p className="signup">아직 계정이 없으신가요? <button className="text-button" type="button" onClick={onSignup}>회원가입</button></p></fieldset>
  </form>;
}
