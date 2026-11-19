const { test } = require('node:test');
const assert = require('node:assert/strict');
const { gradingScreen } = require('./gradingHelper.cjs');
const harness = gradingScreen('components/RecuperacionChoiceModal.tsx');
const { calculateGrades, editGrade, gradesFromCalificacion, buildSaveRequest, toGrade, normalizeEstado, GRADE_OPTIONS, changeGradeOrigin } = harness.load('utils/calificaciones.ts');
const R1 = 'RecuperaPrimerCuatrimestre', R2 = 'RecuperaSegundoCuatrimestre', BOTH = 'RecuperaAmbos';
const base = { c1: '', c2: '', diciembre: '', febrero: '', anual: '', final: '', estado: 'EnCurso' };

for (const [c1, c2, annual, state, needsChoice] of [
  ['5', '7', '6', 'Aprobado', false], ['7', '5', '6', R2, false], ['A', '8', '4', R1, false],
  ['A', 'A', '0', BOTH, false], ['6', 'S/C', '6', 'Aprobado', false], ['S/C', '8', '8', 'Aprobado', false],
  ['5', 'S/C', '5', 'EnCurso', true], ['S/C', 'A', '0', 'EnCurso', true],
  ['S/C', 'S/C', '', 'EnCurso', false], ['5', '', '', 'EnCurso', false], ['', '9', '', 'EnCurso', false],
  ['S/C', '', '', 'EnCurso', false], ['5.5', 'S/C', '5.5', 'EnCurso', true],
  ['5.5', '6', '6', R1, false],
]) test(`shared matrix ${c1 || 'blank'} / ${c2 || 'blank'}`, () => {
  const result = calculateGrades({ ...base, c1, c2 });
  assert.equal(result.anual, annual);
  assert.equal(result.estado, state);
  assert.equal(result.needsChoice, needsChoice);
  if (state !== 'Aprobado') assert.equal(result.final, '');
});

test('recovery uses 4, December priority, ceil only accepted exams, and retains explicit choice after passing', () => {
  const values = { ...base, c1: 'A', c2: 'S/C', recuperacionExcepcional: R2 };
  for (const [diciembre, febrero, final, state] of [['A', 'S/C', '', R2], ['3.9', '', '', R2], ['4.1', '9', '5', 'Aprobado'], ['S/C', '4', '4', 'Aprobado']]) {
    const result = calculateGrades({ ...values, diciembre, febrero });
    assert.equal(result.final, final);
    assert.equal(result.estado, state);
    assert.equal(result.recuperacionExcepcional, R2);
    assert.equal(result.needsChoice, false);
  }
});

test('choice survives reload and exam edits, clears outside exception, and quarter switch requires confirmation', () => {
  const source = { c1Promedio: 5, c1Condicion: 'Numerica', c2Promedio: null, c2Condicion: 'SinCalificar', recuperacionExcepcional: BOTH, estado: 4 };
  const loaded = gradesFromCalificacion(source);
  assert.equal(loaded.recuperacionExcepcional, BOTH);
  assert.equal(editGrade(loaded, 'diciembre', '6').needsChoice, false);
  assert.equal(editGrade(loaded, 'c1', '4').recuperacionExcepcional, BOTH);
  const cleared = editGrade(loaded, 'c1', 'S/C');
  assert.equal(cleared.recuperacionExcepcional, null);
  const switched = editGrade(cleared, 'c2', 'A');
  assert.equal(switched.needsChoice, true);
  assert.throws(() => buildSaveRequest(1, switched), /Confirm/);
  assert.equal(editGrade(loaded, 'c1', '6').recuperacionExcepcional, null);
});

test('A/SC/blank round trip keeps all conditions, six partials and decimals', () => {
  const source = { c1Nota1: 1.25, c1Nota2: 2.5, c1Nota3: null, c2Nota1: 8.1, c2Nota2: 9.2, c2Nota3: 10 };
  const values = { ...base, c1: 'A', c2: 'S/C', diciembre: 'S/C', febrero: '', recuperacionExcepcional: R1 };
  const payload = buildSaveRequest(42, values, source);
  assert.equal(payload.c1Promedio, 0);
  assert.equal(payload.c1Condicion, 'Ausente');
  assert.equal(payload.c2Promedio, null);
  assert.equal(payload.c2Condicion, 'SinCalificar');
  assert.equal(payload.diciembreCondicion, 'SinCalificar');
  assert.equal(payload.marzoCondicion, 'Numerica');
  for (const key of Object.keys(source)) assert.equal(payload[key], source[key]);
  const loaded = gradesFromCalificacion(payload);
  assert.equal(loaded.c1, 'A'); assert.equal(loaded.c2, 'S/C'); assert.equal(loaded.febrero, '');
  assert.equal(toGrade(7.35), '7.35');
  const decimal = buildSaveRequest(42, { ...base, c1: '7.35', c2: '6.25', diciembre: '3.75' }, source);
  assert.equal(decimal.c1Promedio, 7.35); assert.equal(decimal.c2Promedio, 6.25); assert.equal(decimal.recuperacionDiciembre, 3.75);
  assert.equal(GRADE_OPTIONS.includes('0'), false);
});

