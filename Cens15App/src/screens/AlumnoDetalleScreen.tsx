import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, Image, Modal, Linking } from 'react-native';
import { TextInput, Text, Divider, IconButton, Button, DataTable, Snackbar } from 'react-native-paper';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import type { RootStackParamList } from '../navigation/AppNavigator';
import CalificacionesScreen from './CalificacionesScreen';
import ConstanciasTab from './ConstanciasTab';
import { getInscripcionesByAlumno, AlumnoInscripcion } from '../services/alumnoService';
import {
  AlumnoDocumento,
  DocumentoImageAsset,
  TipoDocumentoAlumno,
  getAlumnoDocumentos,
  getDocumentoImages,
  getTiposDocumentoAlumno,
  deleteAlumnoDocumento,
  isPdfUrl,
  resolveStaticUrl,
  updateAlumnoDocumentoUpload,
  uploadAlumnoDocumento,
} from '../services/alumnoDocumentoService';
import { Curso, getCursos } from '../services/cursoService';
import { createInscripcion, deleteInscripcion } from '../services/inscripcionService';

type AlumnoDetalleScreenRouteProp = RouteProp<RootStackParamList, 'AlumnoDetalle'>;
type AlumnoDetalleScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AlumnoDetalle'>;

type Props = {
  route: AlumnoDetalleScreenRouteProp;
  navigation: AlumnoDetalleScreenNavigationProp;
};

const getCursoText = (inscripcion: any) => {
  const curso = inscripcion?.curso || inscripcion?.Curso;
  if (typeof curso === 'string') return curso;
  if (!curso) return '';

  const cursoNombre = curso.curso || curso.Curso || '';
  const division = curso.division || curso.Division || '';
  return `${cursoNombre} ${division}`.trim();
};

const getAnexoText = (inscripcion: any) => {
  const curso = inscripcion?.curso || inscripcion?.Curso;
  const anexo = curso?.anexo || curso?.Anexo || inscripcion?.anexo || inscripcion?.Anexo;
  return anexo?.nombre || anexo?.Nombre || '';
};

const getOrientacionText = (inscripcion: any) => {
  const curso = inscripcion?.curso || inscripcion?.Curso;
  const orientacion = curso?.orientacion || curso?.Orientacion || inscripcion?.orientacion || inscripcion?.Orientacion;
  return orientacion?.nombre || orientacion?.Nombre || orientacion?.nombreCorto || orientacion?.NombreCorto || '';
};

const getInscripcionActiva = (inscripciones: any[]) => {
  return inscripciones.find((i) => i?.estado === 'Activa' || i?.Estado === 'Activa') || inscripciones[0] || null;
};

const getAssetType = (asset: { uri: string; fileName?: string | null; mimeType?: string | null; name?: string | null }) => {
  const fileName = asset.fileName || asset.name || asset.uri.split('/').pop() || 'documento';
  if (asset.mimeType) return asset.mimeType;
  if (fileName.toLowerCase().endsWith('.pdf')) return 'application/pdf';
  return 'image/jpeg';
};

