import { loadSdk } from './sdk.js';
import { SocialLoginError } from './errors.js';

// Google Identity Services ID-token button. OAuth access-token flow is NOT interchangeable.
export function createGoogleProvider({ clientId, windowRef = globalThis.window, loadScript = loadSdk } = {}) {
  let ready = false;
  return {
    async prepare() {
      if (!clientId?.trim()) throw new SocialLoginError('GOOGLE_CONFIG', 'VITE_GOOGLE_CLIENT_ID를 설정하고 개발 서버를 다시 시작해 주세요.');
      await loadScript({ id: 'paperly-google-sdk', src: 'https://accounts.google.com/gsi/client', isReady: () => Boolean(windowRef?.google?.accounts?.id?.renderButton) });
      ready = true;
    },
    mount(element, { onToken, onError }) {
      if (!ready) throw new SocialLoginError('SDK_NOT_READY', '구글 로그인 준비가 끝난 뒤 다시 시도해 주세요.');
      let active = true;
      const google = windowRef.google.accounts.id;
      google.initialize({ client_id: clientId, ux_mode: 'popup', auto_select: false, callback: result => {
        if (!active) return;
        if (typeof result?.credential !== 'string' || !result.credential.trim()) {
          onError(new SocialLoginError('GOOGLE_EMPTY_TOKEN', '구글 인증 토큰을 받지 못했습니다. 다시 로그인해 주세요.')); return;
        }
        onToken(result.credential);
      } });
      google.renderButton(element, { type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', shape: 'pill', width: Math.min(400, element.clientWidth || 400), locale: 'ko' });
      return () => { active = false; element.replaceChildren(); };
    }
  };
}
