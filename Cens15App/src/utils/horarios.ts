import type { AnexoHorario, DiaSemana, HorarioAnexo } from '../services/horarioAnexoService';
import type { Materia } from '../services/materiaService';

export const DIAS: { value: DiaSemana; label: string }[] = [
  { value: 'Monday', label: 'Lunes' },
  { value: 'Tuesday', label: 'Martes' },
  { value: 'Wednesday', label: 'Miercoles' },
  { value: 'Thursday', label: 'Jueves' },
  { value: 'Friday', label: 'Viernes' },
];

export const defaultAnexoId = (anexos: AnexoHorario[]): number | null =>
  anexos.find((anexo) => anexo.nombre.toLowerCase().replace(/[^a-z0-9]/g, '') === 'esc41')?.id ?? null;

export const subjectColor = (id: number) => {
  const hue = Math.round((id * 137.508) % 360);
  return { background: `hsl(${hue}, 52%, 91%)`, border: `hsl(${hue}, 38%, 76%)` };
};

export const dailyBlocks = (blocks: HorarioAnexo[], day: DiaSemana) => {
  let number = 0;
  return blocks.filter((block) => block.diaSemana === day).sort((a, b) => a.orden - b.orden)
    .map((block) => ({ ...block, label: block.tipo === 'Clase' ? `Hora ${++number}` : 'Receso' }));
};

export interface ScheduleRow {
  key: string;
  label: string;
  tipo: HorarioAnexo['tipo'];
  horaInicio: string;
  horaFin: string;
  blocks: Partial<Record<DiaSemana, HorarioAnexo>>;
}

export const weeklyRows = (blocks: HorarioAnexo[], days: DiaSemana[]): ScheduleRow[] => {
  const rows = new Map<string, ScheduleRow>();
  days.forEach((day) => dailyBlocks(blocks, day).forEach((block) => {
    const key = `${block.label}|${block.tipo}|${block.horaInicio}|${block.horaFin}`;
    if (!rows.has(key)) rows.set(key, { key, label: block.label, tipo: block.tipo,
      horaInicio: block.horaInicio, horaFin: block.horaFin, blocks: {} });
    rows.get(key)!.blocks[day] = block;
  }));
  return [...rows.values()].sort((a, b) => a.horaInicio.localeCompare(b.horaInicio)
    || a.horaFin.localeCompare(b.horaFin) || a.label.localeCompare(b.label, undefined, { numeric: true }));
};

export const courseOccupancy = (materias: Materia[], cursoId: number) => {
  const occupied = new Map<number, Materia>();
  materias.filter((materia) => materia.cursoId === cursoId).forEach((materia) => {
    (materia.horarios || []).forEach((block) => occupied.set(block.id, materia));
  });
  return occupied;
};

export const subjectPeriods = (materia: Materia, blocks: HorarioAnexo[]) => {
  const ids = new Set((materia.horarios || []).map((block) => block.id));
  return DIAS.flatMap((day) => dailyBlocks(blocks, day.value).filter((block) => ids.has(block.id))
    .map((block) => ({ ...block, dayLabel: day.label })));
};

export const teachers = (materia: Materia) => {
  const active = (materia.docentes || []).filter((docente) => docente.activo);
  return active.length ? active.map((docente) => `${docente.docente} (${docente.rol})`).join(', ') : 'Sin docente activo';
};
