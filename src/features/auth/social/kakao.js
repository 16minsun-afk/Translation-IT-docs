import { loadSdk } from './sdk.js';
import { SocialLoginError } from './errors.js';

const SDK_ID = 'kakao-javascript-sdk';
// Kakao JS SDK v1.44 retains Auth.login's popup flow; SDK v2 removed it.
const SDK_SRC = 'https://t1.kakaocdn.net/kakao_js_sdk/1.44.0/kakao.min.js';

function error(code, message, cause) {
  const result = new SocialLoginError(code, message);
  if (cause !== undefined) result.cause = cause;
  return result;
}

function sdkIsReady(windowRef) {
  return Boolean(windowRef?.Kakao?.Auth?.login);
}

function accessTokenFrom(auth, response) {
  let token;
  try {
    token = typeof auth.getAccessToken === 'function' ? auth.getAccessToken() : undefined;
  } catch {
    // Some SDK builds expose the token only on the callback response.
  }
  if (typeof token !== 'string' || !token) {
    token = response?.access_token ?? response?.accessToken;
  }
  return typeof token === 'string' && token ? token : null;
}

function clearSdkToken(auth) {
  try {
    if (typeof auth?.setAccessToken === 'function') auth.setAccessToken(null);
  } catch {
    // Clearing an SDK cache must not replace the original login outcome.
  }
}

export function createKakaoProvider({
  appKey,
  windowRef = globalThis.window,
  loadScript = loadSdk,
  timeoutMs = 120000
} = {}) {
  let sdk;
  let preparePromise;
  let loginInProgress = false;

  function configurationError() {
    return error('CONFIGURATION_ERROR', 'VITE_KAKAO_JAVASCRIPT_KEY를 설정하고 개발 서버를 다시 시작해 주세요.');
  }

  function prepare() {
    if (preparePromise) return preparePromise;
    if (typeof appKey !== 'string' || !appKey.trim()) {
      return Promise.reject(configurationError());
    }

    preparePromise = Promise.resolve()
      .then(() => loadScript({
        id: SDK_ID,
        src: SDK_SRC,
        isReady: () => sdkIsReady(windowRef),
        documentRef: windowRef?.document,
        timeoutMs: 15000
      }))
      .then(() => {
        sdk = windowRef?.Kakao;
        if (!sdk?.Auth?.login) {
          throw error('SDK_UNAVAILABLE', '카카오 팝업 로그인 SDK를 사용할 수 없습니다.');
        }

        if (typeof sdk.getAppKey === 'function') {
          let initializedKey;
          try {
            initializedKey = sdk.getAppKey();
          } catch {
            initializedKey = undefined;
          }
          if (initializedKey && initializedKey !== appKey) {
            throw error('CONFIGURATION_ERROR', '카카오 SDK의 앱 키가 다릅니다. 설정을 확인하고 새로고침해 주세요.');
          }
        }

        const initialized = typeof sdk.isInitialized === 'function'
          ? sdk.isInitialized()
          : Boolean(sdk.isInitialized);
        if (!initialized) sdk.init(appKey);
        return sdk;
      })
      .catch(cause => {
        preparePromise = null;
        if (cause instanceof SocialLoginError) throw cause;
        throw error('SDK_LOAD_FAILED', '카카오 SDK를 불러오지 못했습니다. 네트워크 설정을 확인해 주세요.', cause);
      });

    return preparePromise;
  }

  function login() {
    if (typeof appKey !== 'string' || !appKey.trim()) {
      return Promise.reject(configurationError());
    }
    if (!sdk) {
      return Promise.reject(error('SDK_NOT_PREPARED', '카카오 로그인 준비가 끝난 뒤 다시 시도해 주세요.'));
    }
    if (loginInProgress) {
      return Promise.reject(error('LOGIN_IN_PROGRESS', '이미 카카오 로그인 팝업이 열려 있습니다.'));
    }

    const auth = sdk.Auth;
    if (typeof auth?.login !== 'function') {
      return Promise.reject(error('SDK_UNAVAILABLE', '카카오 SDK가 팝업 로그인을 지원하지 않습니다.'));
    }

    loginInProgress = true;
    return new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        settle('reject', error('LOGIN_TIMEOUT', '카카오 로그인 시간이 초과되었습니다. 팝업 차단을 확인하고 다시 시도해 주세요.'));
      }, timeoutMs);

      function settle(outcome, value, shouldClearToken = true) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        loginInProgress = false;
        if (shouldClearToken) clearSdkToken(auth);
        if (outcome === 'resolve') resolve(value);
        else reject(value);
      }

      try {
        // Keep this call synchronous with login(): browsers may block a popup
        // if any asynchronous work happens after the user's click.
        auth.login({
          throughTalk: false,
          success: response => {
            const token = accessTokenFrom(auth, response);
            if (!token) {
              settle('reject', error('LOGIN_EMPTY_TOKEN', '카카오 인증 토큰을 받지 못했습니다. 다시 시도해 주세요.'));
              return;
            }
            settle('resolve', token);
          },
          fail: cause => {
            const message = '카카오 로그인이 취소되었거나 실패했습니다. 다시 시도해 주세요.';
            settle('reject', error('LOGIN_FAILED', message, cause));
          }
        });
      } catch (cause) {
        settle('reject', error('LOGIN_FAILED', '카카오 팝업을 열지 못했습니다. 팝업 허용 설정을 확인해 주세요.', cause));
      }
    });
  }

  return { prepare, login };
}
