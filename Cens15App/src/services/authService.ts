import { apiFetch } from './api';
import { saveToken, saveUserId, saveUserProfile, getUserIdFromToken } from '../utils/storage';

interface LoginResponse {
  token: string;
  expiration: string;
  name: string;
  role: string;
  userId: string;
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

    return loginData;
  } catch (error: any) {
    const message = String(error?.message || 'Error en autenticacion');
    if (message.toLowerCase().includes('invalid credentials')) {
      throw new Error('Invalid Credentials');
    }
    throw error;
  }
};
