import React, { useEffect, useState } from 'react';
import { View, AppState } from 'react-native';
import { Provider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store } from './src/store';
import { lightTheme } from './src/theme';
import AppNavigator from './src/navigation/AppNavigator';
import { useAppDispatch } from './src/hooks/useRedux';
import { logout, setUserToken, updateProfile } from './src/slices/appSlice';
import { getSavedProfile, getToken, isBiometricLoginEnabled } from './src/utils/storage';
import EnvironmentRibbon from './src/components/EnvironmentRibbon';
import { isSessionTokenUsable, onSessionExpired, watchSessionExpiry } from './src/utils/session';
import { observeSessionForeground } from './src/utils/sessionLifecycle';

const InitApp = () => {
  const dispatch = useAppDispatch();
  const [ready, setReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState<'Home' | 'Login'>('Home');
  const [expirationVersion, setExpirationVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const unsubscribe = onSessionExpired(() => {
      dispatch(logout());
      setInitialRoute('Login');
      setExpirationVersion((version) => version + 1);
    });
    const stopTimer = watchSessionExpiry(getToken);
    const stopForeground = observeSessionForeground(getToken, AppState);
    const init = async () => {
      const token = await getToken();
      const biometricLoginEnabled = await isBiometricLoginEnabled();
      const profile = token ? await getSavedProfile() : null;
      if (cancelled) return;

      if (token && isSessionTokenUsable(token)) {
        if (biometricLoginEnabled) {
          setInitialRoute('Login');
        } else {
          dispatch(setUserToken(token));
          if (profile && (profile.userId || profile.userName)) {
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
      }

      setReady(true);
    };

    void init().catch(() => {
      if (!cancelled) { dispatch(logout()); setInitialRoute('Login'); setReady(true); }
    });
    return () => { cancelled = true; unsubscribe(); stopTimer(); stopForeground(); };
  }, [dispatch]);

  if (!ready) return null;

  return <AppNavigator initialRouteName={initialRoute} expirationVersion={expirationVersion} />;
};

export default function App() {
  return (
    <Provider store={store}>
      <PaperProvider theme={lightTheme}>
        <SafeAreaProvider>
          <View style={{ flex: 1 }}>
            <InitApp />
            <EnvironmentRibbon />
          </View>
        </SafeAreaProvider>
      </PaperProvider>
    </Provider>
  );
}
