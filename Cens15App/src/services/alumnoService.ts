import { apiFetch } from './api';

export type Genero = 'Varon' | 'Mujer';

export interface Alumno {
  id: number;
  nombres?: string | null;
  apellidos?: string | null;
  numeroDocumento?: string | null;
  fechaNacimiento?: string | null;
  genero?: Genero | null;
  domicilio?: string | null;
  datosNacimiento?: {
    localidad?: string | null;
    provincia?: string | null;
    pais?: string | null;
  } | null;
  contacto?: {
    telefonoAlumno?: string | null;
    email?: string | null;
    nombreEmergencia?: string | null;
    telefonoEmergencia?: string | null;
  } | null;
  inscripciones?: any[] | null;
}

export interface AlumnoInscripcion {
  id: number;
  alumnoId?: number;
  cursoId?: number;
  anio?: number;
  estado?: string | null;
  curso?: any;
}

export const getAlumnos = async (): Promise<Alumno[]> => {
  try {
    return await apiFetch('Alumnos');
  } catch (error: any) {
    console.error('Error al obtener alumnos:', error);
    throw error;
  }
};

export const getInscripcionesByAlumno = async (alumnoId: number): Promise<AlumnoInscripcion[]> => {
  try {
    return await apiFetch(`alumnos/${alumnoId}/inscripciones`);
  } catch (error: any) {
    console.error('Error al obtener inscripciones del alumno:', error);
    throw error;
  }
};

export interface CreateAlumnoRequest {
  nombres?: string | null;
  apellidos?: string | null;
  numeroDocumento?: string | null;
  fechaNacimiento?: string;
  genero?: Genero;
  domicilio?: string | null;
  datosNacimiento?: {
    localidad?: string | null;
    provincia?: string | null;
    pais?: string | null;
  };
  contacto?: {
    telefonoAlumno?: string | null;
    email?: string | null;
    nombreEmergencia?: string | null;
    telefonoEmergencia?: string | null;
  };
  documentos?: {
    tipoDocumentoAlumnoId: number;
    presentado: boolean;
    imagenUrl?: string | null;
  }[];
}

export const createAlumno = async (data: CreateAlumnoRequest) => {
  try {
    const response = await apiFetch('Alumnos', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    return response;
  } catch (error) {
    console.error('Error al crear alumno:', error);
    throw error;
  }
};
