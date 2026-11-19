const { test } = require('node:test');
const assert = require('node:assert/strict');
const { gradingScreen, nodes, named, settle } = require('./gradingHelper.cjs');
const { listadoScreen, text, press } = require('./listadoHelper.cjs');

function grades(role, { assigned = [10], fail = false } = {}) {
  const reads = [];
  const writes = [];
  let catalogReads = 0;
  const harness = gradingScreen('screens/CalificacionesScreen.tsx', {
    '../hooks/useRedux': { useAppSelector: fn => fn({ app: { userRole: role } }) },
    '../services/alumnoService': { getInscripcionesByAlumno: async () => [
      { id: 1, cursoId: 10, anio: 2026 }, { id: 2, cursoId: 20, anio: 2026 },
    ] },
    '../services/cursoService': {
      getCursos: async () => [{ id: 10, curso: '1', division: 'F' }, { id: 20, curso: '2', division: 'F' }],
      getMisCursosPreceptor: async () => {
        if (fail) throw new Error('No se pudieron verificar los cursos a cargo');
        return assigned.map(id => ({ id }));
      },
    },
    '../services/materiaService': { getMaterias: async () => { catalogReads++; return [{ id: 1, cursoId: 10 }, { id: 2, cursoId: 20 }]; } },
    '../services/cursadaMateriaService': {
      getCursadasByInscripcion: async id => { reads.push(['cursadas', id]); return [{ id, materiaId: id, materiaNombre: `Materia ${id}` }]; },
      createCursadaMateria: async body => writes.push(['cursada', body]),
    },
    '../services/calificacionService': {
      getCalificacionByCursada: async id => { reads.push(['nota', id]); return { id, c1Promedio: 6, c2Promedio: 8, estado: 'Aprobado' }; },
      updateCalificacion: async (id, body) => writes.push(['nota', id, body]),
      createCalificacion: async body => { writes.push(['nota nueva', body]); return { id: 1 }; },
    },
    '../services/certificadoService': {},
  }, { alumno: { id: 5, nombre: 'Alumno', apellido: 'Prueba' } });
  return { harness, reads, writes, get catalogReads() { return catalogReads; }, async open() {
    harness.render(); await settle(); return harness.render();
  } };
}

for (const role of ['Preceptor', ' preceptor ']) {
  test(`${role}: only reads assigned-course grades, never creates attendance or exposes editing`, async () => {
    const f = grades(role);
    const tree = await f.open();
    assert.deepEqual(f.reads, [['cursadas', 1], ['nota', 1]]);
    assert.equal(f.catalogReads, 0);
    assert.equal(f.writes.length, 0);
    assert.match(text(tree), /Solo lectura/);
    assert.match(text(tree), /Materia 1/);
    assert.doesNotMatch(text(tree), /Materia 2/);
    const cells = nodes(tree).filter(n => n.type === 'TouchableOpacity' && n.props.accessibilityLabel);
    assert.ok(cells.length > 0);
    assert.ok(cells.every(n => n.props.disabled && n.props.onPress === undefined));
    assert.ok(!nodes(tree).some(n => n.type === 'IconButton' && n.props.icon === 'dots-vertical'));
  });
}

test('preceptor without courses or student enrollment in those courses sees no grades', async () => {
  for (const assigned of [[], [999]]) {
    const f = grades('Preceptor', { assigned });
    const tree = await f.open();
    assert.equal(f.reads.length, 0);
    assert.equal(f.writes.length, 0);
    assert.match(text(tree), /no tiene inscripciones en tus cursos a cargo/);
    assert.ok(nodes(tree).find(n => n.type === 'Button' && n.props.icon === 'printer').props.disabled);
  }
});

test('failure to determine preceptor assignments fails closed without querying any grades', async () => {
  const f = grades('Preceptor', { fail: true });
  const tree = await f.open();
  assert.equal(f.reads.length, 0);
  assert.equal(f.writes.length, 0);
  assert.match(text(tree), /No se pudieron verificar los cursos a cargo/);
});

test('SuperAdmin retains all enrollments and can edit grades through the student detail view', async () => {
  const f = grades('superAdmin');
  const tree = await f.open();
  assert.equal(f.reads.filter(([kind]) => kind === 'nota').length, 2);
  assert.ok(nodes(tree).some(n => n.type === 'IconButton' && n.props.icon === 'dots-vertical'));
  const cell = nodes(tree).find(n => n.type === 'TouchableOpacity' && n.props.accessibilityLabel && !n.props.disabled);
  assert.ok(cell);
  cell.props.onPress();
  named(f.harness.render(), 'GradePickerModal').props.onSelect('8');
  await settle();
  assert.equal(f.writes.length, 1);
  assert.equal(f.writes[0][0], 'nota');
});

