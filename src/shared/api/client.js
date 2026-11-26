export class ApiError extends Error {
  constructor(status, code, message) {
    super(message); this.name = 'ApiError'; this.status = status; this.code = code;
  }
}

export function createClient({ baseUrl = '/api', fetchImpl = globalThis.fetch, session, onUnauthorized = () => {}, timeoutMs = 15000 } = {}) {
  const base = baseUrl.replace(/\/+$/, '');
  return async function request(path, { method = 'GET', body, auth = true, signal, responseType = 'json' } = {}) {
    if (!path.startsWith('/') || path.startsWith('//')) throw new Error('API path must be relative to the configured base URL');
    const token = auth ? session?.getToken() : null;
    const headers = { Accept: responseType === 'blob' ? '*/*' : 'application/json' };
    const multipart = typeof FormData !== 'undefined' && body instanceof FormData;
    if (body !== undefined && !multipart) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    const controller = new AbortController();
    const abort = () => controller.abort(signal?.reason);
    if (signal?.aborted) abort();
    else signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(`${base}${path}`, { method, headers, body: body === undefined ? undefined : multipart ? body : JSON.stringify(body), signal: controller.signal, credentials: 'omit' });
      if (!response.ok) {
        let payload; try { payload = await response.json(); } catch { /* non JSON error */ }
        if (response.status === 401 && auth && token && token === session?.getToken()) {
          session.clear(); onUnauthorized();
        }
        throw new ApiError(response.status, payload?.code || 'HTTP_ERROR', payload?.message || '요청을 처리하지 못했습니다.');
      }
      if (response.status === 204 || response.status === 205) return undefined;
      if (responseType === 'blob') return { blob: await response.blob(), disposition: response.headers.get('Content-Disposition') };
      const text = await response.text();
      if (!text.trim()) return undefined;
      try { return JSON.parse(text); }
      catch { throw new ApiError(response.status, 'INVALID_RESPONSE', '서버 응답 형식을 확인해 주세요.'); }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (signal?.aborted) throw error;
      if (controller.signal.aborted) throw new ApiError(0, 'TIMEOUT', '응답 시간이 초과되었습니다. 다시 시도해 주세요.');
      throw new ApiError(0, 'NETWORK_ERROR', '서버에 연결할 수 없습니다. 백엔드 실행 상태와 네트워크를 확인해 주세요.');
    } finally {
      clearTimeout(timer); signal?.removeEventListener('abort', abort);
    }
  };
}
