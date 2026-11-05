const { test } = require('node:test');
const assert = require('node:assert/strict');
const { gradingScreen, nodes, named, settle } = require('./gradingHelper.cjs');
const R1 = 'RecuperaPrimerCuatrimestre', R2 = 'RecuperaSegundoCuatrimestre', BOTH = 'RecuperaAmbos';

function fixture(kind, initial = {}, options = {}) {
  const records = [1, ...(options.twoRows ? [2] : [])].map(id => ({
    id, cursadaMateriaId: id, materiaNombre: 'Historia', alumnoId: id, alumnoNombre: `Alumno ${id}`, calificacionId: id,
    c1Promedio: 5, c2Promedio: null, c1Condicion: 'Numerica', c2Condicion: 'Numerica',
    c1Nota1: 5.25, c1Nota2: 4.75, c1Nota3: 5.5, c2Nota1: 1.1, c2Nota2: 2.2, c2Nota3: 3.3,
    recuperacionDiciembre: null, recuperacionMarzo: null, promedioAnual: null, calificacionFinal: null,
    estado: kind === 'docente' ? 0 : 'EnCurso', ...initial,
  }));
  const writes = [];
  const waiting = [];
  let fail = false;
  const mocks = {
    '../services/calificacionService': {
      getCalificacionByCursada: async id => records.find(r => r.cursadaMateriaId === id),
      updateCalificacion: async (id, body) => {
        writes.push({ id, ...body });
        if (fail) throw new Error('Error de prueba al guardar');
        if (options.deferred) await new Promise(resolve => waiting.push({ id, resolve }));
        Object.assign(records.find(r => r.id === id), body);
        // PUT deliberately has no response body.
      },
      createCalificacion: async body => { writes.push(body); return { ...body, id: 99 }; },
    },
    '../services/docenteService': {
      getDocenteByUserId: async () => ({ apellidos: 'Docente', nombres: 'Prueba' }),
      getMisAlumnosParaCalificar: async () => [{ materiaId: 1, materiaNombre: 'Historia', cursoLabel: '1A', anio: 2026, alumnos: records }],
    },
    '../services/alumnoService': { getInscripcionesByAlumno: async () => [{ id: 10, cursoId: 20, anio: 2026 }] },
    '../services/cursoService': { getCursos: async () => [{ id: 20, curso: '1', division: 'A' }] },
    '../services/materiaService': { getMaterias: async () => records.map(r => ({ id: r.id, cursoId: 20 })) },
    '../services/cursadaMateriaService': {
      getCursadasByInscripcion: async () => records.map(r => ({ id: r.id, materiaId: r.id, materiaNombre: r.materiaNombre })),
      createCursadaMateria: async () => { throw new Error('Tests must not create enrollment'); },
    },
    '../services/certificadoService': {},
  };
  const harness = gradingScreen(`screens/${kind === 'docente' ? 'DocenteCalificarScreen' : 'CalificacionesScreen'}.tsx`, mocks, { alumno: { id: 1 } });
  async function open() {
    harness.render();
    await settle();
    let tree = harness.render();
    if (kind === 'docente') {
      nodes(tree).find(n => n.type === 'TouchableOpacity' && n.props.onPress).props.onPress();
      tree = harness.render();
    }
    return tree;
  }
  function select(field, grade, row = 0) {
    const tree = harness.render();
    const cells = nodes(tree).filter(n => n.type === 'TouchableOpacity' && n.props.accessibilityLabel);
    const fieldIndex = ['c1', 'c2', 'anual', 'diciembre', 'febrero', 'final'].indexOf(field);
    const cell = cells[row * 6 + fieldIndex];
    assert.ok(cell && !cell.props.disabled, `editable ${field}`);
    cell.props.onPress();
    named(harness.render(), 'GradePickerModal').props.onSelect(grade);
    return harness.render();
  }
  return { harness, open, select, records, writes, waiting, setFail: () => { fail = true; } };
}

