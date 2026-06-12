import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform, TouchableOpacity, Image, Modal } from 'react-native';
import { Text, Surface, TextInput, Button, Checkbox, IconButton, Divider, TouchableRipple, ActivityIndicator } from 'react-native-paper';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { createAlumno, getAlumnos } from '../services/alumnoService';
import { createInscripcion } from '../services/inscripcionService';
import { getCursos, Curso } from '../services/cursoService';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getProvincias, getLocalidadesByProvincia } from '../services/geoService';
import { DocumentoImageAsset, getTiposDocumentoAlumno, TipoDocumentoAlumno, uploadAlumnoDocumento } from '../services/alumnoDocumentoService';


type InscripcionScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Inscripcion'>;
type InscripcionScreenRouteProp = NativeStackScreenProps<RootStackParamList, 'Inscripcion'>['route'];

const documentosList = ['Fotocopia DNI', 'Certificado de Estudio', 'Pase', 'Cuil'];

const getDocumentoMaxImages = (doc: string) => doc.toLowerCase().includes('dni') ? 2 : 1;
const getAssetType = (asset: { uri: string; fileName?: string | null; mimeType?: string | null; name?: string | null }) => {
  const fileName = asset.fileName || asset.name || asset.uri.split('/').pop() || 'documento';
  if (asset.mimeType) return asset.mimeType;
  if (fileName.toLowerCase().endsWith('.pdf')) return 'application/pdf';
  return 'image/jpeg';
};
const isPdfAsset = (asset: DocumentoImageAsset) => asset.type === 'application/pdf' || asset.uri.toLowerCase().split('?')[0].endsWith('.pdf');
const sanitizeLettersOnly = (value: string) => value.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s'-]/g, '');
const getCreatedAlumnoId = (response: any) => {
  const value =
    response?.id ??
    response?.Id ??
    response?.alumnoId ??
    response?.AlumnoId ??
    response?.alumno?.id ??
    response?.Alumno?.Id ??
    response?.data?.id ??
    response?.data?.Id ??
    (typeof response === 'number' ? response : null);

  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? id : null;
};

const getCursoLabel = (cursoItem?: Curso) => {
  if (!cursoItem) return '';
  const cursoDivision = `${cursoItem.curso || ''}${cursoItem.division || ''}`.trim();
  return [cursoDivision, cursoItem.orientacionNombreCorto, cursoItem.anexoNombre].filter(Boolean).join(' - ');
};

