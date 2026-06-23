import React, { useState } from 'react';
import { View, StyleSheet, Image, Alert } from 'react-native';
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
  const [successMessage, setSuccessMessage] = useState('');
  const [requestedEmail, setRequestedEmail] = useState('');

  const handleSubmit = async () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      Alert.alert('Error', 'Por favor ingresá tu correo electrónico');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      Alert.alert('Error', 'Correo electrónico inválido');
      return;
    }
    setIsLoading(true);
    setSuccessMessage('');
    try {
      await requestPasswordReset(normalizedEmail);
      setRequestedEmail(normalizedEmail);
      setSuccessMessage(
        'Si su correo se encuentra registrado, recibirá el código de reactivación para cambiar su contraseña.'
      );
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'No se pudo enviar el código de recuperación');
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
            Ingresá tu correo para recibir un código de reactivación
          </Text>
          <TextInput
            label="Correo Electrónico"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
            outlineColor="#E0E0E0"
            activeOutlineColor="#1F5FAF"
          />
          {successMessage ? <Text style={styles.successMessage}>{successMessage}</Text> : null}
          <Button
            mode="contained"
            onPress={handleSubmit}
            style={styles.submitButton}
            loading={isLoading}
            disabled={isLoading}
          >
            {successMessage ? 'Reenviar Código' : 'Enviar código de reactivación'}
          </Button>
          {successMessage ? (
            <Button
              mode="outlined"
              onPress={() => navigation.navigate('ResetPassword', { email: requestedEmail || email.trim() })}
              style={styles.codeButton}
              disabled={isLoading}
            >
              Ingresar código recibido
            </Button>
          ) : null}
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
  codeButton: {
    width: '100%',
    marginTop: 12,
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
});

export default ForgotPasswordScreen;
