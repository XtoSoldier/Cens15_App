import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Text, Button, Surface } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const currentYear = new Date().getFullYear();

  return (
    <View style={styles.container}>
      <Surface style={styles.surface} elevation={1}>
        <Image
          source={require('../../assets/img/cens_logo.jpeg')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text variant="headlineMedium" style={styles.title}>
          Cens15App
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Sistema de Gestión Institucional
        </Text>
        <Text variant="bodySmall" style={styles.info}>
          Gabitene de informática CENS 15
        </Text>
        <Text variant="bodySmall" style={styles.info}>
          © {currentYear} Todos los derechos reservados.
        </Text>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('Login')}
          style={styles.loginButton}
        >
          Iniciar Sesión
        </Button>
      </Surface>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F7F9FC',
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
    width: 160,
    height: 160,
    marginBottom: 16,
  },
  title: {
    marginBottom: 8,
    color: '#1F5FAF',
  },
  subtitle: {
    marginBottom: 24,
    opacity: 0.7,
    color: '#2B2B2B',
  },
  info: {
    marginBottom: 4,
    opacity: 0.5,
    color: '#6B6B6B',
  },
  loginButton: {
    marginTop: 24,
    width: '100%',
    backgroundColor: '#1F5FAF',
  },
});

export default HomeScreen;