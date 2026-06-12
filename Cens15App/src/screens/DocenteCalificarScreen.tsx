import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Modal, TouchableWithoutFeedback, ActivityIndicator } from 'react-native';
import { Text, Surface, DataTable, Chip, IconButton, Avatar, Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector, useAppDispatch } from '../hooks/useRedux';
import { updateProfile } from '../slices/appSlice';
import { getDocenteByUserId, getAlumnosParaCalificar, DocenteMateriaConAlumnosDto, AlumnoCalificacionSimpleDto } from '../services/docenteService';
import { createCalificacion, updateCalificacion, SaveCalificacionRequest } from '../services/calificacionService';
import { getUserIdFromToken } from '../utils/storage';

type Grado = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'A' | 'S/C' | '';
type Situacion = 'R1' | 'R2' | 'R1+R2' | 'AP' | 'APE' | '';

const SITUACIONES: { value: Situacion; label: string }[] = [
  { value: '', label: '-' },
  { value: 'R1', label: 'Recupera 1ro' },
  { value: 'R2', label: 'Recupera 2do' },
  { value: 'R1+R2', label: 'Recupera 1ro y 2do' },
  { value: 'AP', label: 'Aprobado' },
  { value: 'APE', label: 'Aprobado x Equivalencia' },
];

const NOTAS_POSIBLES: Grado[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'A', 'S/C'];

interface AlumnoRow {
  alumnoId: number;
  alumnoNombre: string;
  cursadaMateriaId: number;
  calificacionId: number | null;
  c1: Grado;
  c2: Grado;
  anual: Grado;
  diciembre: Grado;
  febrero: Grado;
  final: Grado;
  situacion: Situacion;
  saving: boolean;
}

interface MateriaCurso {
  materiaId: number;
  materiaNombre: string;
  cursoLabel: string;
  anio: number;
  alumnos: AlumnoRow[];
}

function gradoFromDecimal(v: number | null | undefined): Grado {
  if (v == null) return '';
  const n = Math.round(v);
  if (n >= 1 && n <= 10) return n.toString() as Grado;
  return '';
}

function decimalFromGrado(g: Grado): number | null {
  if (g === '' || g === 'A' || g === 'S/C') return null;
  return parseInt(g, 10);
}

function situacionFromEstado(estado: number): Situacion {
  switch (estado) {
    case 1: return 'AP';
    case 2: return 'R1';
    case 3: return 'R2';
    case 4: return 'R1+R2';
    default: return '';
  }
}

function estadoFromSituacion(sit: Situacion): number {
  switch (sit) {
    case 'AP':
    case 'APE': return 1;
    case 'R1': return 2;
    case 'R2': return 3;
    case 'R1+R2': return 4;
    default: return 0;
  }
}

function isAprobada(nota: string) {
  const n = parseInt(nota);
  return !isNaN(n) && n >= 6;
}

function isReprobada(nota: string) {
  const n = parseInt(nota);
  return !isNaN(n) && n < 6;
}

function getNotaColor(nota: Grado) {
  if (isAprobada(nota)) return '#2E7D32';
  if (isReprobada(nota)) return '#C62828';
  if (nota === 'A') return '#E65100';
  if (nota === 'S/C') return '#9E9E9E';
  return '#2B2B2B';
}

function getSituacionColor(sit: Situacion) {
  switch (sit) {
    case 'AP': return '#2E7D32';
    case 'APE': return '#00897B';
    case 'R1':
    case 'R2':
    case 'R1+R2': return '#E65100';
    default: return '#6B6B6B';
  }
}

