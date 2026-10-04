export const PROGRESSIVE_OVERLOAD_KEY = 'level_up_progressive_overload_enabled';
export const PROGRESSIVE_OVERLOAD_EVENT = 'levelup:progressive-overload-changed';

export function isProgressiveOverloadEnabled() {
  try { return globalThis.localStorage?.getItem(PROGRESSIVE_OVERLOAD_KEY) !== 'false'; }
  catch { return true; }
}

export function setProgressiveOverloadEnabled(enabled) {
  const value = enabled !== false;
  try { localStorage.setItem(PROGRESSIVE_OVERLOAD_KEY, String(value)); }
  catch { return isProgressiveOverloadEnabled(); }
  globalThis.window?.dispatchEvent(new CustomEvent(PROGRESSIVE_OVERLOAD_EVENT, { detail: { enabled: value } }));
  return value;
}
