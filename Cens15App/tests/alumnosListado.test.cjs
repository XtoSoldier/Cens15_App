const { test } = require('node:test');
const assert = require('node:assert/strict');
const { listadoScreen, nodes, text, press, settle } = require('./listadoHelper.cjs');

const cursos = [
  { id: 10, curso: '3ro', division: 'A', anexoNombre: 'Centro', orientacionNombreCorto: 'Sociales' },
  { id: 11, curso: '3ro', division: 'B', anexoNombre: 'Norte', orientacionNombreCorto: 'Naturales' },
  { id: 12, curso: '3ro', division: 'A', anexoNombre: 'Centro', orientacionNombreCorto: 'Sociales' },
];
const insc = (id, cursoId, anio, extra = {}) => ({ id, cursoId, anio, curso: '3ro', estado: 'Finalizada', ...extra });
const alumno = (id, nombres = 'Ana', extra = {}) => ({ id, nombres, apellidos: `Apellido${id}`, numeroDocumento: `${id}234`, ...extra });
const courseLabel = id => {
  const c = cursos.find(c => c.id === id);
  return `3ro ${c.division}`;
};

async function setup({ students = [alumno(1), alumno(2, 'Beto'), alumno(3, 'Carla')], history = {
  1: [insc(1, 10, 2024), insc(2, 11, 2026, { estado: 'Activa' }), insc(3, 12, 2024)],
  2: [insc(4, 10, 2026)], 3: [],
}, fail = false, width = 390, autoLoad = true, catalog = cursos, failCursos = false } = {}) {
  let calls = 0;
  let courseCalls = 0;
  const queries = [];
  const requests = [];
  let route;
  let stack = ['AlumnosListado'];
  const screen = listadoScreen('AlumnosListadoScreen.tsx', {
    '../services/alumnoService': {
      getAlumnos: async (query, filters = {}) => {
        queries.push(query);
        requests.push({ query, ...filters });
        const terms = query?.toLowerCase().split(/\s+/) || [];
        return students.filter(student => terms.every(term => `${student.nombres || ''} ${student.apellidos || ''} ${student.numeroDocumento || ''}`.toLowerCase().includes(term)) &&
          (filters.cursoId === undefined && filters.anio === undefined || (history[student.id] || []).some(i =>
            (!filters.cursoId || i.cursoId === filters.cursoId) && (!filters.anio || i.anio === filters.anio))));
      },
      getInscripcionesByAlumno: async id => {
        calls++;
        if (fail) throw new Error('offline');
        return history[id] || [];
      },
    },
    '../services/cursoService': { getCursos: async () => { courseCalls++; if (failCursos) throw new Error('No se pudieron cargar los cursos'); return catalog; } },
    navigation: { useNavigation: () => ({ navigate(name, params) { route = { name, params }; stack.push(name); screen.blur(); } }) },
  });
  screen.resize(width);
  screen.render();
  if (autoLoad) {
    press(screen.render(), 'Traer todos'); screen.render();
    nodes(screen.render()).find(n => n.props.icon === 'filter').props.onPress(); screen.render();
  }
  await settle();
  let tree = screen.render();
  return {
    screen, history, queries, requests,
    get courseCalls() { return courseCalls; },
    get tree() { return tree; },
    render() { tree = screen.render(); return tree; },
    resize(width) { screen.resize(width); tree = screen.render(); },
    async refresh() { screen.blur(); screen.focus(); tree = screen.render(); await settle(); tree = screen.render(); },
    get calls() { return calls; },
    get route() { return route; },
    get stack() { return stack; },
    setFail(value) { fail = value; },
    setCursosFail(value) { failCursos = value; },
    search(value) { nodes(tree).find(n => n.props.label === 'Buscar alumno').props.onChangeText(value); tree = screen.render(); },
    async waitSearch() { screen.flushTimers(); await settle(); tree = screen.render(); },
    showFilters() { nodes(tree).find(n => n.props.icon === 'filter').props.onPress(); tree = screen.render(); },
    choose(prefix, value, optionId) {
      const option = nodes(tree).find(n => n.props.onPress && text(n).startsWith(prefix) && !text(n).endsWith(' x') && n.type === 'TouchableRipple');
      assert.ok(option, `Filter ${prefix}`);
      option.props.onPress(); tree = screen.render();
      if (prefix === 'Curso:' && value !== 'Todos' && !optionId) {
        optionId = cursos.find(c => courseLabel(c.id) === value)?.id;
      }
      if (optionId) {
        const item = nodes(tree).find(n => n.type === 'TouchableRipple' && n.props.key === String(optionId));
        assert.ok(item, `Course ${optionId}`);
        item.props.onPress();
      } else if (value === 'Todos') {
        const all = nodes(tree).find(n => n.props.accessibilityLabel === `${prefix} Todos`);
        assert.ok(all);
        all.props.onPress();
      } else press(tree, value);
      tree = screen.render();
    },
    press(label) { press(tree, label); tree = screen.render(); },
    back(name) {
      const index = stack.lastIndexOf(name);
      stack = index < 0 ? [name] : stack.slice(0, index + 1);
      screen.focus();
    },
  };
}
const count = (s, n) => assert.ok(text(s.tree).includes(`Alumnos encontrados: ${n}`), text(s.tree));
const rows = s => nodes(s.tree).filter(n => n.type === 'TouchableRipple' && nodes(n).some(child => child.type === 'Text' && text(child).startsWith('DNI:')));
const courseButtons = s => nodes(s.tree).filter(n => n.type === 'TouchableRipple' && n.props.accessibilityLabel?.startsWith('Curso:'));
const selectCourseButton = (s, id) => {
  const button = courseButtons(s).find(n => id === null ? text(n) === 'Todos' : n.props.key === String(id));
  assert.ok(button, `Visible course button ${id}`);
  button.props.onPress();
  s.render();
};

