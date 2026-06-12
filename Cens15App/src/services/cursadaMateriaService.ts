import { apiFetch } from './api';

export interface CursadaMateria {
  id: number;
  inscripcionId: number;
  materiaId: number;
  materiaNombre: string;
}

export const getCursadasByInscripcion = async (inscripcionId: number): Promise<CursadaMateria[]> => {
  return await apiFetch(`inscripciones/${inscripcionId}/cursadas-materias`);
};

export const createCursadaMateria = async (data: { inscripcionId: number; materiaId: number }) => {
  return await apiFetch('CursadasMaterias', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};
