import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Surface, DataTable, ActivityIndicator } from 'react-native-paper';
import { Curso, getCursos } from '../services/cursoService';
import { Materia, getMaterias } from '../services/materiaService';

const getCursoLabel = (curso: Curso) => {
  const numeroDivision = `${curso.curso || ''}${curso.division || ''}`.trim();
  return [numeroDivision, curso.orientacionNombreCorto, curso.anexoNombre].filter(Boolean).join(' ');
};

const getMateriaDocentes = (materia: Materia) => {
  if (!materia.docentes || materia.docentes.length === 0) return 'Sin docentes';
  return materia.docentes.map((docente) => docente.rol ? `${docente.docente} (${docente.rol})` : docente.docente).join(', ');
};

const CursosScreen: React.FC = () => {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [selectedCurso, setSelectedCurso] = useState<Curso | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');
        const [cursosData, materiasData] = await Promise.all([getCursos(), getMaterias()]);
        setCursos(cursosData);
        setMaterias(materiasData);
        setSelectedCurso(cursosData[0] || null);
      } catch (err: any) {
        setError(err?.message || 'No se pudieron cargar los cursos');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const materiasCurso = selectedCurso
    ? materias.filter((materia) => materia.cursoId === selectedCurso.id)
    : [];

  return (
    <View style={styles.container}>
      <Surface style={styles.surface} elevation={1}>
        <Text variant="headlineMedium" style={styles.title}>
          Cursos
        </Text>
        {loading && <ActivityIndicator animating color="#1F5FAF" />}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <ScrollView showsVerticalScrollIndicator={false}>
          <DataTable style={styles.table}>
            <DataTable.Header>
              <DataTable.Title style={styles.colCurso}>Curso</DataTable.Title>
              <DataTable.Title style={styles.colOrientacion}>Orientación</DataTable.Title>
              <DataTable.Title style={styles.colAnexo}>Anexo</DataTable.Title>
              <DataTable.Title style={styles.colSemi}>Semi</DataTable.Title>
            </DataTable.Header>

            {cursos.map((item) => {
              const selected = selectedCurso?.id === item.id;
              return (
                <DataTable.Row
                  key={item.id}
                  onPress={() => setSelectedCurso(item)}
                  style={selected && styles.selectedRow}
                >
                  <DataTable.Cell style={styles.colCurso}>{`${item.curso}${item.division}`}</DataTable.Cell>
                  <DataTable.Cell style={styles.colOrientacion}>{item.orientacionNombreCorto}</DataTable.Cell>
                  <DataTable.Cell style={styles.colAnexo}>{item.anexoNombre}</DataTable.Cell>
                  <DataTable.Cell style={styles.colSemi}>{item.semipresencial ? 'Si' : 'No'}</DataTable.Cell>
                </DataTable.Row>
              );
            })}
          </DataTable>

          {selectedCurso && (
            <View style={styles.materiasSection}>
              <Text style={styles.sectionTitle}>Materias de {getCursoLabel(selectedCurso)}</Text>
              <DataTable style={styles.table}>
                <DataTable.Header>
                  <DataTable.Title style={styles.colMateria}>Materia</DataTable.Title>
                  <DataTable.Title style={styles.colDocentes}>Docentes</DataTable.Title>
                </DataTable.Header>

                {materiasCurso.map((materia) => (
                  <DataTable.Row key={materia.id}>
                    <DataTable.Cell style={styles.colMateria}>{materia.nombre}</DataTable.Cell>
                    <DataTable.Cell style={styles.colDocentes}>{getMateriaDocentes(materia)}</DataTable.Cell>
                  </DataTable.Row>
                ))}
              </DataTable>
              {materiasCurso.length === 0 && (
                <Text style={styles.emptyText}>Este curso no tiene materias cargadas.</Text>
              )}
            </View>
          )}
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
  colCurso: {
    flex: 0.8,
  },
  colOrientacion: {
    flex: 1.2,
  },
  colAnexo: {
    flex: 1,
  },
  colSemi: {
    flex: 0.6,
  },
  selectedRow: {
    backgroundColor: '#E6F0FA',
  },
  materiasSection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F5FAF',
    marginBottom: 8,
  },
  colMateria: {
    flex: 1.2,
  },
  colDocentes: {
    flex: 1.8,
  },
  errorText: {
    color: '#C62828',
    textAlign: 'center',
    marginBottom: 12,
  },
  emptyText: {
    color: '#6B6B6B',
    textAlign: 'center',
    marginTop: 12,
  },
});

export default CursosScreen;
