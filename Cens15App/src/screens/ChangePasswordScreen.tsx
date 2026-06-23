import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, Image, Alert } from 'react-native';
import { Button, IconButton, Surface, Text, TextInput } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { changePassword } from '../services/authService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ChangePassword'>;
type ScreenRouteProp = RouteProp<RootStackParamList, 'ChangePassword'>;

const ChangePasswordScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ScreenRouteProp>();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
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
    try {
      await changePassword(route.params.currentPassword, newPassword);
      Alert.alert('Contraseña actualizada', 'Ya podés usar tu nueva contraseña.');
      navigation.reset({ index: 0, routes: [{ name: 'MainMenu' }] });
    } catch (err: any) {
      setError(err?.message || 'No se pudo actualizar la contraseña');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <Surface style={styles.surface} elevation={1}>
          <Image source={require('../../assets/img/cens_logo.jpeg')} style={styles.logo} resizeMode="contain" />
          <Text variant="headlineSmall" style={styles.title}>
            Cambiar contraseña
          </Text>
          <Text style={styles.description}>
            Por seguridad, debés definir una nueva contraseña antes de continuar.
          </Text>
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
              style={styles.passwordInput}
              outlineColor="#E0E0E0"
              activeOutlineColor="#1F5FAF"
            />
            <IconButton
              icon={visible ? 'eye-off' : 'eye'}
              size={20}
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
            style={styles.input}
            outlineColor="#E0E0E0"
            activeOutlineColor="#1F5FAF"
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <Button mode="contained" onPress={handleSave} loading={saving} disabled={saving} style={styles.button}>
            Guardar contraseña
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
  button: {
    width: '100%',
    backgroundColor: '#F28C28',
  },
});

export default ChangePasswordScreen;
