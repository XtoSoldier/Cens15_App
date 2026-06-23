import env from './env';
import { getToken } from '../utils/storage';

export const getApiBaseUrl = () => {
  const baseUrl = env.API_URL.replace(/\/$/, '');
  return baseUrl.toLowerCase().endsWith('/api') ? baseUrl : `${baseUrl}/api`;
};

export const apiFetch = async (
  endpoint: string,
  options: RequestInit = {}
) => {
  const token = await getToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${getApiBaseUrl()}/${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const text = await response.text();
    try {
      const json = text ? JSON.parse(text) : null;
      throw new Error(json?.message || text || 'Error en la petición');
    } catch (error: any) {
      if (error?.message && error.message !== 'Unexpected end of JSON input') {
        throw error;
      }
      throw new Error(text || 'Error en la petición');
    }
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
