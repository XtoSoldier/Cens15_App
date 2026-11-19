const { test } = require('node:test');
const assert = require('node:assert/strict');
const { gradingScreen, nodes, named, settle } = require('./gradingHelper.cjs');
const { text } = require('./listadoHelper.cjs');

const student = (id, extra = {}) => ({
  alumnoId: id, alumnoNombre: `Alumno ${id}`, inscripcionId: id + 10,
  cursadaMateriaId: id, calificacionId: id, c1Promedio: 6, c2Promedio: 6,
  c1Condicion: 'Numerica', c2Condicion: 'Numerica', c1Nota1: 5.25,
  estado: 'Aprobado', ...extra,
});
const sheet = (records, extra = {}) => ({
  materiaId: 1, materiaNombre: 'Historia', cursoId: 10, cursoLabel: '1 F', anio: 2026,
  alumnos: records, ...extra,
});

function fixture({ role = 'Docente', records = [student(1), student(2)], sheets = [sheet(records)], fail = [], deferred = false } = {}) {
  const calls = [];
  const writes = [];
  const prepared = new Map();
  const allRecords = sheets.flatMap(s => s.alumnos);
  let release;
  const harness = gradingScreen('screens/DocenteCalificarScreen.tsx', {
    '../hooks/useRedux': { useAppSelector: fn => fn({ app: { userRole: role } }) },
    './api': { apiFetch: async (endpoint, options = {}) => {
      const body = options.body ? JSON.parse(options.body) : undefined;
      calls.push({ endpoint, body });
      if (endpoint === 'Docentes/mi-perfil') return { nombres: 'Ana', apellidos: 'Perez' };
      if (endpoint === 'Docentes/mis-alumnos-para-calificar' || endpoint === 'Docentes/materias-para-calificar') return sheets;
      if (endpoint === 'CursadasMaterias/para-calificar') {
        const id = 1000 + body.inscripcionId;
        prepared.set(body.inscripcionId, id);
        return { id, ...body };
      }
      if (endpoint === 'Calificaciones' || endpoint.startsWith('Calificaciones/')) {
        writes.push({ endpoint, body });
        const record = allRecords.find(r => (r.cursadaMateriaId || prepared.get(r.inscripcionId)) === body.cursadaMateriaId);
        assert.ok(record, `known attendance ${body.cursadaMateriaId}`);
        if (deferred && writes.length === 1) await new Promise(resolve => { release = resolve; });
        if (fail.includes(record.alumnoId)) throw new Error('No se pudo guardar esta nota');
        Object.assign(record, body);
        return endpoint === 'Calificaciones' ? { id: 100 + record.alumnoId } : undefined;
      }
      throw new Error(`Unexpected endpoint: ${endpoint}`);
    } },
  });
  const button = label => {
    const node = nodes(harness.render()).find(n => n.type === 'Button' && text(n) === label);
    assert.ok(node, `Button ${label}`);
    return node;
  };
  return {
    harness, calls, writes, prepared, records, button,
    async open() { harness.render(); await settle(); return harness.render(); },
    selectSheet(index = 0) {
      nodes(harness.render()).filter(n => n.type === 'TouchableOpacity' && n.props.onPress)[index].props.onPress();
      return harness.render();
    },
    selectGrade(value, row = 0, field = 'c1') {
      const cells = nodes(harness.render()).filter(n => n.type === 'TouchableOpacity' && n.props.accessibilityLabel);
      const index = ['c1', 'c2', 'anual', 'diciembre', 'febrero', 'final'].indexOf(field);
      cells[row * 6 + index].props.onPress();
      named(harness.render(), 'GradePickerModal').props.onSelect(value);
    },
    bulk(value = '8', field = 'c1') {
      button('Calificar a todos').props.onPress();
      const fieldLabel = { c1: 'C1', c2: 'C2', diciembre: 'Dic', febrero: 'Feb' }[field];
      nodes(harness.render()).find(n => n.type === 'Chip' && n.props.accessibilityLabel === `Columna para todos: ${fieldLabel}`).props.onPress();
      nodes(harness.render()).find(n => n.type === 'Chip' && n.props.accessibilityLabel?.startsWith('Nota para todos:') && text(n) === value).props.onPress();
    },
    release: () => release(),
  };
}

test('SuperAdmin opens a subject/course sheet without requiring any teacher profile or student-list query', async () => {
  const f = fixture({ role: 'SuperAdmin' });
  const tree = await f.open();
  assert.deepEqual(f.calls.map(c => c.endpoint), ['Docentes/materias-para-calificar']);
  assert.match(text(tree), /Calificaciones por materia, curso y año/);
  const table = f.selectSheet();
  assert.match(text(table), /Alumno 1/);
  assert.match(text(table), /Alumno 2/);
  assert.match(text(table), /2026/);
  f.selectGrade('8'); await settle();
  assert.equal(f.writes[0].body.c1Promedio, 8);
});

test('Docente loads only own endpoints, with every student in a single subject sheet', async () => {
  const f = fixture();
  await f.open();
  assert.deepEqual(f.calls.map(c => c.endpoint), ['Docentes/mi-perfil', 'Docentes/mis-alumnos-para-calificar']);
  const tree = f.selectSheet();
  assert.match(text(tree), /2 alumnos/);
  assert.equal(f.writes.length, 0);
});

