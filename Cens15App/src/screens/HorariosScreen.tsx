import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { ActivityIndicator, Button, Checkbox, Chip, Dialog, Menu, Portal, Surface, Text, TouchableRipple } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { getCursos } from '../services/cursoService';
import type { Curso } from '../services/cursoService';
import { getMaterias } from '../services/materiaService';
import type { Materia } from '../services/materiaService';
import { getAnexosHorarios, getHorariosAnexo } from '../services/horarioAnexoService';
import type { AnexoHorario, DiaSemana, HorarioAnexo } from '../services/horarioAnexoService';
import { DIAS, courseOccupancy, defaultAnexoId, subjectColor, subjectPeriods, teachers, weeklyRows } from '../utils/horarios';

const courseLabel = (curso: Curso) => `${curso.curso} ${curso.division}`;

const HorariosScreen: React.FC = () => {
  const { fontScale } = useWindowDimensions();
  const classHeight = Math.ceil(80 * Math.max(1, fontScale));
  const recessHeight = Math.ceil(36 * Math.max(1, fontScale));
  const [catalog, setCatalog] = useState<{ anexos: AnexoHorario[]; cursos: Curso[]; materias: Materia[] }>({ anexos: [], cursos: [], materias: [] });
  const [anexoId, setAnexoId] = useState<number | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [hiddenCourses, setHiddenCourses] = useState<number[]>([]);
  const [selectedDays, setSelectedDays] = useState<DiaSemana[]>(DIAS.map((day) => day.value));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [gridReload, setGridReload] = useState(0);
  const [grid, setGrid] = useState<{ anexoId: number | null; blocks: HorarioAnexo[]; loading: boolean; error: string }>({ anexoId: null, blocks: [], loading: false, error: '' });
  const [detail, setDetail] = useState<{ materia: Materia; curso: Curso } | null>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    setError('');
    setDetail(null);
    Promise.all([getAnexosHorarios(), getCursos(), getMaterias()]).then(([anexos, cursos, materias]) => {
      if (!active) return;
      setCatalog({ anexos, cursos, materias });
      setAnexoId((current) => anexos.some((anexo) => anexo.id === current) ? current : defaultAnexoId(anexos));
      setGridReload((value) => value + 1);
    }).catch((err: unknown) => {
      if (active) setError(err instanceof Error ? err.message : 'No se pudieron cargar los horarios.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [reload]));

  useEffect(() => {
    if (anexoId === null) return undefined;
    let active = true;
    setGrid({ anexoId, blocks: [], loading: true, error: '' });
    setDetail(null);
    getHorariosAnexo(anexoId).then((blocks) => {
      if (active) setGrid({ anexoId, blocks, loading: false, error: '' });
    }).catch((err: unknown) => {
      if (active) setGrid({ anexoId, blocks: [], loading: false, error: err instanceof Error ? err.message : 'No se pudo cargar la grilla del anexo.' });
    });
    return () => { active = false; };
  }, [anexoId, gridReload]);

  const anexo = catalog.anexos.find((item) => item.id === anexoId);
  const courses = catalog.cursos.filter((curso) => curso.id_anexo === anexoId)
    .sort((a, b) => courseLabel(a).localeCompare(courseLabel(b)));
  const visibleCourses = courses.filter((curso) => !hiddenCourses.includes(curso.id));
  const days = DIAS.filter((day) => selectedDays.includes(day.value));
  const rows = weeklyRows(grid.blocks, days.map((day) => day.value));
  const gridReady = grid.anexoId === anexoId && !grid.loading && !grid.error;

  return <View style={styles.container}>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.heading}>
        <Text variant="headlineSmall" style={styles.title}>Grilla de horarios</Text>
        <Chip icon="eye-outline" compact>Solo consulta</Chip>
      </View>
      <Text style={styles.hint}>Las modificaciones se realizan desde PanelAdmin.</Text>
      <Button icon="refresh" mode="text" disabled={loading || grid.loading} onPress={() => setReload((value) => value + 1)}>Actualizar horarios</Button>
      {loading ? <View style={styles.status}><ActivityIndicator color="#1F5FAF" /><Text style={styles.hint}>Cargando horarios...</Text></View>
        : error ? <View style={styles.status}><Text style={styles.error}>{error}</Text><Button onPress={() => setReload((value) => value + 1)}>Reintentar</Button></View>
        : <>
          <Menu visible={menuVisible} onDismiss={() => setMenuVisible(false)} anchor={
            <Button mode="outlined" icon="map-marker-outline" onPress={() => setMenuVisible(true)}>{anexo?.nombre || 'Seleccionar anexo'}</Button>
          }>
            {catalog.anexos.map((item) => <Menu.Item key={item.id} title={item.nombre} onPress={() => {
              setMenuVisible(false);
              if (item.id === anexoId) return;
              setHiddenCourses([]);
              setDetail(null);
              setAnexoId(item.id);
            }} />)}
          </Menu>
          {!catalog.anexos.length ? <Text style={styles.hint}>No hay anexos cargados.</Text>
            : anexoId === null ? <Text style={styles.hint}>Selecciona un anexo para consultar sus horarios.</Text>
            : <>
              <Surface style={styles.filters} elevation={0}>
                <View style={styles.filterHeading}>
                  <Text variant="titleMedium">Cursos visibles</Text>
                  <Button compact onPress={() => setHiddenCourses([])}>Todos</Button>
                  <Button compact onPress={() => setHiddenCourses(courses.map((curso) => curso.id))}>Ninguno</Button>
                </View>
                {courses.map((curso) => <Checkbox.Item key={curso.id} label={`${courseLabel(curso)}${curso.orientacionNombreCorto ? ` - ${curso.orientacionNombreCorto}` : ''}`}
                  status={hiddenCourses.includes(curso.id) ? 'unchecked' : 'checked'} position="leading" style={styles.checkbox}
                  onPress={() => setHiddenCourses((current) => current.includes(curso.id) ? current.filter((id) => id !== curso.id) : [...current, curso.id])} />)}
                <Text variant="titleMedium" style={styles.daysTitle}>Dias visibles</Text>
                <View style={styles.dayFilters}>
                  {DIAS.map((day) => <Chip key={day.value} selected={selectedDays.includes(day.value)} mode="outlined"
                    onPress={() => setSelectedDays((current) => current.includes(day.value) ? current.filter((value) => value !== day.value) : [...current, day.value])}>
                    {day.label}
                  </Chip>)}
                </View>
                <Button compact onPress={() => setSelectedDays(DIAS.map((day) => day.value))}>Toda la semana</Button>
              </Surface>
              {grid.loading || grid.anexoId !== anexoId ? <View style={styles.status}><ActivityIndicator color="#1F5FAF" /></View>
                : grid.error ? <View style={styles.status}><Text style={styles.error}>{grid.error}</Text><Button onPress={() => setGridReload((value) => value + 1)}>Reintentar grilla</Button></View>
                : !courses.length ? <Text style={styles.hint}>No hay cursos en este anexo.</Text>
                : !visibleCourses.length ? <Text style={styles.hint}>Selecciona al menos un curso.</Text>
                : !days.length ? <Text style={styles.hint}>Selecciona al menos un dia.</Text>
                : gridReady && visibleCourses.map((curso) => {
                  const occupied = courseOccupancy(catalog.materias, curso.id);
                  return <Surface key={curso.id} style={styles.course} elevation={1}>
                    <View style={styles.courseHeader}>
                      <Text style={styles.hint}>{anexo?.nombre} / Horario por curso</Text>
                      <Text variant="titleLarge" style={styles.title}>{courseLabel(curso)}</Text>
                      {!!curso.orientacionNombreCorto && <Text style={styles.hint}>{curso.orientacionNombreCorto}</Text>}
                    </View>
                    {!rows.length ? <Text style={styles.empty}>Sin horarios configurados para los dias seleccionados.</Text> : <>
                      <Text style={styles.scrollHint}>Desliza horizontalmente para ver los dias. Toca una materia para ver su detalle.</Text>
                      <View style={styles.table}>
                        <View style={styles.index}>
                          <View style={styles.dayHeader}><Text style={styles.indexLabel}>Hora</Text></View>
                          {rows.map((row) => <View key={row.key} style={[styles.indexRow, { height: row.tipo === 'Receso' ? recessHeight : classHeight }]}>
                            <Text style={styles.indexLabel}>{row.label}</Text>
                            {row.tipo === 'Receso' ? <Text style={styles.recessTime}>{row.horaInicio.slice(0, 5)}-{row.horaFin.slice(0, 5)}</Text> : <>
                              <Text style={styles.indexTime}>{row.horaInicio.slice(0, 5)}</Text>
                              <Text style={styles.indexTime}>a {row.horaFin.slice(0, 5)}</Text>
                            </>}
                          </View>)}
                        </View>
                        <ScrollView horizontal nestedScrollEnabled style={styles.weekScroll} showsHorizontalScrollIndicator>
                          <View style={{ width: days.length * 180 }}>
                            <View style={styles.tableRow}>{days.map((day) => <View key={day.value} style={[styles.dayCell, styles.dayHeader]}>
                              <Text variant="titleSmall" style={styles.title}>{day.label}</Text>
                            </View>)}</View>
                            {rows.map((row) => <View key={row.key} style={[styles.tableRow, { height: row.tipo === 'Receso' ? recessHeight : classHeight }]}>
                              {days.map((day) => {
                                const block = row.blocks[day.value];
                                const materia = block ? occupied.get(block.id) : undefined;
                                const color = materia ? subjectColor(materia.id) : null;
                                return <View key={day.value} style={styles.dayCell}>
                                  {!block ? <View style={styles.emptyCell}><Text style={styles.cellHint}>Sin bloque</Text></View>
                                    : block.tipo === 'Receso' ? <View style={styles.recess}><Text style={styles.cellHint}>Receso</Text></View>
                                    : materia && color ? <TouchableRipple borderless onPress={() => setDetail({ materia, curso })}
                                      accessibilityLabel={`Ver horarios de ${materia.nombre}, curso ${courseLabel(curso)}`}
                                      style={[styles.subject, { backgroundColor: color.background, borderLeftColor: color.border }]}>
                                      <View><Text numberOfLines={2} style={styles.subjectName}>{materia.nombre}</Text>
                                        <Text numberOfLines={2} style={styles.teacher}>{teachers(materia)}</Text></View>
                                    </TouchableRipple> : <View style={styles.free}><Text style={styles.cellHint}>Hora libre</Text></View>}
                                </View>;
                              })}
                            </View>)}
                          </View>
                        </ScrollView>
                      </View>
                    </>}
                  </Surface>;
                })}
            </>}
        </>}
    </ScrollView>
    <Portal><Dialog visible={Boolean(detail)} onDismiss={() => setDetail(null)}>
      {detail && <>
        <Dialog.Title>{detail.materia.nombre}</Dialog.Title>
        <Dialog.ScrollArea style={styles.dialogScroll}>
          <ScrollView contentContainerStyle={styles.dialogContent}>
            <Text variant="titleMedium">Curso {courseLabel(detail.curso)}</Text>
            <Text style={styles.hint}>{anexo?.nombre}</Text>
            <Text style={styles.detailText}>{teachers(detail.materia)}</Text>
            <Text style={styles.detailText}>Carga horaria: {detail.materia.cargaHoraria} horas catedra semanales</Text>
            <Text variant="titleMedium" style={styles.daysTitle}>Todos los dias y horarios</Text>
            {subjectPeriods(detail.materia, grid.blocks).map((block) => <View key={block.id} style={styles.period}>
              <Text style={styles.indexLabel}>{block.dayLabel} / {block.label}</Text>
              <Text style={styles.hint}>{block.horaInicio.slice(0, 5)} a {block.horaFin.slice(0, 5)}</Text>
            </View>)}
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions><Button onPress={() => setDetail(null)}>Cerrar</Button></Dialog.Actions>
      </>}
    </Dialog></Portal>
  </View>;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9FC' },
  content: { padding: 12, paddingBottom: 32 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  title: { color: '#1F5FAF', fontWeight: '700' },
  hint: { color: '#6B6B6B', fontSize: 12, marginVertical: 4 },
  status: { padding: 24, alignItems: 'center', gap: 12 },
  error: { color: '#D32F2F', textAlign: 'center' },
  filters: { padding: 8, marginTop: 12, backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E0E0E0' },
  filterHeading: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  checkbox: { paddingVertical: 0 },
  daysTitle: { marginTop: 12, marginBottom: 8 },
  dayFilters: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  course: { marginTop: 16, backgroundColor: '#FFFFFF', borderRadius: 10, overflow: 'hidden' },
  courseHeader: { paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 3, borderTopColor: '#1F5FAF', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  scrollHint: { fontSize: 11, color: '#6B6B6B', padding: 8 },
  empty: { padding: 16, color: '#6B6B6B' },
  table: { flexDirection: 'row', padding: 8 },
  index: { width: 76, backgroundColor: '#FFFFFF', marginRight: 6 },
  indexRow: { justifyContent: 'center', paddingHorizontal: 4, paddingBottom: 6 },
  indexLabel: { color: '#344054', fontSize: 12, lineHeight: 14, fontWeight: '700' },
  indexTime: { color: '#526071', fontSize: 11, lineHeight: 13 },
  recessTime: { color: '#526071', fontSize: 10, lineHeight: 12 },
  weekScroll: { flex: 1, minWidth: 0 },
  tableRow: { flexDirection: 'row' },
  dayCell: { width: 180, paddingRight: 6, paddingBottom: 6 },
  dayHeader: { height: 32, justifyContent: 'center' },
  subject: { flex: 1, borderRadius: 8, borderLeftWidth: 3, paddingHorizontal: 8, paddingVertical: 4, justifyContent: 'center', overflow: 'hidden' },
  subjectName: { color: '#293343', fontSize: 13, lineHeight: 16, fontWeight: '700' },
  teacher: { color: '#465264', fontSize: 11, lineHeight: 14, marginTop: 2 },
  recess: { flex: 1, backgroundColor: '#F1EDE5', borderRadius: 6, justifyContent: 'center', paddingHorizontal: 8 },
  free: { flex: 1, backgroundColor: '#F3F5F7', borderRadius: 8, justifyContent: 'center', paddingHorizontal: 8 },
  emptyCell: { flex: 1, justifyContent: 'center', paddingHorizontal: 8 },
  cellHint: { color: '#677384', fontSize: 12 },
  dialogScroll: { maxHeight: 400 },
  dialogContent: { paddingVertical: 12 },
  detailText: { marginTop: 8, color: '#344054', fontSize: 13 },
  period: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
});

export default HorariosScreen;
