import { apiFetch } from './api';

export interface CreateInscripcionRequest {
  alumnoId: number;
  cursoId: number;
  anio: number;
}

export const deleteInscripcion = async (id: number) => {
  return await apiFetch(`Inscripciones/${id}`, {
    method: 'DELETE',
  });
};

export const createInscripcion = async (data: CreateInscripcionRequest) => {
  return await apiFetch('Inscripciones', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};
