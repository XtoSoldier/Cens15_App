import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store } from './src/store';
import { lightTheme } from './src/theme';
import AppNavigator from './src/navigation/AppNavigator';
import { useAppDispatch } from './src/hooks/useRedux';
import { setUserToken, updateProfile } from './src/slices/appSlice';
import { getSavedProfile, getToken } from './src/utils/storage';

const InitApp = () => {
  const dispatch = useAppDispatch();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      const token = await getToken();

      if (token) {
        dispatch(setUserToken(token));
        const profile = await getSavedProfile();
        if (profile.userId || profile.userName) {
          dispatch(
            updateProfile({
              userName: profile.userName || '',
              userLastname: profile.userLastname || '',
              userEmail: profile.userEmail || '',
              userRole: profile.userRole || '',
              userId: profile.userId || '',
            })
          );
        }
      }

      setReady(true);
    };

    init();
  }, []);

  if (!ready) return null;

  return <AppNavigator />;
};

export default function App() {
  return (
    <Provider store={store}>
      <PaperProvider theme={lightTheme}>
        <SafeAreaProvider>
          <InitApp />
        </SafeAreaProvider>
      </PaperProvider>
    </Provider>
  );
}