function GradePickerModal({
  visible,
  currentGrade,
  onSelect,
  onClose,
}: {
  visible: boolean;
  currentGrade: string;
  onSelect: (grade: Grado) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <Surface style={styles.modalContent} elevation={3}>
              <Text style={styles.modalTitle}>Nota</Text>
              <View style={styles.gradeGrid}>
                <Chip
                  key="clear"
                  selected={currentGrade === ''}
                  onPress={() => onSelect('')}
                  style={[styles.gradeChip, currentGrade === '' && styles.gradeChipSelected, styles.gradeChipGray]}
                  textStyle={styles.gradeChipText}
                >
                  —
                </Chip>
                {NOTAS_POSIBLES.map((nota) => (
                  <Chip
                    key={nota}
                    selected={currentGrade === nota}
                    onPress={() => onSelect(nota)}
                    style={[
                      styles.gradeChip,
                      currentGrade === nota && styles.gradeChipSelected,
                      isAprobada(nota) && styles.gradeChipGreen,
                      isReprobada(nota) && styles.gradeChipRed,
                      nota === 'A' && styles.gradeChipOrange,
                      nota === 'S/C' && styles.gradeChipGray,
                    ]}
                    textStyle={styles.gradeChipText}
                  >
                    {nota}
                  </Chip>
                ))}
              </View>
            </Surface>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

function SituacionPickerModal({
  visible,
  currentSituacion,
  onSelect,
  onClose,
}: {
  visible: boolean;
  currentSituacion: string;
  onSelect: (sit: Situacion) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <Surface style={styles.sitModalContent} elevation={3}>
              <Text style={styles.modalTitle}>Situación</Text>
              {SITUACIONES.map((sit) => (
                <Chip
                  key={sit.value}
                  selected={currentSituacion === sit.value}
                  onPress={() => onSelect(sit.value)}
                  style={[
                    styles.sitChip,
                    currentSituacion === sit.value && styles.sitChipSelected,
                    sit.value === 'AP' && styles.sitChipGreen,
                    sit.value === 'APE' && styles.sitChipTeal,
                    sit.value.startsWith('R') && styles.sitChipOrange,
                  ]}
                  textStyle={styles.sitChipText}
                >
                  {sit.label}
                </Chip>
              ))}
            </Surface>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const FIELD_LABELS: Record<string, string> = {
  c1: 'C1', c2: 'C2', anual: 'N.A.', diciembre: 'Dic', febrero: 'Feb', final: 'N.F.',
};

const DocenteCalificarScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { userId, userName, userLastname } = useAppSelector((s) => s.app);

  const [materias, setMaterias] = useState<MateriaCurso[]>([]);
  const [selectedMateriaIdx, setSelectedMateriaIdx] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [docenteNombre, setDocenteNombre] = useState('');

  const [gradePicker, setGradePicker] = useState<{ visible: boolean; alumnoIdx: number; field: string; value: string }>({
    visible: false,
    alumnoIdx: 0,
    field: '',
    value: '',
  });

  const [sitPicker, setSitPicker] = useState<{ visible: boolean; alumnoIdx: number; value: string }>({
    visible: false,
    alumnoIdx: 0,
    value: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      let uid = userId;
      if (!uid) {
        uid = (await getUserIdFromToken()) || '';
        if (uid) {
          dispatch(updateProfile({ userId: uid }));
        }
      }
      if (!uid) {
        setError('No hay usuario logueado');
        setLoading(false);
        return;
      }
      const docente = await getDocenteByUserId(uid);
      if (!docente) {
        setError('El usuario no está vinculado a ningún docente');
        setLoading(false);
        return;
      }
      setDocenteNombre(`${docente.apellidos}, ${docente.nombres}`);
      const data = await getAlumnosParaCalificar(docente.id);
      const mapped: MateriaCurso[] = data.map((m: DocenteMateriaConAlumnosDto) => ({
        materiaId: m.materiaId,
        materiaNombre: m.materiaNombre,
        cursoLabel: m.cursoLabel || `${m.cursoNombre} ${m.division}`,
        anio: m.anio,
        alumnos: m.alumnos.map((a: AlumnoCalificacionSimpleDto) => ({
          alumnoId: a.alumnoId,
          alumnoNombre: a.alumnoNombre,
          cursadaMateriaId: a.cursadaMateriaId,
          calificacionId: a.calificacionId,
          c1: gradoFromDecimal(a.c1Promedio),
          c2: gradoFromDecimal(a.c2Promedio),
          anual: gradoFromDecimal(a.promedioAnual),
          diciembre: gradoFromDecimal(a.recuperacionDiciembre),
          febrero: gradoFromDecimal(a.recuperacionMarzo),
          final: gradoFromDecimal(a.calificacionFinal),
          situacion: situacionFromEstado(a.estado),
          saving: false,
        })),
      }));
      setMaterias(mapped);
    } catch (err: any) {
      setError(err?.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const selectedMateria = selectedMateriaIdx !== null ? materias[selectedMateriaIdx] : null;

  const pendingGrade = gradePicker.visible && selectedMateria ? selectedMateria.alumnos[gradePicker.alumnoIdx][gradePicker.field as keyof AlumnoRow] as Grado : '';

  const doSaveGrade = async (materiaIdx: number, alumnoIdx: number, field: string, g: Grado) => {
    const materia = materias[materiaIdx];
    const alumno = materia.alumnos[alumnoIdx];
    const califId = alumno.calificacionId;

    const updated = [...materias];
    updated[materiaIdx] = { ...updated[materiaIdx] };
    updated[materiaIdx].alumnos = [...updated[materiaIdx].alumnos];
    updated[materiaIdx].alumnos[alumnoIdx] = { ...alumno, saving: true };
    setMaterias([...updated]);

    try {
      const body: SaveCalificacionRequest = {
        cursadaMateriaId: alumno.cursadaMateriaId,
        c1Promedio: field === 'c1' ? decimalFromGrado(g) : decimalFromGrado(alumno.c1),
        c2Promedio: field === 'c2' ? decimalFromGrado(g) : decimalFromGrado(alumno.c2),
        promedioAnual: field === 'anual' ? decimalFromGrado(g) : decimalFromGrado(alumno.anual),
        recuperacionDiciembre: field === 'diciembre' ? decimalFromGrado(g) : decimalFromGrado(alumno.diciembre),
        recuperacionMarzo: field === 'febrero' ? decimalFromGrado(g) : decimalFromGrado(alumno.febrero),
        calificacionFinal: field === 'final' ? decimalFromGrado(g) : decimalFromGrado(alumno.final),
        estado: 'EnCurso',
      };

      let result: any;
      if (califId) {
        result = await updateCalificacion(califId, body);
      } else {
        result = await createCalificacion(body);
      }

      updated[materiaIdx].alumnos[alumnoIdx] = {
        ...updated[materiaIdx].alumnos[alumnoIdx],
        [field]: g,
        calificacionId: califId || (result && result.id) || null,
        saving: false,
      };
      setMaterias([...updated]);
    } catch (err: any) {
      updated[materiaIdx].alumnos[alumnoIdx] = { ...updated[materiaIdx].alumnos[alumnoIdx], saving: false };
      setMaterias([...updated]);
      setError(err?.message || 'Error al guardar la nota');
    }
  };

  const doSaveSituacion = async (materiaIdx: number, alumnoIdx: number, sit: Situacion) => {
    const materia = materias[materiaIdx];
    const alumno = materia.alumnos[alumnoIdx];
    const califId = alumno.calificacionId;

    const updated = [...materias];
    updated[materiaIdx] = { ...updated[materiaIdx] };
    updated[materiaIdx].alumnos = [...updated[materiaIdx].alumnos];
    updated[materiaIdx].alumnos[alumnoIdx] = { ...alumno, saving: true };
    setMaterias([...updated]);

    try {
      const body: SaveCalificacionRequest = {
        cursadaMateriaId: alumno.cursadaMateriaId,
        c1Promedio: decimalFromGrado(alumno.c1),
        c2Promedio: decimalFromGrado(alumno.c2),
        promedioAnual: decimalFromGrado(alumno.anual),
        recuperacionDiciembre: decimalFromGrado(alumno.diciembre),
        recuperacionMarzo: decimalFromGrado(alumno.febrero),
        calificacionFinal: decimalFromGrado(alumno.final),
        estado: mapEstadoToApi(estadoFromSituacion(sit)),
      };

      let result: any;
      if (califId) {
        result = await updateCalificacion(califId, body);
      } else {
        result = await createCalificacion(body);
      }

      updated[materiaIdx].alumnos[alumnoIdx] = {
        ...updated[materiaIdx].alumnos[alumnoIdx],
        situacion: sit,
        calificacionId: califId || (result && result.id) || null,
        saving: false,
      };
      setMaterias([...updated]);
    } catch (err: any) {
      updated[materiaIdx].alumnos[alumnoIdx] = { ...updated[materiaIdx].alumnos[alumnoIdx], saving: false };
      setMaterias([...updated]);
      setError(err?.message || 'Error al guardar la situación');
    }
  };

  const handleGradeSelect = (grade: Grado) => {
    const gPicker = gradePicker;
    setGradePicker({ ...gPicker, visible: false });
    if (selectedMateriaIdx != null) {
      setError('');
      doSaveGrade(selectedMateriaIdx, gPicker.alumnoIdx, gPicker.field, grade);
    }
  };

  const handleSitSelect = (sit: Situacion) => {
    const sPicker = sitPicker;
    setSitPicker({ ...sPicker, visible: false });
    if (selectedMateriaIdx != null) {
      setError('');
      doSaveSituacion(selectedMateriaIdx, sPicker.alumnoIdx, sit);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#1F5FAF" />
        <Text style={{ marginTop: 12, color: '#6B6B6B' }}>Cargando datos del docente...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <IconButton icon="alert-circle" size={48} iconColor="#C62828" />
        <Text style={{ fontSize: 16, color: '#C62828', textAlign: 'center', marginBottom: 16 }}>{error}</Text>
        <Button mode="contained" onPress={loadData}>Reintentar</Button>
      </View>
    );
  }

  if (selectedMateria) {
    return (
      <View style={styles.container}>
        <View style={styles.materiaHeader}>
          <TouchableOpacity
            style={styles.materiaHeaderBack}
            onPress={() => setSelectedMateriaIdx(null)}
          >
            <IconButton icon="arrow-left" size={20} iconColor="#1F5FAF" style={styles.backBtnIcon} />
            <Text style={styles.materiaHeaderBackText}>Volver</Text>
          </TouchableOpacity>
          <View style={styles.materiaHeaderInfo}>
            <Text style={styles.materiaHeaderTitulo}>{selectedMateria.materiaNombre}</Text>
            <Text style={styles.materiaHeaderCurso}>{selectedMateria.cursoLabel} — {selectedMateria.alumnos.length} alumnos</Text>
          </View>
        </View>

        {error ? <Text style={styles.saveErrorText}>{error}</Text> : null}

        <ScrollView showsVerticalScrollIndicator={false} style={styles.tableScroll}>
          <DataTable style={styles.table}>
            <DataTable.Header style={styles.headerRow}>
              <DataTable.Title style={styles.colNombre}>
                <Text style={styles.headerText}>Alumno</Text>
              </DataTable.Title>
              {['C1', 'C2', 'N.A.', 'Dic', 'Feb', 'N.F.', 'Sit.'].map((col) => (
                <DataTable.Title key={col} style={col === 'Sit.' ? styles.colSit : styles.colNota}>
                  <Text style={styles.headerText}>{col}</Text>
                </DataTable.Title>
              ))}
            </DataTable.Header>

            {selectedMateria.alumnos.map((alumno, idx) => (
              <DataTable.Row key={`${alumno.alumnoId}-${alumno.cursadaMateriaId}`} style={styles.row}>
                <DataTable.Cell style={styles.colNombre}>
                  <View style={styles.alumnoCell}>
                    <Avatar.Text size={26} label={alumno.alumnoNombre[0].toUpperCase()} style={styles.alumnoAvatar} />
                    <Text style={styles.alumnoNombre} numberOfLines={1}>{alumno.alumnoNombre}</Text>
                    {alumno.saving && <ActivityIndicator size="small" color="#1F5FAF" style={{ marginLeft: 4 }} />}
                  </View>
                </DataTable.Cell>
                {(['c1', 'c2', 'anual', 'diciembre', 'febrero', 'final'] as const).map((field) => (
                  <DataTable.Cell key={field} style={styles.colNota}>
                    <TouchableOpacity
                      onPress={() => setGradePicker({ visible: true, alumnoIdx: idx, field, value: alumno[field] })}
                      style={styles.gradeCell}
                    >
                      <Text style={[styles.gradeText, { color: getNotaColor(alumno[field]) }]}>
                        {alumno[field] || '—'}
                      </Text>
                    </TouchableOpacity>
                  </DataTable.Cell>
                ))}
                <DataTable.Cell style={styles.colSit}>
                  <TouchableOpacity
                    onPress={() => setSitPicker({ visible: true, alumnoIdx: idx, value: alumno.situacion })}
                    style={styles.sitCell}
                  >
                    <Text style={[styles.sitText, { color: getSituacionColor(alumno.situacion) }]}>
                      {alumno.situacion || '—'}
                    </Text>
                  </TouchableOpacity>
                </DataTable.Cell>
              </DataTable.Row>
            ))}
          </DataTable>
        </ScrollView>

        <GradePickerModal
          visible={gradePicker.visible}
          currentGrade={pendingGrade}
          onSelect={handleGradeSelect}
          onClose={() => setGradePicker({ ...gradePicker, visible: false })}
        />

        <SituacionPickerModal
          visible={sitPicker.visible}
          currentSituacion={sitPicker.visible && selectedMateria ? selectedMateria.alumnos[sitPicker.alumnoIdx].situacion : ''}
          onSelect={handleSitSelect}
          onClose={() => setSitPicker({ ...sitPicker, visible: false })}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Surface style={styles.surface} elevation={1}>
        <View style={styles.header}>
          <View style={styles.headerDocente}>
            <Avatar.Text size={40} label={docenteNombre ? docenteNombre.split(',')[1]?.trim()?.[0] + docenteNombre.split(',')[0]?.[0] : '?'} style={styles.headerAvatar} />
            <View style={styles.headerDocenteInfo}>
              <Text style={styles.headerDocenteNombre}>{docenteNombre || 'Docente'}</Text>
              <Text style={styles.headerDocenteMaterias}>Materias asignadas</Text>
            </View>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={styles.materiasScroll}>
          {materias.length === 0 ? (
            <Text style={{ textAlign: 'center', color: '#6B6B6B', marginTop: 32 }}>No hay materias asignadas con alumnos inscriptos.</Text>
          ) : (
            materias.map((mat, idx) => (
              <TouchableOpacity
                key={`${mat.materiaId}-${mat.cursoLabel}`}
                onPress={() => setSelectedMateriaIdx(idx)}
                style={styles.materiaCard}
                activeOpacity={0.7}
              >
                <View style={styles.materiaCardIcon}>
                  <IconButton icon="book-open-variant" size={28} iconColor="#1F5FAF" style={styles.materiaCardIconButton} />
                </View>
                <View style={styles.materiaCardInfo}>
                  <Text style={styles.materiaCardNombre}>{mat.materiaNombre}</Text>
                  <Text style={styles.materiaCardCurso}>{mat.cursoLabel} — {mat.anio}</Text>
                </View>
                <View style={styles.materiaCardRight}>
                  <Text style={styles.materiaCardAlumnos}>{mat.alumnos.length}</Text>
                  <Text style={styles.materiaCardAlumnosLabel}>alumnos</Text>
                  <IconButton icon="chevron-right" size={20} iconColor="#BDBDBD" style={styles.materiaCardArrow} />
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </Surface>
    </View>
  );
};

function mapEstadoToApi(estado: number): 'EnCurso' | 'Aprobado' | 'RecuperaPrimerCuatrimestre' | 'RecuperaSegundoCuatrimestre' | 'RecuperaAmbos' {
  switch (estado) {
    case 1: return 'Aprobado';
    case 2: return 'RecuperaPrimerCuatrimestre';
    case 3: return 'RecuperaSegundoCuatrimestre';
    case 4: return 'RecuperaAmbos';
    default: return 'EnCurso';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  surface: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerDocente: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    backgroundColor: '#1F5FAF',
  },
  headerDocenteInfo: {
    marginLeft: 12,
  },
  headerDocenteNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2B2B2B',
  },
  headerDocenteMaterias: {
    fontSize: 12,
    color: '#6B6B6B',
  },
  materiasScroll: {
    flex: 1,
    padding: 16,
  },
  materiaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 14,
    marginBottom: 12,
  },
  materiaCardIcon: {},
  materiaCardIconButton: {
    margin: 0,
    padding: 0,
  },
  materiaCardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  materiaCardNombre: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2B2B2B',
    marginBottom: 2,
  },
  materiaCardCurso: {
    fontSize: 13,
    color: '#1F5FAF',
    fontWeight: '500',
  },
  materiaCardRight: {
    alignItems: 'center',
    marginRight: 4,
  },
  materiaCardAlumnos: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F28C28',
  },
  materiaCardAlumnosLabel: {
    fontSize: 10,
    color: '#6B6B6B',
  },
  materiaCardArrow: {
    margin: 0,
    padding: 0,
  },
  materiaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  materiaHeaderBack: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  backBtnIcon: {
    margin: 0,
    padding: 0,
  },
  materiaHeaderBackText: {
    fontSize: 14,
    color: '#1F5FAF',
    fontWeight: '600',
  },
  materiaHeaderInfo: {
    flex: 1,
  },
  materiaHeaderTitulo: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F5FAF',
  },
  materiaHeaderCurso: {
    fontSize: 13,
    color: '#6B6B6B',
  },
  tableScroll: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  table: {
    backgroundColor: '#FFFFFF',
  },
  headerRow: {
    backgroundColor: '#E6F0FA',
    minHeight: 32,
  },
  headerText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1F5FAF',
    textAlign: 'center',
  },
  colNombre: {
    flex: 2,
    minWidth: 130,
  },
  colNota: {
    flex: 0.7,
    minWidth: 34,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 2,
  },
  colSit: {
    flex: 1,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 2,
  },
  row: {
    minHeight: 44,
  },
  alumnoCell: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  alumnoAvatar: {
    backgroundColor: '#E6F0FA',
  },
  alumnoNombre: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    color: '#2B2B2B',
    marginLeft: 8,
  },
  gradeCell: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 32,
    minHeight: 28,
    borderRadius: 4,
    backgroundColor: 'rgba(230, 240, 250, 0.5)',
    paddingHorizontal: 4,
  },
  gradeText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  sitCell: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
    minHeight: 28,
    borderRadius: 4,
    backgroundColor: 'rgba(230, 240, 250, 0.5)',
    paddingHorizontal: 2,
  },
  sitText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  saveErrorText: {
    fontSize: 13,
    color: '#C62828',
    backgroundColor: '#FDECEA',
    padding: 8,
    marginHorizontal: 12,
    borderRadius: 6,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '75%',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  sitModalContent: {
    width: '70%',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F5FAF',
    textAlign: 'center',
    marginBottom: 12,
  },
  gradeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  gradeChip: {
    minWidth: 42,
    height: 36,
    justifyContent: 'center',
    borderRadius: 6,
  },
  gradeChipSelected: {
    backgroundColor: '#1F5FAF',
  },
  gradeChipGreen: {
    backgroundColor: '#E8F5E9',
  },
  gradeChipRed: {
    backgroundColor: '#FFEBEE',
  },
  gradeChipOrange: {
    backgroundColor: '#FFF3E0',
  },
  gradeChipGray: {
    backgroundColor: '#F5F5F5',
  },
  gradeChipText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginHorizontal: 0,
    marginVertical: 0,
  },
  sitChip: {
    marginBottom: 8,
    height: 40,
    justifyContent: 'center',
    borderRadius: 8,
  },
  sitChipSelected: {
    backgroundColor: '#1F5FAF',
  },
  sitChipGreen: {
    backgroundColor: '#E8F5E9',
  },
  sitChipTeal: {
    backgroundColor: '#E0F2F1',
  },
  sitChipOrange: {
    backgroundColor: '#FFF3E0',
  },
  sitChipText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default DocenteCalificarScreen;
