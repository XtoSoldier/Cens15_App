const { test } = require('node:test');
const assert = require('node:assert/strict');
const { gradingScreen, nodes, named, settle } = require('./gradingHelper.cjs');
const R1 = 'RecuperaPrimerCuatrimestre', R2 = 'RecuperaSegundoCuatrimestre', BOTH = 'RecuperaAmbos';

test('docente: profile and subjects use own-user endpoints, never administrative user lookup', async () => {
  const calls = [];
  const harness = gradingScreen('screens/DocenteCalificarScreen.tsx', {
    './api': { apiFetch: async endpoint => {
      calls.push(endpoint);
      if (endpoint === 'Docentes/mi-perfil') return { apellidos: 'Perez', nombres: 'Ana' };
      if (endpoint === 'Docentes/mis-alumnos-para-calificar') return [
        { materiaId: 1, materiaNombre: 'Historia', cursoLabel: '1 F', anio: 2026, alumnos: [] },
        { materiaId: 2, materiaNombre: 'Lengua', cursoLabel: '2 F', anio: 2026, alumnos: [] },
      ];
      throw new Error('Forbidden administrative lookup');
    } },
    '../hooks/useRedux': { useAppSelector: fn => fn({ app: { userRole: 'Docente' } }) },
  });
  harness.render();
  await settle();
  const texts = nodes(harness.render()).filter(n => n.type === 'Text').flatMap(n => n.children);
  assert.deepEqual(calls, ['Docentes/mi-perfil', 'Docentes/mis-alumnos-para-calificar']);
  for (const text of ['Perez, Ana', 'Historia', 'Lengua', '1 F', '2 F']) {
    assert.ok(texts.includes(text), `visible ${text}`);
  }
});

for (const message of ['No tiene permiso para calificar', 'Failed to fetch', 'Error interno del servidor', 'El usuario no está vinculado a ningún docente']) {
  test(`docente: actual loading error is preserved: ${message}`, async () => {
    const harness = gradingScreen('screens/DocenteCalificarScreen.tsx', {
      './api': { apiFetch: async () => { throw new Error(message); } },
    });
    harness.render();
    await settle();
    const tree = harness.render();
    assert.ok(nodes(tree).some(n => n.type === 'Text' && n.children.includes(message)));
    assert.ok(nodes(tree).some(n => n.type === 'Button' && n.children.includes('Reintentar')));
    if (!message.includes('vinculado')) {
      assert.ok(!nodes(tree).some(n => n.type === 'Text' && n.children.some(child => typeof child === 'string' && child.includes('vinculado'))));
    }
  });
}

function openOrigin(f, row = 0) {
  nodes(f.harness.render()).filter(n => n.type === 'IconButton' && n.props.icon === 'dots-vertical')[row].props.onPress();
  return named(f.harness.render(), 'CalificacionOriginModal');
}

