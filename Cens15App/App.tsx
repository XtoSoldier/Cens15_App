import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Provider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store } from './src/store';
import { lightTheme } from './src/theme';
import AppNavigator from './src/navigation/AppNavigator';
import { useAppDispatch } from './src/hooks/useRedux';
import { setUserToken, updateProfile } from './src/slices/appSlice';
import { getSavedProfile, getToken, isBiometricLoginEnabled } from './src/utils/storage';
import EnvironmentRibbon from './src/components/EnvironmentRibbon';

const InitApp = () => {
  const dispatch = useAppDispatch();
  const [ready, setReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState<'Home' | 'Login'>('Home');

  useEffect(() => {
    const init = async () => {
      const token = await getToken();
      const biometricLoginEnabled = await isBiometricLoginEnabled();

      if (token) {
        if (biometricLoginEnabled) {
          setInitialRoute('Login');
        } else {
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
      }

      setReady(true);
    };

    init();
  }, []);

  if (!ready) return null;

  return <AppNavigator initialRouteName={initialRoute} />;
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
