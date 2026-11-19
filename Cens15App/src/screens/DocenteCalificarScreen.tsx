import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Modal, TouchableWithoutFeedback, ActivityIndicator } from 'react-native';
import { Text, Surface, DataTable, Chip, IconButton, Avatar, Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { getMiDocente, getMisAlumnosParaCalificar, getMateriasParaCalificar, DocenteMateriaConAlumnosDto, AlumnoCalificacionSimpleDto } from '../services/docenteService';
import { prepareCursadaParaCalificar } from '../services/cursadaMateriaService';
import { useAppSelector } from '../hooks/useRedux';
import { createCalificacion, updateCalificacion } from '../services/calificacionService';
import { Grado, GradeValues, GradeField, GRADE_OPTIONS, GRADE_LEGEND, gradeLabel, normalizeEstado, calculateGrades, editGrade, gradesFromCalificacion, buildSaveRequest, suggestedRecovery, isLegacy, changeGradeOrigin } from '../utils/calificaciones';
import RecuperacionChoiceModal from '../components/RecuperacionChoiceModal';
import CalificacionOriginModal, { PaseInfoModal } from '../components/CalificacionOriginModal';

type Situacion = 'R1' | 'R2' | 'R1+R2' | 'AP' | 'A/E' | '';

const SITUACIONES: { value: Situacion; label: string }[] = [
  { value: '', label: '-' },
  { value: 'R1', label: 'Recupera 1ro' },
  { value: 'R2', label: 'Recupera 2do' },
  { value: 'R1+R2', label: 'Recupera 1ro y 2do' },
  { value: 'AP', label: 'Aprobado' },
];

const NOTAS_POSIBLES = GRADE_OPTIONS;

interface AlumnoRow extends GradeValues {
  rowKey: string;
  materiaId: number;
  inscripcionId: number;
  source: AlumnoCalificacionSimpleDto;
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
  cursoId: number;
  materiaNombre: string;
  cursoLabel: string;
  anio: number;
  alumnos: AlumnoRow[];
}

function situacionFromEstado(estado?: GradeValues['estado'] | number): Situacion {
  switch (normalizeEstado(estado)) {
    case 'Aprobado': return 'AP';
    case 'AprobadoPorEquivalencia': return 'A/E';
    case 'RecuperaPrimerCuatrimestre': return 'R1';
    case 'RecuperaSegundoCuatrimestre': return 'R2';
    case 'RecuperaAmbos': return 'R1+R2';
    default: return '';
  }
}

function estadoFromSituacion(sit: Situacion): number {
  switch (sit) {
    case 'AP': return 1;
    case 'R1': return 2;
    case 'R2': return 3;
    case 'R1+R2': return 4;
    default: return 0;
  }
}

function isAprobada(nota: string) {
  const n = Number.parseFloat(nota);
  return !isNaN(n) && n >= 6;
}

function isReprobada(nota: string) {
  const n = Number.parseFloat(nota);
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
    case 'A/E': return '#00897B';
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
  numericOnly = false,
}: {
  visible: boolean;
  currentGrade: string;
  onSelect: (grade: Grado) => void;
  onClose: () => void;
  numericOnly?: boolean;
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
                {NOTAS_POSIBLES.filter(nota => !numericOnly || (nota !== 'A' && nota !== 'S/C')).map((nota) => (
                  <Chip
                    key={nota}
                    accessibilityLabel={gradeLabel(nota)}
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
              <Text>{GRADE_LEGEND}</Text>
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
  const profileRole = useAppSelector(state => state.app.userRole || '').trim().toLowerCase();
  const isSuperAdmin = profileRole === 'superadmin';

  const [materias, setMaterias] = useState<MateriaCurso[]>([]);
  const [selectedMateriaIdx, setSelectedMateriaIdx] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [docenteNombre, setDocenteNombre] = useState('');
  const savingRows = useRef(new Set<string>());
  const requestVersion = useRef(0);
  const bulkPending = useRef(false);
  const [bulkVisible, setBulkVisible] = useState(false);
  const [bulkField, setBulkField] = useState<GradeField>('c1');
  const [bulkGrade, setBulkGrade] = useState<Grado>('');
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkResult, setBulkResult] = useState('');
  const [pendingRecovery, setPendingRecovery] = useState<{ materiaIdx: number; alumnoIdx: number; draft: AlumnoRow } | null>(null);
  const [originRow, setOriginRow] = useState<{ materiaIdx: number; alumnoIdx: number } | null>(null);
  const [paseInfo, setPaseInfo] = useState(false);

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
    void loadData();
    return () => { requestVersion.current++; };
  }, [profileRole]);

  const loadData = async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    setError('');
    setMaterias([]);
    setSelectedMateriaIdx(null);
    setBulkResult('');
    setBulkVisible(false);
    setOriginRow(null);
    setPendingRecovery(null);
    setGradePicker(current => ({ ...current, visible: false }));
    try {
      if (profileRole === 'preceptor') throw new Error('Tu perfil permite consultar calificaciones en los datos del alumno, pero no modificarlas.');
      let data: DocenteMateriaConAlumnosDto[];
      if (isSuperAdmin) {
        setDocenteNombre('SuperAdmin');
        data = await getMateriasParaCalificar();
      } else {
        const docente = await getMiDocente();
        if (version !== requestVersion.current) return;
        setDocenteNombre(`${docente.apellidos}, ${docente.nombres}`);
        data = await getMisAlumnosParaCalificar();
      }
      if (version !== requestVersion.current) return;
      const mapped: MateriaCurso[] = data.map((m: DocenteMateriaConAlumnosDto) => ({
        materiaId: m.materiaId,
        cursoId: m.cursoId,
        materiaNombre: m.materiaNombre,
        cursoLabel: m.cursoLabel || `${m.cursoNombre} ${m.division}`,
        anio: m.anio,
        alumnos: m.alumnos.map((a: AlumnoCalificacionSimpleDto) => ({
          rowKey: `${m.materiaId}:${m.cursoId}:${m.anio}:${a.inscripcionId || `cursada-${a.cursadaMateriaId}`}`,
          materiaId: m.materiaId,
          inscripcionId: a.inscripcionId,
          alumnoId: a.alumnoId,
          alumnoNombre: a.alumnoNombre,
          cursadaMateriaId: a.cursadaMateriaId,
          calificacionId: a.calificacionId,
          source: a,
          ...gradesFromCalificacion(a),
          situacion: situacionFromEstado(gradesFromCalificacion(a).estado),
          saving: false,
        })),
      }));
      setMaterias(mapped);
    } catch (err: any) {
      if (version === requestVersion.current) setError(err?.message || 'Error al cargar datos');
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  };

  const selectedMateria = selectedMateriaIdx !== null ? materias[selectedMateriaIdx] : null;

  const pendingGrade = gradePicker.visible && selectedMateria ? selectedMateria.alumnos[gradePicker.alumnoIdx][gradePicker.field as keyof AlumnoRow] as Grado : '';

  const saveAlumno = async (draft: AlumnoRow) => {
    const key = draft.rowKey;
    if (savingRows.current.has(key)) return false;
    savingRows.current.add(key);
    const patchRow = (patch: Partial<AlumnoRow>) => setMaterias(current => current.map(m => ({ ...m, alumnos: m.alumnos.map(a => a.rowKey === key ? { ...a, ...patch } : a) })));
    patchRow({ saving: true });
    setError('');
    try {
      let id = draft.cursadaMateriaId;
      if (!id) {
        if (!draft.inscripcionId) throw new Error('No se pudo identificar la inscripción del alumno. Volvé a cargar la planilla.');
        const cursada = await prepareCursadaParaCalificar({ inscripcionId: draft.inscripcionId, materiaId: draft.materiaId });
        if (!cursada?.id) throw new Error('No se pudo preparar la cursada del alumno.');
        id = cursada.id;
        patchRow({ cursadaMateriaId: id });
      }
      const body = buildSaveRequest(id, draft, draft.source);
      let calificacionId = draft.calificacionId;
      if (calificacionId) await updateCalificacion(calificacionId, body);
      else calificacionId = (await createCalificacion(body)).id;
      patchRow({ ...draft, cursadaMateriaId: id, source: { ...draft.source, ...body }, calificacionId, saving: false });
      return true;
    } catch (err: any) {
      patchRow({ saving: false });
      setError(err?.message || 'Error al guardar la nota');
      return false;
    } finally {
      savingRows.current.delete(key);
    }
  };

  const doSaveGrade = (materiaIdx: number, alumnoIdx: number, field: string, g: Grado) => {
    const alumno = materias[materiaIdx].alumnos[alumnoIdx];
    if (bulkPending.current || savingRows.current.has(alumno.rowKey) || pendingRecovery || alumno.estado === 'AprobadoPorEquivalencia') return;
    const manual = field === 'anual' || field === 'final';
    if (manual && (!isLegacy(alumno) || g === 'A' || g === 'S/C')) return;
    const result = manual ? calculateGrades({ ...alumno, [field]: g }) : editGrade(alumno, field as GradeField, g);
    const draft = { ...alumno, ...result, situacion: isLegacy(result) ? alumno.situacion : situacionFromEstado(result.estado) };
    if (result.needsChoice) {
      setPendingRecovery({ materiaIdx, alumnoIdx, draft });
      return;
    }
    void saveAlumno(draft);
  };

  const doSaveSituacion = (materiaIdx: number, alumnoIdx: number, sit: Situacion) => {
    const alumno = materias[materiaIdx].alumnos[alumnoIdx];
    if (bulkPending.current || !isLegacy(alumno) || pendingRecovery || savingRows.current.has(alumno.rowKey) || alumno.estado === 'AprobadoPorEquivalencia' || !SITUACIONES.some(option => option.value === sit)) return;
    void saveAlumno({ ...alumno, situacion: sit, estado: mapEstadoToApi(estadoFromSituacion(sit)) });
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

  const applyBulkGrade = async () => {
    if (!selectedMateria || !bulkConfirm || !bulkGrade || bulkPending.current || savingRows.current.size || pendingRecovery) return;
    bulkPending.current = true;
    setBulkSaving(true);
    const version = requestVersion.current;
    let saved = 0, failed = 0, equivalencias = 0, individual = 0;
    try {
      for (const alumno of selectedMateria.alumnos) {
        if (version !== requestVersion.current) break;
        if (alumno.estado === 'AprobadoPorEquivalencia') { equivalencias++; continue; }
        try {
          const result = editGrade(alumno, bulkField, bulkGrade);
          if (result.needsChoice) { individual++; continue; }
          const draft = { ...alumno, ...result, situacion: situacionFromEstado(result.estado) };
          if (await saveAlumno(draft)) saved++;
          else failed++;
        } catch { failed++; }
      }
      setBulkResult(`Actualizados: ${saved}. Sin guardar: ${failed}. Equivalencias omitidas: ${equivalencias}. Requieren elección individual: ${individual}.`);
      setError(failed ? 'Algunas notas no se guardaron. Revisá las filas y reintentá las que correspondan.' : '');
      setBulkVisible(false);
    } finally {
      bulkPending.current = false;
      setBulkSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#1F5FAF" />
        <Text style={{ marginTop: 12, color: '#6B6B6B' }}>Cargando planillas de calificaciones...</Text>
      </View>
    );
  }

  if (error && materias.length === 0) {
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
            disabled={bulkSaving}
            onPress={() => { setSelectedMateriaIdx(null); setBulkResult(''); }}
          >
            <IconButton icon="arrow-left" size={20} iconColor="#1F5FAF" style={styles.backBtnIcon} />
            <Text style={styles.materiaHeaderBackText}>Volver</Text>
          </TouchableOpacity>
          <View style={styles.materiaHeaderInfo}>
            <Text style={styles.materiaHeaderTitulo}>{selectedMateria.materiaNombre}</Text>
            <Text style={styles.materiaHeaderCurso}>{selectedMateria.cursoLabel} — {selectedMateria.anio} — {selectedMateria.alumnos.length} alumnos</Text>
          </View>
        </View>

        {error ? <Text style={styles.saveErrorText}>{error}</Text> : null}
        {bulkResult ? <Text accessibilityLiveRegion="polite" style={{ padding: 12 }}>{bulkResult}</Text> : null}
        <Button
          mode="outlined"
          disabled={bulkSaving || !!pendingRecovery || savingRows.current.size > 0 || selectedMateria.alumnos.length === 0}
          onPress={() => { setBulkVisible(true); setBulkGrade(''); setBulkField('c1'); setBulkConfirm(false); setBulkResult(''); }}
        >Calificar a todos</Button>
        <Text>{GRADE_LEGEND}</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator>
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
              <DataTable.Title style={styles.colMenu}><Text style={styles.headerText}>Opciones</Text></DataTable.Title>
            </DataTable.Header>

            {selectedMateria.alumnos.map((alumno, idx) => (
              <DataTable.Row key={alumno.rowKey} style={styles.row}>
                <DataTable.Cell style={styles.colNombre}>
                  <View style={styles.alumnoCell}>
                    <Avatar.Text size={26} label={alumno.alumnoNombre[0].toUpperCase()} style={styles.alumnoAvatar} />
                    <Text style={styles.alumnoNombre} numberOfLines={1}>{alumno.alumnoNombre}</Text>
                    {alumno.desdePase && <IconButton icon="alert-circle-outline" size={16} accessibilityLabel={`Información de pase: ${alumno.alumnoNombre}, ${selectedMateria.materiaNombre}`} onPress={() => setPaseInfo(true)} />}
                    {alumno.saving && <ActivityIndicator size="small" color="#1F5FAF" style={{ marginLeft: 4 }} />}
                  </View>
                </DataTable.Cell>
                {(['c1', 'c2', 'anual', 'diciembre', 'febrero', 'final'] as const).map((field) => (
                  <DataTable.Cell key={field} style={styles.colNota}>
                    <TouchableOpacity
                      accessibilityLabel={gradeLabel(alumno[field])}
                      disabled={bulkSaving || alumno.saving || alumno.estado === 'AprobadoPorEquivalencia' || pendingRecovery !== null || ((field === 'anual' || field === 'final') && !isLegacy(alumno))}
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
                    disabled={bulkSaving || alumno.saving || alumno.estado === 'AprobadoPorEquivalencia' || pendingRecovery !== null || !isLegacy(alumno)}
                    onPress={() => setSitPicker({ visible: true, alumnoIdx: idx, value: alumno.situacion })}
                    style={styles.sitCell}
                  >
                    <Text style={[styles.sitText, { color: getSituacionColor(alumno.situacion) }]}>
                      {alumno.situacion || '—'}
                    </Text>
                  </TouchableOpacity>
                </DataTable.Cell>
                <DataTable.Cell style={styles.colMenu}><IconButton icon="dots-vertical" size={20} accessibilityLabel={`Origen de calificación: ${alumno.alumnoNombre}, ${selectedMateria.materiaNombre}`} disabled={bulkSaving || alumno.saving || !!pendingRecovery} onPress={() => { setError(''); setOriginRow({ materiaIdx: selectedMateriaIdx!, alumnoIdx: idx }); }} /></DataTable.Cell>
              </DataTable.Row>
            ))}
          </DataTable>
        </ScrollView>
        </ScrollView>

        {bulkVisible && <Modal transparent visible animationType="fade" onRequestClose={() => { if (!bulkPending.current) setBulkVisible(false); }}>
          <View style={styles.modalOverlay}>
            <Surface style={[styles.modalContent, { width: '90%', maxWidth: 460, maxHeight: '90%' }]} elevation={3}>
              <ScrollView>
                <Text style={styles.modalTitle}>Calificar a todos</Text>
                <Text>{selectedMateria.materiaNombre} — {selectedMateria.cursoLabel} — {selectedMateria.anio}</Text>
                <Text>Elegí la columna y la nota. Se reemplazará esa nota en los alumnos de esta planilla. Las equivalencias y los casos que requieran una elección individual se omitirán.</Text>
                <View style={styles.gradeGrid}>
                  {(['c1', 'c2', 'diciembre', 'febrero'] as GradeField[]).map(field => <Chip
                    key={field} selected={bulkField === field} disabled={bulkSaving}
                    accessibilityLabel={`Columna para todos: ${FIELD_LABELS[field]}`}
                    onPress={() => { setBulkField(field); setBulkConfirm(false); }}
                  >{FIELD_LABELS[field]}</Chip>)}
                </View>
                <View style={styles.gradeGrid}>
                  {NOTAS_POSIBLES.map(grade => <Chip key={grade} selected={bulkGrade === grade} disabled={bulkSaving}
                    accessibilityLabel={`Nota para todos: ${gradeLabel(grade)}`}
                    onPress={() => { setBulkGrade(grade); setBulkConfirm(false); }}
                  >{grade}</Chip>)}
                </View>
                {bulkConfirm && <Text>Confirmá aplicar {gradeLabel(bulkGrade)} en {FIELD_LABELS[bulkField]} a {selectedMateria.alumnos.length} alumnos. Los cambios guardados no se deshacen al cerrar.</Text>}
                <Button disabled={bulkSaving} onPress={() => setBulkVisible(false)}>Cancelar</Button>
                <Button mode="contained" disabled={!bulkGrade || bulkSaving} loading={bulkSaving}
                  onPress={() => { if (bulkConfirm) void applyBulkGrade(); else setBulkConfirm(true); }}
                >{bulkConfirm ? 'Confirmar y aplicar' : 'Revisar cambios'}</Button>
              </ScrollView>
            </Surface>
          </View>
        </Modal>}

        <GradePickerModal
          visible={gradePicker.visible}
          currentGrade={pendingGrade}
          numericOnly={gradePicker.field === 'anual' || gradePicker.field === 'final'}
          onSelect={handleGradeSelect}
          onClose={() => setGradePicker({ ...gradePicker, visible: false })}
        />

        {paseInfo && <PaseInfoModal onClose={() => setPaseInfo(false)} />}
        {originRow && <CalificacionOriginModal
          values={materias[originRow.materiaIdx].alumnos[originRow.alumnoIdx]}
          context={`${materias[originRow.materiaIdx].alumnos[originRow.alumnoIdx].alumnoNombre}, ${materias[originRow.materiaIdx].materiaNombre}`}
          pending={materias[originRow.materiaIdx].alumnos[originRow.alumnoIdx].saving}
          saveError={error}
          onCancel={() => setOriginRow(null)}
          onApply={async (origin, disposition) => {
            const { materiaIdx, alumnoIdx } = originRow;
            const base = materias[materiaIdx].alumnos[alumnoIdx];
            if (bulkPending.current || savingRows.current.has(base.rowKey) || pendingRecovery) return;
            const result = changeGradeOrigin(base, origin, disposition);
            const draft = { ...base, ...result, situacion: situacionFromEstado(result.estado) };
            if (result.needsChoice) {
              setOriginRow(null);
              setPendingRecovery({ materiaIdx, alumnoIdx, draft });
            } else if (await saveAlumno(draft)) setOriginRow(null);
          }}
        />}
        {pendingRecovery && <RecuperacionChoiceModal
          suggested={suggestedRecovery(pendingRecovery.draft)}
          onCancel={() => setPendingRecovery(null)}
          onConfirm={(choice) => {
            const result = calculateGrades({ ...pendingRecovery.draft, recuperacionExcepcional: choice });
            const draft = { ...pendingRecovery.draft, ...result, situacion: situacionFromEstado(result.estado) };
            setPendingRecovery(null);
            void saveAlumno(draft);
          }}
        />}

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
            <Avatar.Text size={40} label={isSuperAdmin ? 'SA' : docenteNombre ? `${docenteNombre.split(',')[1]?.trim()?.[0] || ''}${docenteNombre[0]}` : '?'} style={styles.headerAvatar} />
            <View style={styles.headerDocenteInfo}>
              <Text style={styles.headerDocenteNombre}>{docenteNombre || 'Docente'}</Text>
              <Text style={styles.headerDocenteMaterias}>{isSuperAdmin ? 'Calificaciones por materia, curso y año' : 'Mis materias asignadas'}</Text>
            </View>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={styles.materiasScroll}>
          {materias.length === 0 ? (
            <Text style={{ textAlign: 'center', color: '#6B6B6B', marginTop: 32 }}>{isSuperAdmin ? 'No hay materias cargadas.' : 'No hay materias activas asignadas a tu docente.'}</Text>
          ) : (
            materias.map((mat, idx) => (
              <TouchableOpacity
                key={`${mat.materiaId}-${mat.cursoId}-${mat.anio}`}
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
  colMenu: { minWidth: 64, flex: 0.6, justifyContent: 'center' },
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
