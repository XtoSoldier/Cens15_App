// Date-only values stay in local calendar time, not UTC.
export const alumnoDateValue = (value: string | Date | null | undefined): string => {
  if (!value) return '';
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) return '';
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }
  const input = value.trim();
  const parts = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(input);
  const date = parts ? `${parts[3]}-${parts[2]}-${parts[1]}` : input.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return '';
  const parsed = new Date(`${date}T00:00:00`);
  return Number.isFinite(parsed.getTime()) && alumnoDateValue(parsed) === date ? date : '';
};

export const nullableAlumnoFields = (dni: string, fechaNacimiento: string | Date | null, genero: string): {
  numeroDocumento: string | null;
  fechaNacimiento: string | null;
  genero: 'Varon' | 'Mujer' | null;
} => ({
  numeroDocumento: dni.trim() || null,
  fechaNacimiento: alumnoDateValue(fechaNacimiento) || null,
  genero: genero === 'Varon' || genero === 'Mujer' ? genero : null,
});