const getEmbeddedDocumentos = (alumno: any): AlumnoDocumento[] => {
  const documentos = alumno?.raw?.documentos || alumno?.raw?.Documentos || alumno?.documentos || alumno?.Documentos || [];
  return documentos.map((documento: any) => ({
    id: documento.id || documento.Id,
    alumnoId: alumno?.id || alumno?.raw?.id || alumno?.raw?.Id,
    tipoDocumentoAlumnoId: documento.tipoDocumentoAlumnoId || documento.TipoDocumentoAlumnoId,
    presentado: documento.presentado ?? documento.Presentado ?? false,
    imagenUrl: documento.imagenUrl ?? documento.ImagenUrl ?? null,
    imagenesUrl: documento.imagenesUrl || documento.ImagenesUrl || [],
    tipoDocumentoAlumno: documento.tipoDocumentoAlumno || documento.TipoDocumentoAlumno || (
      documento.tipoDocumentoAlumnoNombre || documento.TipoDocumentoAlumnoNombre
        ? { id: documento.tipoDocumentoAlumnoId || documento.TipoDocumentoAlumnoId, nombre: documento.tipoDocumentoAlumnoNombre || documento.TipoDocumentoAlumnoNombre }
        : null
    ),
  }));
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

const getCursoLabel = (inscripcion: any, cursos: Curso[]) => {
  if (inscripcion?.cursoNombre || inscripcion?.CursoNombre || inscripcion?.division || inscripcion?.Division) {
    return `${inscripcion?.cursoNombre || inscripcion?.CursoNombre || ''} ${inscripcion?.division || inscripcion?.Division || ''}`.trim();
  }

  if (typeof (inscripcion?.curso || inscripcion?.Curso) === 'string') {
    return inscripcion?.curso || inscripcion?.Curso;
  }

  const curso = resolveCursoFromInscripcion(inscripcion, cursos);
  if (!curso) return '';

  const cursoNombre = curso.curso || curso.Curso || '';
  const division = curso.division || curso.Division || '';
  return `${cursoNombre} ${division}`.trim();
};

const getAnexoLabel = (inscripcion: any, cursos: Curso[]) => {
  if (inscripcion?.anexoNombre || inscripcion?.AnexoNombre) return inscripcion?.anexoNombre || inscripcion?.AnexoNombre;

  const curso = resolveCursoFromInscripcion(inscripcion, cursos);
  if (!curso) return getAnexoText(inscripcion);

  return curso.anexoNombre || curso.AnexoNombre || getAnexoText(inscripcion);
};

const getOrientacionLabel = (inscripcion: any, cursos: Curso[]) => {
  if (inscripcion?.orientacionNombre || inscripcion?.OrientacionNombre || inscripcion?.orientacionNombreCorto || inscripcion?.OrientacionNombreCorto) {
    return inscripcion?.orientacionNombreCorto || inscripcion?.OrientacionNombreCorto || inscripcion?.orientacionNombre || inscripcion?.OrientacionNombre;
  }

  const curso = resolveCursoFromInscripcion(inscripcion, cursos);
  if (!curso) return getOrientacionText(inscripcion);

  return curso.orientacionNombreCorto || curso.OrientacionNombreCorto || curso.orientacionNombre || curso.OrientacionNombre || getOrientacionText(inscripcion);
};

const formatCurso = (curso?: Curso) => {
  if (!curso) return '';
  const cd = `${curso.curso || ''}${curso.division || ''}`.trim();
  return [cd, curso.orientacionNombreCorto, curso.anexoNombre].filter(Boolean).join(' - ');
};

const getAlumnoNombreTitulo = (alumno: any) => {
  const apellido = alumno?.apellido || alumno?.apellidos || alumno?.raw?.apellidos || '';
  const nombre = alumno?.nombre || alumno?.nombres || alumno?.raw?.nombres || '';
  return [apellido, nombre].filter(Boolean).join(', ') || 'Alumno';
};

const getCursoCompletoLabel = (inscripcion: any, cursos: Curso[], fallbackCurso = '', fallbackAnexo = '', fallbackOrientacion = '') => {
  const curso = resolveCursoFromInscripcion(inscripcion, cursos);
  const cursoNombre = curso?.curso || curso?.Curso || inscripcion?.cursoNombre || inscripcion?.CursoNombre || fallbackCurso;
  const division = curso?.division || curso?.Division || inscripcion?.division || inscripcion?.Division || '';
  const orientacion = getOrientacionLabel(inscripcion, cursos) || fallbackOrientacion;
  const anexo = getAnexoLabel(inscripcion, cursos) || fallbackAnexo;
  const numeroDivision = `${cursoNombre || ''}${division || ''}`.trim();

  return [numeroDivision, orientacion, anexo].filter(Boolean).join(' ');
};

const AlumnoDetalleScreen: React.FC<Props> = () => {
  const route = useRoute<AlumnoDetalleScreenRouteProp>();
  const alumno: any = route.params?.alumno || {} as any;
  const navigation = useNavigation<AlumnoDetalleScreenNavigationProp>();

  const [activeTab, setActiveTab] = useState<string>('datos');
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    nombre: alumno?.nombre ?? alumno?.raw?.nombres ?? '',
    apellido: alumno?.apellido ?? alumno?.raw?.apellidos ?? '',
    dni: alumno?.dni ?? alumno?.raw?.numeroDocumento ?? '',
    fechaNacimiento: alumno?.fechaNacimiento ?? alumno?.raw?.fechaNacimiento ?? '',
    domicilio: alumno?.domicilio ?? alumno?.raw?.domicilio ?? '',
    nacionalidad: alumno?.nacionalidad ?? alumno?.raw?.datosNacimiento?.pais ?? '',
    sexo: alumno?.sexo ?? alumno?.raw?.genero ?? '',
    paisNacimiento: alumno?.paisNacimiento ?? alumno?.raw?.datosNacimiento?.pais ?? '',
    provinciaNacimiento: alumno?.provinciaNacimiento ?? alumno?.raw?.datosNacimiento?.provincia ?? '',
    localidadNacimiento: alumno?.localidadNacimiento ?? alumno?.raw?.datosNacimiento?.localidad ?? '',
    telefono: alumno?.telefono ?? alumno?.raw?.contacto?.telefonoAlumno ?? '',
    email: alumno?.email ?? alumno?.raw?.contacto?.email ?? '',
    emergenciaNombre: alumno?.emergenciaNombre ?? alumno?.raw?.contacto?.nombreEmergencia ?? '',
    emergenciaCelular: alumno?.emergenciaCelular ?? alumno?.raw?.contacto?.telefonoEmergencia ?? '',
    curso: alumno?.curso ?? '',
    anexo: alumno?.anexo ?? '',
    orientacion: alumno?.orientacion ?? '',
  });
  const [pressedTab, setPressedTab] = useState<string | null>(null);
  const [inscripciones, setInscripciones] = useState<AlumnoInscripcion[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loadingInscripciones, setLoadingInscripciones] = useState(false);
  const [inscripcionesError, setInscripcionesError] = useState('');
  const [documentosAlumno, setDocumentosAlumno] = useState<AlumnoDocumento[]>([]);
  const [tiposDocumento, setTiposDocumento] = useState<TipoDocumentoAlumno[]>([]);
  const [loadingDocumentos, setLoadingDocumentos] = useState(false);
  const [documentosError, setDocumentosError] = useState('');
  const [uploadingDocumentoId, setUploadingDocumentoId] = useState<number | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();
  const [reinscribirCursoId, setReinscribirCursoId] = useState<number | null>(null);
  const [reinscribirAnio, setReinscribirAnio] = useState(currentYear);
  const [reinscribirShowDropdown, setReinscribirShowDropdown] = useState(false);
  const [reinscribirError, setReinscribirError] = useState('');
  const [reinscribirLoading, setReinscribirLoading] = useState(false);
  const [showOlderYears, setShowOlderYears] = useState(false);
  const [deletingInscripcion, setDeletingInscripcion] = useState<any | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [snackbarMessage, setSnackbarMessage] = useState('');

  useEffect(() => {
    const loadInscripciones = async () => {
      if (!alumno?.id) return;

      const embedded = alumno?.raw?.inscripciones || alumno?.inscripciones || [];
      if (embedded.length > 0) {
        setInscripciones(embedded);
      }

      try {
        setLoadingInscripciones(true);
        setInscripcionesError('');
        const [data, cursosData] = await Promise.all([
          getInscripcionesByAlumno(alumno.id),
          getCursos(),
        ]);
        setInscripciones(data);
        setCursos(cursosData);
      } catch (error: any) {
        setInscripcionesError(error?.message || 'No se pudieron cargar las inscripciones');
      } finally {
        setLoadingInscripciones(false);
      }
    };

    loadInscripciones();
  }, [alumno?.id]);

  const loadDocumentos = async (showLoading = true) => {
    if (!alumno?.id) return;

    const embeddedDocumentos = getEmbeddedDocumentos(alumno);
    if (embeddedDocumentos.length > 0) {
      setDocumentosAlumno(embeddedDocumentos);
    }

    try {
      if (showLoading) setLoadingDocumentos(true);
      setDocumentosError('');
      const [documentosData, tiposData] = await Promise.all([
        getAlumnoDocumentos(alumno.id),
        getTiposDocumentoAlumno(),
      ]);
      setDocumentosAlumno(documentosData.length > 0 ? documentosData : embeddedDocumentos);
      setTiposDocumento(tiposData);
    } catch (error: any) {
      setDocumentosError(error?.message || 'No se pudo cargar la documentación');
    } finally {
      if (showLoading) setLoadingDocumentos(false);
    }
  };

  useEffect(() => {
    loadDocumentos();
  }, [alumno?.id]);

  const inscripcionActual = getInscripcionActiva(inscripciones);
  const cursoActual = getCursoCompletoLabel(inscripcionActual, cursos, formData.curso, formData.anexo, formData.orientacion) || getCursoText(inscripcionActual) || formData.curso;
  const alumnoNombreTitulo = getAlumnoNombreTitulo(alumno);

  const tabs = [
    { key: 'datos', label: 'Datos', icon: 'account' },
    { key: 'documentacion', label: 'Documentación', icon: 'file-document' },
    { key: 'historial', label: 'Historial de Inscripciones', icon: 'history' },
    { key: 'reinscribir', label: 'Reinscribir alumno', icon: 'reload' },
    { key: 'calificaciones', label: 'Calificaciones', icon: 'clipboard-text' },
    { key: 'constancias', label: 'Constancias', icon: 'certificate' },
  ];
  const tabsRef = React.useRef<ScrollView | null>(null);

  const handleSave = () => {
    if (!formData.nombre || !formData.apellido || !formData.dni) {
      Alert.alert('Error', 'Nombre, Apellido y DNI son obligatorios');
      return;
    }
    if (formData.dni.length < 7 || formData.dni.length > 8) {
      Alert.alert('Error', 'DNI debe tener 7 u 8 dígitos');
      return;
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      Alert.alert('Error', 'Email inválido');
      return;
    }

    setEditMode(false);
    navigation.navigate('AlumnoDetalle', { alumno: { ...alumno, ...formData } });
    Alert.alert('Éxito', 'Datos actualizados correctamente');
  };

  const handleCancel = () => {
    setEditMode(false);
    setFormData({
      nombre: alumno?.nombre ?? alumno?.raw?.nombres ?? '',
      apellido: alumno?.apellido ?? alumno?.raw?.apellidos ?? '',
      dni: alumno?.dni ?? alumno?.raw?.numeroDocumento ?? '',
      fechaNacimiento: alumno?.fechaNacimiento ?? alumno?.raw?.fechaNacimiento ?? '',
      domicilio: alumno?.domicilio ?? alumno?.raw?.domicilio ?? '',
      nacionalidad: alumno?.nacionalidad ?? alumno?.raw?.datosNacimiento?.pais ?? '',
      sexo: alumno?.sexo ?? alumno?.raw?.genero ?? '',
      paisNacimiento: alumno?.paisNacimiento ?? alumno?.raw?.datosNacimiento?.pais ?? '',
      provinciaNacimiento: alumno?.provinciaNacimiento ?? alumno?.raw?.datosNacimiento?.provincia ?? '',
      localidadNacimiento: alumno?.localidadNacimiento ?? alumno?.raw?.datosNacimiento?.localidad ?? '',
      telefono: alumno?.telefono ?? alumno?.raw?.contacto?.telefonoAlumno ?? '',
      email: alumno?.email ?? alumno?.raw?.contacto?.email ?? '',
      emergenciaNombre: alumno?.emergenciaNombre ?? alumno?.raw?.contacto?.nombreEmergencia ?? '',
      emergenciaCelular: alumno?.emergenciaCelular ?? alumno?.raw?.contacto?.telefonoEmergencia ?? '',
      curso: alumno?.curso ?? '',
      anexo: alumno?.anexo ?? '',
      orientacion: alumno?.orientacion ?? '',
    });
  };

  const handleReinscribir = async () => {
    setReinscribirError('');
    if (!alumno?.id) {
      setReinscribirError('No se pudo identificar al alumno');
      return;
    }
    if (!reinscribirCursoId) {
      setReinscribirError('Seleccioná un curso');
      return;
    }
    const cursoLabel = formatCurso(cursos.find((c) => c.id === reinscribirCursoId));
    try {
      setReinscribirLoading(true);
      await createInscripcion({
        alumnoId: alumno.id,
        cursoId: reinscribirCursoId,
        anio: reinscribirAnio,
      });
      setReinscribirCursoId(null);
      setReinscribirAnio(currentYear);
      setReinscribirError('');
      const data = await getInscripcionesByAlumno(alumno.id);
      setInscripciones(data);
      setActiveTab('historial');
      setSnackbarMessage(`Alumno reinscripto correctamente${cursoLabel ? ` en ${cursoLabel}` : ''}.`);
    } catch (error: any) {
      setReinscribirError(error?.message || 'No se pudo reinscribir');
    } finally {
      setReinscribirLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeletingInscripcion(null);
    setDeleteError('');
  };

  const handleDeleteConfirm = async () => {
    if (!deletingInscripcion) return;
    setDeletingLoading(true);
    setDeleteError('');
    try {
      await deleteInscripcion(deletingInscripcion.id);
      setDeletingInscripcion(null);
      setDeletingLoading(false);
      const data = await getInscripcionesByAlumno(alumno.id);
      setInscripciones(data);
    } catch (error: any) {
      setDeleteError(error?.message || 'No se pudo eliminar la inscripción');
      setDeletingLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const documentosByTipo = new Map(documentosAlumno.map((documento) => [documento.tipoDocumentoAlumnoId, documento]));
  const documentacionRows = tiposDocumento.length > 0
    ? tiposDocumento.map((tipo) => ({ tipo, documento: documentosByTipo.get(tipo.id) || null }))
    : documentosAlumno.map((documento) => ({
      tipo: documento.tipoDocumentoAlumno || {
        id: documento.tipoDocumentoAlumnoId,
        nombre: `Documento ${documento.tipoDocumentoAlumnoId}`,
      },
      documento,
    }));

  const buildAsset = (asset: { uri: string; fileName?: string | null; mimeType?: string | null; name?: string | null; file?: File }, fallbackName: string): DocumentoImageAsset => ({
    uri: asset.uri,
    name: asset.fileName || asset.name || asset.uri.split('/').pop() || fallbackName,
    type: getAssetType(asset),
    file: asset.file,
  });

  const uploadDocumentoFile = async (tipo: TipoDocumentoAlumno, documento: AlumnoDocumento | null, file: DocumentoImageAsset) => {
    if (!alumno?.id) return;

    try {
      setUploadingDocumentoId(tipo.id);
      setDocumentosError('');

      if (documento?.id) {
        await updateAlumnoDocumentoUpload({
          id: documento.id,
          tipoDocumentoAlumnoId: tipo.id,
          presentado: true,
          files: [file],
        });
      } else {
        await uploadAlumnoDocumento({
          alumnoId: alumno.id,
          tipoDocumentoAlumnoId: tipo.id,
          presentado: true,
          files: [file],
        });
      }

      await loadDocumentos(false);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'No se pudo subir la documentación');
    } finally {
      setUploadingDocumentoId(null);
    }
  };

  const handleDocumentoUpload = async (tipo: TipoDocumentoAlumno, documento: AlumnoDocumento | null, fromCamera: boolean) => {
    try {
      if (fromCamera) {
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
          await uploadDocumentoFile(tipo, documento, buildAsset(result.assets[0], `${tipo.nombre}.jpg`));
        }
        return;
      }

      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadDocumentoFile(tipo, documento, buildAsset(result.assets[0], tipo.nombre));
      }
    } catch {
      Alert.alert('Error', 'No se pudo obtener el archivo');
    }
  };

  const handleDocumentoDelete = (tipo: TipoDocumentoAlumno, documento: AlumnoDocumento | null) => {
    if (!documento?.id) return;

    Alert.alert(
      'Eliminar documentación',
      `¿Eliminar el archivo cargado para "${tipo.nombre}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setUploadingDocumentoId(tipo.id);
              await deleteAlumnoDocumento(documento.id);
              await loadDocumentos(false);
            } catch (error: any) {
              Alert.alert('Error', error?.message || 'No se pudo eliminar la documentación');
            } finally {
              setUploadingDocumentoId(null);
            }
          },
        },
      ]
    );
  };

  const handleDocumentoPress = async (imageUrl: string) => {
    const url = resolveStaticUrl(imageUrl);

    if (!isPdfUrl(imageUrl)) {
      setPreviewImageUrl(url);
      return;
    }

    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      return;
    }

    Alert.alert('Documento PDF', url);
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabsContainer}>
        <ScrollView
          horizontal
          ref={tabsRef}
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
                style={[
                  styles.tabItem,
                  isActive && styles.tabItemActive,
                ]}
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

        {activeTab === 'datos' && (
          <TouchableOpacity
            onPress={() => {
              if (editMode) handleCancel();
              else setEditMode(true);
            }}
            style={styles.editButton}
          >
            <IconButton
              icon={editMode ? 'cancel' : 'pencil'}
              size={20}
              iconColor={editMode ? '#F28C28' : '#1F5FAF'}
            />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.containerScroll}>
        {activeTab === 'datos' && (
          <View>
            <TextInput
              label="Nombre"
              value={formData.nombre}
              onChangeText={(v) => updateField('nombre', v)}
              editable={editMode}
              mode="outlined"
              style={[styles.input, editMode && styles.inputEditable]}
            />
            <TextInput
              label="Apellido"
              value={formData.apellido}
              onChangeText={(v) => updateField('apellido', v)}
              editable={editMode}
              mode="outlined"
              style={[styles.input, editMode && styles.inputEditable]}
            />
            <TextInput
              label="DNI"
              value={formData.dni}
              onChangeText={(v) => updateField('dni', v)}
              editable={editMode}
              keyboardType="numeric"
              mode="outlined"
              style={[styles.input, editMode && styles.inputEditable]}
            />
            <TextInput
              label="Fecha de Nacimiento (DD/MM/AAAA)"
              value={formData.fechaNacimiento}
              onChangeText={(v) => updateField('fechaNacimiento', v)}
              editable={editMode}
              mode="outlined"
              style={[styles.input, editMode && styles.inputEditable]}
            />
            <TextInput
              label="Domicilio"
              value={formData.domicilio}
              onChangeText={(v) => updateField('domicilio', v)}
              editable={editMode}
              mode="outlined"
              style={[styles.input, editMode && styles.inputEditable]}
            />
            <TextInput
              label="Nacionalidad"
              value={formData.nacionalidad}
              onChangeText={(v) => updateField('nacionalidad', v)}
              editable={editMode}
              mode="outlined"
              style={[styles.input, editMode && styles.inputEditable]}
            />
            <TextInput
              label="Sexo"
              value={formData.sexo}
              onChangeText={(v) => updateField('sexo', v)}
              editable={editMode}
              mode="outlined"
              style={[styles.input, editMode && styles.inputEditable]}
            />

            <Divider style={styles.divider} />

            <TextInput
              label="País de Nacimiento"
              value={formData.paisNacimiento}
              onChangeText={(v) => updateField('paisNacimiento', v)}
              editable={editMode}
              mode="outlined"
              style={[styles.input, editMode && styles.inputEditable]}
            />
            <TextInput
              label="Provincia de Nacimiento"
              value={formData.provinciaNacimiento}
              onChangeText={(v) => updateField('provinciaNacimiento', v)}
              editable={editMode}
              mode="outlined"
              style={[styles.input, editMode && styles.inputEditable]}
            />
            <TextInput
              label="Localidad de Nacimiento"
              value={formData.localidadNacimiento}
              onChangeText={(v) => updateField('localidadNacimiento', v)}
              editable={editMode}
              mode="outlined"
              style={[styles.input, editMode && styles.inputEditable]}
            />

            <Divider style={styles.divider} />

            <TextInput
              label="Teléfono"
              value={formData.telefono}
              onChangeText={(v) => updateField('telefono', v)}
              editable={editMode}
              keyboardType="phone-pad"
              mode="outlined"
              style={[styles.input, editMode && styles.inputEditable]}
            />
            <TextInput
              label="Email"
              value={formData.email}
              onChangeText={(v) => updateField('email', v)}
              editable={editMode}
              keyboardType="email-address"
              autoCapitalize="none"
              mode="outlined"
              style={[styles.input, editMode && styles.inputEditable]}
            />

            <Divider style={styles.divider} />

            <TextInput
              label="Emergencia: Nombre"
              value={formData.emergenciaNombre}
              onChangeText={(v) => updateField('emergenciaNombre', v)}
              editable={editMode}
              mode="outlined"
              style={[styles.input, editMode && styles.inputEditable]}
            />
            <TextInput
              label="Emergencia: Celular"
              value={formData.emergenciaCelular}
              onChangeText={(v) => updateField('emergenciaCelular', v)}
              editable={editMode}
              keyboardType="phone-pad"
              mode="outlined"
              style={[styles.input, editMode && styles.inputEditable]}
            />

            <Divider style={styles.divider} />

            <Text style={styles.sectionTitle}>Curso</Text>
            {loadingInscripciones && (
              <Text style={styles.helperText}>Cargando curso relacionado...</Text>
            )}
            {inscripcionesError ? (
              <Text style={styles.errorText}>{inscripcionesError}</Text>
            ) : null}
            <TextInput
              label="Curso"
              value={cursoActual}
              editable={false}
              mode="outlined"
              style={styles.input}
            />

            {editMode && (
              <View style={styles.editActions}>
                <Button
                  mode="outlined"
                  onPress={handleCancel}
                  style={[styles.actionBtn, styles.cancelBtn]}
                  labelStyle={styles.cancelBtnLabel}
                  icon="cancel"
                >
                  Cancelar
                </Button>
                <Button
                  mode="contained"
                  onPress={handleSave}
                  style={styles.actionBtn}
                  icon="content-save"
                >
                  Guardar cambios
                </Button>
              </View>
            )}
          </View>
        )}

        {activeTab === 'documentacion' && (
          <View>
            <Text style={styles.tabSectionTitle}>Documentación para {alumnoNombreTitulo}</Text>
            {loadingDocumentos && (
              <Text style={styles.helperText}>Cargando documentación...</Text>
            )}
            {documentosError ? (
              <Text style={styles.errorText}>{documentosError}</Text>
            ) : null}
            <DataTable style={styles.docTable}>
              <DataTable.Header>
                <DataTable.Title style={styles.docColDoc}>Documentación</DataTable.Title>
                <DataTable.Title style={styles.docColFile}>Archivo</DataTable.Title>
              </DataTable.Header>
              {documentacionRows.map(({ tipo, documento }) => {
                const images = documento ? getDocumentoImages(documento) : [];
                const isUploading = uploadingDocumentoId === tipo.id;
                const isPresented = !!documento?.presentado && images.length > 0;
                return (
                  <DataTable.Row key={tipo.id}>
                    <DataTable.Cell style={styles.docColDoc}>
                      <View>
                        <Text style={styles.docName}>{tipo.nombre}</Text>
                        <Text style={isPresented ? styles.docPresented : styles.docPending}>
                          {isPresented ? 'Presentado' : 'Pendiente'}
                        </Text>
                      </View>
                    </DataTable.Cell>
                    <DataTable.Cell style={styles.docColFile}>
                      <View style={styles.docCellContent}>
                        {images.length === 0 ? (
                          <Text style={styles.docFileText}>Sin archivo cargado</Text>
                        ) : (
                          <View style={styles.docImagesRow}>
                            {images.map((imageUrl, idx) => (
                              <TouchableOpacity
                                key={`${tipo.id}-${idx}`}
                                onPress={() => handleDocumentoPress(imageUrl)}
                              >
                                {isPdfUrl(imageUrl) ? (
                                  <View style={styles.docPdfThumb}>
                                    <IconButton icon="file-pdf-box" size={24} iconColor="#C62828" style={styles.docPdfIcon} />
                                  </View>
                                ) : (
                                  <Image source={{ uri: resolveStaticUrl(imageUrl) }} style={styles.docThumb} />
                                )}
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                        <View style={styles.docUploadActions}>
                          <Button
                            mode={images.length > 0 ? 'outlined' : 'contained'}
                            compact
                            icon="paperclip"
                            loading={isUploading}
                            disabled={isUploading}
                            onPress={() => handleDocumentoUpload(tipo, documento, false)}
                            style={styles.docUploadButton}
                          >
                            {images.length > 0 ? 'Reemplazar' : 'Adjuntar'}
                          </Button>
                          <Button
                            mode="outlined"
                            compact
                            icon="camera"
                            disabled={isUploading}
                            onPress={() => handleDocumentoUpload(tipo, documento, true)}
                            style={styles.docUploadButton}
                          >
                            Cámara
                          </Button>
                          {images.length > 0 && documento?.id && (
                            <Button
                              mode="outlined"
                              compact
                              icon="delete"
                              disabled={isUploading}
                              onPress={() => handleDocumentoDelete(tipo, documento)}
                              style={[styles.docUploadButton, styles.docDeleteButton]}
                              labelStyle={styles.docDeleteButtonLabel}
                            >
                              Eliminar
                            </Button>
                          )}
                        </View>
                      </View>
                    </DataTable.Cell>
                  </DataTable.Row>
                );
              })}
            </DataTable>
            {!loadingDocumentos && !documentosError && documentacionRows.length === 0 && (
              <Text style={styles.emptyText}>No hay tipos de documentación configurados.</Text>
            )}
          </View>
        )}
        {activeTab === 'historial' && (
          <View>
            <Text style={styles.tabSectionTitle}>Historial para {alumnoNombreTitulo}</Text>
            {loadingInscripciones && (
              <Text style={styles.helperText}>Cargando inscripciones...</Text>
            )}
            {inscripcionesError ? (
              <Text style={styles.errorText}>{inscripcionesError}</Text>
            ) : null}
            <DataTable style={styles.histTable}>
              <DataTable.Header>
                <DataTable.Title style={styles.histColCurso}>Curso</DataTable.Title>
                <DataTable.Title style={styles.histColAnio}>Año</DataTable.Title>
                <DataTable.Title style={styles.histColAction}> </DataTable.Title>
              </DataTable.Header>
              {(inscripciones.length > 0 ? inscripciones : []).map((item: any, idx) => (
                <DataTable.Row key={item?.id || idx}>
                  <DataTable.Cell style={styles.histColCurso}>
                    {getCursoCompletoLabel(item, cursos) || getCursoText(item) || 'Curso sin datos'}
                  </DataTable.Cell>
                  <DataTable.Cell style={styles.histColAnio}>
                    <Text style={styles.histAnioText}>{item?.anio || item?.Anio || '-'}</Text>
                  </DataTable.Cell>
                  <DataTable.Cell style={styles.histColAction}>
                    <IconButton icon="delete" size={20} iconColor="#C62828" onPress={() => { setDeletingInscripcion(item); setDeleteError(''); }} />
                  </DataTable.Cell>
                </DataTable.Row>
              ))}
            </DataTable>
            {!loadingInscripciones && !inscripcionesError && inscripciones.length === 0 && (
              <Text style={styles.emptyText}>No hay inscripciones cargadas para este alumno.</Text>
            )}
          </View>
        )}
        {activeTab === 'reinscribir' && (
          <View>
            <Text style={styles.sectionTitle}>Reinscribir Alumno</Text>

            <TextInput
              label="Alumno"
              value={`${alumno?.nombre} ${alumno?.apellido}`}
              editable={false}
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="DNI"
              value={alumno?.dni ?? ''}
              editable={false}
              mode="outlined"
              style={styles.input}
            />

            <TouchableOpacity
              onPress={() => setReinscribirShowDropdown(!reinscribirShowDropdown)}
              style={styles.dropdown}
            >
              <View style={styles.dropdownContent}>
                <Text style={styles.dropdownText}>
                  {reinscribirCursoId
                    ? formatCurso(cursos.find((c) => c.id === reinscribirCursoId))
                    : 'Seleccionar curso...'}
                </Text>
                <IconButton
                  icon={reinscribirShowDropdown ? 'chevron-up' : 'chevron-down'}
                  size={20}
                />
              </View>
            </TouchableOpacity>

            {reinscribirShowDropdown && (
              <View style={styles.dropdownList}>
                {cursos.length === 0 ? (
                  <Text style={styles.dropdownItemText}>Cargando cursos...</Text>
                ) : (
                  cursos.map((curso) => (
                    <TouchableOpacity
                      key={curso.id}
                      onPress={() => {
                        setReinscribirCursoId(curso.id);
                        setReinscribirShowDropdown(false);
                      }}
                      style={[
                        styles.dropdownItem,
                        reinscribirCursoId === curso.id && styles.dropdownItemActive,
                      ]}
                    >
                      <Text style={styles.dropdownItemText}>{formatCurso(curso)}</Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}

            <Text style={styles.labelStyle}>Año lectivo</Text>
            <View style={styles.yearRow}>
              {[currentYear, currentYear + 1].map((year) => (
                <TouchableOpacity
                  key={year}
                  onPress={() => setReinscribirAnio(year)}
                  style={[
                    styles.yearChip,
                    reinscribirAnio === year && styles.yearChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.yearChipText,
                      reinscribirAnio === year && styles.yearChipTextActive,
                    ]}
                  >
                    {year}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              onPress={() => setShowOlderYears(!showOlderYears)}
              style={styles.olderYearsToggle}
            >
              <Text style={styles.olderYearsToggleText}>
                {showOlderYears ? 'Ocultar años anteriores' : 'Años anteriores...'}
              </Text>
              <IconButton
                icon={showOlderYears ? 'chevron-up' : 'chevron-down'}
                size={16}
              />
            </TouchableOpacity>
            {showOlderYears && (
              <View style={styles.olderYearsRow}>
                {Array.from({ length: currentYear - 2000 }, (_, i) => currentYear - 1 - i).map((year) => (
                  <TouchableOpacity
                    key={year}
                    onPress={() => setReinscribirAnio(year)}
                    style={[
                      styles.olderYearChip,
                      reinscribirAnio === year && styles.yearChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.olderYearChipText,
                        reinscribirAnio === year && styles.yearChipTextActive,
                      ]}
                    >
                      {year}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {reinscribirError ? (
              <Text style={styles.errorText}>{reinscribirError}</Text>
            ) : null}
            <Button
              mode="contained"
              onPress={handleReinscribir}
              style={styles.reinscribirButton}
              icon="school"
              loading={reinscribirLoading}
              disabled={reinscribirLoading}
            >
              {reinscribirLoading ? 'Reinscribiendo...' : 'Reinscribir Alumno'}
            </Button>
          </View>
        )}
        {activeTab === 'calificaciones' && (
          <CalificacionesScreen alumno={alumno} />
        )}
        {activeTab === 'constancias' && (
          <View>
            <Text style={styles.tabSectionTitle}>Constancias para {alumnoNombreTitulo}</Text>
            <ConstanciasTab alumno={alumno} />
          </View>
        )}
      </ScrollView>

      <Snackbar
        visible={!!snackbarMessage}
        onDismiss={() => setSnackbarMessage('')}
        duration={3500}
        action={{
          label: 'OK',
          onPress: () => setSnackbarMessage(''),
        }}
      >
        {snackbarMessage}
      </Snackbar>

      <Modal
        visible={!!deletingInscripcion}
        transparent
        animationType="fade"
        onRequestClose={() => !deletingLoading && setDeletingInscripcion(null)}
      >
        <View style={styles.previewBackdrop}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>Eliminar inscripción</Text>
          </View>
          <View style={styles.deleteModalBody}>
            <Text style={styles.deleteModalText}>
              ¿Eliminar inscripción de "{deletingInscripcion ? (getCursoCompletoLabel(deletingInscripcion, cursos) || getCursoText(deletingInscripcion) || `ID ${deletingInscripcion?.id || ''}`) : ''}"?
            </Text>
            <Text style={styles.deleteModalSubText}>Se eliminarán también las materias y calificaciones asociadas.</Text>
            {deleteError ? <Text style={styles.errorText}>{deleteError}</Text> : null}
            <View style={styles.deleteModalActions}>
              <Button
                mode="outlined"
                onPress={handleDeleteCancel}
                disabled={deletingLoading}
                style={{ marginRight: 8 }}
              >
                Cancelar
              </Button>
              <Button
                mode="contained"
                buttonColor="#C62828"
                textColor="#FFFFFF"
                onPress={handleDeleteConfirm}
                loading={deletingLoading}
                disabled={deletingLoading}
              >
                Eliminar
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!previewImageUrl}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImageUrl(null)}
      >
        <View style={styles.previewBackdrop}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>Documento adjunto</Text>
            <IconButton
              icon="close"
              size={24}
              iconColor="#FFFFFF"
              onPress={() => setPreviewImageUrl(null)}
            />
          </View>
          {previewImageUrl && (
            <Image
              source={{ uri: previewImageUrl }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 8 },
  surface: { padding: 16 },
  input: { marginBottom: 12 },
  inputEditable: {
    backgroundColor: '#F0F6FF',
    borderColor: '#1F5FAF',
  },
  divider: { marginVertical: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginVertical: 8, color: '#1F5FAF' },
  tabSectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, color: '#1F5FAF' },
  subtitle: { fontSize: 14, color: '#6B6B6B', marginVertical: 8 },
  docItem: { fontSize: 14, color: '#2B2B2B', marginBottom: 4 },
  docRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  docName: { fontSize: 14, marginHorizontal: 6, color: '#2B2B2B' },
  docTable: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  docColDoc: {
    flex: 1.2,
  },
  docColFile: {
    flex: 1.8,
  },
  docFileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  docFileIcon: {
    margin: 0,
    padding: 0,
  },
  docFileText: {
    fontSize: 12,
    color: '#2B2B2B',
    flex: 1,
  },
  docCellContent: {
    flex: 1,
    paddingVertical: 6,
  },
  docPresented: {
    fontSize: 11,
    color: '#2E7D32',
    marginTop: 2,
  },
  docPending: {
    fontSize: 11,
    color: '#C62828',
    marginTop: 2,
  },
  docImagesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 6,
  },
  docUploadActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  docUploadButton: {
    marginVertical: 2,
  },
  docDeleteButton: {
    borderColor: '#C62828',
  },
  docDeleteButtonLabel: {
    color: '#C62828',
  },
  docThumb: {
    width: 56,
    height: 42,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  docPdfThumb: {
    width: 56,
    height: 42,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F9FC',
  },
  docPdfIcon: {
    margin: 0,
    padding: 0,
  },
  previewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    padding: 16,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  previewTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  previewImage: {
    flex: 1,
    width: '100%',
  },
  docActions: { flexDirection: 'row', marginLeft: 8 },
  histTable: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  histColCurso: {
    flex: 1.5,
  },
  histColAnio: {
    flex: 0.5,
    justifyContent: 'center',
  },
  histColAction: {
    flex: 0.3,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  histAnioText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F5FAF',
    textAlign: 'center',
  },
  helperText: {
    fontSize: 12,
    color: '#6B6B6B',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#C62828',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#6B6B6B',
    marginTop: 12,
    textAlign: 'center',
  },
  deleteModalBody: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    marginHorizontal: 24,
    marginTop: 'auto',
    marginBottom: 'auto',
    alignItems: 'center',
  },
  deleteModalText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F1F1F',
    textAlign: 'center',
    marginBottom: 8,
  },
  deleteModalSubText: {
    fontSize: 13,
    color: '#6B6B6B',
    textAlign: 'center',
    marginBottom: 16,
  },
  deleteModalActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  tabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    marginBottom: 8,
  },
  tabsContent: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    flexGrow: 0,
  },
  containerScroll: {
    flex: 1,
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
  editButton: {
    marginLeft: 'auto',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  actionBtn: {
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
  labelStyle: {
    fontSize: 14,
    color: '#6B6B6B',
    marginBottom: 8,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  dropdownContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 14,
    color: '#2B2B2B',
  },
  dropdownList: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    marginTop: -8,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  dropdownItemActive: {
    backgroundColor: '#E6F0FA',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#2B2B2B',
  },
  yearRow: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 12,
  },
  yearChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  yearChipActive: {
    backgroundColor: '#1F5FAF',
    borderColor: '#1F5FAF',
  },
  yearChipText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B6B6B',
  },
  yearChipTextActive: {
    color: '#FFFFFF',
  },
  reinscribirButton: {
    marginTop: 16,
    marginBottom: 32,
    backgroundColor: '#F28C28',
  },
  olderYearsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    paddingVertical: 4,
  },
  olderYearsToggleText: {
    fontSize: 13,
    color: '#6B6B6B',
    marginRight: 4,
  },
  olderYearsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
    gap: 8,
    justifyContent: 'center',
  },
  olderYearChip: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    minWidth: 60,
  },
  olderYearChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B6B6B',
  },
});

export default AlumnoDetalleScreen;
