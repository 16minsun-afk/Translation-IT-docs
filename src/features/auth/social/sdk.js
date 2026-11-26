import { SocialLoginError } from './errors.js';

const documents = new WeakMap();
export function loadSdk({ id, src, isReady, documentRef = globalThis.document, timeoutMs = 15000 }) {
  if (isReady()) return Promise.resolve();
  if (!documentRef) return Promise.reject(new SocialLoginError('SDK_UNAVAILABLE', '브라우저에서 로그인해 주세요.'));
  let pending = documents.get(documentRef);
  if (!pending) { pending = new Map(); documents.set(documentRef, pending); }
  if (pending.has(id)) return pending.get(id);
  const promise = new Promise((resolve, reject) => {
    let script = documentRef.getElementById(id);
    if (!script) { script = documentRef.createElement('script'); script.id = id; script.src = src; script.async = true; }
    let timer;
    function cleanup() { clearTimeout(timer); script.removeEventListener('load', loaded); script.removeEventListener('error', failed); }
    function failed() { cleanup(); script.remove(); reject(new SocialLoginError('SDK_LOAD_FAILED', '로그인 SDK를 불러오지 못했습니다. 네트워크·광고 차단 설정을 확인하고 다시 시도해 주세요.')); }
    function loaded() { if (!isReady()) { failed(); return; } cleanup(); resolve(); }
    script.addEventListener('load', loaded); script.addEventListener('error', failed);
    timer = setTimeout(failed, timeoutMs);
    if (!script.parentNode) documentRef.head.appendChild(script);
  });
  pending.set(id, promise);
  promise.then(() => pending.delete(id), () => pending.delete(id));
  return promise;
}