function fixture(kind, initial = {}, options = {}) {
  const records = [1, ...(options.twoRows ? [2] : [])].map(id => ({
    id, cursadaMateriaId: id, materiaNombre: 'Historia', alumnoId: id, alumnoNombre: `Alumno ${id}`, calificacionId: id,
    c1Promedio: 5, c2Promedio: null, c1Condicion: 'Numerica', c2Condicion: 'Numerica',
    c1Nota1: 5.25, c1Nota2: 4.75, c1Nota3: 5.5, c2Nota1: 1.1, c2Nota2: 2.2, c2Nota3: 3.3,
    recuperacionDiciembre: null, recuperacionMarzo: null, promedioAnual: null, calificacionFinal: null,
    estado: kind === 'docente' ? 0 : 'EnCurso', ...initial, ...(options.empty ? { calificacionId: null } : {}),
  }));
  const writes = [];
  const waiting = [];
  let fail = false;
  const mocks = {
    '../services/calificacionService': {
      getCalificacionByCursada: async id => options.empty ? null : records.find(r => r.cursadaMateriaId === id),
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
      getMiDocente: async () => ({ apellidos: 'Docente', nombres: 'Prueba' }),
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
  test(`${kind}: empty row exposes origin menu and can create equivalence without quarters`, async () => {
    const f = fixture(kind, { c1Promedio: null, c2Promedio: null }, { empty: true });
    await f.open();
    let modal = openOrigin(f);
    modal.props.onCancel();
    assert.equal(f.writes.length, 0);
    modal = openOrigin(f);
    await modal.props.onApply('Equivalencia', '   Resolución 42   ');
    assert.equal(f.writes.length, 1);
    assert.equal(f.writes[0].estado, 'AprobadoPorEquivalencia');
    assert.equal(f.writes[0].disposicionEquivalencia, 'Resolución 42');
    assert.equal(f.writes[0].desdePase, false);
    assert.equal(f.writes[0].promedioAnual, null);
    assert.equal(f.writes[0].calificacionFinal, null);
    assert.ok(nodes(f.harness.render()).some(n => n.type === 'Text' && n.children.includes('A/E')));
    const cells = nodes(f.harness.render()).filter(n => n.type === 'TouchableOpacity' && n.props.accessibilityLabel);
    assert.ok(cells.every(n => n.props.disabled));
    assert.equal(named(f.harness.render(), 'CalificacionOriginModal'), undefined);
  });

  test(`${kind}: enum 5 disables grades, removal prompts before writing and cancellation keeps equivalence`, async () => {
    const f = fixture(kind, { estado: 5, c2Condicion: 'SinCalificar', disposicionEquivalencia: 'Res 42' });
    const tree = await f.open();
    assert.ok(nodes(tree).some(n => n.type === 'Text' && n.children.includes('A/E')));
    let modal = openOrigin(f);
    await modal.props.onApply('Normal', '');
    let recovery = named(f.harness.render(), 'RecuperacionChoiceModal');
    assert.ok(recovery);
    assert.equal(f.writes.length, 0);
    recovery.props.onCancel();
    assert.equal(f.records[0].estado, 5);
    assert.ok(nodes(f.harness.render()).some(n => n.type === 'Text' && n.children.includes('A/E')));
    modal = openOrigin(f);
    await modal.props.onApply('Pase', '');
    recovery = named(f.harness.render(), 'RecuperacionChoiceModal');
    recovery.props.onConfirm(BOTH);
    await settle();
    assert.equal(f.writes.length, 1);
    assert.equal(f.writes[0].estado, BOTH);
    assert.equal(f.writes[0].disposicionEquivalencia, null);
    assert.equal(f.writes[0].desdePase, true);
    assert.equal(f.writes[0].c1Promedio, 5);
    assert.equal(f.writes[0].c2Condicion, 'SinCalificar');
    assert.equal(f.writes[0].c1Nota1, 5.25);
    assert.equal(f.writes[0].c2Nota3, 3.3);
  });

  test(`${kind}: Pase reload info belongs to the row and unrelated note edits keep metadata`, async () => {
    const f = fixture(kind, { desdePase: true, c1Promedio: 5.35, c2Promedio: 5.75 }, { twoRows: true });
    f.records[1].desdePase = false;
    const tree = await f.open();
    const icons = nodes(tree).filter(n => n.type === 'IconButton' && n.props.icon === 'alert-circle-outline');
    assert.equal(icons.length, 1);
    assert.ok(icons[0].props.accessibilityLabel.includes('Historia'));
    if (kind === 'docente') assert.ok(icons[0].props.accessibilityLabel.includes('Alumno 1'));
    icons[0].props.onPress();
    const info = named(f.harness.render(), 'PaseInfoModal');
    assert.ok(nodes(info.type(info.props)).some(n => n.type === 'Text' && n.children.includes('Viene de Pase')));
    info.props.onClose();
    f.select('diciembre', '4');
    await settle();
    assert.equal(f.writes[0].desdePase, true);
    assert.equal(f.writes[0].disposicionEquivalencia, null);
    assert.equal(f.writes[0].c1Promedio, 5.35);
    assert.equal(f.writes[0].calificacionFinal, 4);
    const reload = fixture(kind, f.records[0]);
    await reload.open();
    assert.equal(openOrigin(reload).props.values.desdePase, true);
  });

  test(`${kind}: origin pending state blocks duplicate saves, then preserves partials when changed back`, async () => {
    const f = fixture(kind, { c1Promedio: 7.35, c2Promedio: 6.25 }, { deferred: true });
    await f.open();
    const modal = openOrigin(f);
    const saving = modal.props.onApply('Equivalencia', '42');
    await modal.props.onApply('Pase', '');
    assert.equal(f.writes.length, 1);
    assert.equal(named(f.harness.render(), 'CalificacionOriginModal').props.pending, true);
    f.waiting[0].resolve();
    await saving;
    assert.equal(named(f.harness.render(), 'CalificacionOriginModal'), undefined);
    const back = openOrigin(f).props.onApply('Normal', '');
    assert.equal(f.writes[1].c1Nota1, 5.25);
    assert.equal(f.writes[1].c2Nota3, 3.3);
    assert.equal(f.writes[1].c1Promedio, 7.35);
    assert.equal(f.writes[1].c2Promedio, 6.25);
    assert.equal(f.writes[1].promedioAnual, 7);
    assert.equal(f.writes[1].calificacionFinal, 7);
    assert.equal(f.writes[1].estado, 'Aprobado');
    assert.equal(f.writes[1].disposicionEquivalencia, null);
    f.waiting[1].resolve();
    await back;
  });

  test(`${kind}: origin API errors stay inline in the dialog and do not replace original data`, async () => {
    const f = fixture(kind);
    await f.open();
    f.setFail();
    await openOrigin(f).props.onApply('Equivalencia', '42');
    const modal = named(f.harness.render(), 'CalificacionOriginModal');
    assert.equal(modal.props.saveError, 'Error de prueba al guardar');
    assert.equal(modal.props.pending, false);
    assert.equal(modal.props.values.c1, '5');
    assert.notEqual(modal.props.values.estado, 'AprobadoPorEquivalencia');
    modal.props.onCancel();
    assert.equal(f.writes.length, 1);
  });

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

test('docente: legacy manual annual/final and AP remain available; old APE cannot bypass disposition', async () => {
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
  assert.equal(f.writes.length, 1);
  const chipsSit = nodes(situation.type(situation.props)).filter(n => n.type === 'Chip');
  assert.ok(!chipsSit.some(n => n.children.some(c => typeof c === 'string' && c.includes('Equivalencia'))));
  situation.props.onSelect('AP');
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

test('origin dialog validates mandatory multiline disposition, controls exclusive choices and cancels without applying', () => {
  const writes = [];
  let canceled = 0;
  const h = gradingScreen('components/CalificacionOriginModal.tsx', {}, { values: { estado: 'EnCurso' }, context: 'Historia', onCancel: () => canceled++, onApply: (...args) => writes.push(args) });
  const find = type => nodes(h.render()).find(n => n.type === type);
  const button = label => nodes(h.render()).find(n => n.type === 'Button' && n.children.includes(label));
  assert.deepEqual(nodes(h.render()).filter(n => n.type === 'RadioItem').map(n => n.props.value), ['Normal', 'Equivalencia', 'Pase']);
  find('RadioGroup').props.onValueChange('Equivalencia');
  button('Guardar').props.onPress();
  assert.equal(writes.length, 0);
  assert.ok(nodes(h.render()).some(n => n.props.accessibilityRole === 'alert'));
  assert.equal(find('TextInput').props.multiline, true);
  const longText = 'Resolución <42>\n' + 'texto largo '.repeat(200);
  find('TextInput').props.onChangeText(`  ${longText}  `);
  assert.equal(find('TextInput').props.value, `  ${longText}  `);
  button('Guardar').props.onPress();
  assert.equal(writes[0][0], 'Equivalencia');
  assert.equal(writes[0][1], longText.trim());
  find('RadioGroup').props.onValueChange('Forged');
  assert.equal(find('RadioGroup').props.value, 'Equivalencia');
  find('RadioGroup').props.onValueChange('Pase');
  assert.equal(find('TextInput'), undefined);
  button('Cancelar').props.onPress();
  assert.equal(canceled, 1);
  assert.equal(writes.length, 1);
});

test('origin dialog pending state blocks save, cancel, radio changes and hardware dismissal', () => {
  let calls = 0;
  const h = gradingScreen('components/CalificacionOriginModal.tsx', {}, { values: { estado: 'AprobadoPorEquivalencia', disposicionEquivalencia: '42' }, context: 'Historia', pending: true, saveError: 'API error', onCancel: () => calls++, onApply: () => calls++ });
  const tree = h.render();
  for (const b of nodes(tree).filter(n => n.type === 'Button')) { assert.equal(b.props.disabled, true); b.props.onPress(); }
  nodes(tree).find(n => n.type === 'Modal').props.onRequestClose();
  nodes(tree).find(n => n.type === 'RadioGroup').props.onValueChange('Normal');
  assert.equal(nodes(h.render()).find(n => n.type === 'RadioGroup').props.value, 'Equivalencia');
  assert.equal(calls, 0);
  assert.ok(nodes(tree).some(n => n.type === 'Text' && n.children.includes('API error')));
});

test('local bulletin HTML escapes equivalence disposition and shows Pase as plain text; native preview retains both', async () => {
  const f = fixture('admin');
  const { buildBoletinHtml, BoletinPreviewModal } = f.harness.load('screens/CalificacionesScreen.tsx');
  const materias = [
    { cursada: { id: 1 }, materia: '<Historia>', estado: 'AprobadoPorEquivalencia', situacion: 'A/E', disposicionEquivalencia: '<script>"&\'</script>\n42', c1: '5.35', c2: 'S/C', anual: '', final: '', diciembre: '', febrero: '' },
    { cursada: { id: 2 }, materia: 'Lengua', desdePase: true, situacion: 'Aprobado', c1: '8', c2: '8', anual: '8', final: '8', diciembre: '', febrero: '' },
  ];
  const cursos = [{ inscripcion: { id: 10 }, curso: '1A', anio: 2026, materias }];
  const html = buildBoletinHtml({ apellido: '<Alumno>' }, cursos);
  assert.ok(html.includes('A/E'));
  assert.ok(html.includes('Disposición: &lt;script&gt;&quot;&amp;&#039;&lt;/script&gt;'));
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('Lengua (Viene de Pase)'));
  assert.ok(html.includes('&lt;Historia&gt;'));
  const preview = BoletinPreviewModal({ visible: true, alumno: {}, cursos, selectedCursoIds: new Set([10]), renderedHtml: '', loadingPreview: false, previewError: '', onToggleCurso() {}, onClose() {}, onGenerate() {}, generating: false });
  assert.ok(nodes(preview).some(n => n.type === 'Text' && n.children.some(c => typeof c === 'string' && c.includes('Disposición: <script>'))));
  assert.ok(nodes(preview).some(n => n.type === 'Text' && n.children.includes(' (Viene de Pase)')));
});

test('admin: switching alumno invalidates old origin callbacks before any write', async () => {
  const f = fixture('admin');
  await f.open();
  const modal = openOrigin(f);
  f.harness.render({ alumno: { id: 2 } });
  await modal.props.onApply('Equivalencia', '42');
  assert.equal(f.writes.length, 0);
});
