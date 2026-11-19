import { apiFetch } from './api';
import { saveToken, saveUserId, saveUserProfile, getUserIdFromToken, getToken, getSavedProfile, expireSessionCredential } from '../utils/storage';
import { isSessionTokenUsable } from '../utils/session';

interface LoginResponse {
  token: string;
  expiration: string;
  name: string;
  role: string;
  userId: string;
  mustChangePassword?: boolean;
}

export const login = async (email: string, password: string) => {
  try {
    const data = await apiFetch('auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    const loginData = data as LoginResponse;
    await saveToken(loginData.token);

    let userId = loginData.userId || '';
    if (!userId) {
      userId = (await getUserIdFromToken()) || '';
    }
    loginData.userId = userId;
    if (userId) {
      await saveUserId(userId);
    }

    await saveUserProfile({
      userName: loginData.name || '',
      userEmail: email,
      userRole: loginData.role || '',
      userId: userId,
    });

    if (!isSessionTokenUsable(loginData.token)) throw new Error('La sesion ha expirado');
    return loginData;
  } catch (error: any) {
    const message = String(error?.message || 'Error en autenticacion');
    if (message.toLowerCase().includes('invalid credentials')) {
      throw new Error('Invalid Credentials');
    }
    throw error;
  }
};

export const requestInitialAccess = async (email: string) => {
  return apiFetch('auth/request-initial-access', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
};

export const changePassword = async (currentPassword: string, newPassword: string) => {
  const token = await getToken();
  const { userEmail } = await getSavedProfile();
  if (!token || !userEmail) throw new Error('Ingrese nuevamente para cambiar la contrasena');
  await apiFetch('auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  // Changing the password revokes the old credential, including this device's token.
  try {
    return await login(userEmail, newPassword);
  } catch (error) {
    await expireSessionCredential(token);
    throw error;
  }
};

export const requestPasswordReset = async (email: string) => {
  return apiFetch('auth/request-password-reset', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
};

export const validatePasswordResetCode = async (email: string, code: string) => {
  return apiFetch('auth/validate-password-reset-code', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  });
};

export const resetPasswordWithCode = async (email: string, code: string, newPassword: string) => {
  return apiFetch('auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, code, newPassword }),
  });
};
