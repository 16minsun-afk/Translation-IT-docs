const KEY = 'paperly.auth.token';

// 비밀번호/회원정보는 저장하지 않습니다. 저장소 제한 시 메모리로만 유지합니다.
export function createSession({ local, temporary } = {}) {
  const read = store => { try { return store?.getItem(KEY) || null; } catch { return null; } };
  const remove = store => { try { store?.removeItem(KEY); } catch { /* private mode */ } };
  let token = read(temporary) || read(local);
  return {
    getToken: () => token,
    save(value, remember = false) {
      remove(local); remove(temporary);
      token = value;
      try { (remember ? local : temporary)?.setItem(KEY, value); } catch { /* memory fallback */ }
    },
    clear() { token = null; remove(local); remove(temporary); }
  };
}

export function createBrowserSession() {
  let local, temporary;
  try { local = window.localStorage; } catch { /* blocked */ }
  try { temporary = window.sessionStorage; } catch { /* blocked */ }
  return createSession({ local, temporary });
}
