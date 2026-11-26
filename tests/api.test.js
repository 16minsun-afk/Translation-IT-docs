import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '../src/shared/api/client.js';
import { createSession } from '../src/shared/api/session.js';
import { createAuthApi } from '../src/features/auth/authApi.js';
import { createResources } from '../src/shared/api/resources.js';

const member = { id: 1, email: 'user@example.com', nickname: '연구자' };
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
function storage() {
  const values = new Map();
  return { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key), values };
}
function setup(fetchImpl, onUnauthorized) {
  const session = createSession();
  const request = createClient({ session, fetchImpl, onUnauthorized });
  return { session, request, auth: createAuthApi(request, session) };
}

test('login sends credentials without Bearer and stores only validated token', async () => {
  let call;
  const { session, auth } = setup(async (url, options) => { call = { url, ...options }; return json({ token: 'jwt', member }); });
  assert.deepEqual(await auth.login({ email: member.email, password: 'password', remember: true }), member);
  assert.equal(call.url, '/api/auth/login');
  assert.deepEqual(JSON.parse(call.body), { email: member.email, password: 'password' });
  assert.equal(call.headers.Authorization, undefined);
  assert.equal(call.credentials, 'omit');
  assert.equal(session.getToken(), 'jwt');
});
test('protected request sends Bearer and receives current member', async () => {
  const { session, auth } = setup(async (url, options) => {
    assert.equal(url, '/api/members/me'); assert.equal(options.headers.Authorization, 'Bearer jwt'); return json(member);
  });
  session.save('jwt'); assert.deepEqual(await auth.me(), member);
});
test('signup sends only contract fields without authentication', async () => {
  const { auth } = setup(async (url, options) => {
    assert.equal(url, '/api/members'); assert.equal(options.headers.Authorization, undefined);
    assert.deepEqual(JSON.parse(options.body), { email: member.email, nickname: member.nickname, password: 'password' });
    return json(member, 201);
  });
  await auth.signup({ ...member, password: 'password' });
});
test('invalid credentials do not create or erase a session', async () => {
  let unauthorized = 0;
  const { session, auth } = setup(async () => json({ code: 'INVALID_CREDENTIALS', message: 'invalid' }, 401), () => unauthorized++);
  session.save('existing');
  await assert.rejects(auth.login({ email: member.email, password: 'wrong' }), { code: 'INVALID_CREDENTIALS', status: 401 });
  assert.equal(session.getToken(), 'existing'); assert.equal(unauthorized, 0);
});
test('expired token clears session and notifies UI', async () => {
  let notified = 0;
  const { session, request } = setup(async () => json({ code: 'INVALID_TOKEN' }, 401), () => notified++);
  session.save('expired'); await assert.rejects(request('/members/me'), { status: 401 });
  assert.equal(session.getToken(), null); assert.equal(notified, 1);
});
test('late 401 from an old request cannot clear a newly signed-in session', async () => {
  let complete;
  const { session, request } = setup(() => new Promise(resolve => { complete = resolve; }));
  session.save('old'); const pending = request('/members/me'); session.save('new');
  complete(json({ code: 'INVALID_TOKEN' }, 401)); await assert.rejects(pending);
  assert.equal(session.getToken(), 'new');
});
test('malformed authentication response is never saved', async () => {
  const { auth, session } = setup(async () => json({ token: 'jwt', member: {} }));
  await assert.rejects(auth.login({ email: '', password: '' }), { code: 'INVALID_RESPONSE' });
  assert.equal(session.getToken(), null);
});
test('malformed current member is rejected', async () => {
  const { auth } = setup(async () => json({ nickname: 'missing id' }));
  await assert.rejects(auth.me(), { code: 'INVALID_RESPONSE' });
});
test('logout clears token even if server is offline', async () => {
  const { session, auth } = setup(async (_url, options) => { assert.equal(options.headers.Authorization, undefined); throw new TypeError('offline'); });
  session.save('jwt'); await assert.rejects(auth.logout(), { code: 'NETWORK_ERROR' }); assert.equal(session.getToken(), null);
});
test('remember option uses exactly one storage and logout clears both', () => {
  const local = storage(), temporary = storage(); const session = createSession({ local, temporary });
  session.save('temporary'); assert.equal(temporary.values.size, 1); assert.equal(local.values.size, 0);
  session.save('persistent', true); assert.equal(temporary.values.size, 0); assert.equal(local.values.size, 1);
  assert.equal(createSession({ local, temporary }).getToken(), 'persistent');
  session.clear(); assert.equal(local.values.size + temporary.values.size, 0);
});
test('blocked storage falls back to memory', () => {
  const blocked = { getItem() { throw Error(); }, setItem() { throw Error(); }, removeItem() { throw Error(); } };
  const session = createSession({ local: blocked, temporary: blocked });
  session.save('jwt', true); assert.equal(session.getToken(), 'jwt'); session.clear(); assert.equal(session.getToken(), null);
});
test('204 and empty 202 responses are valid', async () => {
  for (const status of [204, 202]) {
    const { request } = setup(async () => new Response(null, { status }));
    assert.equal(await request('/documents/1/translate', { method: 'POST' }), undefined);
  }
});
test('non-JSON error responses remain structured API errors', async () => {
  const { request } = setup(async () => new Response('<html>bad gateway</html>', { status: 502 }));
  await assert.rejects(request('/documents'), { status: 502, code: 'HTTP_ERROR' });
});
test('malformed success JSON is rejected', async () => {
  const { request } = setup(async () => new Response('{bad', { status: 200 }));
  await assert.rejects(request('/members/me'), { code: 'INVALID_RESPONSE' });
});
test('timeout is distinct from network errors', async () => {
  const request = createClient({ timeoutMs: 5, fetchImpl: (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))) });
  await assert.rejects(request('/members/me'), { code: 'TIMEOUT' });
});
test('caller cancellation is preserved', async () => {
  const controller = new AbortController();
  const request = createClient({ fetchImpl: async (_url, { signal }) => { controller.abort(); signal.throwIfAborted(); } });
  await assert.rejects(request('/members/me', { signal: controller.signal }), { name: 'AbortError' });
});
test('uploads use FormData without a manual Content-Type and reject invalid files', async () => {
  const calls = [];
  const { request } = setup(async (url, options) => { calls.push({ url, ...options }); return json({ id: 1 }, 201); });
  const api = createResources(request);
  const file = new File(['hello'], 'research.md', { type: 'text/markdown' });
  await api.documents.upload(file, '논문');
  assert.equal(calls[0].headers['Content-Type'], undefined);
  assert.equal(calls[0].body.get('file').name, 'research.md');
  assert.equal(calls[0].body.get('title'), '논문');
  assert.throws(() => api.documents.upload(new File(['x'], 'image.png')));
  assert.throws(() => api.documents.upload({ name: 'large.txt', size: 5 * 1024 * 1024 + 1 }));
});
test('download preserves bytes and file disposition', async () => {
  const { request, session } = setup(async (url, options) => {
    assert.equal(url, '/api/documents/1/result?type=summary&format=pdf');
    assert.equal(options.headers.Authorization, 'Bearer jwt');
    return new Response('pdf bytes', { headers: { 'Content-Disposition': 'attachment; filename=summary.pdf' } });
  });
  session.save('jwt'); const result = await createResources(request).documents.download(1, { type: 'summary', format: 'pdf' });
  assert.equal(await result.blob.text(), 'pdf bytes'); assert.match(result.disposition, /summary.pdf/);
});
test('resource modules map contract methods and encode IDs', async () => {
  const calls = []; const api = createResources(async (path, options) => { calls.push({ path, ...options }); });
  await api.documents.updateSegment('1/2', '번역'); await api.documents.summarize(2, 'SHORT'); await api.terms.remove(3);
  assert.deepEqual(calls, [
    { path: '/segments/1%2F2', method: 'PATCH', body: { translatedText: '번역' } },
    { path: '/documents/2/summarize', method: 'POST', body: { length: 'SHORT' } },
    { path: '/terms/3', method: 'DELETE' }
  ]);
});
test('Google and Kakao exchanges use distinct provider token fields', async () => {
  const calls = []; const { auth } = setup(async (url, options) => { calls.push({ url, body: JSON.parse(options.body) }); return json({ token: 'jwt', member }); });
  await auth.google('id-token'); await auth.kakao('access-token');
  assert.deepEqual(calls, [{ url: '/api/auth/google', body: { idToken: 'id-token' } }, { url: '/api/auth/kakao', body: { accessToken: 'access-token' } }]);
});
