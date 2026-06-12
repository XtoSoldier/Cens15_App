import env from './env';
import { apiFetch, getApiBaseUrl } from './api';
import { getToken } from '../utils/storage';

export interface TipoDocumentoAlumno {
  id: number;
  nombre: string;
}

export interface AlumnoDocumento {
  id: number;
  alumnoId: number;
  tipoDocumentoAlumnoId: number;
  presentado: boolean;
  imagenUrl?: string | null;
  imagenesUrl?: string[] | null;
  tipoDocumentoAlumno?: TipoDocumentoAlumno | null;
}

export interface DocumentoImageAsset {
  uri: string;
  name?: string;
  type?: string;
  file?: File;
}

export const getTiposDocumentoAlumno = async (): Promise<TipoDocumentoAlumno[]> => {
  return await apiFetch('TiposDocumentoAlumno');
};

export const getAlumnoDocumentos = async (alumnoId: number): Promise<AlumnoDocumento[]> => {
  return await apiFetch(`AlumnoDocumentos?alumnoId=${alumnoId}`);
};

export const createAlumnoDocumento = async (data: {
  alumnoId: number;
  tipoDocumentoAlumnoId: number;
  presentado: boolean;
  imagenUrl?: string | null;
}) => {
  return await apiFetch('AlumnoDocumentos', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

const appendFiles = (formData: FormData, files: DocumentoImageAsset[]) => {
  files.slice(0, 2).forEach((file, index) => {
    const name = file.name || `documento_${index + 1}`;

    if (file.file) {
      formData.append('imagenes', file.file, name);
      return;
    }

    formData.append('imagenes', {
      uri: file.uri,
      name,
      type: file.type || 'application/octet-stream',
    } as any);
  });
};

const uploadDocumento = async (endpoint: string, formData: FormData) => {
  const token = await getToken();
  const response = await fetch(`${getApiBaseUrl()}/${endpoint}`, {
    method: /^AlumnoDocumentos\/\d+\/upload$/i.test(endpoint) ? 'PUT' : 'POST',
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Error al subir documentación');
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
};

export const uploadAlumnoDocumento = async (data: {
  alumnoId: number;
  tipoDocumentoAlumnoId: number;
  presentado: boolean;
  files: DocumentoImageAsset[];
}) => {
  const formData = new FormData();
  formData.append('alumnoId', String(data.alumnoId));
  formData.append('tipoDocumentoAlumnoId', String(data.tipoDocumentoAlumnoId));
  formData.append('presentado', String(data.presentado));
  appendFiles(formData, data.files);

  return await uploadDocumento('AlumnoDocumentos/upload', formData);
};

export const updateAlumnoDocumentoUpload = async (data: {
  id: number;
  tipoDocumentoAlumnoId: number;
  presentado: boolean;
  files: DocumentoImageAsset[];
}) => {
  const formData = new FormData();
  formData.append('tipoDocumentoAlumnoId', String(data.tipoDocumentoAlumnoId));
  formData.append('presentado', String(data.presentado));
  appendFiles(formData, data.files);

  return await uploadDocumento(`AlumnoDocumentos/${data.id}/upload`, formData);
};

export const deleteAlumnoDocumento = async (id: number) => {
  return await apiFetch(`AlumnoDocumentos/${id}`, {
    method: 'DELETE',
  });
};

export const getDocumentoImages = (documento: AlumnoDocumento) => {
  if (documento.imagenesUrl && documento.imagenesUrl.length > 0) return documento.imagenesUrl;
  if (documento.imagenUrl) return [documento.imagenUrl];
  return [];
};

export const resolveStaticUrl = (url: string) => {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const apiBase = getApiBaseUrl().replace(/\/api\/?$/i, '');
  return `${apiBase}${url.startsWith('/') ? '' : '/'}${url}`;
};

export const isPdfUrl = (url: string) => url.toLowerCase().split('?')[0].endsWith('.pdf');
