import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Platform, Modal, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Text, Surface, Divider, IconButton, TextInput } from 'react-native-paper';

interface Novedad {
  id: number;
  titulo: string;
  fecha: string;
  fechaFin?: string | null;
  hora?: string | null;
  descripcion: string;
}

interface Ausencia {
  id: number;
  docente: string;
  dni: string;
  fechaInicio: string;
  fechaFin: string | null;
  motivo: string;
  materia: string;
  anexo: string;
}

interface AusenciaPorDia {
  dia: string;
  fecha: string;
  ausencias: Ausencia[];
}

const NOVEDADES_INICIALES: Novedad[] = [
  { id: 1, titulo: 'Inscripciones Abiertas', fecha: '15/04/2026', descripcion: 'Las inscripciones para el ciclo lectivo 2026 están abiertas hasta el 30 de mayo.' },
  { id: 2, titulo: 'Reunión de Docentes', fecha: '10/04/2026', descripcion: 'Se convoca a todos los docentes a la reunión de planificación el viernes 12 de abril.' },
  { id: 3, titulo: 'Nuevo Curso de Informática', fecha: '05/04/2026', descripcion: 'Se inaugura el nuevo laboratorio de informática con equipos de última generación.' },
  { id: 4, titulo: 'Feria de Ciencias', fecha: '01/04/2026', descripcion: 'Los alumnos de 4° año participarán en la feria de ciencias inter escolar.' },
  { id: 5, titulo: 'Día del Estudiante', fecha: '28/03/2026', descripcion: 'Celebración del día del estudiante con actividades recreativas y deportivas.' },
];

const AUSENCIAS_MOCK: Ausencia[] = [
  { id: 1, docente: 'Prof. Martínez, Ana', dni: '30123456', fechaInicio: '20/04/2026', fechaFin: '22/04/2026', motivo: 'Licencia por enfermedad', materia: 'Matemática', anexo: 'Anexo A' },
  { id: 2, docente: 'Prof. García, Luis', dni: '28765432', fechaInicio: '19/04/2026', fechaFin: null, motivo: 'Trámite personal', materia: 'Historia', anexo: 'Anexo B' },
  { id: 3, docente: 'Prof. Rodríguez, María', dni: '29456789', fechaInicio: '18/04/2026', fechaFin: '18/04/2026', motivo: 'Cita médica', materia: 'Lengua', anexo: 'Anexo A' },
  { id: 4, docente: 'Prof. Fernández, Carlos', dni: '31654321', fechaInicio: '20/04/2026', fechaFin: '21/04/2026', motivo: 'Licencia por duelo', materia: 'Física', anexo: 'Anexo C' },
  { id: 5, docente: 'Prof. López, Susana', dni: '27890123', fechaInicio: '21/04/2026', fechaFin: null, motivo: 'Congreso docente', materia: 'Inglés', anexo: 'Anexo B' },
  { id: 6, docente: 'Prof. Torres, Roberto', dni: '32111222', fechaInicio: '20/04/2026', fechaFin: '20/04/2026', motivo: 'Trámite judicial', materia: 'Ed. Física', anexo: 'Anexo A' },
];

