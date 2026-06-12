import { apiFetch } from './api';

export interface MateriaDocente {
  docenteId: number;
  docente: string;
  rol: string;
}

export interface Materia {
  id: number;
  nombre: string;
  cursoId: number;
  curso: string;
  division: string;
  docentes: MateriaDocente[];
}

export const getMaterias = async (): Promise<Materia[]> => {
  return await apiFetch('Materias');
};