test('entering the list and typing fewer than three trimmed characters never loads students or histories', async () => {
  const s = await setup({ autoLoad: false });
  assert.equal(s.queries.length, 0);
  assert.equal(s.courseCalls, 1);
  assert.equal(s.calls, 0);
  assert.match(text(s.tree), /Escribí al menos 3 caracteres/);
  for (const query of ['A', 'An', '  An  ', '', '   ']) {
    s.search(query);
    await s.waitSearch();
    assert.equal(s.queries.length, 0);
    assert.equal(rows(s).length, 0);
  }
  assert.equal(nodes(s.tree).find(n => n.props.icon === 'refresh').props.disabled, true);
  await s.refresh();
  assert.equal(s.queries.length, 0);
});

test('search starts at three characters and requests only matching students and their histories', async () => {
  const s = await setup({ autoLoad: false });
  s.search('  Ana  ');
  assert.equal(s.queries.length, 0, 'wait for typing debounce');
  await s.waitSearch();
  assert.deepEqual(s.queries, ['Ana']);
  assert.equal(s.calls, 1);
  count(s, 1);
  assert.match(text(rows(s)[0]), /Ana/);
  s.search('Be');
  await s.waitSearch();
  assert.equal(s.queries.length, 1);
  assert.equal(rows(s).length, 0);
  assert.match(text(s.tree), /sin consultar/);
  s.search('Beto');
  await s.waitSearch();
  assert.deepEqual(s.queries, ['Ana', 'Beto']);
  count(s, 1);
  assert.match(text(rows(s)[0]), /Beto/);
});

test('rapid typing debounces to the latest search and supports combined name and surname', async () => {
  const s = await setup({ autoLoad: false });
  s.search('Ana'); s.search('Ana Ape'); s.search('Ana Apellido1');
  await s.waitSearch();
  assert.deepEqual(s.queries, ['Ana Apellido1']);
  count(s, 1);
  s.search('Ana inexistente');
  await s.waitSearch();
  count(s, 0);
});

