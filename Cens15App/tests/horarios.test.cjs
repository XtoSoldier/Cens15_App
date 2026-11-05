const { test } = require('node:test');
const assert = require('node:assert/strict');
const { defaultAnexoId, dailyBlocks, weeklyRows, courseOccupancy, subjectPeriods, subjectColor, teachers } = require('../src/utils/horarios.ts');

const blocks = [
  { id: 1, diaSemana: 'Monday', orden: 1, tipo: 'Clase', horaInicio: '19:10:00', horaFin: '19:50:00' },
  { id: 2, diaSemana: 'Monday', orden: 2, tipo: 'Receso', horaInicio: '19:50:00', horaFin: '20:00:00' },
  { id: 3, diaSemana: 'Monday', orden: 3, tipo: 'Clase', horaInicio: '20:00:00', horaFin: '20:40:00' },
  { id: 4, diaSemana: 'Tuesday', orden: 1, tipo: 'Clase', horaInicio: '19:10:00', horaFin: '19:50:00' },
];

test('ESC. 41 is the default annex without selecting an unrelated one', () => {
  assert.equal(defaultAnexoId([{ id: 3, nombre: 'Otro' }, { id: 9, nombre: 'Esc. 41' }]), 9);
  assert.equal(defaultAnexoId([{ id: 3, nombre: 'ESC 410' }]), null);
});

test('class numbering excludes breaks and restarts each day', () => {
  assert.deepEqual(dailyBlocks([...blocks].reverse(), 'Monday').map((block) => block.label), ['Hora 1', 'Receso', 'Hora 2']);
  assert.equal(dailyBlocks(blocks, 'Tuesday')[0].label, 'Hora 1');
});

test('shared index aligns matching periods without inventing periods on other days', () => {
  const rows = weeklyRows(blocks, ['Monday', 'Tuesday']);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].blocks.Monday.id, 1);
  assert.equal(rows[0].blocks.Tuesday.id, 4);
  assert.equal(rows[1].blocks.Tuesday, undefined);
  assert.equal(weeklyRows(blocks, ['Tuesday']).length, 1);
  const different = weeklyRows([blocks[0], { ...blocks[3], horaInicio: '18:00:00', horaFin: '18:40:00' }], ['Monday', 'Tuesday']);
  assert.equal(different.length, 2);
  assert.equal(different[0].blocks.Monday, undefined);
});

test('subjects remain segregated by course even when they share a period', () => {
  const materias = [
    { id: 1, cursoId: 10, nombre: 'Matematica', horarios: [blocks[0]] },
    { id: 2, cursoId: 20, nombre: 'Historia', horarios: [blocks[0]] },
  ];
  assert.equal(courseOccupancy(materias, 10).get(1).nombre, 'Matematica');
  assert.equal(courseOccupancy(materias, 20).get(1).nombre, 'Historia');
});

test('subject detail includes all days regardless of the view filter', () => {
  const periods = subjectPeriods({ horarios: [blocks[3], blocks[0]] }, blocks);
  assert.deepEqual(periods.map((block) => [block.dayLabel, block.label]), [['Lunes', 'Hora 1'], ['Martes', 'Hora 1']]);
});

test('pastel colors are stable and match the admin formula', () => {
  assert.deepEqual(subjectColor(15), subjectColor(15));
  assert.notDeepEqual(subjectColor(15), subjectColor(16));
  assert.match(subjectColor(15).background, /52%, 91%/);
});

test('only active teachers are shown in the schedule', () => {
  assert.equal(teachers({ docentes: [
    { docente: 'Titular', rol: 'Titular', activo: false },
    { docente: 'Suplente', rol: 'Suplente', activo: true },
  ] }), 'Suplente (Suplente)');
  assert.equal(teachers({ docentes: [] }), 'Sin docente activo');
});
