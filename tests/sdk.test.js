import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSdk } from '../src/features/auth/social/sdk.js';

function browser() {
  const scripts = new Map(); let appended = 0;
  const documentRef = {
    getElementById: id => scripts.get(id),
    createElement: () => { const script = new EventTarget(); script.remove = () => scripts.delete(script.id); return script; },
    head: { appendChild(script) { appended++; script.parentNode = this; scripts.set(script.id, script); } }
  };
  return { documentRef, scripts, count: () => appended };
}
test('SDK requests share one script and resolve after the ready check', async () => {
  const f = browser(); let ready = false;
  const options = { id: 'provider', src: 'https://provider.invalid/sdk.js', isReady: () => ready, documentRef: f.documentRef };
  const first = loadSdk(options), second = loadSdk(options);
  assert.equal(first, second); assert.equal(f.count(), 1);
  ready = true; f.scripts.get('provider').dispatchEvent(new Event('load')); await first;
});
test('failed SDK load is removed and can be retried', async () => {
  const f = browser(); const options = { id: 'provider', src: 'sdk.js', isReady: () => false, documentRef: f.documentRef };
  const first = loadSdk(options); f.scripts.get('provider').dispatchEvent(new Event('error'));
  await assert.rejects(first, { code: 'SDK_LOAD_FAILED' });
  const second = loadSdk(options); assert.equal(f.count(), 2);
  f.scripts.get('provider').dispatchEvent(new Event('error')); await assert.rejects(second);
});
test('SDK timeout is actionable and removes a stalled script', async () => {
  const f = browser(); await assert.rejects(loadSdk({ id: 'provider', src: 'sdk.js', isReady: () => false, documentRef: f.documentRef, timeoutMs: 5 }), { code: 'SDK_LOAD_FAILED' });
  assert.equal(f.scripts.size, 0);
});
test('already available SDK does not insert another script', async () => {
  await loadSdk({ isReady: () => true, documentRef: undefined });
});
