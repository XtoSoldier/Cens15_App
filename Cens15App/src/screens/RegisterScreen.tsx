import React, { useState } from 'react';
import { View, StyleSheet, Image, Alert } from 'react-native';
import { Text, TextInput, Button, Surface, TextInputProps } from 'react-native-paper';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

const RegisterScreen: React.FC = () => {
  const [dni, setDni] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = () => {
    if (!dni) {
      Alert.alert('Error', 'Por favor ingresá tu DNI');
      return;
    }
    if (dni.length < 7 || dni.length > 8) {
      Alert.alert('Error', 'DNI inválido');
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      Alert.alert('Registro exitoso', `DNI ${dni} registrado correctamente`);
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
            Registrarse
          </Text>
          <TextInput
            label="DNI"
            value={dni}
            onChangeText={setDni}
            mode="outlined"
            keyboardType="numeric"
            maxLength={8}
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