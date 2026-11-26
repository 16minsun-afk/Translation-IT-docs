import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createKakaoProvider } from './kakao.js';

export function KakaoButton({ disabled, onToken, onError }) {
  const callbacks = useRef({ onToken, onError }); callbacks.current = { onToken, onError };
  const provider = useMemo(() => createKakaoProvider({ appKey: import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY }), []);
  const [state, setState] = useState('loading');
  const [attempt, setAttempt] = useState(0);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true; let active = true; setState('loading');
    provider.prepare().then(() => { if (active) setState('ready'); }).catch(error => { if (active) { setState('error'); callbacks.current.onError(error); } });
    return () => { active = false; mounted.current = false; };
  }, [provider, attempt]);
  function login() {
    // Invoke synchronously in the click event; awaiting SDK loading here blocks popups.
    const pending = provider.login(); setState('pending');
    pending.then(token => { if (mounted.current) callbacks.current.onToken(token); }).catch(error => { if (mounted.current) callbacks.current.onError(error); }).finally(() => { if (mounted.current) setState('ready'); });
  }
  return <div><button className="kakao" type="button" disabled={disabled || state !== 'ready'} onClick={login}>{state === 'pending' ? '카카오 팝업에서 로그인해 주세요…' : state === 'loading' ? '카카오 로그인 준비 중…' : '카카오로 시작하기'}</button>{state === 'error' && <button className="secondary" type="button" disabled={disabled} onClick={() => setAttempt(value => value + 1)}>카카오 로그인 다시 준비</button>}<p className="social-note">팝업을 닫았다면 잠시 후 다시 시도해 주세요.</p></div>;
}
