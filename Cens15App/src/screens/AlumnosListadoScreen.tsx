import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { Text, Surface, TextInput, IconButton, TouchableRipple, ActivityIndicator } from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { getAlumnos, getInscripcionesByAlumno, Alumno } from '../services/alumnoService';
import { Curso, getCursos } from '../services/cursoService';

type AlumnosListadoNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AlumnosListado'>;

interface AlumnoListadoItem {
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
  curso: string;
  anexo: string;
  orientacion: string;
  sexo: string;
  fechaNacimiento?: string | null;
  domicilio?: string | null;
  nacionalidad?: string | null;
  paisNacimiento?: string | null;
  provinciaNacimiento?: string | null;
  localidadNacimiento?: string | null;
  telefono?: string | null;
  email?: string | null;
  emergenciaNombre?: string | null;
  emergenciaCelular?: string | null;
  raw: Alumno;
}

const getCurrentInscripcion = (alumno: Alumno) => {
  const inscripciones = alumno.inscripciones || [];
  return inscripciones.find((i) => i?.estado === 'Activa') || inscripciones[0] || null;
};

const getCursoText = (inscripcion: any) => {
  const curso = inscripcion?.curso || inscripcion?.Curso;
  if (typeof curso === 'string') return curso;
  if (inscripcion?.cursoNombre || inscripcion?.CursoNombre || inscripcion?.division || inscripcion?.Division) {
    return `${inscripcion?.cursoNombre || inscripcion?.CursoNombre || ''} ${inscripcion?.division || inscripcion?.Division || ''}`.trim();
  }
  if (!curso) return '';

  const cursoNombre = curso.curso || curso.Curso || '';
  const division = curso.division || curso.Division || '';
  return `${cursoNombre} ${division}`.trim();
};

const getAnexoText = (inscripcion: any) => {
  if (inscripcion?.anexoNombre || inscripcion?.AnexoNombre) return inscripcion?.anexoNombre || inscripcion?.AnexoNombre;

  const curso = inscripcion?.curso || inscripcion?.Curso;
  const anexo = curso?.anexo || curso?.Anexo || inscripcion?.anexo || inscripcion?.Anexo;
  return anexo?.nombre || anexo?.Nombre || '';
};

const getOrientacionText = (inscripcion: any) => {
  if (inscripcion?.orientacionNombre || inscripcion?.OrientacionNombre || inscripcion?.orientacionNombreCorto || inscripcion?.OrientacionNombreCorto) {
    return inscripcion?.orientacionNombreCorto || inscripcion?.OrientacionNombreCorto || inscripcion?.orientacionNombre || inscripcion?.OrientacionNombre;
  }

  const curso = inscripcion?.curso || inscripcion?.Curso;
  const orientacion = curso?.orientacion || curso?.Orientacion || inscripcion?.orientacion || inscripcion?.Orientacion;
  return orientacion?.nombre || orientacion?.Nombre || orientacion?.nombreCorto || orientacion?.NombreCorto || '';
};

const getCursoIdFromInscripcion = (inscripcion: any) => {
  return inscripcion?.cursoId || inscripcion?.CursoId || inscripcion?.id_curso || inscripcion?.IdCurso || null;
};

const resolveCursoFromInscripcion = (inscripcion: any, cursos: Curso[]) => {
  const cursoObject = inscripcion?.curso || inscripcion?.Curso;
  if (cursoObject && typeof cursoObject !== 'string') return cursoObject;

  const cursoId = getCursoIdFromInscripcion(inscripcion);
  if (!cursoId) return null;

  return cursos.find((curso) => curso.id === cursoId) || null;
};

const getAnexoResolvedText = (inscripcion: any, cursos: Curso[]) => {
  const curso = resolveCursoFromInscripcion(inscripcion, cursos);
  return curso?.anexoNombre || curso?.AnexoNombre || getAnexoText(inscripcion);
};

