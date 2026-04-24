import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Surface } from 'react-native-paper';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';

const HomeScreen: React.FC = () => {
  const { isLoading, userToken, theme } = useSelector((state: RootState) => state.app);

  return (
    <View style={styles.container}>
      <Surface style={styles.surface} elevation={1}>
        <Text variant="headlineMedium" style={styles.title}>
          Cens15App
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Aplicación multiplataforma
        </Text>
        <Text variant="bodySmall" style={styles.info}>
          Estado: {isLoading ? 'Cargando' : 'Listo'}
        </Text>
        <Text variant="bodySmall" style={styles.info}>
          Tema: {theme}
        </Text>
        <Text variant="bodySmall" style={styles.info}>
          Token: {userToken ? '✓' : 'No autenticado'}
        </Text>
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
  },
  surface: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 24,
    opacity: 0.7,
  },
  info: {
    marginBottom: 4,
    opacity: 0.5,
  },
});

export default HomeScreen;