const AUSENCIAS_POR_DIA: AusenciaPorDia[] = [
  {
    dia: 'Lunes',
    fecha: '20/04/2026',
    ausencias: [
      { id: 1, docente: 'Prof. Martínez, Ana', dni: '30123456', fechaInicio: '20/04/2026', fechaFin: '22/04/2026', motivo: 'Licencia por enfermedad', materia: 'Matemática', anexo: 'Anexo A' },
      { id: 4, docente: 'Prof. Fernández, Carlos', dni: '31654321', fechaInicio: '20/04/2026', fechaFin: '21/04/2026', motivo: 'Licencia por duelo', materia: 'Física', anexo: 'Anexo C' },
      { id: 6, docente: 'Prof. Torres, Roberto', dni: '32111222', fechaInicio: '20/04/2026', fechaFin: '20/04/2026', motivo: 'Trámite judicial', materia: 'Ed. Física', anexo: 'Anexo A' },
    ],
  },
  {
    dia: 'Martes',
    fecha: '21/04/2026',
    ausencias: [
      { id: 1, docente: 'Prof. Martínez, Ana', dni: '30123456', fechaInicio: '20/04/2026', fechaFin: '22/04/2026', motivo: 'Licencia por enfermedad', materia: 'Matemática', anexo: 'Anexo A' },
      { id: 4, docente: 'Prof. Fernández, Carlos', dni: '31654321', fechaInicio: '20/04/2026', fechaFin: '21/04/2026', motivo: 'Licencia por duelo', materia: 'Física', anexo: 'Anexo C' },
      { id: 5, docente: 'Prof. López, Susana', dni: '27890123', fechaInicio: '21/04/2026', fechaFin: null, motivo: 'Congreso docente', materia: 'Inglés', anexo: 'Anexo B' },
    ],
  },
  {
    dia: 'Miércoles',
    fecha: '22/04/2026',
    ausencias: [
      { id: 1, docente: 'Prof. Martínez, Ana', dni: '30123456', fechaInicio: '20/04/2026', fechaFin: '22/04/2026', motivo: 'Licencia por enfermedad', materia: 'Matemática', anexo: 'Anexo A' },
    ],
  },
];

const NovedadesScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('generales');
  const [ausenciaSubTab, setAusenciaSubTab] = useState<string>('docente');
  const [fechaDesde, setFechaDesde] = useState(new Date(2026, 3, 20));
  const [fechaHasta, setFechaHasta] = useState(new Date(2026, 3, 22));
  const [showPickerDesde, setShowPickerDesde] = useState(false);
  const [showPickerHasta, setShowPickerHasta] = useState(false);
  const [pressedTab, setPressedTab] = useState<string | null>(null);
  const [pressedSubTab, setPressedSubTab] = useState<string | null>(null);
  const [anexoFilter, setAnexoFilter] = useState<string>('Todos');
  const [showAnexoDropdown, setShowAnexoDropdown] = useState(false);
  const anexosDisponibles = ['Todos', 'Anexo A', 'Anexo B', 'Anexo C'];

  const [novedades, setNovedades] = useState<Novedad[]>(NOVEDADES_INICIALES);

  const [showForm, setShowForm] = useState(false);
  const [formTitulo, setFormTitulo] = useState('');
  const [formFecha, setFormFecha] = useState(new Date());
  const [formHora, setFormHora] = useState<Date | null>(null);
  const [formMultiDia, setFormMultiDia] = useState(false);
  const [formFechaFin, setFormFechaFin] = useState<Date | null>(null);
  const [formDescripcion, setFormDescripcion] = useState('');
  const [showPickerFecha, setShowPickerFecha] = useState(false);
  const [showPickerFechaFin, setShowPickerFechaFin] = useState(false);
  const [showPickerHora, setShowPickerHora] = useState(false);

  const formatDate = (d: Date) => {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };
  const formatTime = (d: Date) => {
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${min}`;
  };
  const resetForm = () => {
    setFormTitulo('');
    setFormFecha(new Date());
    setFormHora(null);
    setFormMultiDia(false);
    setFormFechaFin(null);
    setFormDescripcion('');
  };
  const handleGuardarNovedad = () => {
    if (!formTitulo.trim()) {
      Alert.alert('Error', 'El nombre del evento es obligatorio.');
      return;
    }
    if (!formDescripcion.trim()) {
      Alert.alert('Error', 'La descripción es obligatoria.');
      return;
    }
    const nuevaNovedad: Novedad = {
      id: Date.now(),
      titulo: formTitulo.trim(),
      fecha: formatDate(formFecha),
      fechaFin: formMultiDia && formFechaFin ? formatDate(formFechaFin) : null,
      hora: formHora ? formatTime(formHora) : null,
      descripcion: formDescripcion.trim(),
    };
    setNovedades(prev => [nuevaNovedad, ...prev]);
    resetForm();
    setShowForm(false);
  };
  const tabs = [
    { key: 'generales', label: 'Generales', icon: 'bell' },
    { key: 'ausencias', label: 'Ausencias', icon: 'account-clock' },
  ];
  const subTabs = [
    { key: 'docente', label: 'Por docente' },
    { key: 'rango', label: 'Por rango' },
  ];

  return (
    <View style={styles.container}>
      <Surface style={styles.surface} elevation={1}>
        {/* Main Tabs */}
        <View style={styles.tabsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsContent}
          >
            {tabs.map((t) => {
              const isActive = activeTab === t.key;
              const isPressed = pressedTab === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  activeOpacity={1}
                  onPressIn={() => setPressedTab(t.key)}
                  onPressOut={() => setPressedTab(null)}
                  onPress={() => {
                    setPressedTab(null);
                    setActiveTab(t.key);
                  }}
                  style={[styles.tabItem, isActive && styles.tabItemActive]}
                >
                  {isPressed && <View style={styles.tabPressed} />}
                  <View style={styles.tabChipContent}>
                    <IconButton
                      icon={t.icon}
                      size={16}
                      iconColor={isActive ? '#1F5FAF' : '#6B6B6B'}
                      style={styles.tabIcon}
                    />
                    <Text style={isActive ? styles.tabLabelActive : styles.tabLabel}>
                      {t.label}
                    </Text>
                  </View>
                  {isActive && <View style={styles.tabUnderline} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Sub-tabs for Ausencias */}
        {activeTab === 'ausencias' && (
          <View style={styles.subTabsContainer}>
            {subTabs.map((st) => (
              <TouchableOpacity
                key={st.key}
                activeOpacity={1}
                onPressIn={() => setPressedSubTab(st.key)}
                onPressOut={() => setPressedSubTab(null)}
                onPress={() => {
                  setPressedSubTab(null);
                  setAusenciaSubTab(st.key);
                }}
                style={[
                  styles.subTab,
                  ausenciaSubTab === st.key && styles.subTabActive,
                  pressedSubTab === st.key && styles.subTabPressed,
                ]}
              >
                <Text
                  style={[
                    styles.subTabText,
                    ausenciaSubTab === st.key && styles.subTabTextActive,
                  ]}
                >
                  {st.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Anexo Filter */}
        {activeTab === 'ausencias' && (
          <View style={styles.anexoFilterContainer}>
            <TouchableOpacity
              style={styles.anexoFilterBtn}
              onPress={() => setShowAnexoDropdown(!showAnexoDropdown)}
            >
              <Text style={styles.anexoFilterLabel}>Anexo:</Text>
              <Text style={styles.anexoFilterValue}>{anexoFilter}</Text>
              <IconButton
                icon={showAnexoDropdown ? 'chevron-up' : 'chevron-down'}
                size={18}
                iconColor="#6B6B6B"
                style={styles.anexoFilterIcon}
              />
            </TouchableOpacity>
            {showAnexoDropdown && (
              <View style={styles.anexoDropdown}>
                {anexosDisponibles.map((a) => (
                  <TouchableOpacity
                    key={a}
                    onPress={() => {
                      setAnexoFilter(a);
                      setShowAnexoDropdown(false);
                    }}
                    style={[
                      styles.anexoDropdownItem,
                      anexoFilter === a && styles.anexoDropdownItemActive,
                    ]}
                  >
                    <Text style={[
                      styles.anexoDropdownText,
                      anexoFilter === a && styles.anexoDropdownTextActive,
                    ]}>
                      {a}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Content */}
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {activeTab === 'generales' &&
            novedades.map((item, index) => (
              <View key={item.id}>
                <View style={styles.novedadItem}>
                  <View style={styles.novedadHeader}>
                    <Text variant="titleMedium" style={styles.novedadTitulo}>{item.titulo}</Text>
                    {item.hora && (
                      <View style={styles.novedadHoraBadge}>
                        <IconButton icon="clock-outline" size={14} iconColor="#F28C28" style={styles.novedadHoraIcon} />
                        <Text style={styles.novedadHora}>{item.hora}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.novedadFecha}>
                    {item.fecha}
                    {item.fechaFin ? ` — ${item.fechaFin}` : ''}
                  </Text>
                  <Text style={styles.novedadDescripcion}>{item.descripcion}</Text>
                </View>
                {index < novedades.length - 1 && <Divider style={styles.divider} />}
              </View>
            ))}

          {activeTab === 'generales' && novedades.length === 0 && (
            <View style={styles.emptyState}>
              <IconButton icon="bell-off" size={48} iconColor="#BDBDBD" />
              <Text style={styles.emptyText}>No hay novedades generales</Text>
            </View>
          )}

          {activeTab === 'ausencias' && ausenciaSubTab === 'docente' &&
            AUSENCIAS_MOCK
              .filter(a => anexoFilter === 'Todos' || a.anexo === anexoFilter)
              .map((item, index, filtered) => (
                <View key={item.id}>
                  <View style={styles.ausenciaItem}>
                    <View style={styles.ausenciaHeader}>
                      <Text style={styles.ausenciaDocente}>{item.docente}</Text>
                      <Text style={styles.ausenciaMateria}>{item.materia}</Text>
                    </View>
                    <View style={styles.ausenciaFechas}>
                      <View style={styles.fechaRow}>
                        <Text style={styles.fechaLabel}>Desde:</Text>
                        <Text style={styles.fechaValue}>{item.fechaInicio}</Text>
                      </View>
                      <View style={styles.fechaRow}>
                        <Text style={styles.fechaLabel}>Hasta:</Text>
                        <Text style={[styles.fechaValue, !item.fechaFin && styles.fechaHastaAbierta]}>
                          {item.fechaFin ?? 'Sin definir'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.ausenciaMotivo}>{item.motivo}</Text>
                    <Text style={styles.ausenciaDni}>DNI: {item.dni}</Text>
                  </View>
                  {index < filtered.length - 1 && <Divider style={styles.divider} />}
                </View>
              ))}
            {activeTab === 'ausencias' && ausenciaSubTab === 'docente' &&
              AUSENCIAS_MOCK.filter(a => anexoFilter === 'Todos' || a.anexo === anexoFilter).length === 0 && (
                <View style={styles.emptyState}>
                  <IconButton icon="account-off" size={48} iconColor="#BDBDBD" />
                  <Text style={styles.emptyText}>No hay ausencias para este anexo</Text>
                </View>
              )}

          {activeTab === 'ausencias' && ausenciaSubTab === 'rango' && (
            <View>
              <View style={styles.rangoFiltros}>
                <TouchableOpacity
                  style={styles.rangoDateBtn}
                  onPress={() => setShowPickerDesde(true)}
                >
                  <View style={styles.rangoDateContent}>
                    <Text style={styles.rangoDateLabel}>Desde</Text>
                    <Text style={styles.rangoDateValue}>{formatDate(fechaDesde)}</Text>
                  </View>
                  <IconButton icon="calendar" size={18} iconColor="#1F5FAF" style={styles.rangoDateIcon} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.rangoDateBtn}
                  onPress={() => setShowPickerHasta(true)}
                >
                  <View style={styles.rangoDateContent}>
                    <Text style={styles.rangoDateLabel}>Hasta</Text>
                    <Text style={styles.rangoDateValue}>{formatDate(fechaHasta)}</Text>
                  </View>
                  <IconButton icon="calendar" size={18} iconColor="#1F5FAF" style={styles.rangoDateIcon} />
                </TouchableOpacity>
              </View>

              {showPickerDesde && (
                <DateTimePicker
                  value={fechaDesde}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_, date) => {
                    setShowPickerDesde(false);
                    if (date) setFechaDesde(date);
                  }}
                />
              )}

              {showPickerHasta && (
                <DateTimePicker
                  value={fechaHasta}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_, date) => {
                    setShowPickerHasta(false);
                    if (date) setFechaHasta(date);
                  }}
                  minimumDate={fechaDesde}
                />
              )}

              {AUSENCIAS_POR_DIA.map((grupo, gIdx) => {
                const ausenciasFiltradas = grupo.ausencias.filter(
                  (a) => anexoFilter === 'Todos' || a.anexo === anexoFilter
                );
                if (ausenciasFiltradas.length === 0) return null;
                return (
                  <View key={grupo.fecha}>
                    <View style={styles.diaCard}>
                      <View style={styles.diaHeader}>
                        <Text style={styles.diaNombre}>{grupo.dia}</Text>
                        <Text style={styles.diaFecha}>{grupo.fecha}</Text>
                      </View>
                      <Text style={styles.diaCount}>
                        {ausenciasFiltradas.length} {ausenciasFiltradas.length === 1 ? 'ausente' : 'ausentes'}
                      </Text>
                      {ausenciasFiltradas.map((aus) => (
                        <View key={aus.id} style={styles.diaAusente}>
                          <View style={styles.ausenteIcono}>
                            <IconButton icon="account" size={16} iconColor="#F28C28" style={styles.ausenteIconBtn} />
                          </View>
                          <View style={styles.ausenteInfo}>
                            <Text style={styles.ausenteDocente}>{aus.docente}</Text>
                            <Text style={styles.ausenteMateria}>{aus.materia} — DNI: {aus.dni}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                    {gIdx < AUSENCIAS_POR_DIA.length - 1 && <View style={styles.diaSpacer} />}
                  </View>
                );
              })}
              {AUSENCIAS_POR_DIA.every(
                (g) => g.ausencias.filter((a) => anexoFilter === 'Todos' || a.anexo === anexoFilter).length === 0
              ) && (
                <View style={styles.emptyState}>
                  <IconButton icon="account-off" size={48} iconColor="#BDBDBD" />
                  <Text style={styles.emptyText}>No hay ausencias para este anexo en el rango seleccionado</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* FAB for adding new novedad */}
        {activeTab === 'generales' && (
          <TouchableOpacity
            style={styles.fab}
            activeOpacity={0.8}
            onPress={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            <IconButton icon="plus" size={28} iconColor="#FFFFFF" style={styles.fabIcon} />
          </TouchableOpacity>
        )}
      </Surface>

      {/* Modal - Nueva Novedad General */}
      <Modal
        visible={showForm}
        animationType="slide"
        transparent
        onRequestClose={() => setShowForm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text variant="titleLarge" style={styles.modalTitle}>Nueva Novedad</Text>
              <TouchableOpacity onPress={() => setShowForm(false)} style={styles.modalCloseBtn}>
                <IconButton icon="close" size={22} iconColor="#6B6B6B" style={styles.modalCloseIcon} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              <TextInput
                label="Nombre del evento"
                value={formTitulo}
                onChangeText={setFormTitulo}
                mode="outlined"
                style={styles.formInput}
                outlineColor="#E0E0E0"
                activeOutlineColor="#1F5FAF"
              />

              <View style={styles.formRow}>
                <TouchableOpacity
                  style={styles.formDateBtn}
                  onPress={() => setShowPickerFecha(true)}
                >
                  <View style={styles.formDateContent}>
                    <Text style={styles.formDateLabel}>Fecha</Text>
                    <Text style={styles.formDateValue}>{formatDate(formFecha)}</Text>
                  </View>
                  <IconButton icon="calendar" size={18} iconColor="#1F5FAF" style={styles.formDateIcon} />
                </TouchableOpacity>

                {showPickerFecha && (
                  <DateTimePicker
                    value={formFecha}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(_, date) => {
                      setShowPickerFecha(false);
                      if (date) {
                        setFormFecha(date);
                        if (formFechaFin && date > formFechaFin) {
                          setFormFechaFin(date);
                        }
                      }
                    }}
                  />
                )}
              </View>

              <View style={styles.formRow}>
                <TouchableOpacity
                  style={styles.formDateBtn}
                  onPress={() => setShowPickerHora(true)}
                >
                  <View style={styles.formDateContent}>
                    <Text style={styles.formDateLabel}>Hora (opcional)</Text>
                    <Text style={formHora ? styles.formDateValue : styles.formDatePlaceholder}>
                      {formHora ? formatTime(formHora) : 'Sin hora'}
                    </Text>
                  </View>
                  <IconButton icon="clock-outline" size={18} iconColor="#1F5FAF" style={styles.formDateIcon} />
                </TouchableOpacity>

                {showPickerHora && (
                  <DateTimePicker
                    value={formHora ?? new Date()}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(_, time) => {
                      setShowPickerHora(false);
                      if (time) setFormHora(time);
                    }}
                  />
                )}
              </View>

              <View style={styles.formMultiDiaRow}>
                <TouchableOpacity
                  style={styles.formMultiDiaBtn}
                  onPress={() => {
                    setFormMultiDia(!formMultiDia);
                    if (formMultiDia) setFormFechaFin(null);
                  }}
                >
                  <View style={[styles.formCheckbox, formMultiDia && styles.formCheckboxActive]}>
                    {formMultiDia && (
                      <IconButton icon="check" size={16} iconColor="#FFFFFF" style={styles.formCheckboxIcon} />
                    )}
                  </View>
                  <Text style={styles.formMultiDiaLabel}>Evento de varios días</Text>
                </TouchableOpacity>
              </View>

              {formMultiDia && (
                <View style={styles.formRow}>
                  <TouchableOpacity
                    style={styles.formDateBtn}
                    onPress={() => setShowPickerFechaFin(true)}
                  >
                    <View style={styles.formDateContent}>
                      <Text style={styles.formDateLabel}>Fecha de fin</Text>
                      <Text style={formFechaFin ? styles.formDateValue : styles.formDatePlaceholder}>
                        {formFechaFin ? formatDate(formFechaFin) : 'Seleccionar'}
                      </Text>
                    </View>
                    <IconButton icon="calendar-end" size={18} iconColor="#1F5FAF" style={styles.formDateIcon} />
                  </TouchableOpacity>

                  {showPickerFechaFin && (
                    <DateTimePicker
                      value={formFechaFin ?? formFecha}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={(_, date) => {
                        setShowPickerFechaFin(false);
                        if (date) setFormFechaFin(date);
                      }}
                      minimumDate={formFecha}
                    />
                  )}
                </View>
              )}

              <TextInput
                label="Descripción"
                value={formDescripcion}
                onChangeText={setFormDescripcion}
                mode="outlined"
                multiline
                numberOfLines={4}
                style={styles.formTextarea}
                outlineColor="#E0E0E0"
                activeOutlineColor="#1F5FAF"
              />

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={[styles.formBtn, styles.formBtnCancel]}
                  onPress={() => setShowForm(false)}
                >
                  <Text style={styles.formBtnCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.formBtn}
                  onPress={handleGuardarNovedad}
                >
                  <Text style={styles.formBtnText}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    backgroundColor: '#FFFFFF',
  },
  tabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tabsContent: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    flexGrow: 0,
  },
  tabItem: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  tabItemActive: {
    backgroundColor: 'transparent',
  },
  tabPressed: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(31, 95, 175, 0.12)',
  },
  tabChipContent: { flexDirection: 'row', alignItems: 'center' },
  tabIcon: { margin: 0 },
  tabLabel: { color: '#6B6B6B', fontSize: 12, marginLeft: 4 },
  tabLabelActive: { color: '#1F5FAF', fontSize: 12, marginLeft: 4, fontWeight: '600' },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#1F5FAF',
  },
  subTabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F7F9FC',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  subTab: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#BDBDBD',
  },
  subTabActive: {
    backgroundColor: '#1F5FAF',
    borderColor: '#1F5FAF',
  },
  subTabPressed: {
    backgroundColor: 'rgba(31, 95, 175, 0.15)',
  },
  subTabText: {
    fontSize: 13,
    color: '#6B6B6B',
  },
  subTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  novedadItem: {
    paddingVertical: 16,
  },
  novedadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  novedadTitulo: {
    color: '#1F5FAF',
    flex: 1,
  },
  novedadHoraBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  novedadHoraIcon: {
    margin: 0,
    padding: 0,
  },
  novedadHora: {
    fontSize: 11,
    color: '#F28C28',
    fontWeight: '600',
  },
  novedadFecha: {
    fontSize: 12,
    color: '#6B6B6B',
    marginBottom: 8,
  },
  novedadDescripcion: {
    fontSize: 14,
    color: '#2B2B2B',
    lineHeight: 20,
  },
  ausenciaItem: {
    paddingVertical: 14,
  },
  ausenciaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  ausenciaDocente: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2B2B2B',
    flex: 1,
  },
  ausenciaMateria: {
    fontSize: 11,
    color: '#1F5FAF',
    fontWeight: '600',
    marginLeft: 8,
    textAlign: 'right',
  },
  ausenciaFechas: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 8,
  },
  fechaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fechaLabel: {
    fontSize: 12,
    color: '#6B6B6B',
    marginRight: 4,
  },
  fechaValue: {
    fontSize: 12,
    color: '#2B2B2B',
    fontWeight: '500',
  },
  fechaHastaAbierta: {
    color: '#E65100',
    fontStyle: 'italic',
  },
  ausenciaMotivo: {
    fontSize: 13,
    color: '#4A4A4A',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  ausenciaDni: {
    fontSize: 11,
    color: '#9E9E9E',
  },
  diaCard: {
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 12,
  },
  diaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  diaNombre: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F5FAF',
  },
  diaFecha: {
    fontSize: 13,
    color: '#6B6B6B',
  },
  diaCount: {
    fontSize: 12,
    color: '#F28C28',
    fontWeight: '600',
    marginBottom: 10,
  },
  diaAusente: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  ausenteIcono: {
    marginRight: 8,
  },
  ausenteIconBtn: {
    margin: 0,
    padding: 0,
  },
  ausenteInfo: {
    flex: 1,
  },
  ausenteDocente: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2B2B2B',
  },
  ausenteMateria: {
    fontSize: 11,
    color: '#6B6B6B',
    marginTop: 1,
  },
  diaSpacer: {
    height: 12,
  },
  divider: {
    backgroundColor: '#E0E0E0',
  },
  anexoFilterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  anexoFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  anexoFilterLabel: {
    fontSize: 13,
    color: '#6B6B6B',
    marginRight: 8,
  },
  anexoFilterValue: {
    fontSize: 13,
    color: '#1F5FAF',
    fontWeight: '600',
    flex: 1,
  },
  anexoFilterIcon: {
    margin: 0,
    padding: 0,
  },
  anexoDropdown: {
    position: 'absolute',
    top: '100%',
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    zIndex: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  anexoDropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  anexoDropdownItemActive: {
    backgroundColor: '#F0F4FA',
  },
  anexoDropdownText: {
    fontSize: 14,
    color: '#2B2B2B',
  },
  anexoDropdownTextActive: {
    color: '#1F5FAF',
    fontWeight: '600',
  },
  rangoFiltros: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  rangoDateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  rangoDateContent: {
    flex: 1,
  },
  rangoDateLabel: {
    fontSize: 11,
    color: '#6B6B6B',
    marginBottom: 2,
  },
  rangoDateValue: {
    fontSize: 14,
    color: '#2B2B2B',
    fontWeight: '600',
  },
  rangoDateIcon: {
    margin: 0,
    padding: 0,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 14,
    color: '#9E9E9E',
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1F5FAF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabIcon: {
    margin: 0,
    padding: 0,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    color: '#1F5FAF',
    fontWeight: '700',
  },
  modalCloseBtn: {
    borderRadius: 20,
  },
  modalCloseIcon: {
    margin: 0,
    padding: 0,
  },
  modalScroll: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 16,
  },
  formInput: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  formRow: {
    marginBottom: 12,
  },
  formDateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 14,
    backgroundColor: '#FFFFFF',
  },
  formDateContent: {
    flex: 1,
  },
  formDateLabel: {
    fontSize: 11,
    color: '#6B6B6B',
    marginBottom: 2,
  },
  formDateValue: {
    fontSize: 14,
    color: '#2B2B2B',
    fontWeight: '600',
  },
  formDatePlaceholder: {
    fontSize: 14,
    color: '#BDBDBD',
    fontStyle: 'italic',
  },
  formDateIcon: {
    margin: 0,
    padding: 0,
  },
  formMultiDiaRow: {
    marginBottom: 12,
  },
  formMultiDiaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  formCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#BDBDBD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  formCheckboxActive: {
    backgroundColor: '#1F5FAF',
    borderColor: '#1F5FAF',
  },
  formCheckboxIcon: {
    margin: 0,
    padding: 0,
  },
  formMultiDiaLabel: {
    fontSize: 14,
    color: '#2B2B2B',
  },
  formTextarea: {
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    minHeight: 100,
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  formBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#1F5FAF',
  },
  formBtnCancel: {
    backgroundColor: '#F0F0F0',
  },
  formBtnText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  formBtnCancelText: {
    fontSize: 15,
    color: '#6B6B6B',
    fontWeight: '600',
  },
});

export default NovedadesScreen;
