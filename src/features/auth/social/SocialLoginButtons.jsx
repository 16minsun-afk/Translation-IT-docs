import React from 'react';
import { GoogleButton } from './GoogleButton.jsx';
import { KakaoButton } from './KakaoButton.jsx';

export function SocialLoginButtons({ onSocial, onError, remember, busy }) {
  return <div className="social-buttons" aria-label="소셜 로그인"><KakaoButton disabled={busy} onToken={token => onSocial('kakao', token, remember)} onError={onError}/><GoogleButton disabled={busy} onToken={token => onSocial('google', token, remember)} onError={onError}/></div>;
}
