import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, Surface, Divider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { updateProfile } from '../slices/appSlice';

type SettingsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const dispatch = useAppDispatch();
  const { userName, userLastname, userEmail } = useAppSelector((state) => state.app);

  const [nombre, setNombre] = useState(userName);
  const [apellido, setApellido] = useState(userLastname);
  const [email, setEmail] = useState(userEmail);
  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNueva, setPasswordNueva] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPasswordActual, setShowPasswordActual] = useState(false);
  const [showPasswordNueva, setShowPasswordNueva] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  const handleGuardarPerfil = () => {
    if (!nombre || !apellido || !email) {
      Alert.alert('Error', 'Nombre, Apellido y Email son obligatorios');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert('Error', 'Email inválido');
      return;
    }

    dispatch(updateProfile({ userName: nombre, userLastname: apellido, userEmail: email }));
    Alert.alert('Éxito', 'Perfil actualizado correctamente');
  };

  const handleCambiarPassword = () => {
    if (!passwordActual || !passwordNueva || !passwordConfirm) {
      Alert.alert('Error', 'Completá todos los campos de contraseña');
      return;
    }
    if (passwordNueva.length < 6) {
      Alert.alert('Error', 'La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (passwordNueva !== passwordConfirm) {
      Alert.alert('Error', 'Las contraseñas nuevas no coinciden');
      return;
    }

    setPasswordActual('');
    setPasswordNueva('');
    setPasswordConfirm('');
    Alert.alert('Éxito', 'Contraseña actualizada correctamente');
  };

  return (
    <View style={styles.container}>
      <Surface style={styles.surface} elevation={1}>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text variant="headlineMedium" style={styles.title}>
            Configuración
          </Text>

          {/* Datos Personales */}
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Datos Personales</Text>

            <TextInput
              label="Nombre"
              value={nombre}
              onChangeText={setNombre}
              mode="outlined"
              style={styles.input}
              outlineColor="#E0E0E0"
              activeOutlineColor="#1F5FAF"
            />
            <TextInput
              label="Apellido"
              value={apellido}
              onChangeText={setApellido}
              mode="outlined"
              style={styles.input}
              outlineColor="#E0E0E0"
              activeOutlineColor="#1F5FAF"
            />
            <TextInput
              label="Email"
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
              onPress={handleGuardarPerfil}
              style={styles.saveButton}
              icon="content-save"
            >
              Guardar Datos
            </Button>
          </View>

          <Divider style={styles.divider} />

          {/* Cambiar Contraseña */}
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Cambiar Contraseña</Text>

            <TextInput
              label="Contraseña actual"
              value={passwordActual}
              onChangeText={setPasswordActual}
              mode="outlined"
              secureTextEntry={!showPasswordActual}
              right={
                <TextInput.Icon
                  icon={showPasswordActual ? 'eye-off' : 'eye'}
                  onPress={() => setShowPasswordActual(!showPasswordActual)}
                />
              }
              style={styles.input}
              outlineColor="#E0E0E0"
              activeOutlineColor="#1F5FAF"
            />
            <TextInput
              label="Nueva contraseña"
              value={passwordNueva}
              onChangeText={setPasswordNueva}
              mode="outlined"
              secureTextEntry={!showPasswordNueva}
              right={
                <TextInput.Icon
                  icon={showPasswordNueva ? 'eye-off' : 'eye'}
                  onPress={() => setShowPasswordNueva(!showPasswordNueva)}
                />
              }
              style={styles.input}
              outlineColor="#E0E0E0"
              activeOutlineColor="#1F5FAF"
            />
            <TextInput
              label="Confirmar nueva contraseña"
              value={passwordConfirm}
              onChangeText={setPasswordConfirm}
              mode="outlined"
              secureTextEntry={!showPasswordConfirm}
              right={
                <TextInput.Icon
                  icon={showPasswordConfirm ? 'eye-off' : 'eye'}
                  onPress={() => setShowPasswordConfirm(!showPasswordConfirm)}
                />
              }
              style={styles.input}
              outlineColor="#E0E0E0"
              activeOutlineColor="#1F5FAF"
            />

            <Button
              mode="contained"
              onPress={handleCambiarPassword}
              style={styles.saveButton}
              icon="lock-reset"
            >
              Cambiar Contraseña
            </Button>
          </View>
        </ScrollView>
      </Surface>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  surface: {
    flex: 1,
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  scroll: {
    flex: 1,
  },
  title: {
    marginTop: 16,
    marginBottom: 24,
    color: '#1F5FAF',
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    marginBottom: 16,
    color: '#1F5FAF',
  },
  input: {
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  divider: {
    marginVertical: 20,
    backgroundColor: '#E0E0E0',
  },
  saveButton: {
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: '#1F5FAF',
  },
});

export default SettingsScreen;
