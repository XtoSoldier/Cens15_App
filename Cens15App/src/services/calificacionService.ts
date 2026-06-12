import { apiFetch, getApiBaseUrl } from './api';
import { getToken } from '../utils/storage';

export type EstadoMateria = 'EnCurso' | 'Aprobado' | 'RecuperaPrimerCuatrimestre' | 'RecuperaSegundoCuatrimestre' | 'RecuperaAmbos';

export interface Calificacion {
  id: number;
  cursadaMateriaId: number;
  materiaNombre: string;
  c1Promedio?: number | null;
  c2Promedio?: number | null;
  promedioAnual?: number | null;
  recuperacionDiciembre?: number | null;
  recuperacionMarzo?: number | null;
  calificacionFinal?: number | null;
  estado: EstadoMateria;
}

export interface SaveCalificacionRequest {
  cursadaMateriaId: number;
  c1Nota1?: number | null;
  c1Nota2?: number | null;
  c1Nota3?: number | null;
  c1Promedio?: number | null;
  c2Nota1?: number | null;
  c2Nota2?: number | null;
  c2Nota3?: number | null;
  c2Promedio?: number | null;
  promedioAnual?: number | null;
  recuperacionDiciembre?: number | null;
  recuperacionMarzo?: number | null;
  calificacionFinal?: number | null;
  estado: EstadoMateria;
}

export const getCalificacionByCursada = async (cursadaMateriaId: number): Promise<Calificacion | null> => {
  const token = await getToken();
  const response = await fetch(`${getApiBaseUrl()}/cursadas-materias/${cursadaMateriaId}/calificacion`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Error al obtener calificación');
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
};

export const createCalificacion = async (data: SaveCalificacionRequest): Promise<Calificacion> => {
  return await apiFetch('Calificaciones', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateCalificacion = async (id: number, data: SaveCalificacionRequest) => {
  return await apiFetch(`Calificaciones/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};
