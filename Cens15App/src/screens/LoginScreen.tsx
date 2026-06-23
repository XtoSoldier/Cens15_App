import React, { useState } from 'react';
import { View, StyleSheet, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, TextInput, Button, Surface, TouchableRipple, IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { setUserToken, incrementLoginAttempt, checkLock, updateProfile } from '../slices/appSlice';
import { login } from '../services/authService';
import { registerLoginActivity } from '../services/loginActivityService';
import { clearUserData } from '../utils/storage';


type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

const MOCK_USER = {
  email: 'admin@cens15.edu.ar',
  password: 'Cens15App2026',
};

const LoginScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const { loginAttempts, lockUntil } = useAppSelector((state) => state.app);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isLocked = lockUntil && Date.now() < lockUntil;
  const remainingTime = lockUntil ? Math.ceil((lockUntil - Date.now()) / 1000 / 60) : 0;

 const handleLogin = async () => {
  dispatch(checkLock());

  if (isLocked) {
    setError(`Demasiados intentos. Intentá en ${remainingTime} minutos`);
    return;
  }

  if (!email || !password) {
    setError('Por favor completá email y contraseña');
    return;
  }

  setIsLoading(true);
  setError('');

  try {
    const response = await login(email, password);
    await registerLoginActivity({
      email,
      userId: response.userId,
      success: true,
      reason: response.mustChangePassword ? 'Login con cambio de contraseña pendiente' : 'Login exitoso',
    });

    // 🔐 Guardar token en Redux
    dispatch(setUserToken(response.token));

    dispatch(
      updateProfile({
        userName: response.name || '',
        userLastname: '',
        userEmail: email,
        userRole: response.role || '',
        userId: response.userId || '',
      })
    );

    if (response.mustChangePassword) {
      navigation.navigate('ChangePassword', { currentPassword: password });
    } else {
      navigation.navigate('MainMenu');
    }
  } catch (err: any) {
    dispatch(incrementLoginAttempt());

    const attemptsLeft = 3 - (loginAttempts + 1);

    if (err.message?.includes('Invalid Credentials')) {
      await registerLoginActivity({ email, success: false, reason: 'Credenciales inválidas' });
      if (attemptsLeft <= 0) {
        setError('Demasiados intentos. Bloqueado por 3 minutos');
      } else {
        setError(`Credenciales inválidas. Te quedan ${attemptsLeft} intentos`);
      }
    } else {
      await registerLoginActivity({ email, success: false, reason: err?.message || 'Error de conexión' });
      setError('Error de conexión con el servidor');
    }
  } finally {
    setIsLoading(false);
  }
};
  const handleRegister = () => {
    navigation.navigate('Register');
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Surface style={styles.surface} elevation={1}>
          <Image
            source={require('../../assets/img/cens_logo.jpeg')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text variant="headlineMedium" style={styles.title}>
            Iniciar Sesión
          </Text>
          <View style={styles.inputContainer}>
            <TextInput
              label="Email"
              value={email}
              onChangeText={(text) => { setEmail(text); setError(''); }}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.passwordInput}
              outlineColor="#E0E0E0"
              activeOutlineColor="#1F5FAF"
            />
            <View style={styles.placeholder} />
          </View>
          <View style={styles.passwordContainer}>
            <TextInput
              label="Contraseña"
              value={password}
              onChangeText={(text) => { setPassword(text); setError(''); }}
              mode="outlined"
              secureTextEntry={!passwordVisible}
              style={styles.passwordInput}
              outlineColor="#E0E0E0"
              activeOutlineColor="#1F5FAF"
            />
            <IconButton
              icon={passwordVisible ? 'eye-off' : 'eye'}
              size={20}
              onPress={() => setPasswordVisible(!passwordVisible)}
              style={styles.eyeButton}
              iconColor="#6B6B6B"
            />
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <Button
            mode="contained"
            onPress={handleLogin}
            style={styles.loginButton}
            loading={isLoading}
            // disabled={isLoading || isLocked}
          >
            Iniciar Sesión
          </Button>
          <View style={styles.linksContainer}>
            <TouchableRipple onPress={handleRegister} style={styles.link}>
              <Text style={styles.linkText}>Registrarse</Text>
            </TouchableRipple>
            <TouchableRipple onPress={handleForgotPassword} style={styles.link}>
              <Text style={styles.linkText}>Olvidé mi contraseña</Text>
            </TouchableRipple>
          </View>
        </Surface>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex:1,
    backgroundColor: '#F7F9FC',
  },
  scrollContainer: {
    flexGrow:1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  surface: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  title: {
    marginBottom: 24,
    color: '#1F5FAF',
  },
  input: {
    width: '100%',
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  passwordInput: {
    flex:1,
    backgroundColor: '#FFFFFF',
  },
  placeholder: {
    width: 32,
    marginLeft: 4,
  },
  eyeButton: {
    margin: 0,
  },
  errorText: {
    color: '#D6452D',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
    backgroundColor: '#FDECEA',
    padding: 8,
    borderRadius: 4,
    width: '100%',
  },
  loginButton: {
    width: '100%',
    marginTop: 8,
    backgroundColor: '#1F5FAF',
  },
  linksContainer: {
    width: '100%',
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  link: {
    padding: 8,
  },
  linkText: {
    color: '#1F5FAF',
    fontSize: 14,
  },
});

export default LoginScreen;
