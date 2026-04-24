import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AppState {
  isLoading: boolean;
  userToken: string | null;
  theme: 'light' | 'dark';
}

const initialState: AppState = {
  isLoading: false,
  userToken: null,
  theme: 'light',
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
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
    },
    logout: (state) => {
      state.userToken = null;
    },
  },
});

export const { setLoading, setUserToken, setTheme, logout } = appSlice.actions;
export default appSlice;