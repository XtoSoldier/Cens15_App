import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getExpoHost = () => {
  const hostUri = Constants.expoConfig?.hostUri || Constants.linkingUri;
  if (!hostUri) return null;

  try {
    const url = new URL(hostUri.includes('://') ? hostUri : `http://${hostUri}`);
    return url.hostname;
  } catch {
    return null;
  }
};

const getLocalApiUrl = () => {
  if (Platform.OS === 'web') {
    return process.env.EXPO_PUBLIC_LOCAL_API_WEB_URL || 'https://localhost:7000/api';
  }

  const host = getExpoHost();
  const port = process.env.EXPO_PUBLIC_LOCAL_API_PORT || '5211';
  return host ? `http://${host}:${port}/api` : `http://10.0.2.2:${port}/api`;
};

const ENV = {
  dev: {
    API_URL: process.env.EXPO_PUBLIC_API_URL_DEV || getLocalApiUrl(),
    EXTERNAL_API_URL: process.env.EXPO_PUBLIC_EXTERNAL_API_URL_DEV || '',
  },
  prod: {
    API_URL: process.env.EXPO_PUBLIC_API_URL_PROD || 'https://tu-api-produccion.com/api',
    EXTERNAL_API_URL: process.env.EXPO_PUBLIC_EXTERNAL_API_URL_PROD || '',
  },
};

const currentEnv = __DEV__ ? ENV.dev : ENV.prod;

export default {
  ...currentEnv,
  ENV_LABEL: process.env.EXPO_PUBLIC_ENV_LABEL || '',
  SHOW_ENV_INDICATOR: process.env.EXPO_PUBLIC_SHOW_ENV_INDICATOR === 'true',
};
