import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'user_token';
const USER_ID_KEY = 'user_id';
const USER_NAME_KEY = 'user_name';
const USER_LASTNAME_KEY = 'user_lastname';
const USER_EMAIL_KEY = 'user_email';
const USER_ROLE_KEY = 'user_role';

export const saveToken = async (token: string) => {
  await AsyncStorage.setItem(TOKEN_KEY, token);
};

export const getToken = async () => {
  return await AsyncStorage.getItem(TOKEN_KEY);
};

export const removeToken = async () => {
  await AsyncStorage.removeItem(TOKEN_KEY);
};

export const saveUserId = async (userId: string) => {
  if (userId) await AsyncStorage.setItem(USER_ID_KEY, userId);
};

export const getUserId = async () => {
  return await AsyncStorage.getItem(USER_ID_KEY);
};

export const saveUserProfile = async (profile: { userName?: string; userLastname?: string; userEmail?: string; userRole?: string; userId?: string }) => {
  if (profile.userName) await AsyncStorage.setItem(USER_NAME_KEY, profile.userName);
  if (profile.userLastname) await AsyncStorage.setItem(USER_LASTNAME_KEY, profile.userLastname);
  if (profile.userEmail) await AsyncStorage.setItem(USER_EMAIL_KEY, profile.userEmail);
  if (profile.userRole) await AsyncStorage.setItem(USER_ROLE_KEY, profile.userRole);
  if (profile.userId) await AsyncStorage.setItem(USER_ID_KEY, profile.userId);
};

export const getSavedProfile = async () => {
  const [userName, userLastname, userEmail, userRole, userId] = await Promise.all([
    AsyncStorage.getItem(USER_NAME_KEY),
    AsyncStorage.getItem(USER_LASTNAME_KEY),
    AsyncStorage.getItem(USER_EMAIL_KEY),
    AsyncStorage.getItem(USER_ROLE_KEY),
    AsyncStorage.getItem(USER_ID_KEY),
  ]);
  return { userName, userLastname, userEmail, userRole, userId };
};

export const clearUserData = async () => {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_ID_KEY, USER_NAME_KEY, USER_LASTNAME_KEY, USER_EMAIL_KEY, USER_ROLE_KEY]);
};

function decodeJwtPayload(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export const getUserIdFromToken = async (): Promise<string | null> => {
  const token = await getToken();
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  return payload?.sub || null;
};