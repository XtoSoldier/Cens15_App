import React, { useState } from 'react';
import { View, StyleSheet, Image, Alert } from 'react-native';
import { Text, TextInput, Button, Surface } from 'react-native-paper';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

const ForgotPasswordScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = () => {
    if (!email) {
      Alert.alert('Error', 'Por favor ingresá tu correo electrónico');
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      Alert.alert(
        'Correo enviado',
        `Se enviaron instrucciones a ${email}`,
        [{ text: 'OK' }]
      );
      setIsLoading(false);
    }, 1500);
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
            Ingresá tu correo para recibir instrucciones
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
          <Button
            mode="contained"
            onPress={handleSubmit}
            style={styles.submitButton}
            loading={isLoading}
            disabled={isLoading}
          >
            Enviar Instrucciones
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
});

export default ForgotPasswordScreen;