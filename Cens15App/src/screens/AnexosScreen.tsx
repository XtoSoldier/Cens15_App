import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Surface, Divider } from 'react-native-paper';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';

type AnexosScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Anexos'>;

interface Anexo {
  id: number;
  nombre: string;
  direccion: string;
  telefono: string;
  horario: string;
}

const anexosData: Anexo[] = [
  { id: 1, nombre: 'Anexo Centro', direccion: 'Av. 7 N° 1234', telefono: '0221-123-4567', horario: '08:00 - 22:00' },
  { id: 2, nombre: 'Anexo Norte', direccion: 'Calle 45 N° 567', telefono: '0221-234-5678', horario: '08:00 - 20:00' },
  { id: 3, nombre: 'Anexo Sur', direccion: 'Blvd. 12 N° 890', telefono: '0221-345-6789', horario: '09:00 - 21:00' },
  { id: 4, nombre: 'Anexo Este', direccion: 'Calle 34 N° 123', telefono: '0221-456-7890', horario: '08:00 - 18:00' },
];

const AnexosScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Surface style={styles.surface} elevation={1}>
        <Text variant="headlineMedium" style={styles.title}>
          Anexos
        </Text>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {anexosData.map((item, index) => (
            <View key={item.id}>
              <View style={styles.anexoItem}>
                <Text variant="titleMedium" style={styles.anexoNombre}>{item.nombre}</Text>
                <View style={styles.anexoDetail}>
                  <Text style={styles.anexoLabel}>Dirección: </Text>
                  <Text style={styles.anexoValue}>{item.direccion}</Text>
                </View>
                <View style={styles.anexoDetail}>
                  <Text style={styles.anexoLabel}>Teléfono: </Text>
                  <Text style={styles.anexoValue}>{item.telefono}</Text>
                </View>
                <View style={styles.anexoDetail}>
                  <Text style={styles.anexoLabel}>Horario: </Text>
                  <Text style={styles.anexoValue}>{item.horario}</Text>
                </View>
              </View>
              {index < anexosData.length - 1 && <Divider style={styles.divider} />}
            </View>
          ))}
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
  title: {
    marginTop: 16,
    marginBottom: 24,
    color: '#1F5FAF',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  anexoItem: {
    paddingVertical: 16,
  },
  anexoNombre: {
    color: '#1F5FAF',
    marginBottom: 8,
  },
  anexoDetail: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  anexoLabel: {
    fontSize: 14,
    color: '#6B6B6B',
    fontWeight: 'bold',
  },
  anexoValue: {
    fontSize: 14,
    color: '#2B2B2B',
  },
  divider: {
    backgroundColor: '#E0E0E0',
  },
});

export default AnexosScreen;