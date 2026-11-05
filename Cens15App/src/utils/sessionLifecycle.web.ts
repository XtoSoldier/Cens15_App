import { observeSessionForeground as observeAppState } from './sessionLifecycle.native';

export function observeSessionForeground(
  recheck: () => Promise<unknown>,
  appState: Parameters<typeof observeAppState>[1],
) {
  const stopAppState = observeAppState(recheck, appState);
  const check = () => { void recheck().catch(() => undefined); };
  const browser = typeof window !== 'undefined' && typeof window.addEventListener === 'function'
    && typeof window.removeEventListener === 'function' ? window : undefined;
  const page = typeof document !== 'undefined' && typeof document.addEventListener === 'function'
    && typeof document.removeEventListener === 'function' ? document : undefined;
  const visible = () => { if (page?.visibilityState === 'visible') check(); };
  browser?.addEventListener('focus', check);
  page?.addEventListener('visibilitychange', visible);
  return () => {
    stopAppState();
    browser?.removeEventListener('focus', check);
    page?.removeEventListener('visibilitychange', visible);
  };
}
