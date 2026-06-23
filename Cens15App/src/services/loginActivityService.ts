import { Platform } from 'react-native';
import { apiFetch } from './api';

type LoginActivityPayload = {
  email: string;
  userId?: string;
  success: boolean;
  reason?: string;
};

const getDeviceInfo = () => {
  if (Platform.OS === 'web') {
    return typeof navigator !== 'undefined' ? navigator.userAgent : 'web';
  }
  return `${Platform.OS} ${Platform.Version}`;
};

export const registerLoginActivity = async ({
  email,
  userId,
  success,
  reason,
}: LoginActivityPayload) => {
  try {
    await apiFetch('LoginActivities', {
      method: 'POST',
      body: JSON.stringify({
        email,
        userId: userId || null,
        success,
        reason,
        platform: Platform.OS,
        deviceInfo: getDeviceInfo(),
        appVersion: '1.0.0',
      }),
    });
  } catch {
    // La auditoría no debe bloquear el inicio de sesión.
  }
};