test('preceptor course service uses the authenticated endpoint and rejects invalid scope data', async () => {
  const endpoints = [];
  let response = [{ id: 10, curso: '1', division: 'F' }];
  const h = gradingScreen('screens/CalificacionesScreen.tsx', {
    './api': { apiFetch: async endpoint => { endpoints.push(endpoint); return response; } },
  });
  const service = h.load('services/cursoService.ts');
  assert.equal((await service.getMisCursosPreceptor())[0].id, 10);
  assert.deepEqual(endpoints, ['Preceptores/mis-cursos']);
  response = null;
  await assert.rejects(service.getMisCursosPreceptor(), /verificar los cursos/);
});

function detail(role) {
  const forbidden = () => { throw new Error('Unexpected academic write'); };
  const screen = listadoScreen('AlumnoDetalleScreen.tsx', {
    navigation: { useRoute: () => ({ params: { alumno: { id: 99, nombre: 'Alumno ajeno', apellido: 'Visible', dni: '30123456' } } }) },
    '../hooks/useRedux': { useAppSelector: fn => fn({ app: { userRole: role } }) },
    '../services/alumnoService': { getInscripcionesByAlumno: async () => [{ id: 2, cursoId: 20, anio: 2026 }], updateAlumno: forbidden, deleteAlumno: forbidden },
    '../services/cursoService': { getCursos: async () => [{ id: 20, curso: '2', division: 'F' }] },
    '../services/alumnoDocumentoService': { getAlumnoDocumentos: async () => [], getTiposDocumentoAlumno: async () => [{ id: 1, nombre: 'DNI' }],
      updateAlumnoDocumentoUpload: forbidden, uploadAlumnoDocumento: forbidden, deleteAlumnoDocumento: forbidden },
    '../services/inscripcionService': { createInscripcion: forbidden, deleteInscripcion: forbidden },
    'expo-image-picker': {}, 'expo-document-picker': {},
    './CalificacionesScreen': { default: function CalificacionesScreen() {} },
    './ConstanciasTab': { default: function ConstanciasTab() {} },
    '../components/AlumnoBirthDateField': { default: function AlumnoBirthDateField() {} },
  });
  return screen;
}

test('preceptor can view any student personal data, documents and enrollment history without write controls', async () => {
  const screen = detail('Preceptor');
  screen.render(); await settle();
  let tree = screen.render();
  assert.equal(nodes(tree).find(n => n.props.label === 'Nombre').props.value, 'Alumno ajeno');
  assert.ok(!nodes(tree).some(n => n.type === 'IconButton' && n.props.icon === 'pencil'));
  assert.doesNotMatch(text(tree), /Reinscribir alumno/);
  press(tree, 'Documentación'); tree = screen.render();
  assert.match(text(tree), /DNI/);
  assert.ok(!nodes(tree).some(n => n.type === 'Button' && ['camera', 'paperclip', 'delete'].includes(n.props.icon)));
  press(tree, 'Historial de Inscripciones'); tree = screen.render();
  assert.match(text(tree), /2026/);
  assert.ok(!nodes(tree).some(n => n.type === 'IconButton' && n.props.icon === 'delete'));
});

test('SuperAdmin still has student editing and enrollment controls', async () => {
  const screen = detail('SuperAdmin');
  screen.render(); await settle();
  const tree = screen.render();
  assert.ok(nodes(tree).some(n => n.type === 'IconButton' && n.props.icon === 'pencil'));
  assert.match(text(tree), /Reinscribir alumno/);
});

test('SuperAdmin grading entry does not require a linked teacher, while Docente keeps their assigned subjects', () => {
  for (const [role, destination] of [['SuperAdmin', 'DocenteCalificar'], ['Docente', 'DocenteCalificar']]) {
    const routes = [];
    const h = gradingScreen('screens/DocentesScreen.tsx', {
      '../hooks/useRedux': { useAppSelector: fn => fn({ app: { userRole: role } }) },
      '@react-navigation/native': { useNavigation: () => ({ navigate: name => routes.push(name) }) },
    });
    const button = nodes(h.render()).find(n => n.type === 'TouchableOpacity' && text(n).includes('Calificar'));
    assert.ok(button);
    button.props.onPress();
    assert.deepEqual(routes, [destination]);
  }
});