test('legacy manual AP/APE representation stays numeric and preserves annual/final and state', () => {
  const legacy = gradesFromCalificacion({ estado: 1, promedioAnual: 8.5, calificacionFinal: 9.25 });
  const payload = buildSaveRequest(1, legacy);
  assert.equal(payload.estado, 'Aprobado');
  assert.equal(payload.promedioAnual, 8.5); assert.equal(payload.calificacionFinal, 9.25);
  assert.equal(payload.c1Condicion, 'Numerica'); assert.equal(payload.recuperacionExcepcional, null);
  assert.equal(normalizeEstado(3), R2); assert.equal(normalizeEstado(R1), R1);
  const cleared = editGrade({ ...base, c1: '8', anual: '8', final: '8', estado: 'Aprobado' }, 'c1', '');
  assert.equal(cleared.estado, 'EnCurso'); assert.equal(cleared.final, '');
});

test('equivalence requires a trimmed disposition, enum 5 reloads, and no artificial numeric approval is emitted', () => {
  assert.equal(normalizeEstado(5), 'AprobadoPorEquivalencia');
  const source = { estado: 5, desdePase: true, disposicionEquivalencia: '  Res. <42>  ', c1Promedio: 5.35, c2Condicion: 'SinCalificar', recuperacionDiciembre: 3.75,
    c1Nota1: 1.25, c1Nota2: 2.5, c1Nota3: null, c2Nota1: 8.1, c2Nota2: 9.2, c2Nota3: 10, promedioAnual: 6, calificacionFinal: 6 };
  const values = gradesFromCalificacion(source);
  const body = buildSaveRequest(42, values, source);
  assert.equal(body.estado, 'AprobadoPorEquivalencia');
  assert.equal(body.promedioAnual, null);
  assert.equal(body.calificacionFinal, null);
  assert.equal(body.desdePase, false);
  assert.equal(body.disposicionEquivalencia, 'Res. <42>');
  assert.equal(body.c1Promedio, 5.35);
  assert.equal(body.c2Condicion, 'SinCalificar');
  assert.equal(body.recuperacionDiciembre, 3.75);
  for (const key of ['c1Nota1', 'c1Nota2', 'c1Nota3', 'c2Nota1', 'c2Nota2', 'c2Nota3']) assert.equal(body[key], source[key]);
  assert.throws(() => buildSaveRequest(42, changeGradeOrigin(values, 'Equivalencia', ' \n '), source), /obligatoria/);
  assert.equal(gradesFromCalificacion({ estado: 1 }).estado, 'Aprobado');
});

test('removing equivalence defers exceptional recovery and retains the raw grades and exams', () => {
  const ae = changeGradeOrigin({ ...base, c1: '5', c2: 'S/C', diciembre: 'A', febrero: '3.5' }, 'Equivalencia', '42');
  for (const origin of ['Normal', 'Pase']) {
    const draft = changeGradeOrigin(ae, origin);
    assert.equal(draft.needsChoice, true);
    assert.equal(draft.c1, '5'); assert.equal(draft.c2, 'S/C');
    assert.equal(draft.diciembre, 'A'); assert.equal(draft.febrero, '3.5');
    assert.equal(draft.disposicionEquivalencia, null);
    assert.equal(draft.desdePase, origin === 'Pase');
    assert.throws(() => buildSaveRequest(1, draft), /Confirm/);
    assert.equal(buildSaveRequest(1, { ...draft, recuperacionExcepcional: BOTH }).estado, BOTH);
  }
  assert.equal(ae.estado, 'AprobadoPorEquivalencia');
  assert.throws(() => changeGradeOrigin(ae, 'Forged'), /inválido/);
});

test('Pase is metadata, keeps numeric calculations and survives reload and unrelated edits', () => {
  for (const values of [{ ...base, c1: 'A', c2: '8', diciembre: '4' }, { ...base, c1: '6.35', c2: 'S/C' }, { ...base, c1: '7', c2: '5', febrero: '4' }]) {
    const normal = calculateGrades(values);
    const pase = changeGradeOrigin(values, 'Pase');
    for (const key of ['anual', 'final', 'estado', 'c1', 'c2', 'diciembre', 'febrero']) assert.equal(pase[key], normal[key]);
    const body = buildSaveRequest(1, pase);
    assert.equal(body.desdePase, true);
    assert.equal(body.disposicionEquivalencia, null);
    const reloaded = gradesFromCalificacion(body);
    assert.equal(editGrade(reloaded, 'diciembre', '4').desdePase, true);
    assert.equal(buildSaveRequest(1, changeGradeOrigin(reloaded, 'Normal')).desdePase, false);
  }
});
