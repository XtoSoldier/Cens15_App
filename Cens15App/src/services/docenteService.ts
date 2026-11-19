import { apiFetch } from './api';
import type { CalificacionMetadata, EstadoMateria } from './calificacionService';

export interface DocenteMateriaDto {
  materiaId: number;
  materia: string;
  cursoId: number;
  curso: string;
  division: string;
  rol: string;
  activo?: boolean;
}

export interface DocenteDto {
  id: number;
  nombres: string;
  apellidos: string;
  email: string;
  userId: string | null;
  materias: DocenteMateriaDto[];
}

export interface AlumnoCalificacionSimpleDto extends CalificacionMetadata {
  alumnoId: number;
  inscripcionId: number;
  alumnoNombre: string;
  cursadaMateriaId: number;
  calificacionId: number | null;
  c1Promedio: number | null;
  c2Promedio: number | null;
  promedioAnual: number | null;
  recuperacionDiciembre: number | null;
  recuperacionMarzo: number | null;
  calificacionFinal: number | null;
  estado: number | EstadoMateria;
}

export interface DocenteMateriaConAlumnosDto {
  materiaId: number;
  materiaNombre: string;
  cursoId: number;
  cursoNombre: string;
  division: string;
  cursoLabel: string;
  anio: number;
  alumnos: AlumnoCalificacionSimpleDto[];
}

export const getDocentes = async (): Promise<DocenteDto[]> => {
  return await apiFetch('Docentes');
};

export const getDocenteByUserId = async (userId: string): Promise<DocenteDto | null> => {
  return await apiFetch(`Docentes/por-usuario/${encodeURIComponent(userId)}`);
};

export const getMiDocente = async (): Promise<DocenteDto> => {
  return await apiFetch('Docentes/mi-perfil');
};

export const getAlumnosParaCalificar = async (docenteId: number): Promise<DocenteMateriaConAlumnosDto[]> => {
  return await apiFetch(`Docentes/${docenteId}/alumnos-para-calificar`);
};

export const getMisAlumnosParaCalificar = async (): Promise<DocenteMateriaConAlumnosDto[]> => {
  return await apiFetch('Docentes/mis-alumnos-para-calificar');
};

export const getMateriasParaCalificar = async (): Promise<DocenteMateriaConAlumnosDto[]> => {
  return await apiFetch('Docentes/materias-para-calificar');
};