test('Traer todos explicitly loads the list, cancels pending search and allows local filtering', async () => {
  const s = await setup({ autoLoad: false });
  s.search('Ana');
  s.press('Traer todos');
  await s.waitSearch();
  assert.deepEqual(s.queries, [undefined]);
  count(s, 3);
  assert.equal(nodes(s.tree).find(n => n.props.label === 'Buscar alumno').props.value, '');
  s.search('Ana'); count(s, 1);
  s.search(''); count(s, 3);
  assert.equal(s.queries.length, 1);
});

test('returning to a searched list reissues that search without fetching all students', async () => {
  const s = await setup({ autoLoad: false });
  s.search('Ana'); await s.waitSearch();
  s.screen.blur(); s.screen.focus(); s.render(); await s.waitSearch();
  assert.deepEqual(s.queries, ['Ana', 'Ana']);
  count(s, 1);
});

test('late remote responses cannot restore an old search or load its histories after clearing', async () => {
  const pending = [];
  let histories = 0;
  const screen = listadoScreen('AlumnosListadoScreen.tsx', {
    '../services/alumnoService': {
      getAlumnos: query => new Promise(resolve => pending.push({ query, resolve })),
      getInscripcionesByAlumno: async () => { histories++; return []; },
    },
    '../services/cursoService': { getCursos: async () => cursos },
  });
  const change = value => { nodes(screen.render()).find(n => n.props.label === 'Buscar alumno').props.onChangeText(value); screen.render(); screen.flushTimers(); };
  screen.render();
  change('Ana'); change('Beto');
  pending[1].resolve([alumno(2, 'Beto')]); await settle();
  assert.match(text(screen.render()), /Beto/);
  pending[0].resolve([alumno(1)]); await settle();
  assert.doesNotMatch(text(screen.render()), /Apellido1/);
  assert.equal(histories, 1);
  change('Carla'); change('');
  pending[2].resolve([alumno(3, 'Carla')]); await settle();
  assert.match(text(screen.render()), /sin consultar/);
  assert.equal(histories, 1);
});

test('student service encodes server searches and never turns a short query into fetch-all', async () => {
  const endpoints = [];
  const h = listadoScreen('AlumnosListadoScreen.tsx', {
    './api': { apiFetch: async endpoint => { endpoints.push(endpoint); return []; } },
  });
  const service = h.load('services/alumnoService.ts');
  for (const query of ['', '  ', 'An', ' An ']) assert.equal((await service.getAlumnos(query)).length, 0);
  assert.equal(endpoints.length, 0);
  await service.getAlumnos('  Ana & Pérez  ');
  await service.getAlumnos();
  await service.getAlumnos(undefined, { cursoId: 10, anio: 2026 });
  await service.getAlumnos('Ana', { cursoId: 10 });
  assert.deepEqual(endpoints, ['Alumnos?search=Ana%20%26%20P%C3%A9rez', 'Alumnos', 'Alumnos?cursoId=10&anio=2026', 'Alumnos?search=Ana&cursoId=10']);
});

test('course catalog is visible before requesting students, including courses with no enrollments', async () => {
  const s = await setup({ autoLoad: false, width: 1280, catalog: [...cursos, { id: 99, curso: '4to', division: 'C' }] });
  assert.equal(s.queries.length, 0);
  assert.equal(s.calls, 0);
  assert.equal(courseButtons(s).length, 5);
  assert.match(text(s.tree), /4to C/);
  selectCourseButton(s, 99);
  await settle(); s.render();
  assert.deepEqual(s.requests, [{ query: undefined, cursoId: 99, anio: new Date().getFullYear() }]);
  count(s, 0);
  assert.equal(courseButtons(s).length, 5);
});

