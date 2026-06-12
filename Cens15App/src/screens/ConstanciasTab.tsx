import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, Surface, Button, Checkbox, Divider, DataTable } from 'react-native-paper';

interface Constancia {
  tipo: string;
  fecha: string;
  alumno: string;
}

const TIPOS_CONSTANCIA = [
  { key: 'regular', label: 'Constancia de Alumno Regular', icon: 'school' },
  { key: 'anios', label: 'Constancia de Años Cursados', icon: 'calendar-today' },
  { key: 'estudio', label: 'Constancia de Estudio', icon: 'book-open-variant' },
  { key: 'documentacion', label: 'Constancia de Doc. Faltante / Materias Adeudas', icon: 'file-alert' },
];

const CONSTANCIAS_MOCK: Constancia[] = [
  { tipo: 'Constancia de Alumno Regular', fecha: '15/03/2024', alumno: 'Juan Pérez' },
  { tipo: 'Constancia de Estudio', fecha: '20/06/2024', alumno: 'Juan Pérez' },
];

const TEXTO_CONSTANCIA: Record<string, string> = {
  regular:
    'Se certifica que el/la alumno/a se encuentra inscripto/a y cursando regularmente en este establecimiento educativo durante el ciclo lectivo correspondiente.',
  anios:
    'Se certifica que el/la alumno/a ha cursado satisfactoriamente los años lectivos correspondientes a su trayectoria académica en este establecimiento.',
  estudio:
    'Se certifica que el/la alumno/a se encuentra cursando estudios en este establecimiento educativo, correspondiente al ciclo lectivo vigente.',
  documentacion:
    'Se deja constancia que el/la alumno/a presenta documentación pendiente de entrega y/o materias adeudas correspondientes al ciclo lectivo en curso.',
};

