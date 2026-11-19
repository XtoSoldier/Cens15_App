import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, Platform, useWindowDimensions } from 'react-native';
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
  anio: string;
  inscripciones: InscripcionListado[];
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

interface InscripcionListado {
  cursoId: string;
  curso: string;
  anexo: string;
  orientacion: string;
  anio: string;
  activa: boolean;
  fecha: string;
  id: string;
}

const text = (value: unknown): string => typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';

const getYear = (inscripcion: any) => {
  const value = text(inscripcion?.anio ?? inscripcion?.Anio);
  return /^\d{4}$/.test(value) && Number(value) > 0 ? value : '';
};

const getCursoText = (inscripcion: any) => {
  const curso = inscripcion?.curso || inscripcion?.Curso;
  const cursoNombre = text(inscripcion?.cursoNombre || inscripcion?.CursoNombre || (typeof curso === 'string' ? curso : curso?.curso || curso?.Curso));
  const division = text(inscripcion?.division || inscripcion?.Division || curso?.division || curso?.Division);
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
  return inscripcion?.cursoId || inscripcion?.CursoId || inscripcion?.id_curso || inscripcion?.IdCurso || inscripcion?.curso?.id || inscripcion?.Curso?.Id || null;
};

const resolveCursoFromInscripcion = (inscripcion: any, cursos: Curso[]) => {
  const cursoObject = inscripcion?.curso || inscripcion?.Curso;
  const cursoId = getCursoIdFromInscripcion(inscripcion);
  return cursos.find((curso) => String(curso.id) === String(cursoId)) || (cursoObject && typeof cursoObject === 'object' ? cursoObject : null);
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
  // Sort a normalized copy, never the API arrays. Latest year wins, then active status/date/id.
  const inscripciones: InscripcionListado[] = alumnoConInscripciones.inscripciones
    .filter((i) => i && typeof i === 'object' && !Array.isArray(i))
    .map((i) => {
      const curso = resolveCursoFromInscripcion(i, cursos);
      return {
        cursoId: text(getCursoIdFromInscripcion(i)),
        curso: getCursoText({ ...i, curso: i.curso || i.Curso || curso,
          division: i.division || i.Division || curso?.division || curso?.Division }),
        anexo: text(getAnexoResolvedText(i, cursos)),
        orientacion: text(getOrientacionResolvedText(i, cursos)),
        anio: getYear(i),
        activa: (i.estado || i.Estado) === 'Activa',
        fecha: text(i.fechaInscripcion || i.FechaInscripcion),
        id: text(i.id || i.Id),
      };
    })
    .sort((a, b) => b.anio.localeCompare(a.anio) || Number(b.activa) - Number(a.activa) ||
      b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id, undefined, { numeric: true }) ||
      JSON.stringify(a).localeCompare(JSON.stringify(b)));
  const inscripcion = inscripciones[0];

  return {
    id: alumno.id,
    nombre: text(alumno.nombres),
    apellido: text(alumno.apellidos),
    dni: text(alumno.numeroDocumento),
    curso: inscripcion?.curso || '',
    anexo: inscripcion?.anexo || '',
    orientacion: inscripcion?.orientacion || '',
    anio: inscripcion?.anio || '',
    inscripciones,
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
  ? ({ minHeight: 0, overflowY: 'auto' } as any)
  : null;

const AlumnosListadoScreen: React.FC = () => {
  const navigation = useNavigation<AlumnosListadoNavigationProp>();
  const { width } = useWindowDimensions();
  const showCourseButtons = width >= 768;
  const [alumnos, setAlumnos] = useState<AlumnoListadoItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadAll, setLoadAll] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [selectedCurso, setSelectedCurso] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'curso' | 'anio' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [courseCatalog, setCourseCatalog] = useState<Curso[]>([]);
  const [loadingCursos, setLoadingCursos] = useState(false);
  const [cursosError, setCursosError] = useState('');
  const cursosRequest = useRef<Promise<Curso[]> | null>(null);
  const cursosVersion = useRef(0);
  const requestVersion = useRef(0);
  const currentYear = String(new Date().getFullYear());
  const requestedSearch = !loadAll && searchQuery.trim().length >= 3 ? searchQuery.trim() : undefined;
  const requestedCurso = !loadAll && selectedCurso ? Number(selectedCurso) : undefined;
  const requestedYear = requestedCurso !== undefined && selectedYear ? Number(selectedYear) : undefined;
  const canLoad = loadAll || !!selectedCurso || searchQuery.trim().length >= 3;

  const fetchCursos = useCallback(() => {
    const version = ++cursosVersion.current;
    setLoadingCursos(true);
    setCursosError('');
    const request = getCursos();
    cursosRequest.current = request;
    void request.then(data => {
      if (version === cursosVersion.current) setCourseCatalog(data);
    }).catch(err => {
      if (version === cursosVersion.current) setCursosError(err?.message || 'No se pudieron cargar los cursos');
    }).finally(() => {
      if (version === cursosVersion.current) setLoadingCursos(false);
    });
    return request;
  }, []);

  useFocusEffect(useCallback(() => {
    void fetchCursos();
    return () => { cursosVersion.current++; };
  }, [fetchCursos]));

  const fetchAlumnos = useCallback(async () => {
    if (!canLoad) return;
    const version = ++requestVersion.current;
    try {
      setLoading(true);
      setError('');
      const [data, cursosData] = await Promise.all([
        getAlumnos(requestedSearch, { cursoId: requestedCurso, anio: requestedYear }),
        cursosRequest.current || fetchCursos(),
      ]);
      if (version !== requestVersion.current) return;
      const alumnosConInscripciones = await Promise.all(
        data.map(async (alumno) => {
          try {
            const inscripciones = await getInscripcionesByAlumno(alumno.id);
            if (!Array.isArray(inscripciones)) throw new Error('Historial no disponible');
            return normalizeAlumno(alumno, cursosData, inscripciones);
          } catch {
            throw new Error('No se pudo cargar el historial de inscripciones. Reintentá para obtener un listado completo.');
          }
        })
      );
      if (version === requestVersion.current) {
        setAlumnos(Array.from(new Map(alumnosConInscripciones.map((alumno) => [alumno.id, alumno])).values()));
      }
    } catch (err: any) {
      if (version === requestVersion.current) setError(err?.message || 'No se pudo cargar el listado de alumnos');
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [requestedSearch, requestedCurso, requestedYear, canLoad, fetchCursos]);

  useFocusEffect(
    useCallback(() => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      setAlumnos([]);
      setError('');
      setLoading(canLoad);
      if (canLoad) {
        if (loadAll || requestedSearch === undefined) void fetchAlumnos();
        else timer = setTimeout(() => { void fetchAlumnos(); }, 300);
      }
      return () => { clearTimeout(timer); requestVersion.current++; };
    }, [fetchAlumnos, canLoad, loadAll, requestedSearch])
  );

  const handleSearchChange = (value: string) => {
    const nextSearch = value.trim().length >= 3 ? value.trim() : undefined;
    if (!loadAll && nextSearch !== requestedSearch) {
      requestVersion.current++;
      setAlumnos([]);
      setError('');
      setLoading(!!selectedCurso || value.trim().length >= 3);
    }
    setSearchQuery(value);
  };

  const inscripciones = useMemo(() => alumnos.flatMap((a) => a.inscripciones), [alumnos]);
  const cursos = useMemo(() => {
    return courseCatalog.map(curso => ({ value: String(curso.id), label: `${curso.curso} ${curso.division}`.trim() || 'Curso' }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [courseCatalog]);
  const years = useMemo(() => uniqueValues([currentYear, selectedYear || '', ...inscripciones.map((i) => i.anio)]).reverse(), [inscripciones, currentYear, selectedYear]);
  const selectedCursoLabel = cursos.find((curso) => curso.value === selectedCurso)?.label || (selectedCurso ? 'Curso no disponible' : null);

  const filteredAlumnos = alumnos.flatMap((alumno) => {
    const terms = loadAll || searchQuery.trim().length >= 3 ? searchQuery.trim().toLowerCase().split(/\s+/) : [];
    const searchable = `${alumno.nombre} ${alumno.apellido} ${alumno.dni}`.toLowerCase();
    const matchesSearch = terms.every((term) => searchable.includes(term));

    if (!matchesSearch) return [];
    const inscripcion = alumno.inscripciones.find((i) =>
      (!selectedCurso || i.cursoId === selectedCurso) &&
      (!selectedYear || i.anio === selectedYear));
    if (!inscripcion && (selectedCurso || selectedYear)) return [];
    return [{ ...alumno, curso: inscripcion?.curso || '', anexo: inscripcion?.anexo || '',
      orientacion: inscripcion?.orientacion || '', anio: inscripcion?.anio || '' }];
  });

  const clearFilters = () => {
    setSelectedCurso(null);
    setSelectedYear(null);
    setFilterType(null);
  };

  const getFilterData = () => {
    switch (filterType) {
      case 'curso': return cursos;
      case 'anio': return years.map((value) => ({ value, label: value }));
      default: return [];
    }
  };

  const handleFilterSelect = (value: string | null) => {
    switch (filterType) {
      case 'curso': selectCurso(value); break;
      case 'anio': setSelectedYear(value); break;
    }
    setFilterType(null);
  };

  const selectCurso = (value: string | null) => {
    setSelectedCurso(value);
    if (value && !selectedYear) setSelectedYear(currentYear);
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
              onChangeText={handleSearchChange}
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
            disabled={loading || !canLoad}
            style={styles.iconButton}
          />
          <IconButton
            icon="filter"
            accessibilityLabel={showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
            accessibilityState={{ expanded: showFilters }}
            size={24}
            iconColor={showFilters ? '#1F5FAF' : '#6B6B6B'}
            onPress={() => {
              setShowFilters(!showFilters);
              if (!showFilters) setFilterType(null);
            }}
            style={styles.iconButton}
          />
        </View>

        <View style={styles.loadOptions}>
          <Text style={styles.searchHelp}>Buscá por nombre, apellido o DNI (mínimo 3 caracteres).</Text>
          <TouchableRipple
            accessibilityRole="button"
            accessibilityLabel="Traer todos"
            style={styles.clearButton}
            onPress={() => {
              setSearchQuery('');
              clearFilters();
              if (loadAll) void fetchAlumnos();
              else setLoadAll(true);
            }}
          >
            <Text style={styles.clearButtonText}>Traer todos</Text>
          </TouchableRipple>
        </View>

        {showFilters && (
          <View style={styles.filtersDropdown}>
            <View style={styles.filterRow}>
              {showCourseButtons ? <>
                <Text style={styles.filterOptionText}>Cursos:</Text>
                <TouchableRipple
                  accessibilityRole="button" accessibilityLabel="Curso: Todos"
                  accessibilityState={{ selected: selectedCurso === null }}
                  style={[styles.filterOption, selectedCurso === null && styles.filterOptionActive]}
                  onPress={() => selectCurso(null)}>
                  <Text style={[styles.filterOptionText, selectedCurso === null && styles.selectedCourseText]}>Todos</Text>
                </TouchableRipple>
                {cursos.map((curso) => <TouchableRipple key={curso.value}
                  accessibilityRole="button" accessibilityLabel={`Curso: ${curso.label}`}
                  accessibilityState={{ selected: selectedCurso === curso.value }}
                  style={[styles.filterOption, selectedCurso === curso.value && styles.filterOptionActive]}
                  onPress={() => selectCurso(curso.value)}>
                  <Text style={[styles.filterOptionText, selectedCurso === curso.value && styles.selectedCourseText]}>{curso.label}</Text>
                </TouchableRipple>)}
              </> : <TouchableRipple
                style={[styles.filterOption, selectedCurso && styles.filterOptionActive]}
                onPress={() => setFilterType(filterType === 'curso' ? null : 'curso')}
              >
                <Text style={styles.filterOptionText}>Curso: {selectedCursoLabel || 'Todos'}</Text>
              </TouchableRipple>}
              <TouchableRipple
                style={[styles.filterOption, selectedYear && styles.filterOptionActive]}
                onPress={() => setFilterType(filterType === 'anio' ? null : 'anio')}
              >
                <Text style={styles.filterOptionText}>Año de inscripción: {selectedYear || 'Todos'}</Text>
              </TouchableRipple>
              {(selectedCurso || selectedYear) && (
                <TouchableRipple onPress={clearFilters} style={styles.clearButton}
                  accessibilityRole="button" accessibilityLabel="Limpiar todos los filtros">
                  <Text style={styles.clearButtonText}>Limpiar filtros</Text>
                </TouchableRipple>
              )}
            </View>

            {loadingCursos && <Text style={styles.emptyFilterText}>Cargando cursos...</Text>}
            {cursosError ? <View>
              <Text style={styles.errorText}>{cursosError}</Text>
              <TouchableRipple onPress={() => { void fetchCursos(); }} style={styles.clearButton}>
                <Text style={styles.clearButtonText}>Reintentar cursos</Text>
              </TouchableRipple>
            </View> : null}

            {filterType && (filterType !== 'curso' || !showCourseButtons) && (
              <View style={styles.filterList}>
                <Text style={styles.filterListTitle}>
                  {filterType === 'curso' ? 'Cursos' : 'Años de inscripción'}
                </Text>
                <ScrollView style={styles.filterOptions} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                  <TouchableRipple style={styles.filterItem} onPress={() => handleFilterSelect(null)}
                    accessibilityRole="button" accessibilityLabel={`${filterType === 'curso' ? 'Curso' : 'Año de inscripción'}: Todos`}>
                    <Text style={styles.filterItemText}>Todos</Text>
                  </TouchableRipple>
                  {getFilterData().length === 0 ? (
                    <Text style={styles.emptyFilterText}>No hay opciones disponibles</Text>
                  ) : (
                    getFilterData().map((item) => (
                      <TouchableRipple key={item.value} style={styles.filterItem} onPress={() => handleFilterSelect(item.value)}>
                        <Text style={styles.filterItemText}>{item.label}</Text>
                      </TouchableRipple>
                    ))
                  )}
                </ScrollView>
              </View>
            )}

          </View>
        )}

        {!showFilters && (selectedCurso || selectedYear) && (
          <View style={styles.activeFilters}>
            {selectedCurso && (
              <TouchableRipple onPress={() => setSelectedCurso(null)} style={styles.filterChip}>
                <Text style={styles.filterChipText}>Curso: {selectedCursoLabel} x</Text>
              </TouchableRipple>
            )}
            {selectedYear && (
              <TouchableRipple onPress={() => setSelectedYear(null)} style={styles.filterChip}>
                <Text style={styles.filterChipText}>Año de inscripción: {selectedYear} x</Text>
              </TouchableRipple>
            )}
          </View>
        )}

        <Text style={styles.resultCount} accessibilityLiveRegion="polite">
          {!canLoad ? 'Alumnos encontrados: sin consultar' : loading ? 'Alumnos encontrados: cargando...' : error ? 'Alumnos encontrados: no disponible' : `Alumnos encontrados: ${filteredAlumnos.length}`}
        </Text>

        {!canLoad ? (
          <View style={styles.stateContainer}>
            <Text style={styles.stateText}>Escribí al menos 3 caracteres para buscar, elegí un curso o seleccioná "Traer todos".</Text>
          </View>
        ) : loading ? (
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
                    {[alumno.curso, alumno.anexo, alumno.orientacion].filter(Boolean).join(' - ') || 'Sin inscripción'}
                  </Text>
                  <Text style={styles.alumnoDetails}>
                    {alumno.anio ? `Año de inscripción: ${alumno.anio}` : alumno.inscripciones.length ? 'Sin año informado' : 'Sin inscripción'}
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
    minHeight: 0,
    padding: 16,
    width: '100%',
    backgroundColor: '#FFFFFF',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  searchContainer: {
    flex: 1,
  },
  loadOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  searchHelp: {
    flexShrink: 1,
    fontSize: 12,
    color: '#6B6B6B',
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
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  filterOption: {
    maxWidth: '100%',
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
  selectedCourseText: {
    color: '#1F5FAF',
    fontWeight: '600',
  },
  filterList: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  filterOptions: {
    maxHeight: 180,
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
    justifyContent: 'center',
  },
  clearButtonText: {
    fontSize: 12,
    color: '#1F5FAF',
    fontWeight: '500',
  },
  activeFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
    gap: 8,
  },
  filterChip: {
    maxWidth: '100%',
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
    minHeight: 0,
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
  resultCount: {
    fontSize: 12,
    color: '#6B6B6B',
    marginBottom: 4,
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
