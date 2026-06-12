import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Surface, DataTable } from 'react-native-paper';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';

type MateriasScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Materias'>;

interface Materia {
  id: number;
  nombre: string;
  curso: string;
  horas: number;
  docente: string;
}

const materiasData: Materia[] = [
  { id: 1, nombre: 'Matemática', curso: '1°', horas: 4, docente: 'Prof. García' },
  { id: 2, nombre: 'Lengua', curso: '1°', horas: 4, docente: 'Prof. Martínez' },
  { id: 3, nombre: 'Informática', curso: '2°', horas: 6, docente: 'Prof. López' },
  { id: 4, nombre: 'Contabilidad', curso: '3°', horas: 5, docente: 'Prof. Rodríguez' },
  { id: 5, nombre: 'Administración', curso: '4°', horas: 5, docente: 'Prof. Fernández' },
  { id: 6, nombre: 'Recursos Humanos', curso: '5°', horas: 4, docente: 'Prof. Gómez' },
];

const MateriasScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Surface style={styles.surface} elevation={1}>
        <Text variant="headlineMedium" style={styles.title}>
          Materias
        </Text>
        <DataTable style={styles.table}>
          <DataTable.Header>
            <DataTable.Title style={styles.colNombre}>Materia</DataTable.Title>
            <DataTable.Title style={styles.colCurso}>Curso</DataTable.Title>
            <DataTable.Title style={styles.colHoras}>Horas</DataTable.Title>
            <DataTable.Title style={styles.colDocente}>Docente</DataTable.Title>
          </DataTable.Header>

          {materiasData.map((item) => (
            <DataTable.Row key={item.id}>
              <DataTable.Cell style={styles.colNombre}>{item.nombre}</DataTable.Cell>
              <DataTable.Cell style={styles.colCurso}>{item.curso}</DataTable.Cell>
              <DataTable.Cell style={styles.colHoras}>{item.horas}</DataTable.Cell>
              <DataTable.Cell style={styles.colDocente}>{item.docente}</DataTable.Cell>
            </DataTable.Row>
          ))}
        </DataTable>
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
    width: '100%',
    backgroundColor: '#FFFFFF',
  },
  title: {
    marginTop: 16,
    marginBottom: 24,
    color: '#1F5FAF',
    textAlign: 'center',
  },
  table: {
    width: '100%',
  },
  colNombre: {
    flex: 1.5,
  },
  colCurso: {
    flex: 0.5,
  },
  colHoras: {
    flex: 0.5,
  },
  colDocente: {
    flex: 1,
  },
});

export default MateriasScreen;