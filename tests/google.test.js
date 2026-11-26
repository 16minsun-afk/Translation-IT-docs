import test from 'node:test';
import assert from 'node:assert/strict';
import { createGoogleProvider } from '../src/features/auth/social/google.js';

function fixture() {
  let config, options, removed = 0;
  const element = { clientWidth: 380, replaceChildren() { removed++; } };
  const windowRef = { google: { accounts: { id: { initialize(value) { config = value; }, renderButton(_element, value) { options = value; } } } } };
  const provider = createGoogleProvider({ clientId: 'web-client-id', windowRef, loadScript: async ({ src, isReady }) => { assert.equal(src, 'https://accounts.google.com/gsi/client'); assert.equal(isReady(), true); } });
  return { provider, element, config: () => config, options: () => options, removed: () => removed };
}
test('Google requires configured web client ID', async () => {
  await assert.rejects(createGoogleProvider({ clientId: '' }).prepare(), { code: 'GOOGLE_CONFIG' });
});
test('Google uses popup ID credential, never OAuth access token', async () => {
  const f = fixture(); await f.provider.prepare(); let token;
  f.provider.mount(f.element, { onToken: value => { token = value; }, onError: assert.fail });
  assert.equal(f.config().ux_mode, 'popup'); assert.equal(f.config().client_id, 'web-client-id');
  assert.equal(f.options().width, 380);
  f.config().callback({ credential: 'google-id-token', access_token: 'wrong-token-kind' });
  assert.equal(token, 'google-id-token');
});
test('Google missing credential reports an error instead of sending empty token', async () => {
  const f = fixture(); await f.provider.prepare(); let error;
  f.provider.mount(f.element, { onToken: assert.fail, onError: value => { error = value; } });
  f.config().callback({ access_token: 'not-an-id-token' }); assert.equal(error.code, 'GOOGLE_EMPTY_TOKEN');
});
test('Google callback after unmount is ignored', async () => {
  const f = fixture(); await f.provider.prepare();
  const dispose = f.provider.mount(f.element, { onToken: assert.fail, onError: assert.fail });
  dispose(); f.config().callback({ credential: 'late-token' }); assert.equal(f.removed(), 1);
});
test('Google mount must wait for SDK initialization', () => {
  const f = fixture(); assert.throws(() => f.provider.mount(f.element, {}), { code: 'SDK_NOT_READY' });
});
test('Google SDK load errors propagate', async () => {
  const provider = createGoogleProvider({ clientId: 'id', loadScript: async () => { throw new Error('blocked'); } });
  await assert.rejects(provider.prepare(), /blocked/);
});