const getOrientacionResolvedText = (inscripcion: any, cursos: Curso[]) => {
  const curso = resolveCursoFromInscripcion(inscripcion, cursos);
  return curso?.orientacionNombreCorto || curso?.OrientacionNombreCorto || curso?.orientacionNombre || curso?.OrientacionNombre || getOrientacionText(inscripcion);
};

const normalizeAlumno = (alumno: Alumno, cursos: Curso[], inscripcionesOverride?: any[]): AlumnoListadoItem => {
  const alumnoConInscripciones = {
    ...alumno,
    inscripciones: inscripcionesOverride || alumno.inscripciones || [],
  };
  const inscripcion = getCurrentInscripcion(alumnoConInscripciones);

  return {
    id: alumno.id,
    nombre: alumno.nombres || '',
    apellido: alumno.apellidos || '',
    dni: alumno.numeroDocumento || '',
    curso: getCursoText(inscripcion),
    anexo: getAnexoResolvedText(inscripcion, cursos),
    orientacion: getOrientacionResolvedText(inscripcion, cursos),
    sexo: alumno.genero || '',
    fechaNacimiento: alumno.fechaNacimiento,
    domicilio: alumno.domicilio,
    nacionalidad: alumno.datosNacimiento?.pais || '',
    paisNacimiento: alumno.datosNacimiento?.pais || '',
    provinciaNacimiento: alumno.datosNacimiento?.provincia || '',
    localidadNacimiento: alumno.datosNacimiento?.localidad || '',
    telefono: alumno.contacto?.telefonoAlumno || '',
    email: alumno.contacto?.email || '',
    emergenciaNombre: alumno.contacto?.nombreEmergencia || '',
    emergenciaCelular: alumno.contacto?.telefonoEmergencia || '',
    raw: alumnoConInscripciones,
  };
};

