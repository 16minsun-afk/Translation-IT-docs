import React, { useState } from 'react';

export function SignupForm({ onSubmit, onBack, busy, error }) {
  const [values, setValues] = useState({ email: '', password: '', nickname: '' });
  const update = e => setValues({ ...values, [e.target.name]: e.target.value });
  return <form onSubmit={e => { e.preventDefault(); if (!busy) onSubmit({ ...values, email: values.email.trim(), nickname: values.nickname.trim() }); }} aria-busy={busy}><fieldset disabled={busy}><div className="fields"><label htmlFor="signup-email">이메일<input id="signup-email" name="email" type="email" autoComplete="email" value={values.email} onChange={update} required maxLength={254}/></label><label htmlFor="nickname">닉네임<input id="nickname" name="nickname" autoComplete="nickname" value={values.nickname} onChange={update} required pattern=".*\S.*" maxLength={50}/></label><label htmlFor="new-password">비밀번호<input id="new-password" name="password" type="password" autoComplete="new-password" value={values.password} onChange={update} required minLength={8} placeholder="8자 이상 입력하세요"/></label></div>{error && <p className="error" role="alert">{error}</p>}<button className="primary" style={{ marginTop: 28 }} type="submit">{busy ? '가입 중…' : '회원가입'}</button><button className="secondary" type="button" onClick={onBack}>로그인으로 돌아가기</button></fieldset></form>;
}
