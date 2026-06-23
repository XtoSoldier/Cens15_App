import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Modal, TouchableWithoutFeedback, Alert, Platform } from 'react-native';
import { Text, Surface, DataTable, Chip, IconButton, Button, ActivityIndicator, Checkbox } from 'react-native-paper';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { getInscripcionesByAlumno, AlumnoInscripcion } from '../services/alumnoService';
import { getCursos, Curso } from '../services/cursoService';
import { getMaterias, Materia } from '../services/materiaService';
import { CursadaMateria, createCursadaMateria, getCursadasByInscripcion } from '../services/cursadaMateriaService';
import { Calificacion, EstadoMateria, SaveCalificacionRequest, createCalificacion, getCalificacionByCursada, updateCalificacion } from '../services/calificacionService';
import { RenderedCertificadoTemplate, getCertificadoTemplates, renderCertificadoForAlumno } from '../services/certificadoService';

type Grado = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '';
type Situacion = 'Aprobado' | 'Recup 1' | 'Recup 2' | 'Recup 1 y 2' | 'En curso' | '';
type EditableField = 'c1' | 'c2' | 'diciembre' | 'febrero';

const NOTAS_POSIBLES: Grado[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

interface MateriaCalificacion {
  cursada: CursadaMateria;
  calificacion: Calificacion | null;
  materia: string;
  c1: Grado;
  c2: Grado;
  anual: Grado;
  diciembre: Grado;
  febrero: Grado;
  final: Grado;
  situacion: Situacion;
}

interface CursoCalificaciones {
  inscripcion: AlumnoInscripcion;
  curso: string;
  anio: number;
  materias: MateriaCalificacion[];
}

interface Props {
  alumno?: any;
}

const toGrade = (value?: number | null): Grado => {
  if (value === null || value === undefined) return '';
  const rounded = Math.ceil(Number(value));
  if (rounded < 1 || rounded > 10) return '';
  return String(rounded) as Grado;
};

const toNumber = (value: Grado) => value ? Number(value) : null;
const isApproved6 = (value: Grado) => Number(value) >= 6;
const isApproved4 = (value: Grado) => Number(value) >= 4;

const getEstadoFromSituacion = (situacion: Situacion): EstadoMateria => {
  switch (situacion) {
    case 'Aprobado': return 'Aprobado';
    case 'Recup 1': return 'RecuperaPrimerCuatrimestre';
    case 'Recup 2': return 'RecuperaSegundoCuatrimestre';
    case 'Recup 1 y 2': return 'RecuperaAmbos';
    default: return 'EnCurso';
  }
};

const getSituacionFromEstado = (estado?: EstadoMateria): Situacion => {
  switch (estado) {
    case 'Aprobado': return 'Aprobado';
    case 'RecuperaPrimerCuatrimestre': return 'Recup 1';
    case 'RecuperaSegundoCuatrimestre': return 'Recup 2';
    case 'RecuperaAmbos': return 'Recup 1 y 2';
    default: return 'En curso';
  }
};

const calculateMateria = (base: MateriaCalificacion): MateriaCalificacion => {
  const c1 = toNumber(base.c1);
  const c2 = toNumber(base.c2);
  const diciembre = toNumber(base.diciembre);
  const febrero = toNumber(base.febrero);

  let anual: Grado = '';
  let final: Grado = '';
  let situacion: Situacion = c1 === null ? 'En curso' : '';

  if (c1 !== null && c2 !== null) {
    const promedio = (c1 + c2) / 2;
    anual = toGrade(promedio);

    if (c2 >= 6 && promedio >= 6) {
      final = toGrade(promedio);
      situacion = 'Aprobado';
    } else {
      const recup1 = c1 < 6;
      const recup2 = c2 < 6;
      if (recup1 && recup2) situacion = 'Recup 1 y 2';
      else if (recup1) situacion = 'Recup 1';
      else if (recup2) situacion = 'Recup 2';
      else situacion = 'Recup 2';

      if (diciembre !== null && diciembre >= 4) {
        final = toGrade(diciembre);
        situacion = 'Aprobado';
      } else if (febrero !== null && febrero >= 4) {
        final = toGrade(febrero);
        situacion = 'Aprobado';
      }
    }
  } else if (c1 !== null) {
    situacion = 'En curso';
  }

  return { ...base, anual, final, situacion };
};

const buildSaveRequest = (materia: MateriaCalificacion): SaveCalificacionRequest => ({
  cursadaMateriaId: materia.cursada.id,
  c1Promedio: toNumber(materia.c1),
  c2Promedio: toNumber(materia.c2),
  promedioAnual: toNumber(materia.anual),
  recuperacionDiciembre: toNumber(materia.diciembre),
  recuperacionMarzo: toNumber(materia.febrero),
  calificacionFinal: toNumber(materia.final),
  estado: getEstadoFromSituacion(materia.situacion),
});

const getCursoLabel = (inscripcion: AlumnoInscripcion, cursos: Curso[]) => {
  const curso = cursos.find((item) => item.id === inscripcion.cursoId);
  if (!curso) return `Curso ${inscripcion.cursoId || ''}`.trim();
  return [`${curso.curso}${curso.division}`.trim(), curso.orientacionNombreCorto, curso.anexoNombre].filter(Boolean).join(' ');
};

function GradePickerModal({ visible, currentGrade, onSelect, onClose }: { visible: boolean; currentGrade: string; onSelect: (grade: Grado) => void; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <Surface style={styles.modalContent} elevation={3}>
              <Text style={styles.modalTitle}>Nota</Text>
              <View style={styles.gradeGrid}>
                <Chip selected={currentGrade === ''} onPress={() => onSelect('')} style={[styles.gradeChip, styles.gradeChipGray]} textStyle={styles.gradeChipText}>—</Chip>
                {NOTAS_POSIBLES.map((nota) => (
                  <Chip key={nota} selected={currentGrade === nota} onPress={() => onSelect(nota)} style={[styles.gradeChip, Number(nota) >= 6 ? styles.gradeChipGreen : styles.gradeChipRed]} textStyle={styles.gradeChipText}>
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

const getNotaColor = (nota: Grado) => {
  if (!nota) return '#2B2B2B';
  return Number(nota) >= 6 ? '#2E7D32' : '#C62828';
};

const getSituacionColor = (sit: Situacion) => sit === 'Aprobado' ? '#2E7D32' : sit.startsWith('Recup') ? '#E65100' : '#6B6B6B';

const formatFechaEmision = () => new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}).format(new Date());

const getAlumnoNombre = (alumno: any) => {
  const apellido = alumno?.apellido || alumno?.apellidos || alumno?.raw?.apellidos || '';
  const nombre = alumno?.nombre || alumno?.nombres || alumno?.raw?.nombres || '';
  return `${apellido} ${nombre}`.trim() || 'Alumno';
};

const getAlumnoNombreTitulo = (alumno: any) => {
  const apellido = alumno?.apellido || alumno?.apellidos || alumno?.raw?.apellidos || '';
  const nombre = alumno?.nombre || alumno?.nombres || alumno?.raw?.nombres || '';
  return [apellido, nombre].filter(Boolean).join(', ') || 'Alumno';
};

const escapeHtml = (value: string | number | null | undefined) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const gradeOrDash = (value: Grado) => value || '-';

const buildBoletinHtml = (alumno: any, cursos: CursoCalificaciones[]) => {
  const fecha = formatFechaEmision();
  const alumnoNombre = getAlumnoNombre(alumno);
  const cursosHtml = cursos.map((curso) => `
    <section class="curso">
      <div class="curso-titulo">Curso: ${escapeHtml(curso.curso)}${curso.anio ? ` - ${escapeHtml(curso.anio)}` : ''}</div>
      <table>
        <thead>
          <tr>
            <th class="materia">Asignatura</th>
            <th>1er Cuat.</th>
            <th>2do Cuat.</th>
            <th>Prom. Anual</th>
            <th>Ex. Dic</th>
            <th>Ex. Marzo</th>
            <th>Nota Final</th>
            <th>Situación</th>
          </tr>
        </thead>
        <tbody>
          ${curso.materias.map((materia) => `
            <tr>
              <td class="materia">${escapeHtml(materia.materia)}</td>
              <td>${escapeHtml(gradeOrDash(materia.c1))}</td>
              <td>${escapeHtml(gradeOrDash(materia.c2))}</td>
              <td>${escapeHtml(gradeOrDash(materia.anual))}</td>
              <td>${escapeHtml(gradeOrDash(materia.diciembre))}</td>
              <td>${escapeHtml(gradeOrDash(materia.febrero))}</td>
              <td>${escapeHtml(gradeOrDash(materia.final))}</td>
              <td>${escapeHtml(materia.situacion || '-')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </section>
  `).join('');

  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 18mm 22mm;
      color: #111;
      font-family: "Courier New", monospace;
      font-size: 10px;
    }
    .documento { width: 100%; max-width: 166mm; margin: 0 auto; }
    .encabezado { text-align: center; line-height: 1.35; }
    .institucion { font-size: 13px; font-weight: 700; letter-spacing: 0.4px; }
    .separador { border: 0; border-top: 1px solid #111; margin: 10px 0 8px; }
    .titulo { text-align: center; font-weight: 700; margin-bottom: 24px; }
    .alumno { margin-bottom: 18px; font-weight: 700; }
    .curso { margin-bottom: 17px; page-break-inside: avoid; }
    .curso-titulo { font-weight: 700; margin-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th { border-bottom: 1px solid #111; padding: 3px 3px; text-align: center; font-size: 8px; }
    td { padding: 3px 3px; text-align: center; vertical-align: top; font-size: 8px; }
    th.materia, td.materia { width: 30%; text-align: left; }
    .pie { margin-top: 54px; display: flex; justify-content: space-between; align-items: flex-end; }
    .firma { width: 38%; text-align: center; border-top: 1px solid #111; padding-top: 7px; font-size: 9px; }
  </style>
</head>
<body>
  <div class="documento">
    <div class="encabezado">
      <div class="institucion">CENTRO EDUCATIVO DE NIVEL SECUNDARIO N° 15</div>
      <div>CUE 9400086/01</div>
      <div>ANEXO ESC. N°41</div>
    </div>
    <hr class="separador" />
    <div class="titulo">INFORME DE CALIFICACIONES - Fecha de Emisión ${escapeHtml(fecha)}</div>
    <div class="alumno">Alumno: ${escapeHtml(alumnoNombre)}</div>
    ${cursosHtml || '<p>No hay calificaciones cargadas.</p>'}
    <div class="pie">
      <div class="firma">Sello del establecimiento</div>
      <div class="firma">Firma y Sello Rector/a</div>
    </div>
  </div>
</body>
</html>`;
};

const PAGE_FORMATS: Record<string, { widthMm: number; heightMm: number }> = {
  A4: { widthMm: 210, heightMm: 297 },
  Legal: { widthMm: 216, heightMm: 356 },
  Oficio: { widthMm: 216, heightMm: 330 },
};

const normalizeImageSrc = (src: string) => src;
const normalizeDegreeSymbols = (value: string) => {
  let normalized = value.replace(/º/g, '°');
  while (normalized.includes('°°')) {
    normalized = normalized.replace(/°°/g, '°');
  }
  return normalized.replace(/° °/g, '° ');
};

const readTemplateNumber = (template: any, camelKey: string, pascalKey: string, fallback: number) => {
  const value = template?.[camelKey] ?? template?.[pascalKey];
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const readTemplateString = (template: any, camelKey: string, pascalKey: string, fallback = '') => {
  const value = template?.[camelKey] ?? template?.[pascalKey];
  return typeof value === 'string' && value.trim() ? value : fallback;
};

const buildHtmlFromTemplate = (rendered: RenderedCertificadoTemplate) => {
  const formato = readTemplateString(rendered, 'formato', 'Formato', 'A4');
  const margenSuperior = readTemplateNumber(rendered, 'margenSuperior', 'MargenSuperior', 20);
  const margenInferior = readTemplateNumber(rendered, 'margenInferior', 'MargenInferior', 20);
  const margenIzquierdo = readTemplateNumber(rendered, 'margenIzquierdo', 'MargenIzquierdo', 25);
  const margenDerecho = readTemplateNumber(rendered, 'margenDerecho', 'MargenDerecho', 25);
  const html = normalizeDegreeSymbols(readTemplateString(rendered, 'html', 'Html'));
  const imagenesJson = readTemplateString(rendered, 'imagenesJson', 'ImagenesJson');
  const format = PAGE_FORMATS[formato] || PAGE_FORMATS.A4;
  const previewWidth = 800;
  const previewHeight = previewWidth * (format.heightMm / format.widthMm);
  let imagenes: Array<{
    id?: string;
    type?: string;
    src?: string;
    text?: string;
    x: number;
    y: number;
    width: number;
    height: number;
    zIndex?: number;
  }> = [];

  try {
    imagenes = imagenesJson ? JSON.parse(imagenesJson) : [];
  } catch {
    imagenes = [];
  }

  const imagesHtml = imagenes.map((img) => {
    const leftMm = (img.x / previewWidth) * format.widthMm;
    const topMm = (img.y / previewHeight) * format.heightMm;
    const widthMm = (img.width / previewWidth) * format.widthMm;
    const heightMm = (img.height / previewHeight) * format.heightMm;

    if (img.type === 'text') {
      return `<div style="position:absolute;left:${leftMm}mm;top:${topMm}mm;width:${widthMm}mm;height:${heightMm}mm;border-top:1px dashed #111;padding-top:2mm;text-align:center;font-family:Courier New,monospace;font-size:9px;z-index:${img.zIndex || 1};">${escapeHtml(img.text || '')}</div>`;
    }

    if (!img.src) return '';
    return `<img src="${escapeHtml(normalizeImageSrc(img.src))}" style="position:absolute;left:${leftMm}mm;top:${topMm}mm;width:${widthMm}mm;height:${heightMm}mm;object-fit:contain;z-index:${img.zIndex || 1};" />`;
  }).join('');

  return normalizeDegreeSymbols(`
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: ${format.widthMm}mm ${format.heightMm}mm; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; }
    body { color: #111; }
    .page {
      position: relative;
      width: ${format.widthMm}mm;
      min-height: ${format.heightMm}mm;
      margin: 0 auto;
      background: #fff;
      overflow: hidden;
    }
    .watermark {
      position: absolute;
      left: 50%;
      top: 50%;
      width: 140%;
      transform: translate(-50%, -50%) rotate(54.74deg);
      transform-origin: center;
      z-index: 0;
      color: rgba(31, 95, 175, 0.075);
      font-family: "Courier New", monospace;
      font-size: 22mm;
      font-weight: 700;
      letter-spacing: 1.5mm;
      text-align: center;
      white-space: nowrap;
      pointer-events: none;
      user-select: none;
    }
    .content {
      position: relative;
      z-index: 2;
      padding: ${margenSuperior}mm ${margenDerecho}mm ${margenInferior}mm ${margenIzquierdo}mm;
    }
    .ql-align-center { text-align: center; }
    .ql-align-right { text-align: right; }
    .ql-align-justify { text-align: justify; }
    .ql-align-left { text-align: left; }
    .content [style*="text-align: center"] { text-align: center; }
    .content [style*="text-align:center"] { text-align: center; }
    .content [style*="text-align: right"] { text-align: right; }
    .content [style*="text-align:right"] { text-align: right; }
    .content [style*="text-align: justify"] { text-align: justify; }
    .content [style*="text-align:justify"] { text-align: justify; }
    table { max-width: 100%; }
  </style>
</head>
<body>
  <div class="page">
    <div class="watermark">CENS N°15 Anexo Esc.41</div>
    ${imagesHtml}
    <div class="content">${html}</div>
  </div>
</body>
</html>`);
};

const printHtmlOnWeb = (html: string) => {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.setAttribute('aria-hidden', 'true');

  document.body.appendChild(iframe);

  const iframeDocument = iframe.contentWindow?.document;
  if (!iframeDocument || !iframe.contentWindow) {
    document.body.removeChild(iframe);
    throw new Error('No se pudo preparar la impresión del boletín.');
  }

  iframeDocument.open();
  iframeDocument.write(html);
  iframeDocument.close();

  iframe.onload = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 1000);
  };
};

function renderGradeCell(value: Grado, onPress: () => void, enabled = true) {
  return (
    <TouchableOpacity onPress={enabled ? onPress : undefined} style={[styles.gradeCell, !enabled && styles.disabledCell]}>
      <Text style={[styles.gradeText, { color: enabled ? getNotaColor(value) : '#9E9E9E' }]}>{value || '—'}</Text>
    </TouchableOpacity>
  );
}

function BoletinPreviewModal({
  visible,
  alumno,
  cursos,
  selectedCursoIds,
  renderedHtml,
  loadingPreview,
  previewError,
  onToggleCurso,
  onClose,
  onGenerate,
  generating,
}: {
  visible: boolean;
  alumno: any;
  cursos: CursoCalificaciones[];
  selectedCursoIds: Set<number>;
  renderedHtml: string;
  loadingPreview: boolean;
  previewError: string;
  onToggleCurso: (inscripcionId: number) => void;
  onClose: () => void;
  onGenerate: () => void;
  generating: boolean;
}) {
  const selectedCursos = cursos.filter((curso) => selectedCursoIds.has(curso.inscripcion.id));

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.previewContainer}>
        <View style={styles.previewHeaderBar}>
          <Text style={styles.previewHeaderTitle}>Vista previa del boletín</Text>
          <IconButton icon="close" size={22} onPress={onClose} />
        </View>
        <ScrollView style={styles.previewScroll} contentContainerStyle={styles.previewPage}>
          {cursos.length > 0 && (
            <View style={styles.previewSelectorBox}>
              <Text style={styles.previewSelectorTitle}>Ciclos lectivos a incluir</Text>
              {cursos.map((curso) => {
                const checked = selectedCursoIds.has(curso.inscripcion.id);
                return (
                  <TouchableOpacity
                    key={curso.inscripcion.id}
                    style={styles.previewSelectorRow}
                    onPress={() => onToggleCurso(curso.inscripcion.id)}
                  >
                    <Checkbox status={checked ? 'checked' : 'unchecked'} onPress={() => onToggleCurso(curso.inscripcion.id)} />
                    <Text style={styles.previewSelectorText}>{curso.curso}{curso.anio ? ` - ${curso.anio}` : ''}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {loadingPreview ? (
            <View style={styles.stateContainer}>
              <ActivityIndicator color="#1F5FAF" />
              <Text style={styles.stateText}>Preparando vista previa...</Text>
            </View>
          ) : previewError ? (
            <Text style={styles.errorText}>{previewError}</Text>
          ) : Platform.OS === 'web' && renderedHtml ? (
            <View style={styles.exactPreviewFrame as any}>
              {React.createElement('iframe' as any, {
                srcDoc: renderedHtml,
                style: { width: '100%', height: '100%', border: 0, background: '#fff' },
                title: 'Vista previa boletín',
              })}
            </View>
          ) : (
            <>
              <View style={styles.previewInstitutionBlock}>
                <Text style={styles.previewInstitution}>CENTRO EDUCATIVO DE NIVEL SECUNDARIO N° 15</Text>
                <Text style={styles.previewSmallText}>CUE 9400086/01</Text>
                <Text style={styles.previewSmallText}>ANEXO ESC. N°41</Text>
              </View>
              <View style={styles.previewDivider} />
              <Text style={styles.previewTitle}>INFORME DE CALIFICACIONES - Fecha de Emisión {formatFechaEmision()}</Text>
              <Text style={styles.previewAlumno}>Alumno: {getAlumnoNombre(alumno)}</Text>
              {selectedCursos.map((curso) => (
                <View key={curso.inscripcion.id} style={styles.previewCursoBlock}>
                  <Text style={styles.previewCursoTitle}>Curso: {curso.curso}{curso.anio ? ` - ${curso.anio}` : ''}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator>
                    <DataTable style={styles.previewTable}>
                      <DataTable.Header style={styles.previewTableHeader}>
                        <DataTable.Title style={styles.previewColMateria}><Text style={styles.previewTableHeaderText}>Asignatura</Text></DataTable.Title>
                        <DataTable.Title style={styles.previewColNota}><Text style={styles.previewTableHeaderText}>1er</Text></DataTable.Title>
                        <DataTable.Title style={styles.previewColNota}><Text style={styles.previewTableHeaderText}>2do</Text></DataTable.Title>
                        <DataTable.Title style={styles.previewColNota}><Text style={styles.previewTableHeaderText}>Anual</Text></DataTable.Title>
                        <DataTable.Title style={styles.previewColNota}><Text style={styles.previewTableHeaderText}>Dic</Text></DataTable.Title>
                        <DataTable.Title style={styles.previewColNota}><Text style={styles.previewTableHeaderText}>Mar</Text></DataTable.Title>
                        <DataTable.Title style={styles.previewColNota}><Text style={styles.previewTableHeaderText}>Final</Text></DataTable.Title>
                        <DataTable.Title style={styles.previewColSituacion}><Text style={styles.previewTableHeaderText}>Situación</Text></DataTable.Title>
                      </DataTable.Header>
                      {curso.materias.map((materia) => (
                        <DataTable.Row key={materia.cursada.id} style={styles.previewTableRow}>
                          <DataTable.Cell style={styles.previewColMateria}><Text style={styles.previewMateriaText}>{materia.materia}</Text></DataTable.Cell>
                          <DataTable.Cell style={styles.previewColNota}><Text style={styles.previewCellText}>{gradeOrDash(materia.c1)}</Text></DataTable.Cell>
                          <DataTable.Cell style={styles.previewColNota}><Text style={styles.previewCellText}>{gradeOrDash(materia.c2)}</Text></DataTable.Cell>
                          <DataTable.Cell style={styles.previewColNota}><Text style={styles.previewCellText}>{gradeOrDash(materia.anual)}</Text></DataTable.Cell>
                          <DataTable.Cell style={styles.previewColNota}><Text style={styles.previewCellText}>{gradeOrDash(materia.diciembre)}</Text></DataTable.Cell>
                          <DataTable.Cell style={styles.previewColNota}><Text style={styles.previewCellText}>{gradeOrDash(materia.febrero)}</Text></DataTable.Cell>
                          <DataTable.Cell style={styles.previewColNota}><Text style={styles.previewCellText}>{gradeOrDash(materia.final)}</Text></DataTable.Cell>
                          <DataTable.Cell style={styles.previewColSituacion}><Text style={styles.previewCellText}>{materia.situacion || '-'}</Text></DataTable.Cell>
                        </DataTable.Row>
                      ))}
                    </DataTable>
                  </ScrollView>
                </View>
              ))}
            </>
          )}
          {cursos.length === 0 && <Text style={styles.emptyText}>No hay calificaciones cargadas.</Text>}
          {cursos.length > 0 && selectedCursos.length === 0 && <Text style={styles.emptyText}>Seleccioná al menos un ciclo lectivo para generar el boletín.</Text>}
        </ScrollView>
        <View style={styles.previewActions}>
          <Button mode="outlined" onPress={onClose} disabled={generating} style={styles.previewActionButton}>Cerrar</Button>
          <Button mode="contained" onPress={onGenerate} loading={generating} disabled={generating || loadingPreview || selectedCursos.length === 0} style={styles.previewActionButton} icon="file-pdf-box">
            Generar PDF
          </Button>
        </View>
      </View>
    </Modal>
  );
}

const CalificacionesScreen: React.FC<Props> = ({ alumno }) => {
  const alumnoId = alumno?.id || alumno?.raw?.id;
  const [inscripciones, setInscripciones] = useState<CursoCalificaciones[]>([]);
  const [expandedCursos, setExpandedCursos] = useState<Set<number>>(new Set([0]));
  const [gradePicker, setGradePicker] = useState<{ visible: boolean; cursoIdx: number; materiaIdx: number; field: EditableField }>({ visible: false, cursoIdx: 0, materiaIdx: 0, field: 'c1' });
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [previewVisible, setPreviewVisible] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [selectedBoletinCursoIds, setSelectedBoletinCursoIds] = useState<Set<number>>(new Set());
  const [renderedBoletinHtml, setRenderedBoletinHtml] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState('');

  const loadData = async () => {
    if (!alumnoId) return;
    try {
      setLoading(true);
      setError('');
      const [inscripcionesData, cursosData, materiasData] = await Promise.all([
        getInscripcionesByAlumno(alumnoId),
        getCursos(),
        getMaterias(),
      ]);

      const cursosCalificaciones = await Promise.all(inscripcionesData.map(async (inscripcion) => {
        const materiasCurso = materiasData.filter((materia: Materia) => materia.cursoId === inscripcion.cursoId);
        let cursadas = await getCursadasByInscripcion(inscripcion.id);

        for (const materia of materiasCurso) {
          if (!cursadas.some((cursada) => cursada.materiaId === materia.id)) {
            await createCursadaMateria({ inscripcionId: inscripcion.id, materiaId: materia.id });
          }
        }

        cursadas = await getCursadasByInscripcion(inscripcion.id);
        const materiasCalificaciones = await Promise.all(cursadas.map(async (cursada) => {
          const calificacion = await getCalificacionByCursada(cursada.id);
          return calculateMateria({
            cursada,
            calificacion,
            materia: cursada.materiaNombre,
            c1: toGrade(calificacion?.c1Promedio),
            c2: toGrade(calificacion?.c2Promedio),
            anual: toGrade(calificacion?.promedioAnual),
            diciembre: toGrade(calificacion?.recuperacionDiciembre),
            febrero: toGrade(calificacion?.recuperacionMarzo),
            final: toGrade(calificacion?.calificacionFinal),
            situacion: getSituacionFromEstado(calificacion?.estado),
          });
        }));

        return {
          inscripcion,
          curso: getCursoLabel(inscripcion, cursosData),
          anio: inscripcion.anio || new Date().getFullYear(),
          materias: materiasCalificaciones,
        };
      }));

      setInscripciones(cursosCalificaciones);
      setExpandedCursos(new Set(cursosCalificaciones.length > 0 ? [0] : []));
      setSelectedBoletinCursoIds(new Set(cursosCalificaciones.map((curso) => curso.inscripcion.id)));
    } catch (err: any) {
      setError(err?.message || 'No se pudieron cargar las calificaciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [alumnoId]);

  const selectedBoletinKey = Array.from(selectedBoletinCursoIds).sort((a, b) => a - b).join(',');

  const loadRenderedBoletin = async (inscripcionIds: number[]) => {
    if (!alumnoId) return '';

    const templates = await getCertificadoTemplates();
    const template = templates.find((item) => item.nombre.toLowerCase() === 'boletin_calificaciones') || templates.find((item) => {
      const name = item.nombre.toLowerCase();
      return name.includes('bolet') || name.includes('calificacion');
    }) || templates[0];

    if (!template) {
      throw new Error('No hay plantillas de certificados cargadas en PanelAdmin.');
    }

    const rendered = await renderCertificadoForAlumno(template.id, alumnoId, inscripcionIds);
    return buildHtmlFromTemplate(rendered);
  };

  useEffect(() => {
    if (!previewVisible) return;

    const selectedIds = Array.from(selectedBoletinCursoIds);
    if (selectedIds.length === 0) {
      setRenderedBoletinHtml('');
      setPreviewError('');
      return;
    }

    let cancelled = false;
    const render = async () => {
      try {
        setLoadingPreview(true);
        setPreviewError('');
        const html = await loadRenderedBoletin(selectedIds);
        if (!cancelled) setRenderedBoletinHtml(html);
      } catch (err: any) {
        if (!cancelled) {
          setRenderedBoletinHtml('');
          setPreviewError(err?.message || 'No se pudo preparar la vista previa del boletín.');
        }
      } finally {
        if (!cancelled) setLoadingPreview(false);
      }
    };

    render();
    return () => {
      cancelled = true;
    };
  }, [previewVisible, selectedBoletinKey, alumnoId]);

  const saveMateria = async (cursoIdx: number, materiaIdx: number, updatedMateria: MateriaCalificacion) => {
    const key = `${cursoIdx}-${materiaIdx}`;
    try {
      setSavingKey(key);
      const payload = buildSaveRequest(updatedMateria);
      if (updatedMateria.calificacion?.id) {
        await updateCalificacion(updatedMateria.calificacion.id, payload);
      } else {
        const created = await createCalificacion(payload);
        updatedMateria.calificacion = created;
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo guardar la calificación');
      await loadData();
    } finally {
      setSavingKey(null);
    }
  };

  const updateGrade = async (cursoIdx: number, materiaIdx: number, field: EditableField, grade: Grado) => {
    const updated = [...inscripciones];
    const curso = { ...updated[cursoIdx] };
    const materias = [...curso.materias];
    const materia = calculateMateria({ ...materias[materiaIdx], [field]: grade });
    materias[materiaIdx] = materia;
    curso.materias = materias;
    updated[cursoIdx] = curso;
    setInscripciones(updated);
    await saveMateria(cursoIdx, materiaIdx, materia);
  };

  const canEdit = (materia: MateriaCalificacion, field: EditableField) => {
    if (field === 'c1') return true;
    if (field === 'c2') return !!materia.c1;
    if (field === 'diciembre') return !!materia.c1 && !!materia.c2 && materia.situacion !== 'Aprobado';
    if (field === 'febrero') return !!materia.diciembre && !isApproved4(materia.diciembre) && materia.situacion !== 'Aprobado';
    return false;
  };

  const toggleCurso = (idx: number) => {
    setExpandedCursos((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleOpenPreview = () => {
    if (inscripciones.length === 0) {
      Alert.alert('Boletín', 'No hay calificaciones cargadas para generar el boletín.');
      return;
    }
    setSelectedBoletinCursoIds(new Set(inscripciones.map((curso) => curso.inscripcion.id)));
    setRenderedBoletinHtml('');
    setPreviewError('');
    setPreviewVisible(true);
  };

  const toggleBoletinCurso = (inscripcionId: number) => {
    setSelectedBoletinCursoIds((prev) => {
      const next = new Set(prev);
      if (next.has(inscripcionId)) next.delete(inscripcionId);
      else next.add(inscripcionId);
      return next;
    });
  };

  const handleGeneratePdf = async () => {
    try {
      const selectedCursos = inscripciones.filter((curso) => selectedBoletinCursoIds.has(curso.inscripcion.id));
      if (selectedCursos.length === 0) {
        Alert.alert('Boletín', 'Seleccioná al menos un ciclo lectivo para generar el boletín.');
        return;
      }

      setGeneratingPdf(true);
      const html = renderedBoletinHtml || await loadRenderedBoletin(selectedCursos.map((curso) => curso.inscripcion.id));

      if (Platform.OS === 'web') {
        printHtmlOnWeb(html);
        return;
      }

      const fileName = `boletin-${getAlumnoNombre(alumno).replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf`;
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();

      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Compartir boletín de calificaciones',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('PDF generado', `Archivo generado: ${fileName}\n${uri}`);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo generar el PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.screenTitle}>Calificaciones para {getAlumnoNombreTitulo(alumno)}</Text>
      {loading && <ActivityIndicator animating color="#1F5FAF" style={styles.loader} />}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <ScrollView style={styles.scrollContainer}>
        {inscripciones.map((curso, cursoIdx) => {
          const isExpanded = expandedCursos.has(cursoIdx);
          return (
            <View key={curso.inscripcion.id} style={styles.cursoBlock}>
              <TouchableOpacity style={styles.cursoHeader} onPress={() => toggleCurso(cursoIdx)}>
                <Text style={styles.cursoTitle}>{curso.curso}</Text>
                <View style={styles.cursoHeaderRight}>
                  <Text style={styles.cursoYear}>{curso.anio}</Text>
                  <IconButton icon={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} iconColor="#FFFFFF" />
                </View>
              </TouchableOpacity>

              {isExpanded && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tableScroll}>
                  <DataTable style={styles.table}>
                    <DataTable.Header style={styles.headerRow}>
                      <DataTable.Title style={styles.colMateria}><Text style={styles.headerText}>Materia</Text></DataTable.Title>
                      <DataTable.Title style={styles.colNota}><Text style={styles.headerText}>C1</Text></DataTable.Title>
                      <DataTable.Title style={styles.colNota}><Text style={styles.headerText}>C2</Text></DataTable.Title>
                      <DataTable.Title style={styles.colNota}><Text style={styles.headerText}>N.A.</Text></DataTable.Title>
                      <DataTable.Title style={styles.colNota}><Text style={styles.headerText}>Dic</Text></DataTable.Title>
                      <DataTable.Title style={styles.colNota}><Text style={styles.headerText}>Feb</Text></DataTable.Title>
                      <DataTable.Title style={styles.colNota}><Text style={styles.headerText}>N.F.</Text></DataTable.Title>
                      <DataTable.Title style={styles.colSit}><Text style={styles.headerText}>Sit.</Text></DataTable.Title>
                    </DataTable.Header>

                    {curso.materias.map((materia, materiaIdx) => {
                      const rowKey = `${cursoIdx}-${materiaIdx}`;
                      return (
                        <DataTable.Row key={materia.cursada.id} style={styles.row}>
                          <DataTable.Cell style={styles.colMateria}><Text style={styles.materiaText} numberOfLines={1}>{materia.materia}</Text></DataTable.Cell>
                          {(['c1', 'c2'] as EditableField[]).map((field) => (
                            <DataTable.Cell key={field} style={styles.colNota}>{renderGradeCell(materia[field], () => setGradePicker({ visible: true, cursoIdx, materiaIdx, field }), canEdit(materia, field) && savingKey !== rowKey)}</DataTable.Cell>
                          ))}
                          <DataTable.Cell style={styles.colNota}>{renderGradeCell(materia.anual, () => {}, false)}</DataTable.Cell>
                          {(['diciembre', 'febrero'] as EditableField[]).map((field) => (
                            <DataTable.Cell key={field} style={styles.colNota}>{renderGradeCell(materia[field], () => setGradePicker({ visible: true, cursoIdx, materiaIdx, field }), canEdit(materia, field) && savingKey !== rowKey)}</DataTable.Cell>
                          ))}
                          <DataTable.Cell style={styles.colNota}>{renderGradeCell(materia.final, () => {}, false)}</DataTable.Cell>
                          <DataTable.Cell style={styles.colSit}><Text style={[styles.sitText, { color: getSituacionColor(materia.situacion) }]}>{materia.situacion || '—'}</Text></DataTable.Cell>
                        </DataTable.Row>
                      );
                    })}
                  </DataTable>
                </ScrollView>
              )}
            </View>
          );
        })}
        {!loading && inscripciones.length === 0 && <Text style={styles.emptyText}>No hay inscripciones para calificar.</Text>}
        <Button mode="contained" onPress={handleOpenPreview} style={styles.boletinButton} icon="printer">
          Generar Boletín de Calificaciones
        </Button>
      </ScrollView>

      <BoletinPreviewModal
        visible={previewVisible}
        alumno={alumno}
        cursos={inscripciones}
        selectedCursoIds={selectedBoletinCursoIds}
        renderedHtml={renderedBoletinHtml}
        loadingPreview={loadingPreview}
        previewError={previewError}
        onToggleCurso={toggleBoletinCurso}
        onClose={() => setPreviewVisible(false)}
        onGenerate={handleGeneratePdf}
        generating={generatingPdf}
      />

      <GradePickerModal
        visible={gradePicker.visible}
        currentGrade={gradePicker.visible ? inscripciones[gradePicker.cursoIdx]?.materias[gradePicker.materiaIdx]?.[gradePicker.field] || '' : ''}
        onSelect={(grade) => {
          const current = gradePicker;
          setGradePicker({ ...gradePicker, visible: false });
          updateGrade(current.cursoIdx, current.materiaIdx, current.field, grade);
        }}
        onClose={() => setGradePicker({ ...gradePicker, visible: false })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9FC' },
  screenTitle: { fontSize: 18, fontWeight: '700', color: '#1F5FAF', marginHorizontal: 10, marginTop: 10, marginBottom: 6 },
  scrollContainer: { flex: 1, padding: 8 },
  loader: { marginVertical: 12 },
  errorText: { color: '#C62828', textAlign: 'center', marginVertical: 8 },
  emptyText: { color: '#6B6B6B', textAlign: 'center', marginVertical: 16 },
  stateContainer: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  stateText: { color: '#6B6B6B', textAlign: 'center', marginTop: 8 },
  cursoBlock: { marginBottom: 12 },
  cursoHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1F5FAF', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 },
  cursoTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  cursoHeaderRight: { flexDirection: 'row', alignItems: 'center' },
  cursoYear: { color: '#FFFFFF', fontSize: 12, marginRight: 4, opacity: 0.8 },
  tableScroll: { marginTop: 4 },
  table: { backgroundColor: '#FFFFFF' },
  headerRow: { backgroundColor: '#E6F0FA', minHeight: 32 },
  headerText: { fontSize: 11, fontWeight: '600', color: '#1F5FAF', textAlign: 'center' },
  colMateria: { flex: 2, minWidth: 110 },
  colNota: { flex: 0.7, minWidth: 42, justifyContent: 'center', alignItems: 'center', paddingVertical: 2 },
  colSit: { flex: 1.3, minWidth: 82, justifyContent: 'center', alignItems: 'center', paddingVertical: 2 },
  row: { minHeight: 40 },
  materiaText: { fontSize: 11, color: '#2B2B2B' },
  gradeCell: { alignItems: 'center', justifyContent: 'center', minWidth: 34, minHeight: 30, borderRadius: 4, backgroundColor: 'rgba(230, 240, 250, 0.5)', paddingHorizontal: 4 },
  disabledCell: { backgroundColor: '#F5F5F5' },
  gradeText: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  sitText: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '75%', padding: 16, borderRadius: 12, backgroundColor: '#FFFFFF' },
  modalTitle: { fontSize: 16, fontWeight: '600', color: '#1F5FAF', textAlign: 'center', marginBottom: 12 },
  gradeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 },
  gradeChip: { minWidth: 42, height: 36, justifyContent: 'center', borderRadius: 6 },
  gradeChipGreen: { backgroundColor: '#E8F5E9' },
  gradeChipRed: { backgroundColor: '#FFEBEE' },
  gradeChipGray: { backgroundColor: '#F5F5F5' },
  gradeChipText: { fontSize: 14, fontWeight: '600', textAlign: 'center', marginHorizontal: 0, marginVertical: 0 },
  boletinButton: { marginTop: 16, marginBottom: 24, backgroundColor: '#1F5FAF', borderRadius: 8 },
  previewContainer: { flex: 1, backgroundColor: '#E9EEF5' },
  previewHeaderBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, paddingHorizontal: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#DDE3EA' },
  previewHeaderTitle: { fontSize: 16, fontWeight: '700', color: '#1F5FAF' },
  previewScroll: { flex: 1 },
  previewPage: { margin: 12, padding: 18, backgroundColor: '#FFFFFF', borderRadius: 4, minHeight: 720 },
  exactPreviewFrame: { width: '100%', height: 820, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DDE3EA', overflow: 'hidden' },
  previewSelectorBox: { marginBottom: 18, padding: 10, backgroundColor: '#F3F7FC', borderRadius: 8, borderWidth: 1, borderColor: '#D8E4F2' },
  previewSelectorTitle: { fontSize: 12, fontWeight: '700', color: '#1F5FAF', marginBottom: 6 },
  previewSelectorRow: { flexDirection: 'row', alignItems: 'center', minHeight: 36 },
  previewSelectorText: { flex: 1, fontSize: 12, color: '#2B2B2B' },
  previewInstitutionBlock: { alignItems: 'center', marginBottom: 8 },
  previewInstitution: { fontSize: 13, fontWeight: '700', color: '#111111', textAlign: 'center', letterSpacing: 0.4 },
  previewSmallText: { fontSize: 10, color: '#111111', textAlign: 'center', marginTop: 2 },
  previewDivider: { height: 1, backgroundColor: '#111111', marginVertical: 8 },
  previewTitle: { fontSize: 10, fontWeight: '700', color: '#111111', textAlign: 'center', marginBottom: 20 },
  previewAlumno: { fontSize: 11, fontWeight: '700', color: '#111111', marginBottom: 16 },
  previewCursoBlock: { marginBottom: 18 },
  previewCursoTitle: { fontSize: 11, fontWeight: '700', color: '#111111', marginBottom: 6 },
  previewTable: { minWidth: 680, backgroundColor: '#FFFFFF' },
  previewTableHeader: { minHeight: 28, borderBottomWidth: 1, borderBottomColor: '#111111' },
  previewTableHeaderText: { fontSize: 9, fontWeight: '700', color: '#111111', textAlign: 'center' },
  previewTableRow: { minHeight: 28, borderBottomWidth: 0 },
  previewColMateria: { flex: 2.6, minWidth: 170, justifyContent: 'center', alignItems: 'flex-start' },
  previewColNota: { flex: 0.7, minWidth: 58, justifyContent: 'center' },
  previewColSituacion: { flex: 1.2, minWidth: 88, justifyContent: 'center' },
  previewMateriaText: { fontSize: 9, color: '#111111', textAlign: 'left' },
  previewCellText: { fontSize: 9, color: '#111111', textAlign: 'center' },
  previewFooterSignatures: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 44 },
  previewSignature: { width: '38%', borderTopWidth: 1, borderTopColor: '#111111', paddingTop: 7, fontSize: 9, color: '#111111', textAlign: 'center' },
  previewActions: { flexDirection: 'row', gap: 10, padding: 12, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#DDE3EA' },
  previewActionButton: { flex: 1 },
});

export default CalificacionesScreen;