for (const kind of ['admin', 'docente']) {
  test(`${kind}: rare draft cancellation performs no writes, confirmation saves choice, recovery preserves it`, async () => {
    const f = fixture(kind);
    await f.open();
    let tree = f.select('c2', 'S/C');
    let modal = named(tree, 'RecuperacionChoiceModal');
    assert.ok(modal);
    assert.equal(modal.props.suggested, R1);
    assert.equal(f.writes.length, 0);
    modal.props.onCancel();
    assert.equal(named(f.harness.render(), 'RecuperacionChoiceModal'), undefined);
    assert.equal(f.records[0].c2Condicion, 'Numerica');
    assert.equal(f.writes.length, 0);

    tree = f.select('c2', 'S/C');
    named(tree, 'RecuperacionChoiceModal').props.onConfirm(BOTH);
    await settle();
    assert.equal(f.writes.length, 1);
    assert.equal(f.writes[0].c2Condicion, 'SinCalificar');
    assert.equal(f.writes[0].estado, BOTH);
    assert.equal(f.writes[0].recuperacionExcepcional, BOTH);
    assert.equal(f.writes[0].c1Nota1, 5.25);
    assert.equal(f.writes[0].c2Nota3, 3.3);

    tree = f.select('diciembre', 'A');
    assert.equal(named(tree, 'RecuperacionChoiceModal'), undefined);
    await settle();
    assert.equal(f.writes[1].recuperacionDiciembre, 0);
    assert.equal(f.writes[1].diciembreCondicion, 'Ausente');
    assert.equal(f.writes[1].recuperacionExcepcional, BOTH);
    f.select('diciembre', '4');
    await settle();
    assert.equal(f.writes[2].estado, 'Aprobado');
    assert.equal(f.writes[2].calificacionFinal, 4);
    assert.equal(f.writes[2].recuperacionExcepcional, BOTH);

    const reload = fixture(kind, f.records[0]);
    await reload.open();
    tree = reload.select('diciembre', '5');
    assert.equal(named(tree, 'RecuperacionChoiceModal'), undefined);
    await settle();
    assert.equal(reload.writes[0].estado, 'Aprobado');
    assert.equal(reload.writes[0].recuperacionExcepcional, BOTH);
  });

  test(`${kind}: A + SC confirms explicitly, remains visible after reload, and decimal fields survive unrelated save`, async () => {
    const f = fixture(kind, { c1Promedio: 0, c1Condicion: 'Ausente' });
    await f.open();
    const tree = f.select('c2', 'S/C');
    named(tree, 'RecuperacionChoiceModal').props.onConfirm(R2);
    await settle();
    assert.equal(f.writes[0].c1Promedio, 0);
    assert.equal(f.writes[0].c1Condicion, 'Ausente');
    assert.equal(f.writes[0].promedioAnual, 0);
    const reload = fixture(kind, f.records[0]);
    const reloadedTree = await reload.open();
    assert.ok(nodes(reloadedTree).some(n => n.props.accessibilityLabel === 'Ausente (cuenta 0)'));
    assert.ok(nodes(reloadedTree).some(n => n.props.accessibilityLabel === 'Sin Calificar (no promedia)'));
    const decimals = fixture(kind, { c1Promedio: 5.35, c2Promedio: 5.75 });
    await decimals.open();
    decimals.select('diciembre', 'A');
    await settle();
    assert.equal(decimals.writes[0].c1Promedio, 5.35);
    assert.equal(decimals.writes[0].c2Promedio, 5.75);
  });

  test(`${kind}: failed save shows inline web error and leaves previous grades intact`, async () => {
    const f = fixture(kind);
    await f.open();
    f.setFail();
    f.select('c1', 'A');
    await settle();
    const tree = f.harness.render();
    assert.ok(nodes(tree).some(n => n.type === 'Text' && n.children.includes('Error de prueba al guardar')));
    assert.equal(f.records[0].c1Promedio, 5);
    assert.equal(named(tree, 'GradePickerModal').props.visible, false);
  });

  test(`${kind}: switching the counted quarter discards the old choice and prompts with the new default`, async () => {
    const f = fixture(kind, { c2Condicion: 'SinCalificar', recuperacionExcepcional: BOTH });
    await f.open();
    f.select('c1', 'S/C');
    await settle();
    assert.equal(f.writes[0].recuperacionExcepcional, null);
    assert.equal(f.writes[0].promedioAnual, null);
    assert.equal(f.writes[0].estado, 'EnCurso');
    const tree = f.select('c2', 'A');
    const modal = named(tree, 'RecuperacionChoiceModal');
    assert.equal(modal.props.suggested, R2);
    assert.equal(f.writes.length, 1);
    modal.props.onCancel();
    assert.equal(f.records[0].c2Condicion, 'SinCalificar');
    assert.equal(f.writes.length, 1);
  });

  test(`${kind}: semester picker contains A/SC but no raw zero, derived annual/final are read-only`, async () => {
    const f = fixture(kind);
    const tree = await f.open();
    const cells = nodes(tree).filter(n => n.type === 'TouchableOpacity' && n.props.accessibilityLabel);
    assert.equal(cells[2].props.disabled, true);
    assert.equal(cells[5].props.disabled, true);
    cells[0].props.onPress();
    const picker = named(f.harness.render(), 'GradePickerModal');
    const chips = nodes(picker.type(picker.props)).filter(n => n.type === 'Chip');
    assert.ok(chips.some(n => n.children.includes('A')));
    assert.ok(chips.some(n => n.children.includes('S/C')));
    assert.ok(!chips.some(n => n.children.includes('0')));
  });

  test(`${kind}: concurrent rows resolve out of order without overwriting grades; duplicate row save is blocked`, async () => {
    const f = fixture(kind, {}, { twoRows: true, deferred: true });
    await f.open();
    f.select('c1', 'A', 0);
    f.select('c1', '7', 1);
    assert.equal(f.writes.length, 2);
    const cells = nodes(f.harness.render()).filter(n => n.type === 'TouchableOpacity' && n.props.accessibilityLabel);
    assert.equal(cells[0].props.disabled, true);
    f.waiting.find(w => w.id === 2).resolve();
    await settle();
    f.waiting.find(w => w.id === 1).resolve();
    await settle();
    const labels = nodes(f.harness.render()).filter(n => n.type === 'TouchableOpacity' && n.props.accessibilityLabel).map(n => n.props.accessibilityLabel);
    assert.equal(labels[0], 'Ausente (cuenta 0)');
    assert.equal(labels[6], '7');
  });
}

