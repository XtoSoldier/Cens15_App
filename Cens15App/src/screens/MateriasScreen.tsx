import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator, DataTable, Surface, Text } from 'react-native-paper';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { getMaterias, Materia } from '../services/materiaService';

type MateriasScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Materias'>;

const MateriasScreen: React.FC = () => {
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const loadMaterias = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await getMaterias();
        if (mounted) {
          setMaterias(Array.isArray(data) ? data : []);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err?.message || 'No se pudieron cargar las materias');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadMaterias();

    return () => {
      mounted = false;
    };
  }, []);

  const getCursoLabel = (materia: Materia) => {
    const curso = [materia.curso, materia.division].filter(Boolean).join(' ');
    return curso || '-';
  };

  const getDocentesLabel = (materia: Materia) => {
    if (!materia.docentes || materia.docentes.length === 0) {
      return 'Sin docente';
    }

    return materia.docentes
      .map((docente) => {
        const rol = docente.rol ? ` (${docente.rol})` : '';
        return `${docente.docente}${rol}`;
      })
      .join(', ');
  };

  return (
    <View style={styles.container}>
      <Surface style={styles.surface} elevation={1}>
        <Text variant="headlineMedium" style={styles.title}>
          Materias
        </Text>
        {loading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator animating color="#1F5FAF" />
            <Text style={styles.statusText}>Cargando materias...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContent}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : materias.length === 0 ? (
          <View style={styles.centerContent}>
            <Text style={styles.statusText}>No hay materias cargadas.</Text>
          </View>
        ) : (
          <DataTable style={styles.table}>
            <DataTable.Header>
              <DataTable.Title style={styles.colNombre}>Materia</DataTable.Title>
              <DataTable.Title style={styles.colCurso}>Curso</DataTable.Title>
              <DataTable.Title style={styles.colDocente}>Docente</DataTable.Title>
            </DataTable.Header>

            {materias.map((item) => (
              <DataTable.Row key={item.id}>
                <DataTable.Cell style={styles.colNombre}>{item.nombre}</DataTable.Cell>
                <DataTable.Cell style={styles.colCurso}>{getCursoLabel(item)}</DataTable.Cell>
                <DataTable.Cell style={styles.colDocente}>{getDocentesLabel(item)}</DataTable.Cell>
              </DataTable.Row>
            ))}
          </DataTable>
        )}
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
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  statusText: {
    marginTop: 12,
    color: '#6B6B6B',
    textAlign: 'center',
  },
  errorText: {
    color: '#D32F2F',
    textAlign: 'center',
  },
  colNombre: {
    flex: 1.5,
  },
  colCurso: {
    flex: 0.8,
  },
  colDocente: {
    flex: 1.7,
  },
});

export default MateriasScreen;
