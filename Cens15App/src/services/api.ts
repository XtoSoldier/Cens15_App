import env from './env';
import { expireSessionCredential, getToken } from '../utils/storage';

export const getApiBaseUrl = () => {
  const baseUrl = env.API_URL.replace(/\/$/, '');
  return baseUrl.toLowerCase().endsWith('/api') ? baseUrl : `${baseUrl}/api`;
};

const publicAuthEndpoints = new Set([
  'auth/login', 'auth/request-initial-access', 'auth/request-password-reset',
  'auth/validate-password-reset-code', 'auth/reset-password',
]);

// Only this app's API is eligible for credential attachment and 401 expiration.
export const authenticatedApiRequest = async (endpoint: string, options: RequestInit = {}) => {
  if (/^[a-z][a-z\d+.-]*:|^\/\//i.test(endpoint)) throw new Error('Expected an API-relative endpoint');
  const path = endpoint.replace(/^\/+/, '');
  const savedToken = await getToken();
  const token = publicAuthEndpoints.has(path.toLowerCase().split('?')[0]) ? null : savedToken;
  const headers = new Headers(options.headers);
  headers.delete('Authorization');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${getApiBaseUrl()}/${path}`, { ...options, headers });
  if (response.status === 401 && token) await expireSessionCredential(token);
  return response;
};

export const apiFetch = async (
  endpoint: string,
  options: RequestInit = {}
) => {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const response = await authenticatedApiRequest(endpoint, { ...options, headers });

  if (!response.ok) {
    const text = await response.text();
    let json;
    try { json = text ? JSON.parse(text) : null; } catch { /* Preserve non-JSON HTTP error bodies. */ }
    throw new Error(json?.message || text || 'Error en la petición');
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
};

export const externalApiFetch = async (
  endpoint: string,
  options: RequestInit = {}
) => {
  if (!env.EXTERNAL_API_URL) {
    throw new Error('External API URL no configurada');
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(`${env.EXTERNAL_API_URL}/${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Error en la petición externa');
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
};
