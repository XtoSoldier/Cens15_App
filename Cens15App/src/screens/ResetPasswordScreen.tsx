import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, Image } from 'react-native';
import { Button, IconButton, Surface, Text, TextInput } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { requestPasswordReset, resetPasswordWithCode, validatePasswordResetCode } from '../services/authService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ResetPassword'>;
type ScreenRouteProp = RouteProp<RootStackParamList, 'ResetPassword'>;

const ResetPasswordScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ScreenRouteProp>();
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [codeValidated, setCodeValidated] = useState(false);
  const [info, setInfo] = useState('');

  const handleValidateCode = async () => {
    if (saving || codeValidated || successMessage) return;
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Ingresá el código de 6 dígitos');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await validatePasswordResetCode(route.params.email, code.trim());
      setCodeValidated(true);
    } catch (err: any) {
      setError(err?.message || 'No se pudo validar el código');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (saving || !codeValidated || successMessage) return;
    if (newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setSaving(true);
    setError('');
    setSuccessMessage('');
    try {
      await resetPasswordWithCode(route.params.email, code.trim(), newPassword);
      setSuccessMessage('Contraseña actualizada. Ya podés iniciar sesión con tu nueva contraseña.');
      setCode('');
      setNewPassword('');
      setConfirmPassword('');
      setCodeValidated(false);
      setVisible(false);
      setInfo('');
    } catch (err: any) {
      setError(err?.message || 'No se pudo actualizar la contraseña');
    } finally {
      setSaving(false);
    }
  };

  const handleResend = async () => {
    if (saving || successMessage) return;
    setSaving(true);
    setError('');
    try {
      await requestPasswordReset(route.params.email);
      setCode('');
      setNewPassword('');
      setConfirmPassword('');
      setCodeValidated(false);
      setVisible(false);
      setInfo('Si el correo esta registrado y activo, recibiras un nuevo codigo. El codigo anterior ya no es valido.');
    } catch (err: any) {
      setError(err?.message || 'No se pudo reenviar el codigo');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <Surface style={styles.surface} elevation={1}>
          <Image source={require('../../assets/img/cens_logo.jpeg')} style={styles.logo} resizeMode="contain" />
          <Text variant="headlineSmall" style={styles.title}>
            Nueva contraseña
          </Text>
          {successMessage ? (
            <>
              <Text accessibilityRole="alert" style={styles.successMessage}>{successMessage}</Text>
              <Button mode="contained" style={styles.button} onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Login' }] })}>
                Iniciar sesion
              </Button>
            </>
          ) : (
            <>
              <Text style={styles.description}>
                {codeValidated
                  ? 'Código validado. Definí tu nueva contraseña.'
                  : 'Si el correo esta registrado y activo, recibiras un codigo de acceso unico de 6 digitos. Vence en 15 minutos y permite hasta 5 intentos. Solicita un codigo nuevo: las antiguas claves temporales ya no son validas.'}
              </Text>
              {info ? <Text accessibilityRole="alert" style={styles.description}>{info}</Text> : null}
              {error ? <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text> : null}
              {!codeValidated ? (
                <>
                  <TextInput
                    label="Codigo de acceso unico"
                    value={code}
                    onChangeText={(text) => {
                      setCode(text.replace(/\D/g, '').slice(0, 6));
                      setError('');
                    }}
                    mode="outlined"
                    keyboardType="numeric"
                    maxLength={6}
                    textContentType="oneTimeCode"
                    autoComplete="one-time-code"
                    disabled={saving}
                    style={styles.input}
                    outlineColor="#E0E0E0"
                    activeOutlineColor="#1F5FAF"
                  />
                  <Button mode="contained" onPress={handleValidateCode} loading={saving} disabled={saving} style={styles.button}>
                    Validar código
                  </Button>
                </>
              ) : (
                <>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      label="Nueva contraseña"
                      value={newPassword}
                      onChangeText={(text) => {
                        setNewPassword(text);
                        setError('');
                      }}
                      mode="outlined"
                      secureTextEntry={!visible}
                      disabled={saving}
                      autoCorrect={false}
                      autoCapitalize="none"
                      autoComplete="off"
                      textContentType="none"
                      importantForAutofill="no"
                      style={styles.passwordInput}
                      outlineColor="#E0E0E0"
                      activeOutlineColor="#1F5FAF"
                    />
                    <IconButton
                      icon={visible ? 'eye-off' : 'eye'}
                      size={20}
                      disabled={saving}
                      onPress={() => setVisible(!visible)}
                      style={styles.eyeButton}
                      iconColor="#6B6B6B"
                    />
                  </View>
                  <TextInput
                    label="Confirmar nueva contraseña"
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text);
                      setError('');
                    }}
                    mode="outlined"
                    secureTextEntry={!visible}
                    disabled={saving}
                    autoCorrect={false}
                    autoCapitalize="none"
                    autoComplete="off"
                    textContentType="none"
                    importantForAutofill="no"
                    style={styles.input}
                    outlineColor="#E0E0E0"
                    activeOutlineColor="#1F5FAF"
                  />
                  <Button mode="contained" onPress={handleSave} loading={saving} disabled={saving} style={styles.button}>
                    Guardar contraseña
                  </Button>
                  <Button disabled={saving} onPress={() => {
                    if (saving) return;
                    setCodeValidated(false);
                    setCode('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setVisible(false);
                    setError('');
                    setInfo('');
                  }}>
                    Usar otro codigo
                  </Button>
                </>
              )}
              <Button disabled={saving} onPress={handleResend}>Reenviar codigo</Button>
            </>
          )}
        </Surface>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  surface: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
  },
  logo: {
    width: 110,
    height: 110,
    marginBottom: 16,
  },
  title: {
    marginBottom: 8,
    color: '#1F5FAF',
  },
  description: {
    textAlign: 'center',
    color: '#4A4A4A',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  passwordInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  eyeButton: {
    marginLeft: 4,
  },
  errorText: {
    color: '#D32F2F',
    marginBottom: 12,
    textAlign: 'center',
  },
  successMessage: {
    width: '100%',
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#E8F5E9',
    color: '#2E7D32',
    textAlign: 'center',
  },
  button: {
    width: '100%',
    backgroundColor: '#F28C28',
  },
});

export default ResetPasswordScreen;
