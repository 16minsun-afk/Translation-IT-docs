import test from 'node:test';
import assert from 'node:assert/strict';
import { createKakaoProvider } from '../src/features/auth/social/kakao.js';

function makeSdk({ token = 'provider-token', initialized = false } = {}) {
  const calls = { init: [], login: [], setAccessToken: [] };
  const sdk = {
    Auth: {
      getAccessToken: () => token,
      setAccessToken: value => calls.setAccessToken.push(value),
      login: options => calls.login.push(options)
    },
    isInitialized: () => initialized || calls.init.length > 0,
    init: key => calls.init.push(key)
  };
  return { sdk, calls };
}

function providerFor(sdk, options = {}) {
  const windowRef = { Kakao: sdk, document: {} };
  let loads = 0;
  const provider = createKakaoProvider({
    appKey: 'test-app-key',
    windowRef,
    loadScript: async () => { loads += 1; },
    ...options
  });
  return { provider, windowRef, getLoads: () => loads };
}

test('missing app key rejects preparation with a clear configuration error', async () => {
  const provider = createKakaoProvider({ appKey: '  ', loadScript: async () => assert.fail('must not load SDK') });
  await assert.rejects(provider.prepare(), { code: 'CONFIGURATION_ERROR' });
});

test('prepare loads SDK and initializes it once; login opens popup synchronously', async () => {
  const { sdk, calls } = makeSdk();
  const { provider, getLoads } = providerFor(sdk);

  const first = provider.prepare();
  const second = provider.prepare();
  assert.equal(first, second);
  await Promise.all([first, second]);
  assert.equal(getLoads(), 1);
  assert.deepEqual(calls.init, ['test-app-key']);

  const pending = provider.login();
  assert.equal(calls.login.length, 1, 'Auth.login must run before login() returns');
  calls.login[0].success();
  assert.equal(await pending, 'provider-token');
  assert.deepEqual(calls.setAccessToken, [null]);
});

test('already initialized SDK is not initialized a second time', async () => {
  const { sdk, calls } = makeSdk({ initialized: true });
  const { provider } = providerFor(sdk);
  await provider.prepare();
  assert.deepEqual(calls.init, []);
});

test('success callback response can provide token when SDK getter has none', async () => {
  const { sdk, calls } = makeSdk({ token: null });
  const { provider } = providerFor(sdk);
  await provider.prepare();
  const pending = provider.login();
  calls.login[0].success({ access_token: 'callback-token' });
  assert.equal(await pending, 'callback-token');
});

test('Kakao failure rejects and clears its SDK token', async () => {
  const { sdk, calls } = makeSdk();
  const { provider } = providerFor(sdk);
  await provider.prepare();
  const pending = provider.login();
  calls.login[0].fail({ error_description: 'User cancelled' });
  await assert.rejects(pending, { code: 'LOGIN_FAILED', message: '카카오 로그인이 취소되었거나 실패했습니다. 다시 시도해 주세요.' });
  assert.deepEqual(calls.setAccessToken, [null]);
});

test('success without a token rejects rather than returning an empty token', async () => {
  const { sdk, calls } = makeSdk({ token: '' });
  const { provider } = providerFor(sdk);
  await provider.prepare();
  const pending = provider.login();
  calls.login[0].success({});
  await assert.rejects(pending, { code: 'LOGIN_EMPTY_TOKEN' });
});

test('a second popup is rejected until the active login settles', async () => {
  const { sdk, calls } = makeSdk();
  const { provider } = providerFor(sdk);
  await provider.prepare();
  const first = provider.login();
  await assert.rejects(provider.login(), { code: 'LOGIN_IN_PROGRESS' });
  calls.login[0].success();
  await first;
  assert.equal(calls.login.length, 1);
});

test('login timeout settles once and ignores a late SDK callback', async () => {
  const { sdk, calls } = makeSdk();
  const { provider } = providerFor(sdk, { timeoutMs: 5 });
  await provider.prepare();
  const pending = provider.login();
  await assert.rejects(pending, { code: 'LOGIN_TIMEOUT' });
  calls.login[0].success();
  assert.deepEqual(calls.setAccessToken, [null]);
});

test('an SDK initialized with a different app key is rejected', async () => {
  const { sdk } = makeSdk({ initialized: true });
  sdk.getAppKey = () => 'other-app-key';
  const { provider } = providerFor(sdk);
  await assert.rejects(provider.prepare(), { code: 'CONFIGURATION_ERROR' });
});
