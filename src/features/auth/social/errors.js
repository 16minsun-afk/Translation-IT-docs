export class SocialLoginError extends Error {
  constructor(code, message) { super(message); this.name = 'SocialLoginError'; this.code = code; }
}
