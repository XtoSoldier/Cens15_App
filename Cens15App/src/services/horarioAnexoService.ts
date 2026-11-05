import { apiFetch } from './api';

export interface AnexoHorario {
  id: number;
  nombre: string;
}

export type DiaSemana = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';

export interface HorarioAnexo {
  id: number;
  diaSemana: DiaSemana;
  orden: number;
  tipo: 'Clase' | 'Receso';
  horaInicio: string;
  horaFin: string;
}

export const getAnexosHorarios = async (): Promise<AnexoHorario[]> =>
  apiFetch('Anexos', { method: 'GET' });

export const getHorariosAnexo = async (anexoId: number): Promise<HorarioAnexo[]> =>
  apiFetch(`anexos/${anexoId}/horarios`, { method: 'GET' });
