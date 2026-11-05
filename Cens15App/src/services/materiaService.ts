import { apiFetch } from './api';
import type { HorarioAnexo } from './horarioAnexoService';

export interface MateriaDocente {
  docenteId: number;
  docente: string;
  rol: string;
  activo: boolean;
}

export interface Materia {
  id: number;
  nombre: string;
  cursoId: number;
  curso: string;
  division: string;
  docentes: MateriaDocente[];
  cargaHoraria: number;
  horarios: HorarioAnexo[];
}

export const getMaterias = async (): Promise<Materia[]> => {
  return await apiFetch('Materias');
};
