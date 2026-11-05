export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3 || parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '='));
    const value = JSON.parse(decoded);
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

export function tokenDeadline(token: string): number | null {
  const exp = decodeJwtPayload(token)?.exp;
  return typeof exp === 'number' && Number.isFinite(exp) && Number.isFinite(exp * 1000)
    ? exp * 1000 : null;
}

let credential: string | null | undefined;
const expiredListeners = new Set<() => void>();
const credentialListeners = new Set<() => void>();

export function isSessionTokenUsable(token: string | null, now = Date.now()): boolean {
  if (!token || (credential !== undefined && credential !== token)) return false;
  const deadline = tokenDeadline(token);
  return deadline !== null && now < deadline;
}

export const getSessionCredential = () => credential;
export function setSessionCredential(token: string | null) {
  credential = token;
  credentialListeners.forEach((listener) => listener());
}
export function onSessionExpired(listener: () => void) {
  expiredListeners.add(listener);
  return () => { expiredListeners.delete(listener); };
}
export function emitSessionExpired() {
  expiredListeners.forEach((listener) => listener());
}

// Timers are absolute JWT deadlines, never extended by activity. Re-arm long delays.
export function watchSessionExpiry(recheck: () => Promise<unknown>) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  const schedule = () => {
    if (timer !== undefined) clearTimeout(timer);
    const token = credential;
    if (!token || stopped) return;
    const deadline = tokenDeadline(token);
    const delay = Math.min(2147483647, Math.max(0, (deadline ?? 0) - Date.now()));
    timer = setTimeout(() => {
      void recheck().catch(() => undefined).finally(() => { if (!stopped) schedule(); });
    }, delay);
  };
  credentialListeners.add(schedule);
  schedule();
  return () => {
    stopped = true;
    credentialListeners.delete(schedule);
    if (timer !== undefined) clearTimeout(timer);
  };
}