const InscripcionScreen: React.FC = () => {
  const navigation = useNavigation<InscripcionScreenNavigationProp>();
  const route = useRoute<InscripcionScreenRouteProp>();

  // Datos Personales
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [dni, setDni] = useState('');
  const [curso, setCurso] = useState('');
  const [anexo, setAnexo] = useState('');
  const [orientacion, setOrientacion] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [fechaNacimiento, setFechaNacimiento] = useState<Date | null>(null);
  const [domicilio, setDomicilio] = useState('');
  const [nacionalidad, setNacionalidad] = useState('');
  const [sexo, setSexo] = useState('');

  // Datos de Nacimiento
  const [paisNacimiento, setPaisNacimiento] = useState('');
  const [provinciaNacimiento, setProvinciaNacimiento] = useState('');
  const [localidadNacimiento, setLocalidadNacimiento] = useState('');

  // Datos de contacto
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');

  // Emergencias
  const [emergenciaNombre, setEmergenciaNombre] = useState('');
  const [emergenciaCelular, setEmergenciaCelular] = useState('');

  // Documentación
  const [documentos, setDocumentos] = useState<string[]>([]);
  const [documentosImagenes, setDocumentosImagenes] = useState<Record<string, DocumentoImageAsset[]>>({});
  const [otrosDocumentos, setOtrosDocumentos] = useState<string[]>([]);
  const [tiposDocumento, setTiposDocumento] = useState<TipoDocumentoAlumno[]>([]);

  // Curso
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [selectedCursoId, setSelectedCursoId] = useState<number | null>(null);
  const [loadingCursos, setLoadingCursos] = useState(false);
  const [showCursoSelector, setShowCursoSelector] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [esArgentina, setEsArgentina] = useState(true);
  const [pais, setPais] = useState('');
  const [provinciaId, setProvinciaId] = useState<number | null>(null);
  const [localidadId, setLocalidadId] = useState<number | null>(null);
  const [provincias, setProvincias] = useState<string[]>([]);
  const [selectedProvincia, setSelectedProvincia] = useState<string | null>(null);
  const [localidades, setLocalidades] = useState<string[]>([]);
  const [selectedLocalidad, setSelectedLocalidad] = useState<string | null>(null);
  const [loadingLocalidades, setLoadingLocalidades] = useState(false);
  const [loadingProvincias, setLoadingProvincias] = useState(false);
  const [showProvinciaSelector, setShowProvinciaSelector] = useState(false);
  const [showLocalidadSelector, setShowLocalidadSelector] = useState(false);
  const [provinciaSearch, setProvinciaSearch] = useState('');
  const [localidadSearch, setLocalidadSearch] = useState('');


  useEffect(() => {
    fetchCursos();
  }, []);
  useEffect(() => {
    fetchProvincias();
  }, []);

  useEffect(() => {
    const fetchTiposDocumento = async () => {
      try {
        const data = await getTiposDocumentoAlumno();
        setTiposDocumento(data);
      } catch (error) {
        Alert.alert('Error', 'No se pudieron cargar los tipos de documento');
      }
    };

    fetchTiposDocumento();
  }, []);

  useEffect(() => {
    const fetchLocalidades = async () => {
      if (!selectedProvincia) {
        setLocalidades([]);
        setSelectedLocalidad(null);
        setLocalidadNacimiento('');
        return;
      }

      try {
        setLoadingLocalidades(true);
        const data = await getLocalidadesByProvincia(selectedProvincia);
        setLocalidades(data);
      } catch (error) {
        Alert.alert('Error', 'No se pudieron cargar las localidades');
      } finally {
        setLoadingLocalidades(false);
      }
    };

    fetchLocalidades();
  }, [selectedProvincia]);
  const fetchProvincias = async () => {
    try {
      setLoadingProvincias(true);
      const data = await getProvincias();

      // opcional: ordenar alfabéticamente
      const ordenadas = data.sort((a, b) => a.localeCompare(b));

      setProvincias(ordenadas);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar las provincias');
    } finally {
      setLoadingProvincias(false);
    }
  };

  const provinciasFiltradas = provincias.filter((prov) =>
    prov.toLowerCase().includes(provinciaSearch.trim().toLowerCase())
  );

  const localidadesFiltradas = localidades.filter((loc) =>
    loc.toLowerCase().includes(localidadSearch.trim().toLowerCase())
  );

  const generoOptions = [
    { label: 'Varón', value: 'Varon' },
    { label: 'Mujer', value: 'Mujer' },
  ];

  const renderHighlightedText = (text: string, query: string) => {
    const cleanQuery = query.trim();
    if (!cleanQuery) return <Text style={styles.selectorOptionText}>{text}</Text>;

    const lowerText = text.toLowerCase();
    const lowerQuery = cleanQuery.toLowerCase();
    const startIndex = lowerText.indexOf(lowerQuery);

    if (startIndex === -1) {
      return <Text style={styles.selectorOptionText}>{text}</Text>;
    }

    const endIndex = startIndex + cleanQuery.length;
    const before = text.slice(0, startIndex);
    const match = text.slice(startIndex, endIndex);
    const after = text.slice(endIndex);

    return (
      <Text style={styles.selectorOptionText}>
        {before}
        <Text style={styles.selectorOptionMatch}>{match}</Text>
        {after}
      </Text>
    );
  };

  const fetchCursos = async () => {
    try {
      setLoadingCursos(true);
      const data = await getCursos();
      setCursos(data);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los cursos');
    } finally {
      setLoadingCursos(false);
    }
  };
  const onChangeDate = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);

    if (selectedDate) {
      setFechaNacimiento(selectedDate);
    }
  };
  const formatInputDate = (date: Date | null) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };
  // Handle data returned from DNICaptureScreen

  useFocusEffect(
    React.useCallback(() => {
      const params = route.params;

      if (params?.scannedData) {
        const data = params.scannedData;

        if (data.dni) setDni(data.dni);
        if (data.apellido) setApellido(data.apellido);
        if (data.nombre) setNombre(data.nombre);
        if (data.sexo) setSexo(data.sexo);
        if (data.fechaNacimiento) setFechaNacimiento(data.fechaNacimiento);
      }
    }, [route.params?.scannedData]));
  const handleDNIScan = () => {
    navigation.navigate('DNICapturePhoto');
  };

  const toggleDocumento = (doc: string) => {
    if (documentos.includes(doc)) {
      setDocumentos(documentos.filter(d => d !== doc));
      // Remove image when unchecking
      const newImagenes = { ...documentosImagenes };
      delete newImagenes[doc];
      setDocumentosImagenes(newImagenes);
    } else {
      setDocumentos([...documentos, doc]);
    }
  };

  const getTipoDocumentoId = (doc: string) => {
    const normalizedDoc = doc.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return tiposDocumento.find((tipo) => {
      const normalizedTipo = tipo.nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return normalizedTipo.includes(normalizedDoc) || normalizedDoc.includes(normalizedTipo);
    })?.id;
  };

  const handleDocumentoImagen = async (doc: string, fromCamera: boolean) => {
    try {
      const currentImages = documentosImagenes[doc] || [];
      const maxImages = getDocumentoMaxImages(doc);

      if (currentImages.length >= maxImages) {
        Alert.alert('Atención', `Este documento permite hasta ${maxImages} archivo${maxImages > 1 ? 's' : ''}`);
        return;
      }

      if (fromCamera) {
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
          const asset = result.assets[0];
          const fileName = asset.fileName || asset.uri.split('/').pop() || `documento_${currentImages.length + 1}.jpg`;
          const fileType = getAssetType(asset);

          setDocumentosImagenes({
            ...documentosImagenes,
            [doc]: [...currentImages, { uri: asset.uri, name: fileName, type: fileType, file: asset.file }],
          });
        }
      } else {
        const result = await DocumentPicker.getDocumentAsync({
          type: ['image/*', 'application/pdf'],
          multiple: false,
          copyToCacheDirectory: true,
        });

        if (!result.canceled && result.assets[0]) {
          const asset = result.assets[0];
          const fileName = asset.name || asset.uri.split('/').pop() || `documento_${currentImages.length + 1}`;
          const fileType = getAssetType(asset);

          if (!fileType.startsWith('image/') && fileType !== 'application/pdf') {
            Alert.alert('Error', 'Solo se permiten imágenes o archivos PDF');
            return;
          }

          setDocumentosImagenes({
            ...documentosImagenes,
            [doc]: [...currentImages, { uri: asset.uri, name: fileName, type: fileType, file: asset.file }],
          });
        }
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo obtener el archivo');
    }
  };

  const removeDocumentoImagen = (doc: string, imageIndex?: number) => {
    if (imageIndex === undefined) {
      const newImagenes = { ...documentosImagenes };
      delete newImagenes[doc];
      setDocumentosImagenes(newImagenes);
      return;
    }

    const images = (documentosImagenes[doc] || []).filter((_, idx) => idx !== imageIndex);
    setDocumentosImagenes({
      ...documentosImagenes,
      [doc]: images,
    });
  };

  const uploadSelectedDocumentos = async (alumnoId: number) => {
    for (const doc of documentos) {
      const tipoDocumentoAlumnoId = getTipoDocumentoId(doc);
      if (!tipoDocumentoAlumnoId) {
        throw new Error(`No existe el tipo de documento "${doc}" configurado en la API`);
      }

      const files = documentosImagenes[doc] || [];
      if (files.length > 0) {
        await uploadAlumnoDocumento({
          alumnoId,
          tipoDocumentoAlumnoId,
          presentado: true,
          files,
        });
      }
    }
  };

  const submitAlumno = async () => {
    if (!nombre || !apellido || !dni) {
      setError('Completá los campos obligatorios');
      return;
    }
    if (nombre !== sanitizeLettersOnly(nombre) || apellido !== sanitizeLettersOnly(apellido)) {
      setError('Nombre y apellido solo pueden contener letras');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const formatApiDate = (date: Date) => date.toISOString().split('T')[0];

      const createdAlumno = await createAlumno({
        nombres: nombre,
        apellidos: apellido,
        numeroDocumento: dni,
        fechaNacimiento: fechaNacimiento ? formatApiDate(fechaNacimiento) : undefined,
        genero: sexo === 'Varon' || sexo === 'Mujer' ? sexo : undefined,
        domicilio,
        datosNacimiento: {
          localidad: esArgentina ? localidadNacimiento : null,
          provincia: esArgentina ? provinciaNacimiento : null,
          pais: esArgentina ? 'Argentina' : pais,
        },
        contacto: {
          telefonoAlumno: telefono,
          email,
          nombreEmergencia: emergenciaNombre,
          telefonoEmergencia: emergenciaCelular,
        },
      });

      let createdAlumnoId = getCreatedAlumnoId(createdAlumno);
      if (!createdAlumnoId) {
        const alumnos = await getAlumnos();
        const alumnoCreado = alumnos.find((a) => a.numeroDocumento === dni);
        createdAlumnoId = alumnoCreado?.id || null;
      }

      if (!createdAlumnoId) {
        throw new Error('El alumno fue creado, pero no se pudo obtener su ID para inscribirlo al curso');
      }

      if (selectedCursoId) {
        await createInscripcion({
          alumnoId: createdAlumnoId,
          cursoId: selectedCursoId,
          anio: new Date().getFullYear(),
        });
      }

      if (createdAlumnoId) {
        await uploadSelectedDocumentos(createdAlumnoId);
      }

      setShowSuccessModal(true);

    } catch (error: any) {
      setError(error.message || 'Error al crear alumno');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!nombre || !apellido || !dni) {
      setError('Completá los campos obligatorios');
      return;
    }
    if (nombre !== sanitizeLettersOnly(nombre) || apellido !== sanitizeLettersOnly(apellido)) {
      setError('Nombre y apellido solo pueden contener letras');
      return;
    }

    const missingFields = [
      !fechaNacimiento && 'fecha de nacimiento',
      !sexo && 'sexo',
      !domicilio && 'domicilio',
      esArgentina && !selectedProvincia && 'provincia de nacimiento',
      esArgentina && !selectedLocalidad && 'localidad de nacimiento',
      !esArgentina && !pais && 'país de nacimiento',
      !telefono && 'teléfono',
      !email && 'email',
      !emergenciaNombre && 'nombre de emergencia',
      !emergenciaCelular && 'celular de emergencia',
      !selectedCursoId && 'curso',
    ].filter(Boolean) as string[];

    if (missingFields.length > 0) {
      Alert.alert(
        'Atención',
        `Faltan cargar datos:\n\n${missingFields.map((f) => `- ${f}`).join('\n')}\n\n¿Desea inscribirlo igual?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Inscribir igual', onPress: submitAlumno },
        ]
      );
      return;
    }

    await submitAlumno();
  };

  const fillTestingAlumno = () => {
    const nombres = ['Martín', 'Sofía', 'Lucas', 'Camila', 'Tomás', 'Valentina'];
    const apellidos = ['Gómez', 'Fernández', 'Rodríguez', 'López', 'Martínez', 'Pérez'];
    const selectedNombre = nombres[Math.floor(Math.random() * nombres.length)];
    const selectedApellido = apellidos[Math.floor(Math.random() * apellidos.length)];
    const randomDni = String(Math.floor(30000000 + Math.random() * 15000000));
    const randomPhone = `11-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;

    setNombre(selectedNombre);
    setApellido(selectedApellido);
    setDni(randomDni);
    setFechaNacimiento(new Date(2000 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 12), Math.floor(1 + Math.random() * 28)));
    setDomicilio(`Calle ${Math.floor(100 + Math.random() * 900)} N° ${Math.floor(1000 + Math.random() * 9000)}`);
    setNacionalidad('Argentina');
    setSexo(Math.random() > 0.5 ? 'Varon' : 'Mujer');
    setTelefono(randomPhone);
    setEmail(`${selectedNombre}.${selectedApellido}.${randomDni.slice(-3)}@mail.com`.toLowerCase());
    setEmergenciaNombre(`${apellidos[Math.floor(Math.random() * apellidos.length)]}, Responsable`);
    setEmergenciaCelular(randomPhone);
    setDocumentos(['Fotocopia DNI', 'Certificado de Estudio']);
    setDocumentosImagenes({});
    setOtrosDocumentos([]);
    setError('');
  };

  return (
    <View style={styles.container}>
      <Surface style={styles.surface} elevation={1}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <Text variant="headlineMedium" style={styles.title}>
            Inscripción de Alumno
          </Text>

          {__DEV__ && (
            <Button
              mode="outlined"
              icon="test-tube"
              onPress={fillTestingAlumno}
              style={styles.testingButton}
              labelStyle={styles.testingButtonLabel}
            >
              Generar alumno de testing
            </Button>
          )}

          {/* Sección Datos Personales */}
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Datos Personales</Text>

            <View style={styles.dniRow}>
              <TextInput
                label="DNI"
                value={dni}
                onChangeText={setDni}
                mode="outlined"
                keyboardType="numeric"
                style={styles.dniInput}
                outlineColor="#E0E0E0"
                activeOutlineColor="#1F5FAF"
              />
              <TouchableOpacity
                onPress={handleDNIScan}
                style={styles.scanButton}
              >
                <View style={styles.scanButtonContent}>
                  <IconButton
                    icon="camera"
                    size={20}
                    iconColor="#FFFFFF"
                    style={styles.scanIcon}
                  />
                </View>
              </TouchableOpacity>
            </View>

            <TextInput
              label="Nombre"
              value={nombre}
              onChangeText={(value) => setNombre(sanitizeLettersOnly(value))}
              mode="outlined"
              style={styles.input}
              outlineColor="#E0E0E0"
              activeOutlineColor="#1F5FAF"
            />
            <TextInput
              label="Apellido"
              value={apellido}
              onChangeText={(value) => setApellido(sanitizeLettersOnly(value))}
              mode="outlined"
              style={styles.input}
              outlineColor="#E0E0E0"
              activeOutlineColor="#1F5FAF"
            />
            <View style={{ marginBottom: 16 }}>
              <Text>Fecha de nacimiento</Text>

              {Platform.OS === 'web' ? (
                <input
                  type="date"
                  value={formatInputDate(fechaNacimiento)}
                  max={formatInputDate(new Date())}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setFechaNacimiento(value ? new Date(`${value}T00:00:00`) : null);
                  }}
                  style={styles.webDateInput as any}
                />
              ) : (
                <>
                  <TouchableRipple onPress={() => setShowDatePicker(true)}>
                    <View style={styles.dateSelector}>
                      <Text>
                        {fechaNacimiento
                          ? fechaNacimiento.toLocaleDateString()
                          : 'Seleccionar fecha'}
                      </Text>
                    </View>
                  </TouchableRipple>

                  {showDatePicker && (
                    <DateTimePicker
                      value={fechaNacimiento || new Date()}
                      mode="date"
                      display="default"
                      onChange={onChangeDate}
                      maximumDate={new Date()}
                    />
                  )}
                </>
              )}
            </View>
            <TextInput
              label="Domicilio"
              value={domicilio}
              onChangeText={setDomicilio}
              mode="outlined"
              style={styles.input}
              outlineColor="#E0E0E0"
              activeOutlineColor="#1F5FAF"
            />
            <TextInput
              label="Nacionalidad"
              value={nacionalidad}
              onChangeText={setNacionalidad}
              mode="outlined"
              style={styles.input}
              outlineColor="#E0E0E0"
              activeOutlineColor="#1F5FAF"
            />

            <Text style={styles.subtitle}>Sexo</Text>
            <View style={styles.sexoRow}>
              {generoOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => setSexo(option.value)}
                  style={[
                    styles.sexoOption,
                    sexo === option.value && styles.sexoOptionActive
                  ]}
                >
                  <View style={styles.sexoContent}>
                    <Checkbox
                      status={sexo === option.value ? 'checked' : 'unchecked'}
                      onPress={() => setSexo(option.value)}
                      color="#1F5FAF"
                    />
                    <Text style={styles.sexoText}>{option.label}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Divider style={styles.divider} />

          {/* Sección Datos de Nacimiento */}
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Datos de Nacimiento</Text>
            {/* <TextInput
              label="País de Nacimiento"
              value={paisNacimiento}
              onChangeText={setPaisNacimiento}
              mode="outlined"
              style={styles.input}
              outlineColor="#E0E0E0"
              activeOutlineColor="#1F5FAF"
            />
            <TextInput
              label="Provincia de Nacimiento"
              value={provinciaNacimiento}
              onChangeText={setProvinciaNacimiento}
              mode="outlined"
              style={styles.input}
              outlineColor="#E0E0E0"
              activeOutlineColor="#1F5FAF"
            />
            <TextInput
              label="Localidad de nacimiento"
              value={localidadNacimiento}
              onChangeText={setLocalidadNacimiento}
              mode="outlined"
              style={styles.input}
              outlineColor="#E0E0E0"
              activeOutlineColor="#1F5FAF"
            />*/}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Checkbox
                status={esArgentina ? 'checked' : 'unchecked'}
                onPress={() => {
                  const nuevoValor = !esArgentina;
                  setEsArgentina(nuevoValor);

                  if (!nuevoValor) {
                    // 👇 si deja de ser Argentina
                    setProvinciaId(null);
                    setLocalidadId(null);
                    setSelectedProvincia(null);
                    setSelectedLocalidad(null);
                    setProvinciaNacimiento('');
                    setLocalidadNacimiento('');
                  } else {
                    // 👇 vuelve a Argentina
                    setPais('');
                  }
                }}
              />
              <Text>Nacido en Argentina</Text>
            </View>
            {esArgentina && (
              <>
                <View style={styles.selectorBlock}>
                  <Text style={styles.selectorLabel}>Provincia</Text>
                  <TouchableOpacity
                    style={styles.selectorControl}
                    onPress={() => {
                      setProvinciaSearch('');
                      setShowProvinciaSelector(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={selectedProvincia ? styles.selectorValue : styles.selectorPlaceholder}>
                      {selectedProvincia || 'Seleccionar provincia'}
                    </Text>
                    <IconButton icon="chevron-down" size={20} iconColor="#6B6B6B" style={styles.selectorIcon} />
                  </TouchableOpacity>
                </View>
                <View style={styles.selectorBlock}>
                  <Text style={styles.selectorLabel}>Localidad de nacimiento</Text>
                  <TouchableOpacity
                    style={styles.selectorControl}
                    onPress={() => {
                      if (!selectedProvincia) {
                        Alert.alert('Atención', 'Primero seleccioná una provincia');
                        return;
                      }
                      if (loadingLocalidades) return;
                      setLocalidadSearch('');
                      setShowLocalidadSelector(true);
                    }}
                    activeOpacity={0.8}
                    disabled={loadingLocalidades}
                  >
                    <Text style={selectedLocalidad ? styles.selectorValue : styles.selectorPlaceholder}>
                      {loadingLocalidades ? 'Cargando localidades...' : selectedLocalidad || 'Seleccionar localidad'}
                    </Text>
                    {loadingLocalidades ? (
                      <ActivityIndicator color="#1F5FAF" style={styles.selectorLoadingIcon} />
                    ) : (
                      <IconButton icon="chevron-down" size={20} iconColor="#6B6B6B" style={styles.selectorIcon} />
                    )}
                  </TouchableOpacity>
                  {loadingLocalidades && (
                    <Text style={styles.selectorHelperText}>Esto puede demorar unos segundos según la provincia seleccionada.</Text>
                  )}
                </View>
              </>
            )}
            {!esArgentina && (
              <TextInput
                label="País de nacimiento"
                value={pais}
                onChangeText={setPais}
                mode="outlined"
                style={{ marginBottom: 16 }}
              />
            )}
          </View>

          <Divider style={styles.divider} />

          {/* Sección Datos de contacto */}
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Datos de contacto</Text>
            <TextInput
              label="Teléfono Celular"
              value={telefono}
              onChangeText={setTelefono}
              mode="outlined"
              keyboardType="phone-pad"
              style={styles.input}
              outlineColor="#E0E0E0"
              activeOutlineColor="#1F5FAF"
            />
            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              outlineColor="#E0E0E0"
              activeOutlineColor="#1F5FAF"
            />
          </View>

          <Divider style={styles.divider} />

          {/* Datos en caso de emergencia */}
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Datos en caso de emergencia</Text>
            <TextInput
              label="Nombre"
              value={emergenciaNombre}
              onChangeText={setEmergenciaNombre}
              mode="outlined"
              style={styles.input}
              outlineColor="#E0E0E0"
              activeOutlineColor="#1F5FAF"
            />
            <TextInput
              label="Celular"
              value={emergenciaCelular}
              onChangeText={setEmergenciaCelular}
              mode="outlined"
              keyboardType="phone-pad"
              style={styles.input}
              outlineColor="#E0E0E0"
              activeOutlineColor="#1F5FAF"
            />
          </View>

          <Divider style={styles.divider} />

          {/* Sección Documentación */}
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Documentación</Text>
            {documentosList.map((doc) => (
              <View key={doc}>
                <TouchableOpacity
                  onPress={() => toggleDocumento(doc)}
                  style={styles.checkboxRow}
                >
                  <Checkbox
                    status={documentos.includes(doc) ? 'checked' : 'unchecked'}
                    onPress={() => toggleDocumento(doc)}
                    color="#1F5FAF"
                  />
                  <Text style={styles.checkboxLabel}>{doc}</Text>
                </TouchableOpacity>

                {documentos.includes(doc) && (
                  <View style={styles.docActions}>
                    <TouchableOpacity
                      onPress={() => handleDocumentoImagen(doc, false)}
                      style={styles.docActionButton}
                    >
                      <IconButton icon="paperclip" size={16} iconColor="#1F5FAF" style={styles.docIcon} />
                      <Text style={styles.docActionText}>Adjuntar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleDocumentoImagen(doc, true)}
                      style={styles.docActionButton}
                    >
                      <IconButton icon="camera" size={16} iconColor="#1F5FAF" style={styles.docIcon} />
                      <Text style={styles.docActionText}>Cámara</Text>
                    </TouchableOpacity>

                    {(documentosImagenes[doc] || []).length > 0 && (
                      <TouchableOpacity
                        onPress={() => removeDocumentoImagen(doc)}
                        style={styles.docActionButton}
                      >
                        <IconButton icon="close-circle" size={16} iconColor="#F28C28" style={styles.docIcon} />
                        <Text style={[styles.docActionText, { color: '#F28C28' }]}>Quitar</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {(documentosImagenes[doc] || []).length > 0 && (
                  <View style={styles.imagePreviewRow}>
                    {(documentosImagenes[doc] || []).map((file, imageIndex) => (
                      <View key={`${doc}-${imageIndex}`} style={styles.previewItem}>
                        {isPdfAsset(file) ? (
                          <View style={styles.pdfPreview}>
                            <IconButton icon="file-pdf-box" size={32} iconColor="#C62828" style={styles.pdfPreviewIcon} />
                            <Text style={styles.pdfPreviewText} numberOfLines={1}>{file.name || 'PDF'}</Text>
                          </View>
                        ) : (
                          <Image source={{ uri: file.uri }} style={styles.previewImage} />
                        )}
                        <TouchableOpacity
                          style={styles.previewRemove}
                          onPress={() => removeDocumentoImagen(doc, imageIndex)}
                        >
                          <IconButton icon="close" size={14} iconColor="#FFFFFF" style={styles.previewRemoveIcon} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
                {doc.toLowerCase().includes('dni') && documentos.includes(doc) && (
                  <Text style={styles.docHint}>Puede cargar 1 archivo con ambas caras o 2 archivos separados. Se aceptan imágenes o PDF.</Text>
                )}
              </View>
            ))}

            {otrosDocumentos.map((doc, index) => (
              <View key={index} style={styles.otroDocRow}>
                <TextInput
                  label="Otro documento"
                  value={doc}
                  onChangeText={(text) => {
                    const newDocs = [...otrosDocumentos];
                    newDocs[index] = text;
                    setOtrosDocumentos(newDocs);
                  }}
                  mode="outlined"
                  style={styles.otroDocInput}
                  outlineColor="#E0E0E0"
                  activeOutlineColor="#1F5FAF"
                />
                <IconButton
                  icon="close"
                  size={20}
                  onPress={() => {
                    setOtrosDocumentos(otrosDocumentos.filter((_, i) => i !== index));
                  }}
                  style={styles.removeButton}
                />
              </View>
            ))}

            <Button
              mode="outlined"
              onPress={() => setOtrosDocumentos([...otrosDocumentos, ''])}
              style={styles.addButton}
              icon="plus"
            >
              Agregar Otro
            </Button>
          </View>

          <Divider style={styles.divider} />

          {/* Curso al que se inscribe */}
          <View style={styles.selectorBlock}>
            <Text style={styles.selectorLabel}>Curso al que se inscribe</Text>
            <TouchableOpacity
              style={styles.selectorControl}
              onPress={() => setShowCursoSelector(true)}
              activeOpacity={0.8}
            >
              <Text style={selectedCursoId ? styles.selectorValue : styles.selectorPlaceholder} numberOfLines={1}>
                {selectedCursoId
                  ? (() => {
                    const c = cursos.find((x) => x.id === selectedCursoId);
                    return getCursoLabel(c) || 'Curso seleccionado';
                  })()
                  : 'Seleccionar curso'}
              </Text>
              <IconButton icon="chevron-down" size={20} iconColor="#6B6B6B" style={styles.selectorIcon} />
            </TouchableOpacity>
          </View>

          <Modal
            visible={showProvinciaSelector}
            transparent
            animationType="fade"
            onRequestClose={() => setShowProvinciaSelector(false)}
          >
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowProvinciaSelector(false)}>
              <TouchableOpacity activeOpacity={1} style={styles.selectorModalCard}>
                <Text style={styles.selectorModalTitle}>Seleccionar provincia</Text>
                <TextInput
                  mode="outlined"
                  placeholder="Buscar provincia"
                  value={provinciaSearch}
                  onChangeText={setProvinciaSearch}
                  style={styles.selectorSearchInput}
                  outlineColor="#E0E0E0"
                  activeOutlineColor="#1F5FAF"
                  dense
                />
                <ScrollView style={styles.selectorModalList} nestedScrollEnabled>
                  {loadingProvincias ? (
                    <Text style={styles.selectorLoading}>Cargando provincias...</Text>
                  ) : provinciasFiltradas.length === 0 ? (
                    <Text style={styles.selectorLoading}>No se encontraron provincias</Text>
                  ) : (
                    provinciasFiltradas.map((prov) => (
                      <TouchableOpacity
                        key={prov}
                        style={styles.selectorOption}
                        onPress={() => {
                          setSelectedProvincia(prov);
                          setProvinciaNacimiento(prov);
                          setSelectedLocalidad(null);
                          setLocalidadNacimiento('');
                          setShowProvinciaSelector(false);
                        }}
                      >
                        {renderHighlightedText(prov, provinciaSearch)}
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
              </TouchableOpacity>
            </TouchableOpacity>
          </Modal>

          <Modal
            visible={showCursoSelector}
            transparent
            animationType="fade"
            onRequestClose={() => setShowCursoSelector(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.selectorModalCard}>
                <Text style={styles.selectorModalTitle}>Seleccionar curso</Text>
                <ScrollView style={styles.selectorModalList} nestedScrollEnabled>
                  {loadingCursos ? (
                    <Text style={styles.selectorLoading}>Cargando cursos...</Text>
                  ) : cursos.length === 0 ? (
                    <Text style={styles.selectorLoading}>No hay cursos cargados</Text>
                  ) : (
                    cursos.map((c) => (
                      <TouchableOpacity
                        key={c.id}
                        style={styles.selectorOption}
                        onPress={() => {
                          setSelectedCursoId(c.id);
                          setShowCursoSelector(false);
                        }}
                      >
                        <Text style={styles.selectorOptionText}>
                          {getCursoLabel(c)}
                        </Text>
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
                <Button mode="text" onPress={() => setShowCursoSelector(false)} style={styles.selectorCloseButton}>Cerrar</Button>
              </View>
            </View>
          </Modal>

          <Modal
            visible={showLocalidadSelector}
            transparent
            animationType="fade"
            onRequestClose={() => setShowLocalidadSelector(false)}
          >
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowLocalidadSelector(false)}>
              <TouchableOpacity activeOpacity={1} style={styles.selectorModalCard}>
                <Text style={styles.selectorModalTitle}>Seleccionar localidad</Text>
                <TextInput
                  mode="outlined"
                  placeholder="Buscar localidad"
                  value={localidadSearch}
                  onChangeText={setLocalidadSearch}
                  style={styles.selectorSearchInput}
                  outlineColor="#E0E0E0"
                  activeOutlineColor="#1F5FAF"
                  dense
                />
                <ScrollView style={styles.selectorModalList} nestedScrollEnabled>
                  {loadingLocalidades ? (
                    <Text style={styles.selectorLoading}>Cargando localidades...</Text>
                  ) : localidadesFiltradas.length === 0 ? (
                    <Text style={styles.selectorLoading}>No hay localidades disponibles</Text>
                  ) : (
                    localidadesFiltradas.map((loc) => (
                      <TouchableOpacity
                        key={loc}
                        style={styles.selectorOption}
                        onPress={() => {
                          setSelectedLocalidad(loc);
                          setLocalidadNacimiento(loc);
                          setShowLocalidadSelector(false);
                        }}
                      >
                        {renderHighlightedText(loc, localidadSearch)}
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
              </TouchableOpacity>
            </TouchableOpacity>
          </Modal>

          <Button
            mode="contained"
            onPress={handleSubmit}
            style={styles.submitButton}
            loading={loading}
            disabled={loading}
          >
            Inscribir Alumno
          </Button>

          <Modal
            visible={showSuccessModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowSuccessModal(false)}
          >
            <View style={styles.successOverlay}>
              <View style={styles.successCard}>
                <IconButton icon="check-circle" size={52} iconColor="#2E7D32" style={styles.successIcon} />
                <Text style={styles.successTitle}>Inscripción realizada</Text>
                <Text style={styles.successMessage}>El alumno fue inscripto correctamente.</Text>
                <Button
                  mode="contained"
                  onPress={() => {
                    setShowSuccessModal(false);
                    navigation.navigate('AlumnosListado');
                  }}
                  style={styles.successButton}
                >
                  Ver listado
                </Button>
              </View>
            </View>
          </Modal>
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
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  title: {
    marginTop: 16,
    marginBottom: 24,
    color: '#1F5FAF',
  },
  testingButton: {
    marginBottom: 16,
    borderColor: '#F28C28',
  },
  testingButtonLabel: {
    color: '#F28C28',
    fontWeight: '600',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 16,
    color: '#1F5FAF',
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  dateSelector: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 4,
    padding: 12,
    marginTop: 4,
  },
  webDateInput: {
    width: '100%',
    height: 48,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 4,
    paddingHorizontal: 12,
    marginTop: 4,
    backgroundColor: '#FFFFFF',
    color: '#2B2B2B',
    fontSize: 14,
  },
  dniRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dniInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F5FAF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  scanButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scanIcon: {
    margin: 0,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B6B6B',
    marginBottom: 8,
  },
  sexoRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  sexoOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    marginRight: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  sexoOptionActive: {
    backgroundColor: '#E6F0FA',
    borderColor: '#1F5FAF',
  },
  sexoContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sexoText: {
    marginLeft: 4,
    fontSize: 14,
  },
  divider: {
    marginVertical: 16,
    backgroundColor: '#E0E0E0',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checkboxLabel: {
    marginLeft: 8,
    fontSize: 14,
    color: '#2B2B2B',
  },
  docActions: {
    flexDirection: 'row',
    marginLeft: 32,
    marginBottom: 8,
  },
  docActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  docIcon: {
    margin: 0,
    padding: 0,
  },
  docActionText: {
    fontSize: 12,
    color: '#1F5FAF',
  },
  imagePreview: {
    marginLeft: 32,
    marginBottom: 8,
  },
  imagePreviewRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginLeft: 32,
    marginBottom: 8,
  },
  previewItem: {
    position: 'relative',
  },
  previewImage: {
    width: 100,
    height: 75,
    borderRadius: 4,
  },
  pdfPreview: {
    width: 100,
    height: 75,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F9FC',
    padding: 4,
  },
  pdfPreviewIcon: {
    margin: 0,
    padding: 0,
  },
  pdfPreviewText: {
    fontSize: 10,
    color: '#6B6B6B',
    textAlign: 'center',
  },
  previewRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F28C28',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewRemoveIcon: {
    margin: 0,
    padding: 0,
  },
  docHint: {
    marginLeft: 32,
    marginBottom: 8,
    fontSize: 12,
    color: '#6B6B6B',
  },
  otroDocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  otroDocInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  removeButton: {
    marginLeft: 4,
  },
  addButton: {
    marginTop: 8,
    borderColor: '#1F5FAF',
  },
  dropdown: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
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
    marginTop: 8,
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
  selectorBlock: {
    marginBottom: 16,
  },
  selectorLabel: {
    fontSize: 14,
    color: '#2B2B2B',
    marginBottom: 6,
  },
  selectorControl: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    minHeight: 50,
    paddingLeft: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  selectorValue: {
    flex: 1,
    fontSize: 14,
    color: '#2B2B2B',
  },
  selectorPlaceholder: {
    flex: 1,
    fontSize: 14,
    color: '#9E9E9E',
  },
  selectorIcon: {
    margin: 0,
  },
  selectorLoadingIcon: {
    marginHorizontal: 12,
  },
  selectorHelperText: {
    fontSize: 12,
    color: '#6B6B6B',
    marginTop: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  selectorModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    maxHeight: '70%',
    paddingVertical: 8,
  },
  selectorModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F5FAF',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  selectorSearchInput: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  selectorModalList: {
    maxHeight: 420,
  },
  selectorLoading: {
    padding: 16,
    color: '#6B6B6B',
  },
  selectorOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#EFEFEF',
  },
  selectorOptionText: {
    fontSize: 14,
    color: '#2B2B2B',
  },
  selectorOptionMatch: {
    backgroundColor: '#FFF3CD',
    color: '#1F5FAF',
    fontWeight: '700',
  },
  selectorCloseButton: {
    alignSelf: 'flex-end',
    marginHorizontal: 8,
  },
  submitButton: {
    marginTop: 24,
    marginBottom: 32,
    backgroundColor: '#F28C28',
  },
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  successIcon: {
    margin: 0,
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F5FAF',
    marginBottom: 8,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 14,
    color: '#6B6B6B',
    textAlign: 'center',
    marginBottom: 20,
  },
  successButton: {
    width: '100%',
    backgroundColor: '#1F5FAF',
  },
});

export default InscripcionScreen;
