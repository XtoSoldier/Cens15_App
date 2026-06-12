import { apiFetch } from './api';

export interface Curso {
  id: number;
  curso: string;
  division: string;
  id_orientacion: number;
  id_anexo: number;
  orientacionNombreCorto: string;
  anexoNombre: string;
  semipresencial: boolean;
}

const normalizeCurso = (item: any): Curso => ({
  id: Number(item.id ?? item.Id),
  curso: String(item.curso ?? item.Curso ?? item.cursoNombre ?? item.CursoNombre ?? ''),
  division: String(item.division ?? item.Division ?? ''),
  id_orientacion: Number(item.id_orientacion ?? item.IdOrientacion ?? item.orientacionId ?? item.OrientacionId ?? 0),
  id_anexo: Number(item.id_anexo ?? item.IdAnexo ?? item.anexoId ?? item.AnexoId ?? 0),
  orientacionNombreCorto: String(item.orientacionNombreCorto ?? item.OrientacionNombreCorto ?? item.orientacionNombre ?? item.OrientacionNombre ?? ''),
  anexoNombre: String(item.anexoNombre ?? item.AnexoNombre ?? ''),
  semipresencial: Boolean(item.semipresencial ?? item.Semipresencial ?? false),
});

export const getCursos = async (): Promise<Curso[]> => {
  try {
    const data = await apiFetch('Cursos');
    const items = Array.isArray(data) ? data : Array.isArray(data?.value) ? data.value : [];
    return items.map(normalizeCurso).filter((curso: Curso) => curso.id > 0);
  } catch (error) {
    console.error('Error al obtener cursos:', error);
    throw error;
  }
};