const uniqueValues = (values: string[]) => Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
const webListStyle = Platform.OS === 'web'
  ? ({ maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' } as any)
  : null;

const AlumnosListadoScreen: React.FC = () => {
  const navigation = useNavigation<AlumnosListadoNavigationProp>();
  const [alumnos, setAlumnos] = useState<AlumnoListadoItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCurso, setSelectedCurso] = useState<string | null>(null);
  const [selectedAnexo, setSelectedAnexo] = useState<string | null>(null);
  const [selectedOrientacion, setSelectedOrientacion] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'curso' | 'anexo' | 'orientacion' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchAlumnos = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [data, cursosData] = await Promise.all([getAlumnos(), getCursos()]);
      const alumnosConInscripciones = await Promise.all(
        data.map(async (alumno) => {
          try {
            const inscripciones = await getInscripcionesByAlumno(alumno.id);
            return normalizeAlumno(alumno, cursosData, inscripciones);
          } catch {
            return normalizeAlumno(alumno, cursosData);
          }
        })
      );
      setAlumnos(alumnosConInscripciones);
    } catch (err: any) {
      setError(err?.message || 'No se pudo cargar el listado de alumnos');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAlumnos();
    }, [fetchAlumnos])
  );

  const cursos = useMemo(() => uniqueValues(alumnos.map((a) => a.curso)), [alumnos]);
  const anexos = useMemo(() => uniqueValues(alumnos.map((a) => a.anexo)), [alumnos]);
  const orientaciones = useMemo(() => uniqueValues(alumnos.map((a) => a.orientacion)), [alumnos]);

  const filteredAlumnos = alumnos.filter((alumno) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query ||
      alumno.nombre.toLowerCase().includes(query) ||
      alumno.apellido.toLowerCase().includes(query) ||
      alumno.dni.includes(query);

    const matchesCurso = !selectedCurso || alumno.curso === selectedCurso;
    const matchesAnexo = !selectedAnexo || alumno.anexo === selectedAnexo;
    const matchesOrientacion = !selectedOrientacion || alumno.orientacion === selectedOrientacion;

    return matchesSearch && matchesCurso && matchesAnexo && matchesOrientacion;
  });

  const clearFilters = () => {
    setSelectedCurso(null);
    setSelectedAnexo(null);
    setSelectedOrientacion(null);
    setFilterType(null);
  };

  const getFilterData = () => {
    switch (filterType) {
      case 'curso': return cursos;
      case 'anexo': return anexos;
      case 'orientacion': return orientaciones;
      default: return [];
    }
  };

  const handleFilterSelect = (value: string) => {
    switch (filterType) {
      case 'curso': setSelectedCurso(value); break;
      case 'anexo': setSelectedAnexo(value); break;
      case 'orientacion': setSelectedOrientacion(value); break;
    }
    setFilterType(null);
  };

  return (
    <View style={styles.container}>
      <Surface style={styles.surface} elevation={1}>
        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <TextInput
              label="Buscar alumno"
              value={searchQuery}
              onChangeText={setSearchQuery}
              mode="outlined"
              style={styles.searchInput}
              outlineColor="#E0E0E0"
              activeOutlineColor="#1F5FAF"
              right={<TextInput.Icon icon="magnify" color="#6B6B6B" />}
            />
          </View>
          <IconButton
            icon="refresh"
            size={22}
            iconColor="#6B6B6B"
            onPress={fetchAlumnos}
            disabled={loading}
            style={styles.iconButton}
          />
          <IconButton
            icon="filter"
            size={24}
            iconColor={showFilters ? '#1F5FAF' : '#6B6B6B'}
            onPress={() => {
              setShowFilters(!showFilters);
              if (!showFilters) setFilterType(null);
            }}
            style={styles.iconButton}
          />
        </View>

        {showFilters && (
          <View style={styles.filtersDropdown}>
            <View style={styles.filterRow}>
              <TouchableRipple
                style={[styles.filterOption, selectedCurso && styles.filterOptionActive]}
                onPress={() => setFilterType(filterType === 'curso' ? null : 'curso')}
              >
                <Text style={styles.filterOptionText}>Curso: {selectedCurso || 'Todos'}</Text>
              </TouchableRipple>
              <TouchableRipple
                style={[styles.filterOption, selectedAnexo && styles.filterOptionActive]}
                onPress={() => setFilterType(filterType === 'anexo' ? null : 'anexo')}
              >
                <Text style={styles.filterOptionText}>Anexo: {selectedAnexo || 'Todos'}</Text>
              </TouchableRipple>
              <TouchableRipple
                style={[styles.filterOption, selectedOrientacion && styles.filterOptionActive]}
                onPress={() => setFilterType(filterType === 'orientacion' ? null : 'orientacion')}
              >
                <Text style={styles.filterOptionText}>Orientación: {selectedOrientacion || 'Todas'}</Text>
              </TouchableRipple>
            </View>

            {filterType && (
              <View style={styles.filterList}>
                <Text style={styles.filterListTitle}>
                  {filterType === 'curso' ? 'Cursos' : filterType === 'anexo' ? 'Anexos' : 'Orientaciones'}
                </Text>
                {getFilterData().length === 0 ? (
                  <Text style={styles.emptyFilterText}>No hay opciones disponibles</Text>
                ) : (
                  getFilterData().map((item) => (
                    <TouchableRipple key={item} style={styles.filterItem} onPress={() => handleFilterSelect(item)}>
                      <Text style={styles.filterItemText}>{item}</Text>
                    </TouchableRipple>
                  ))
                )}
              </View>
            )}

            {(selectedCurso || selectedAnexo || selectedOrientacion) && (
              <TouchableRipple onPress={clearFilters} style={styles.clearButton}>
                <Text style={styles.clearButtonText}>Limpiar filtros</Text>
              </TouchableRipple>
            )}
          </View>
        )}

        {(selectedCurso || selectedAnexo || selectedOrientacion) && (
          <View style={styles.activeFilters}>
            {selectedCurso && (
              <TouchableRipple onPress={() => setSelectedCurso(null)} style={styles.filterChip}>
                <Text style={styles.filterChipText}>Curso: {selectedCurso} x</Text>
              </TouchableRipple>
            )}
            {selectedAnexo && (
              <TouchableRipple onPress={() => setSelectedAnexo(null)} style={styles.filterChip}>
                <Text style={styles.filterChipText}>Anexo: {selectedAnexo} x</Text>
              </TouchableRipple>
            )}
            {selectedOrientacion && (
              <TouchableRipple onPress={() => setSelectedOrientacion(null)} style={styles.filterChip}>
                <Text style={styles.filterChipText}>Orientación: {selectedOrientacion} x</Text>
              </TouchableRipple>
            )}
          </View>
        )}

        {loading ? (
          <View style={styles.stateContainer}>
            <ActivityIndicator color="#1F5FAF" />
            <Text style={styles.stateText}>Cargando alumnos...</Text>
          </View>
        ) : error ? (
          <View style={styles.stateContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableRipple onPress={fetchAlumnos} style={styles.retryButton}>
              <Text style={styles.retryText}>Reintentar</Text>
            </TouchableRipple>
          </View>
        ) : filteredAlumnos.length === 0 ? (
          <View style={styles.stateContainer}>
            <Text style={styles.stateText}>No hay alumnos para mostrar</Text>
          </View>
        ) : (
          <ScrollView
            style={[styles.listContainer, webListStyle]}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={Platform.OS === 'web'}
            nestedScrollEnabled
          >
            {filteredAlumnos.map((alumno) => (
              <TouchableRipple
                key={alumno.id}
                onPress={() => navigation.navigate('AlumnoDetalle', { alumno })}
                style={styles.alumnoItem}
              >
                <View>
                  <Text style={styles.alumnoName}>{alumno.apellido}, {alumno.nombre}</Text>
                  <Text style={styles.alumnoDNI}>DNI: {alumno.dni || 'Sin cargar'}</Text>
                  <Text style={styles.alumnoDetails}>
                    {[alumno.curso, alumno.anexo, alumno.orientacion].filter(Boolean).join(' - ') || 'Sin inscripción activa'}
                  </Text>
                </View>
              </TouchableRipple>
            ))}
          </ScrollView>
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  searchContainer: {
    flex: 1,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
  },
  iconButton: {
    marginLeft: 4,
    marginRight: -4,
  },
  filtersDropdown: {
    backgroundColor: '#F7F9FC',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  filterOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterOptionActive: {
    backgroundColor: '#E6F0FA',
    borderColor: '#1F5FAF',
  },
  filterOptionText: {
    fontSize: 12,
    color: '#2B2B2B',
  },
  filterList: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  filterListTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F5FAF',
    marginBottom: 8,
  },
  filterItem: {
    padding: 10,
    paddingLeft: 20,
  },
  filterItemText: {
    fontSize: 14,
    color: '#2B2B2B',
  },
  emptyFilterText: {
    fontSize: 13,
    color: '#6B6B6B',
    padding: 10,
  },
  clearButton: {
    padding: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  clearButtonText: {
    fontSize: 12,
    color: '#F28C28',
    fontWeight: '500',
  },
  activeFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 8,
  },
  filterChip: {
    backgroundColor: '#E6F0FA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterChipText: {
    fontSize: 12,
    color: '#1F5FAF',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
  },
  alumnoItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  alumnoName: {
    fontSize: 16,
    color: '#2B2B2B',
    fontWeight: '500',
  },
  alumnoDNI: {
    fontSize: 14,
    color: '#6B6B6B',
    marginTop: 4,
  },
  alumnoDetails: {
    fontSize: 12,
    color: '#6B6B6B',
    marginTop: 2,
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  stateText: {
    fontSize: 14,
    color: '#6B6B6B',
    marginTop: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#C62828',
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#E6F0FA',
  },
  retryText: {
    color: '#1F5FAF',
    fontWeight: '600',
  },
});

export default AlumnosListadoScreen;
