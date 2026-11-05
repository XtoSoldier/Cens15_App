import type { CalificacionMetadata, CondicionNota, EstadoMateria, RecuperacionExcepcional, SaveCalificacionRequest } from '../services/calificacionService';

export type Grado = `${number}` | 'A' | 'S/C' | '';
export type GradeField = 'c1' | 'c2' | 'diciembre' | 'febrero';
export const GRADE_OPTIONS: Grado[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'A', 'S/C'];
export const GRADE_LEGEND = 'A = Ausente (cuenta 0), S/C = Sin Calificar (no promedia)';
export const gradeLabel = (g: Grado): string => g === 'A' ? 'Ausente (cuenta 0)' : g === 'S/C' ? 'Sin Calificar (no promedia)' : g || 'Pendiente';

export interface GradeValues {
  c1: Grado;
  c2: Grado;
  diciembre: Grado;
  febrero: Grado;
  anual: Grado;
  final: Grado;
  recuperacionExcepcional?: RecuperacionExcepcional | null;
  estado?: EstadoMateria;
}

export const toGrade = (value?: number | null, condition?: CondicionNota): Grado => {
  if (condition === 'Ausente') return 'A';
  if (condition === 'SinCalificar') return 'S/C';
  return value != null && Number.isFinite(value) && value >= 0 && value <= 10 ? String(value) as Grado : '';
};
export const toNumber = (g: Grado): number | null => g === 'A' ? 0 : g === '' || g === 'S/C' ? null : Number(g);
export const conditionFromGrade = (g: Grado): CondicionNota => g === 'A' ? 'Ausente' : g === 'S/C' ? 'SinCalificar' : 'Numerica';
export const normalizeEstado = (estado?: EstadoMateria | number): EstadoMateria => typeof estado === 'number'
  ? (['EnCurso', 'Aprobado', 'RecuperaPrimerCuatrimestre', 'RecuperaSegundoCuatrimestre', 'RecuperaAmbos'] as const)[estado] || 'EnCurso'
  : estado || 'EnCurso';

export const isLegacy = (v: GradeValues) => v.c1 === '' && v.c2 === '' && v.diciembre === '' && v.febrero === '';
export const exceptionalQuarter = (v: GradeValues): 1 | 2 | null => {
  if (v.c2 === 'S/C' && toNumber(v.c1) !== null && toNumber(v.c1)! < 6) return 1;
  if (v.c1 === 'S/C' && toNumber(v.c2) !== null && toNumber(v.c2)! < 6) return 2;
  return null;
};
export const suggestedRecovery = (v: GradeValues): RecuperacionExcepcional => exceptionalQuarter(v) === 2 ? 'RecuperaSegundoCuatrimestre' : 'RecuperaPrimerCuatrimestre';

export function calculateGrades(v: GradeValues) {
  const c1 = toNumber(v.c1), c2 = toNumber(v.c2);
  const quarter = exceptionalQuarter(v);
  const choice = quarter ? v.recuperacionExcepcional ?? null : null;
  let anual: Grado = '', final: Grado = '', estado: EstadoMateria = 'EnCurso';
  if (isLegacy(v)) {
    return { ...v, recuperacionExcepcional: null, estado: v.estado || 'EnCurso', needsChoice: false };
  }
  const both = c1 !== null && c2 !== null;
  const single = (c1 !== null && v.c2 === 'S/C') || (c2 !== null && v.c1 === 'S/C');
  if (both || single) {
    const average = both ? (c1! + c2!) / 2 : (c1 ?? c2)!;
    anual = String(both ? Math.ceil(average) : average) as Grado;
    if (both ? c2! >= 6 && average >= 6 : average >= 6) {
      estado = 'Aprobado';
      final = anual;
    } else {
      estado = single ? choice || 'EnCurso' : c1! < 6 && c2! < 6 ? 'RecuperaAmbos' : c1! < 6 ? 'RecuperaPrimerCuatrimestre' : 'RecuperaSegundoCuatrimestre';
      const diciembre = toNumber(v.diciembre), marzo = toNumber(v.febrero);
      const accepted = diciembre !== null && diciembre >= 4 ? diciembre : marzo !== null && marzo >= 4 ? marzo : null;
      if (accepted !== null) {
        final = String(Math.ceil(accepted)) as Grado;
        estado = 'Aprobado';
      }
    }
  }
  return { ...v, anual, final, estado, recuperacionExcepcional: choice, needsChoice: quarter !== null && choice === null };
}

export function editGrade<T extends GradeValues>(base: T, field: GradeField, grade: Grado) {
  const next = { ...base, [field]: grade };
  if (exceptionalQuarter(base) !== exceptionalQuarter(next)) next.recuperacionExcepcional = null;
  if (!isLegacy(base) && isLegacy(next)) {
    next.anual = '';
    next.final = '';
    next.estado = 'EnCurso';
  }
  return { ...next, ...calculateGrades(next) };
}

interface GradeSource extends CalificacionMetadata {
  c1Promedio?: number | null;
  c2Promedio?: number | null;
  promedioAnual?: number | null;
  recuperacionDiciembre?: number | null;
  recuperacionMarzo?: number | null;
  calificacionFinal?: number | null;
  estado?: EstadoMateria | number;
}
export function gradesFromCalificacion(source?: GradeSource | null) {
  return calculateGrades({
    c1: toGrade(source?.c1Promedio, source?.c1Condicion),
    c2: toGrade(source?.c2Promedio, source?.c2Condicion),
    diciembre: toGrade(source?.recuperacionDiciembre, source?.diciembreCondicion),
    febrero: toGrade(source?.recuperacionMarzo, source?.marzoCondicion),
    anual: toGrade(source?.promedioAnual), final: toGrade(source?.calificacionFinal),
    recuperacionExcepcional: source?.recuperacionExcepcional,
    estado: normalizeEstado(source?.estado),
  });
}

export function buildSaveRequest(cursadaMateriaId: number, values: GradeValues, source?: CalificacionMetadata | null): SaveCalificacionRequest {
  const v = calculateGrades(values);
  if (v.needsChoice) throw new Error('Confirmá qué cuatrimestre(s) recuperar antes de guardar.');
  return {
    cursadaMateriaId,
    c1Nota1: source?.c1Nota1, c1Nota2: source?.c1Nota2, c1Nota3: source?.c1Nota3,
    c2Nota1: source?.c2Nota1, c2Nota2: source?.c2Nota2, c2Nota3: source?.c2Nota3,
    c1Promedio: toNumber(v.c1), c1Condicion: conditionFromGrade(v.c1),
    c2Promedio: toNumber(v.c2), c2Condicion: conditionFromGrade(v.c2),
    recuperacionDiciembre: toNumber(v.diciembre), diciembreCondicion: conditionFromGrade(v.diciembre),
    recuperacionMarzo: toNumber(v.febrero), marzoCondicion: conditionFromGrade(v.febrero),
    promedioAnual: toNumber(v.anual), calificacionFinal: toNumber(v.final),
    estado: v.estado, recuperacionExcepcional: v.recuperacionExcepcional,
  };
}
