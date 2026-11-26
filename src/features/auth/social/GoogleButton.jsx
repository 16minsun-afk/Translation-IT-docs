import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createGoogleProvider } from './google.js';

export function GoogleButton({ disabled, onToken, onError }) {
  const element = useRef(null);
  const callbacks = useRef({ onToken, onError }); callbacks.current = { onToken, onError };
  const provider = useMemo(() => createGoogleProvider({ clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID }), []);
  const [state, setState] = useState('loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true, dispose;
    setState('loading');
    provider.prepare().then(() => {
      if (!active) return;
      dispose = provider.mount(element.current, { onToken: token => callbacks.current.onToken(token), onError: error => callbacks.current.onError(error) });
      setState('ready');
    }).catch(error => { if (active) { setState('error'); callbacks.current.onError(error); } });
    return () => { active = false; dispose?.(); };
  }, [provider, attempt]);
  useEffect(() => { if (element.current) element.current.inert = Boolean(disabled); }, [disabled, state]);
  return <div><div ref={element} aria-label="구글 로그인" style={{ minHeight: 44, display: 'flex', justifyContent: 'center' }}/>{state === 'loading' && <p className="social-note" role="status">구글 로그인 준비 중…</p>}{state === 'error' && <button className="secondary" type="button" disabled={disabled} onClick={() => setAttempt(value => value + 1)}>구글 로그인 다시 준비</button>}<p className="social-note">구글 버튼을 누르면 로그인 팝업이 열립니다.</p></div>;
}