test('docente: legacy manual annual/final and AP/APE workflow remains available without adding enum values', async () => {
  const f = fixture('docente', { c1Promedio: null, c2Promedio: null, estado: 1, promedioAnual: 8.25, calificacionFinal: 9.75 });
  await f.open();
  const tree = f.harness.render();
  const cells = nodes(tree).filter(n => n.type === 'TouchableOpacity' && n.props.accessibilityLabel);
  assert.equal(cells[2].props.disabled, false);
  cells[2].props.onPress();
  const picker = named(f.harness.render(), 'GradePickerModal');
  const chips = nodes(picker.type(picker.props)).filter(n => n.type === 'Chip');
  assert.ok(!chips.some(n => n.children.includes('A') || n.children.includes('S/C')));
  picker.props.onSelect('9');
  await settle();
  assert.equal(f.writes[0].estado, 'Aprobado');
  assert.equal(f.writes[0].calificacionFinal, 9.75);
  assert.equal(f.writes[0].promedioAnual, 9);
  const situation = named(f.harness.render(), 'SituacionPickerModal');
  situation.props.onSelect('APE');
  await settle();
  assert.equal(f.writes[1].estado, 'Aprobado');
  assert.equal(f.writes[1].c1Condicion, 'Numerica');
  assert.equal(f.writes[1].c1Promedio, null);
  assert.equal(f.writes[1].recuperacionExcepcional, null);
});

test('exceptional modal preselects suggested quarter and offers exactly three radio choices plus cancel', () => {
  const h = gradingScreen('components/RecuperacionChoiceModal.tsx', {}, { suggested: R2, onCancel() {}, onConfirm() {} });
  const tree = h.render();
  assert.equal(nodes(tree).find(n => n.type === 'RadioGroup').props.value, R2);
  assert.deepEqual(nodes(tree).filter(n => n.type === 'RadioItem').map(n => n.props.value), [R1, R2, BOTH]);
  assert.ok(nodes(tree).find(n => n.type === 'Button' && n.children.includes('Cancelar')));
});
