import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AppState {
  isLoading: boolean;
  userToken: string | null;
  theme: 'light' | 'dark';
  loginAttempts: number;
  lockUntil: number | null;
  userName: string;
  userLastname: string;
  userEmail: string;
  userRole: string;
  userId: string;
}

const initialState: AppState = {
  isLoading: false,
  userToken: null,
  theme: 'light',
  loginAttempts: 0,
  lockUntil: null,
  userName: '',
  userLastname: '',
  userEmail: '',
  userRole: '',
  userId: '',
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    setUserToken: (state, action: PayloadAction<string | null>) => {
      state.userToken = action.payload;

      if (action.payload) {
        state.loginAttempts = 0;
        state.lockUntil = null;
      }
    },

    incrementLoginAttempt: (state) => {
      state.loginAttempts += 1;

      if (state.loginAttempts >= 3) {
        state.lockUntil = Date.now() + 3 * 60 * 1000;
      }
    },

    checkLock: (state) => {
      if (state.lockUntil && Date.now() > state.lockUntil) {
        state.loginAttempts = 0;
        state.lockUntil = null;
      }
    },

    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
    },

    logout: (state) => {
      state.userToken = null;
      state.userName = '';
      state.userLastname = '';
      state.userEmail = '';
      state.userRole = '';
      state.userId = '';
      state.loginAttempts = 0;
      state.lockUntil = null;
    },

    updateProfile: (
      state,
      action: PayloadAction<{
        userName?: string;
        userLastname?: string;
        userEmail?: string;
        userRole?: string;
        userId?: string;
      }>
    ) => {
      if (action.payload.userName !== undefined)
        state.userName = action.payload.userName;

      if (action.payload.userLastname !== undefined)
        state.userLastname = action.payload.userLastname;

      if (action.payload.userEmail !== undefined)
        state.userEmail = action.payload.userEmail;

      if (action.payload.userRole !== undefined)
        state.userRole = action.payload.userRole;

      if (action.payload.userId !== undefined)
        state.userId = action.payload.userId;
    },
  },
});

export const {
  setLoading,
  setUserToken,
  incrementLoginAttempt,
  checkLock,
  setTheme,
  logout,
  updateProfile,
} = appSlice.actions;

export default appSlice.reducer;