const ConstanciasTab: React.FC<{ alumno: any }> = ({ alumno }) => {
  const [historial, setHistorial] = useState<Constancia[]>(CONSTANCIAS_MOCK);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [tipoSeleccionado, setTipoSeleccionado] = useState<string | null>(null);

  const handleGenerar = () => {
    if (!tipoSeleccionado) {
      Alert.alert('Error', 'Seleccioná un tipo de constancia');
      return;
    }

    const tipoInfo = TIPOS_CONSTANCIA.find((t) => t.key === tipoSeleccionado);
    const nuevaConstancia: Constancia = {
      tipo: tipoInfo?.label ?? tipoSeleccionado,
      fecha: new Date().toLocaleDateString('es-AR'),
      alumno: `${alumno?.nombre} ${alumno?.apellido}`,
    };

    setHistorial([nuevaConstancia, ...historial]);
    setMostrarFormulario(false);
    setTipoSeleccionado(null);
    Alert.alert('Éxito', 'Constancia generada correctamente');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Constancias</Text>

      {!mostrarFormulario ? (
        <Button
          mode="contained"
          onPress={() => setMostrarFormulario(true)}
          style={styles.generateButton}
          icon="file-plus"
        >
          Generar Nueva Constancia
        </Button>
      ) : (
        <Surface style={styles.formSurface} elevation={1}>
          <Text style={styles.formTitle}>Seleccionar tipo de constancia</Text>
          {TIPOS_CONSTANCIA.map((tipo) => (
            <TouchableOpacity
              key={tipo.key}
              onPress={() => setTipoSeleccionado(tipo.key)}
              style={[
                styles.tipoOption,
                tipoSeleccionado === tipo.key && styles.tipoOptionActive,
              ]}
            >
              <Checkbox
                status={tipoSeleccionado === tipo.key ? 'checked' : 'unchecked'}
                onPress={() => setTipoSeleccionado(tipo.key)}
                color="#1F5FAF"
              />
              <Text style={styles.tipoLabel}>{tipo.label}</Text>
            </TouchableOpacity>
          ))}

          {tipoSeleccionado && (
            <View style={styles.previewContainer}>
              <Text style={styles.previewLabel}>Vista previa del texto:</Text>
              <Text style={styles.previewText}>{TEXTO_CONSTANCIA[tipoSeleccionado]}</Text>
              <View style={styles.previewDatos}>
                <Text style={styles.previewDatosTitle}>Datos que se incluirán:</Text>
                <Text style={styles.previewDatosItem}>Nombre: {alumno?.nombre} {alumno?.apellido}</Text>
                <Text style={styles.previewDatosItem}>DNI: {alumno?.dni}</Text>
                <Text style={styles.previewDatosItem}>Curso: {alumno?.curso}</Text>
              </View>
            </View>
          )}

          <View style={styles.formActions}>
            <Button
              mode="outlined"
              onPress={() => {
                setMostrarFormulario(false);
                setTipoSeleccionado(null);
              }}
              style={[styles.formBtn, styles.cancelBtn]}
              labelStyle={styles.cancelBtnLabel}
              icon="cancel"
            >
              Cancelar
            </Button>
            <Button
              mode="contained"
              onPress={handleGenerar}
              style={styles.formBtn}
              icon="file-check"
            >
              Generar
            </Button>
          </View>
        </Surface>
      )}

      <Divider style={styles.divider} />

      <Text style={styles.subsectionTitle}>Historial de Constancias</Text>
      {historial.length > 0 ? (
        <DataTable style={styles.table}>
          <DataTable.Header>
            <DataTable.Title style={styles.colTipo}>Tipo</DataTable.Title>
            <DataTable.Title style={styles.colFecha}>Fecha</DataTable.Title>
          </DataTable.Header>
          {historial.map((c, idx) => (
            <DataTable.Row key={idx}>
              <DataTable.Cell style={styles.colTipo}>
                <View style={styles.rowContent}>
                  <TouchableOpacity onPress={() => Alert.alert('Ver constancia', `${c.tipo}\nAlumno: ${c.alumno}`)}>
                    <Text style={styles.linkText}>{c.tipo}</Text>
                  </TouchableOpacity>
                </View>
              </DataTable.Cell>
              <DataTable.Cell style={styles.colFecha}>
                <Text style={styles.fechaText}>{c.fecha}</Text>
              </DataTable.Cell>
            </DataTable.Row>
          ))}
        </DataTable>
      ) : (
        <Text style={styles.emptyText}>No hay constancias generadas</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginVertical: 8,
    color: '#1F5FAF',
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginVertical: 12,
    color: '#1F5FAF',
  },
  generateButton: {
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: '#1F5FAF',
  },
  formSurface: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  formTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F5FAF',
    marginBottom: 12,
  },
  tipoOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  tipoOptionActive: {
    backgroundColor: '#E6F0FA',
    borderColor: '#1F5FAF',
  },
  tipoLabel: {
    fontSize: 13,
    color: '#2B2B2B',
    flex: 1,
    marginLeft: 8,
  },
  previewContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#F7F9FC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  previewLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B6B6B',
    marginBottom: 6,
  },
  previewText: {
    fontSize: 13,
    color: '#2B2B2B',
    fontStyle: 'italic',
    lineHeight: 20,
    marginBottom: 12,
  },
  previewDatosTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B6B6B',
    marginBottom: 4,
  },
  previewDatos: {
    marginTop: 4,
  },
  previewDatosItem: {
    fontSize: 12,
    color: '#2B2B2B',
    marginBottom: 2,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  formBtn: {
    flex: 1,
    marginHorizontal: 8,
    borderRadius: 8,
  },
  cancelBtn: {
    borderColor: '#F28C28',
  },
  cancelBtnLabel: {
    color: '#F28C28',
  },
  divider: {
    marginVertical: 16,
    backgroundColor: '#E0E0E0',
  },
  table: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  colTipo: {
    flex: 1.5,
  },
  colFecha: {
    flex: 0.8,
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkText: {
    fontSize: 13,
    color: '#1F5FAF',
    textDecorationLine: 'underline',
  },
  fechaText: {
    fontSize: 12,
    color: '#6B6B6B',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B6B6B',
    textAlign: 'center',
    marginTop: 16,
  },
});

export default ConstanciasTab;
