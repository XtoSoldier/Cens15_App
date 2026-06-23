import React, { useState } from 'react';
import { View, StyleSheet, Image, Alert } from 'react-native';
import { Text, TextInput, Button, Surface } from 'react-native-paper';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { requestInitialAccess } from '../services/authService';

const RegisterScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
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
    try {
      await requestInitialAccess(normalizedEmail);
      Alert.alert(
        'Revisá tu correo',
        'Si el correo está registrado, se envió un email con la clave para ingresar por primera vez.'
      );
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'No se pudo solicitar el acceso inicial');
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
            Registrarse
          </Text>
          <TextInput
            label="Correo electrónico"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
            outlineColor="#E0E0E0"
            activeOutlineColor="#1F5FAF"
          />
          <Button
            mode="contained"
            onPress={handleRegister}
            style={styles.registerButton}
            loading={isLoading}
            disabled={isLoading}
          >
            Registrarse
          </Button>
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
  registerButton: {
    width: '100%',
    marginTop: 8,
    backgroundColor: '#F28C28',
  },
});

export default RegisterScreen;