test('choosing a course on mobile defaults to current year without a text search or fetch-all', async () => {
  const year = new Date().getFullYear();
  const s = await setup({ autoLoad: false, history: { 1: [insc(1, 10, year - 1)], 2: [insc(2, 10, year)], 3: [] } });
  s.choose('Curso:', courseLabel(10));
  await settle(); s.render();
  assert.deepEqual(s.requests, [{ query: undefined, cursoId: 10, anio: year }]);
  count(s, 1);
  assert.match(text(rows(s)[0]), /Beto/);
  assert.match(text(s.tree), new RegExp(`Año de inscripción: ${year}`));
  s.search('B'); await s.waitSearch();
  s.search('Be'); await s.waitSearch();
  count(s, 1);
  assert.equal(s.requests.length, 1, 'short text does not restart or stall the course query');
  s.search('Beto'); await s.waitSearch();
  assert.deepEqual(s.requests.at(-1), { query: 'Beto', cursoId: 10, anio: year });
  count(s, 1);
});

test('course query can switch to all years or a specific historical year and keeps all courses available', async () => {
  const year = new Date().getFullYear();
  const s = await setup({ autoLoad: false, width: 1280, history: {
    1: [insc(1, 10, year - 1), insc(2, 11, year)], 2: [insc(3, 10, year)], 3: [],
  } });
  selectCourseButton(s, 10); await settle(); s.render(); count(s, 1);
  s.choose('Año de inscripción:', 'Todos'); await settle(); s.render(); count(s, 2);
  assert.deepEqual(s.requests.at(-1), { query: undefined, cursoId: 10, anio: undefined });
  s.choose('Año de inscripción:', String(year - 1)); await settle(); s.render(); count(s, 1);
  assert.match(text(rows(s)[0]), new RegExp(`Año de inscripción: ${year - 1}`));
  selectCourseButton(s, 11); await settle(); s.render(); count(s, 0);
  assert.equal(s.requests.at(-1).anio, year - 1, 'an explicitly chosen historical year is preserved');
  assert.equal(courseButtons(s).length, 4);
  const before = s.requests.length;
  s.press('Limpiar filtros'); await settle(); s.render();
  assert.equal(s.requests.length, before);
  assert.match(text(s.tree), /sin consultar/);
});

test('failed catalog can be retried without downloading any students', async () => {
  const s = await setup({ autoLoad: false, failCursos: true });
  assert.match(text(s.tree), /No se pudieron cargar los cursos/);
  assert.equal(s.queries.length, 0);
  s.setCursosFail(false);
  s.press('Reintentar cursos'); await settle(); s.render();
  assert.equal(s.courseCalls, 2);
  assert.equal(s.queries.length, 0);
  s.choose('Curso:', courseLabel(10)); await settle(); s.render();
  assert.equal(s.queries.length, 1);
});

