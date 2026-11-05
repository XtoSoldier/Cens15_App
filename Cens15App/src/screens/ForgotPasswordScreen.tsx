import React, { useState } from 'react';
import { StyleSheet, Image } from 'react-native';
import { Text, TextInput, Button, Surface } from 'react-native-paper';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { requestPasswordReset } from '../services/authService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>;

const ForgotPasswordScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (isLoading) return;
    setError('');
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError('Por favor ingresá tu correo electrónico');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Correo electrónico inválido');
      return;
    }
    setIsLoading(true);
    try {
      await requestPasswordReset(normalizedEmail);
      navigation.navigate('ResetPassword', { email: normalizedEmail });
    } catch (error: any) {
      setError(error?.message || 'No se pudo enviar el código de recuperación');
    } finally {
      setIsLoading(false);
    }
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
            Recuperar Contraseña
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
             Ingresá tu correo para solicitar un código de acceso único
          </Text>
          <TextInput
            label="Correo Electrónico"
            value={email}
            onChangeText={(value) => { setEmail(value); setError(''); }}
            disabled={isLoading}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
            outlineColor="#E0E0E0"
            activeOutlineColor="#1F5FAF"
          />
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <Button
            mode="contained"
            onPress={handleSubmit}
            style={styles.submitButton}
            loading={isLoading}
            disabled={isLoading}
          >
            Enviar codigo
          </Button>
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
    marginBottom: 8,
    color: '#1F5FAF',
  },
  subtitle: {
    marginBottom: 24,
    color: '#2B2B2B',
    textAlign: 'center',
  },
  input: {
    width: '100%',
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  submitButton: {
    width: '100%',
    marginTop: 8,
    backgroundColor: '#F28C28',
  },
  error: { color: '#C62828', textAlign: 'center', marginBottom: 12, width: '100%' },
});

export default ForgotPasswordScreen;
