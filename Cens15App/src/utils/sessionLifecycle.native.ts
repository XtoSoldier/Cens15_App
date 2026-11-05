export function observeSessionForeground(
  recheck: () => Promise<unknown>,
  appState: { addEventListener: (event: 'change', listener: (state: string) => void) => { remove: () => void } },
) {
  const subscription = appState.addEventListener('change', (state) => {
    if (state === 'active') void recheck().catch(() => undefined);
  });
  return () => subscription.remove();
}