test('large screens keep every course as a horizontal wrapping button after switching filters', async () => {
  const s = await setup({ width: 1280 });
  s.showFilters();
  assert.equal(courseButtons(s).length, 4);
  assert.equal(courseButtons(s).filter(n => n.props.accessibilityState.selected).length, 1);
  assert.equal(courseButtons(s).find(n => n.props.accessibilityState.selected).props.accessibilityLabel, 'Curso: Todos');
  const toolbar = nodes(s.tree).find(n => n.type === 'View' && n.props.style?.flexDirection === 'row' && n.props.style?.flexWrap === 'wrap');
  assert.ok(toolbar);
  selectCourseButton(s, 10); count(s, 1);
  selectCourseButton(s, 11); count(s, 1);
  assert.equal(courseButtons(s).length, 4);
  assert.equal(courseButtons(s).find(n => n.props.accessibilityState.selected).props.key, '11');
  selectCourseButton(s, null); count(s, 2);
  s.choose('Año de inscripción:', 'Todos'); count(s, 3);
  assert.equal(courseButtons(s).length, 4);
  assert.doesNotMatch(text(s.tree), /\(ID /);
});

test('desktop course buttons stay visible with year and search, including courses with zero matching students', async () => {
  const s = await setup({ width: 1024 });
  s.showFilters();
  s.choose('Año de inscripción:', '2026');
  selectCourseButton(s, 12); count(s, 0);
  assert.equal(courseButtons(s).length, 4);
  selectCourseButton(s, 10); count(s, 1);
  assert.match(text(rows(s)[0]), /Beto/);
  s.choose('Año de inscripción:', 'Todos'); count(s, 2);
  assert.equal(courseButtons(s).find(n => n.props.accessibilityState?.selected).props.key, '10');
  s.choose('Año de inscripción:', '2026'); count(s, 1);
  selectCourseButton(s, 11); count(s, 1);
  s.search('Beto'); count(s, 0);
  selectCourseButton(s, 10); count(s, 1);
  assert.match(text(s.tree), /Año de inscripción: 2026/);
  assert.equal(courseButtons(s).length, 4);
  s.press('Limpiar filtros'); count(s, 1);
  assert.equal(courseButtons(s).find(n => n.props.accessibilityState.selected).props.accessibilityLabel, 'Curso: Todos');
  assert.match(text(s.tree), /Año de inscripción: Todos/);
});

test('resizing switches between compact selector and persistent buttons without resetting selection or refetching', async () => {
  const s = await setup({ width: 390 });
  s.showFilters();
  const trigger = nodes(s.tree).find(n => n.type === 'TouchableRipple' && text(n) === 'Curso: Todos');
  trigger.props.onPress(); s.render();
  assert.ok(nodes(s.tree).some(n => n.type === 'Text' && text(n) === 'Cursos'));
  const before = s.calls;
  s.resize(1280);
  assert.equal(courseButtons(s).length, 4);
  assert.equal(nodes(s.tree).filter(n => n.type === 'Text' && text(n) === 'Cursos').length, 0);
  selectCourseButton(s, 11); count(s, 1);
  s.resize(390);
  assert.equal(courseButtons(s).length, 0);
  assert.match(text(s.tree), /Curso: 3ro B/);
  s.choose('Año de inscripción:', '2026'); count(s, 1);
  s.resize(1280);
  assert.equal(courseButtons(s).find(n => n.props.accessibilityState.selected).props.key, '11');
  assert.match(text(s.tree), /Año de inscripción: 2026/);
  assert.equal(s.calls, before);
});

test('unfiltered count includes students without enrollment; preview includes latest year and division', async () => {
  const s = await setup();
  count(s, 3);
  assert.equal(rows(s).length, 3);
  assert.match(text(rows(s)[0]), /3ro B - Norte - NaturalesAño de inscripción: 2026/);
  assert.match(text(rows(s)[2]), /Sin inscripción/);
});

test('year options include all historical years; each student appears once with matching historical preview', async () => {
  const s = await setup();
  s.showFilters();
  s.choose('Año de inscripción:', '2024');
  count(s, 1);
  assert.equal(rows(s).length, 1);
  assert.match(text(rows(s)[0]), /3ro A - Centro - SocialesAño de inscripción: 2024/);
  assert.doesNotMatch(text(rows(s)[0]), /2026|Norte/);
});

test('course selection retains internal IDs without displaying them and course/year cannot cross enrollments', async () => {
  const s = await setup();
  s.showFilters();
  s.choose('Curso:', courseLabel(10));
  count(s, 1);
  s.choose('Año de inscripción:', '2026');
  count(s, 1);
  assert.match(text(rows(s)[0]), /Beto/);
  s.choose('Curso:', courseLabel(12), 12);
  count(s, 0);
  s.choose('Año de inscripción:', '2024');
  count(s, 1);
  s.choose('Curso:', courseLabel(11));
  count(s, 0);
});

test('only course and enrollment year are offered; search still combines with both filters', async () => {
  const s = await setup();
  s.showFilters();
  s.choose('Año de inscripción:', '2024');
  assert.doesNotMatch(text(s.tree), /Anexo:|Orientación:|\(ID /);
  s.choose('Curso:', courseLabel(10));
  for (const query of [' aNa ', 'apellido1', '1234']) { s.search(query); count(s, 1); }
  s.search('Beto'); count(s, 0);
  s.search(''); count(s, 1);
});

test('Todos, individual chips, and Limpiar filtros reset year and other filters', async () => {
  const s = await setup();
  s.showFilters();
  s.choose('Año de inscripción:', '2024');
  s.showFilters();
  s.press('Año de inscripción: 2024 x'); count(s, 3);
  s.showFilters();
  s.choose('Año de inscripción:', '2024');
  s.choose('Año de inscripción:', 'Todos'); count(s, 3);
  s.choose('Curso:', courseLabel(11));
  s.choose('Curso:', 'Todos'); count(s, 2);
  s.choose('Curso:', courseLabel(11));
  s.showFilters();
  s.press(`Curso: ${courseLabel(11)} x`); count(s, 2);
  s.showFilters();
  s.choose('Curso:', courseLabel(10));
  s.choose('Año de inscripción:', '2024');
  s.press('Limpiar filtros'); count(s, 3);
  assert.match(text(s.tree), /Año de inscripción: Todos/);
  assert.doesNotMatch(text(s.tree), / x/);
});

test('expanded filters share a compact row with clear and do not duplicate selected values as chips', async () => {
  const s = await setup();
  s.showFilters();
  s.choose('Curso:', courseLabel(10));
  s.choose('Año de inscripción:', '2024');
  const course = nodes(s.tree).find(n => n.type === 'TouchableRipple' && text(n) === `Curso: ${courseLabel(10)}`);
  const year = nodes(s.tree).find(n => n.type === 'TouchableRipple' && text(n) === 'Año de inscripción: 2024');
  const clear = nodes(s.tree).find(n => n.type === 'TouchableRipple' && text(n) === 'Limpiar filtros');
  const row = nodes(s.tree).find(n => n.type === 'View' && n.children.includes(course) && n.children.includes(year) && n.children.includes(clear));
  assert.ok(row, 'Course, year and clear must belong to the same toolbar');
  assert.equal(row.props.style.flexDirection, 'row');
  assert.equal(row.props.style.flexWrap, 'wrap');
  assert.equal(row.props.style.marginBottom, undefined);
  assert.doesNotMatch(text(s.tree), /Curso: .* x|Año de inscripción: 2024 x/);
  count(s, 1);
  s.press('Limpiar filtros'); count(s, 3);
  assert.match(text(s.tree), /Curso: Todos/);
  assert.match(text(s.tree), /Año de inscripción: Todos/);
  assert.doesNotMatch(text(s.tree), /Limpiar filtros/);
});

test('collapsed filters retain removable chips and the list fills the remaining flexible height', async () => {
  const s = await setup();
  s.showFilters();
  s.choose('Curso:', courseLabel(10));
  s.choose('Año de inscripción:', '2024');
  s.showFilters();
  assert.match(text(s.tree), /Año de inscripción: 2024 x/);
  assert.ok(text(s.tree).includes(`Curso: ${courseLabel(10)} x`));
  assert.doesNotMatch(text(s.tree), /Limpiar filtros/);
  const list = nodes(s.tree).find(n => n.type === 'ScrollView' && Array.isArray(n.props.style));
  const style = Object.assign({}, ...list.props.style.filter(Boolean));
  assert.equal(style.flex, 1);
  assert.equal(style.minHeight, 0);
  assert.equal(style.maxHeight, undefined);
  s.press('Año de inscripción: 2024 x'); count(s, 2);
  s.showFilters();
  assert.match(text(s.tree), /Año de inscripción: Todos/);
  count(s, 2);
});

test('latest selection is stable across history order, prefers active within year, does not mutate API arrays', async () => {
  const old = insc(7, 10, 2023, { estado: 'Activa' });
  const latest = insc(8, 11, 2026, { estado: 'Activa', fechaInscripcion: '2026-01-01' });
  const other = insc(9, 10, 2026, { fechaInscripcion: '2026-12-01' });
  const history = { 1: Object.freeze([old, other, latest]) };
  const s = await setup({ students: [alumno(1)], history });
  const before = text(rows(s)[0]);
  assert.match(before, /3ro B.*2026/);
  history[1] = Object.freeze([latest, old, other]);
  await s.refresh();
  assert.equal(text(rows(s)[0]), before);
  assert.equal(history[1][0], latest);
});

test('same-year inactive selection uses date then id regardless of input order', async () => {
  const history = { 1: [insc(1, 10, 2025, { fechaInscripcion: '2025-01-01' }), insc(2, 11, 2025, { fechaInscripcion: '2025-02-01' })] };
  const s = await setup({ students: [alumno(1)], history });
  assert.match(text(rows(s)[0]), /3ro B/);
  const before = text(rows(s)[0]);
  history[1] = [...history[1]].reverse(); await s.refresh();
  assert.equal(text(rows(s)[0]), before);
  history[1] = [insc(1, 10, 2025), insc(2, 11, 2025)]; await s.refresh();
  assert.match(text(rows(s)[0]), /3ro B/);
});

test('empty list and empty search results still show zero count without filters', async () => {
  const empty = await setup({ students: [] }); count(empty, 0);
  const s = await setup(); s.search('nonexistent'); count(s, 0);
  assert.match(text(s.tree), /No hay alumnos para mostrar/);
});

test('malformed fields and missing year are safe, no invented year or null enrollment', async () => {
  const s = await setup({ students: [alumno(1, null, { numeroDocumento: 123, apellidos: {} }), alumno(2)],
    history: { 1: [null, 'broken', { cursoId: 10, anio: {}, estado: 'Activa' }], 2: [{ curso: {}, anio: 'invalid' }] } });
  count(s, 2);
  assert.match(text(rows(s)[0]), /Sin año informado/);
  s.showFilters();
  const trigger = nodes(s.tree).find(n => n.type === 'TouchableRipple' && text(n) === 'Año de inscripción: Todos');
  trigger.props.onPress(); s.render();
  assert.ok(nodes(s.tree).some(n => n.type === 'Text' && text(n) === String(new Date().getFullYear())));
  assert.doesNotMatch(text(s.tree), /Año de inscripción: (0|NaN|\[object)/);
  s.search('123'); count(s, 1);
});

test('duplicate API student entries still produce one row', async () => {
  const s = await setup({ students: [alumno(1), alumno(1)] });
  count(s, 1); assert.equal(rows(s).length, 1);
});

test('history failure hides complete counts and rows, then retry recovers', async () => {
  const s = await setup({ fail: true });
  assert.match(text(s.tree), /Alumnos encontrados: no disponible/);
  assert.match(text(s.tree), /historial de inscripciones/);
  assert.doesNotMatch(text(s.tree), /Alumnos encontrados: \d/);
  assert.equal(rows(s).length, 0);
  s.setFail(false); s.press('Reintentar');
  assert.match(text(s.tree), /Alumnos encontrados: cargando/);
  await settle(); s.render(); count(s, 3);
  s.setFail(true); await s.refresh();
  assert.match(text(s.tree), /Alumnos encontrados: no disponible/);
  assert.equal(rows(s).length, 0);
});

test('refocus reloads data while preserving search and selected filters', async () => {
  const s = await setup();
  s.showFilters(); s.choose('Año de inscripción:', '2024'); s.choose('Curso:', courseLabel(10));
  s.search('Ana');
  const before = s.calls;
  s.history[1] = [insc(5, 11, 2026)];
  await s.refresh();
  assert.equal(s.calls, before + 3); count(s, 0);
  assert.equal(nodes(s.tree).find(n => n.props.label === 'Buscar alumno').props.value, 'Ana');
  s.showFilters();
  for (const label of ['Año de inscripción: 2024 x', `Curso: ${courseLabel(10)} x`]) {
    assert.ok(text(s.tree).includes(label));
  }
});

test('invalid history response fails closed instead of claiming an empty complete history', async () => {
  const s = await setup({ students: [alumno(1)], history: { 1: { unexpected: [] } } });
  assert.match(text(s.tree), /Alumnos encontrados: no disponible/);
  assert.equal(rows(s).length, 0);
});

test('older focus requests cannot overwrite newer results or hide a newer history error', async () => {
  const pending = [];
  const screen = listadoScreen('AlumnosListadoScreen.tsx', {
    '../services/alumnoService': {
      getAlumnos: async () => [alumno(1)],
      getInscripcionesByAlumno: () => new Promise((resolve, reject) => pending.push({ resolve, reject })),
    },
    '../services/cursoService': { getCursos: async () => cursos },
  });
  screen.render(); press(screen.render(), 'Traer todos'); screen.render(); await settle();
  screen.blur(); screen.focus(); await settle();
  pending[1].resolve([insc(2, 11, 2026)]); await settle();
  assert.match(text(screen.render()), /Año de inscripción: 2026/);
  pending[0].resolve([insc(1, 10, 2024)]); await settle();
  assert.match(text(screen.render()), /Año de inscripción: 2026/);
  screen.blur(); screen.focus(); await settle();
  screen.blur(); screen.focus(); await settle();
  pending[3].reject(new Error('offline')); await settle();
  pending[2].resolve([]); await settle();
  assert.match(text(screen.render()), /Alumnos encontrados: no disponible/);
  assert.doesNotMatch(text(screen.render()), /Alumnos encontrados: \d/);
});

test('real detail back Button calls popTo and returns to existing list state with focus refresh', async () => {
  const s = await setup();
  s.showFilters(); s.choose('Año de inscripción:', '2024'); s.choose('Curso:', courseLabel(10)); s.search('Ana');
  rows(s)[0].props.onPress();
  assert.equal(s.route.name, 'AlumnoDetalle');
  assert.equal(s.route.params.alumno.anio, '2024');
  assert.doesNotThrow(() => JSON.stringify(s.route.params));
  const forbidden = () => { throw new Error('Unexpected backend write'); };
  let backCalls = 0;
  const detail = listadoScreen('AlumnoDetalleScreen.tsx', {
    navigation: { useRoute: () => s.route, useNavigation: () => ({ popTo(name) { backCalls++; s.back(name); } }) },
    '../hooks/useRedux': { useAppSelector: fn => fn({ app: { userRole: 'admin' } }) },
    '../services/alumnoService': { getInscripcionesByAlumno: async () => s.history[1], updateAlumno: forbidden, deleteAlumno: forbidden },
    '../services/cursoService': { getCursos: async () => cursos },
    '../services/alumnoDocumentoService': { getAlumnoDocumentos: async () => [], getTiposDocumentoAlumno: async () => [],
      updateAlumnoDocumentoUpload: forbidden, uploadAlumnoDocumento: forbidden, deleteAlumnoDocumento: forbidden },
    '../services/inscripcionService': { createInscripcion: forbidden, deleteInscripcion: forbidden },
    'expo-image-picker': {}, 'expo-document-picker': {},
    './CalificacionesScreen': { default: function CalificacionesScreen() {} },
    './ConstanciasTab': { default: function ConstanciasTab() {} },
    '../components/AlumnoBirthDateField': { default: function AlumnoBirthDateField() {} },
  });
  detail.render(); await settle();
  const tree = detail.render();
  const button = nodes(tree).find(n => n.type === 'Button' && /Volver/.test(text(n)));
  assert.ok(button, 'Detail has a rendered back button');
  const before = s.calls;
  button.props.onPress(); await settle(); s.render();
  assert.equal(backCalls, 1);
  assert.deepEqual(s.stack, ['AlumnosListado']);
  assert.equal(s.calls, before + 3);
  count(s, 1);
  s.showFilters();
  assert.match(text(s.tree), /Año de inscripción: 2024 x/);
  assert.ok(text(s.tree).includes(`Curso: ${courseLabel(10)} x`));
  assert.equal(nodes(s.tree).find(n => n.props.label === 'Buscar alumno').props.value, 'Ana');
});
