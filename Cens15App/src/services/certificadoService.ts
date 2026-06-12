import { apiFetch } from './api';

export interface CertificadoTemplate {
  id: number;
  nombre: string;
  descripcion?: string | null;
  contenidoHtml: string;
  formato: string;
  margenSuperior: number;
  margenInferior: number;
  margenIzquierdo: number;
  margenDerecho: number;
  imagenesJson?: string | null;
}

export interface RenderedCertificadoTemplate {
  templateId: number;
  alumnoId: number;
  nombre: string;
  html: string;
  formato: string;
  margenSuperior: number;
  margenInferior: number;
  margenIzquierdo: number;
  margenDerecho: number;
  imagenesJson?: string | null;
}

export const getCertificadoTemplates = async (): Promise<CertificadoTemplate[]> => {
  return await apiFetch('Certificados');
};

export const renderCertificadoForAlumno = async (
  templateId: number,
  alumnoId: number,
  inscripcionIds: number[]
): Promise<RenderedCertificadoTemplate> => {
  const query = inscripcionIds.length > 0 ? `?inscripcionIds=${inscripcionIds.join(',')}` : '';
  return await apiFetch(`Certificados/${templateId}/render/alumno/${alumnoId}${query}`);
};
