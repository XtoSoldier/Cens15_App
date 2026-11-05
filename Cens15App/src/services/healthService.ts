export const checkApiHealth = async (apiBase: string, signal: AbortSignal): Promise<boolean> => {
  const response = await fetch(`${apiBase.replace(/\/$/, '')}/health`, {
    method: 'GET',
    cache: 'no-store',
    signal,
  });
  return response.ok && (await response.json()).status === 'ok';
};