test('students without attendance have independent row keys and prepare only the explicitly saved row', async () => {
  const f = fixture({ records: [student(1, { cursadaMateriaId: 0, calificacionId: null }), student(2, { cursadaMateriaId: 0, calificacionId: null })] });
  await f.open(); f.selectSheet();
  assert.equal(f.prepared.size, 0, 'reading does not create attendance');
  f.selectGrade('8', 0); await settle();
  assert.equal(f.prepared.size, 1);
  assert.equal(f.prepared.has(11), true);
  assert.equal(f.writes[0].body.cursadaMateriaId, 1011);
  const values = nodes(f.harness.render()).filter(n => n.type === 'TouchableOpacity' && n.props.accessibilityLabel);
  assert.equal(values[6].props.accessibilityLabel, '6', 'second row is unchanged');
  f.selectGrade('7', 1); await settle();
  assert.equal(f.prepared.size, 2);
  assert.equal(f.writes[1].body.cursadaMateriaId, 1012);
});

test('failed grade creation retains the prepared attendance for an explicit retry', async () => {
  const fail = [1];
  const f = fixture({ records: [student(1, { cursadaMateriaId: 0, calificacionId: null })], fail });
  await f.open(); f.selectSheet();
  f.selectGrade('8'); await settle();
  assert.match(text(f.harness.render()), /No se pudo guardar esta nota/);
  fail.length = 0;
  f.selectGrade('8'); await settle();
  assert.equal(f.calls.filter(c => c.endpoint === 'CursadasMaterias/para-calificar').length, 1);
  assert.equal(f.writes.length, 2);
  assert.equal(f.writes[1].body.cursadaMateriaId, 1011);
});

test('bulk grading requires review and confirmation, updates all eligible rows and preserves partial grades', async () => {
  const f = fixture();
  await f.open(); f.selectSheet(); f.bulk();
  assert.equal(f.writes.length, 0);
  f.button('Revisar cambios').props.onPress();
  assert.equal(f.writes.length, 0);
  assert.match(text(f.harness.render()), /Confirmá aplicar/);
  f.button('Confirmar y aplicar').props.onPress(); await settle();
  assert.equal(f.writes.length, 2);
  assert.ok(f.writes.every(w => w.body.c1Promedio === 8 && w.body.c1Nota1 === 5.25));
  assert.match(text(f.harness.render()), /Actualizados: 2\. Sin guardar: 0/);
});

test('canceling bulk grading writes nothing and missing attendance is prepared only after confirmation', async () => {
  const f = fixture({ records: [student(1, { cursadaMateriaId: 0, calificacionId: null })] });
  await f.open(); f.selectSheet(); f.bulk();
  f.button('Revisar cambios').props.onPress();
  f.button('Cancelar').props.onPress();
  assert.equal(f.writes.length, 0);
  assert.equal(f.prepared.size, 0);
  f.bulk(); f.button('Revisar cambios').props.onPress(); f.button('Confirmar y aplicar').props.onPress(); await settle();
  assert.equal(f.prepared.size, 1);
  assert.equal(f.writes.length, 1);
});

test('bulk grading does not overwrite equivalences or guess individual recovery choices', async () => {
  const f = fixture({ records: [
    student(1, { estado: 'AprobadoPorEquivalencia', disposicionEquivalencia: 'Res 1' }),
    student(2, { c1Promedio: 5 }),
    student(3),
  ] });
  await f.open(); f.selectSheet(); f.bulk('S/C', 'c2');
  f.button('Revisar cambios').props.onPress(); f.button('Confirmar y aplicar').props.onPress(); await settle();
  assert.equal(f.writes.length, 1);
  assert.equal(f.writes[0].body.cursadaMateriaId, 3);
  assert.match(text(f.harness.render()), /Equivalencias omitidas: 1\. Requieren elección individual: 1/);
});

test('bulk grading reports partial failures without claiming that every grade was saved', async () => {
  const f = fixture({ fail: [1] });
  await f.open(); f.selectSheet(); f.bulk();
  f.button('Revisar cambios').props.onPress(); f.button('Confirmar y aplicar').props.onPress(); await settle();
  assert.equal(f.writes.length, 2);
  assert.match(text(f.harness.render()), /Actualizados: 1\. Sin guardar: 1/);
  assert.match(text(f.harness.render()), /Algunas notas no se guardaron/);
});

test('duplicate confirmation cannot start a second batch, and cancellation stays disabled while saving', async () => {
  const f = fixture({ deferred: true });
  await f.open(); f.selectSheet(); f.bulk();
  f.button('Revisar cambios').props.onPress();
  const confirm = f.button('Confirmar y aplicar').props.onPress;
  confirm(); confirm(); await settle();
  assert.equal(f.writes.length, 1);
  assert.equal(f.button('Cancelar').props.disabled, true);
  assert.equal(f.button('Confirmar y aplicar').props.disabled, true);
  f.release(); await settle();
  assert.equal(f.writes.length, 2);
});

test('sheets with the same subject and course remain separate by year, including bulk updates', async () => {
  const f = fixture({ role: 'SuperAdmin', sheets: [sheet([student(1)]), sheet([student(2)], { anio: 2025 })] });
  const tree = await f.open();
  const cards = nodes(tree).filter(n => n.type === 'TouchableOpacity');
  assert.notEqual(cards[0].props.key, cards[1].props.key);
  f.selectSheet(1); f.bulk();
  f.button('Revisar cambios').props.onPress(); f.button('Confirmar y aplicar').props.onPress(); await settle();
  assert.equal(f.writes.length, 1);
  assert.equal(f.writes[0].body.cursadaMateriaId, 2);
  assert.match(text(f.harness.render()), /2025/);
});

test('preceptor cannot use the editable grading screen directly', async () => {
  const f = fixture({ role: 'Preceptor' });
  const tree = await f.open();
  assert.match(text(tree), /pero no modificarlas/);
  assert.equal(f.calls.length, 0);
});
