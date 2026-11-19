const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');

const exportsObject = {};
vm.runInNewContext(ts.transpileModule(
  fs.readFileSync(path.join(__dirname, '../src/utils/webPullToRefresh.ts'), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } },
).outputText, { exports: exportsObject });
const { installWebPullToRefresh, PULL_THRESHOLD } = exportsObject;

function fixture() {
  const listeners = new Map();
  const options = new Map();
  const distances = [];
  let refreshes = 0;
  const root = {
    ownerDocument: { scrollingElement: { scrollTop: 0 } },
    scrollTop: 0,
    parentElement: null,
    addEventListener(name, listener, config) { listeners.set(name, listener); options.set(name, config); },
    removeEventListener(name, listener) { assert.equal(listeners.get(name), listener); listeners.delete(name); },
  };
  const target = { scrollTop: 0, parentElement: root, closest: () => null };
  const cleanup = installWebPullToRefresh(root, value => distances.push(value), () => refreshes++);
  function emit(name, x = 0, y = 0, extra = {}) {
    const event = {
      target, touches: [{ clientX: x, clientY: y }], cancelable: true,
      prevented: false, stopped: false,
      preventDefault() { this.prevented = true; },
      stopPropagation() { this.stopped = true; },
      ...extra,
    };
    listeners.get(name)?.(event);
    return event;
  }
  return { root, target, listeners, options, distances, emit, cleanup, get refreshes() { return refreshes; } };
}

test('a downward pull at the top refreshes once on release, not on movement', () => {
  const f = fixture();
  assert.equal(f.options.get('touchmove').passive, false);
  assert.equal(f.options.get('touchmove').capture, true);
  f.emit('touchstart', 0, 100);
  assert.equal(f.emit('touchmove', 0, 240).prevented, true);
  assert.ok(f.distances.at(-1) >= PULL_THRESHOLD);
  assert.equal(f.refreshes, 0);
  assert.equal(f.emit('touchend').prevented, true);
  assert.equal(f.refreshes, 1);
  f.emit('touchstart');
  f.emit('touchmove', 0, 200);
  f.emit('touchend');
  assert.equal(f.refreshes, 1);
  assert.equal(f.emit('click').prevented, true);
});

test('short pulls and canceled gestures reset without refreshing', () => {
  for (const end of ['touchend', 'touchcancel']) {
    const f = fixture();
    f.emit('touchstart');
    f.emit('touchmove', 0, end === 'touchcancel' ? 200 : 50);
    f.emit(end);
    assert.equal(f.refreshes, 0);
    assert.equal(f.distances.at(-1), 0);
  }
});

test('regular taps, upward scrolling and horizontal swipes are not intercepted', () => {
  for (const [x, y] of [[0, 0], [0, -100], [100, 30]]) {
    const f = fixture();
    f.emit('touchstart');
    assert.equal(f.emit('touchmove', x, y).prevented, false);
    assert.equal(f.emit('touchend').stopped, false);
    assert.equal(f.emit('click').prevented, false);
    assert.equal(f.refreshes, 0);
  }
});

test('nested lists, parent scroll containers and the document must all be at the top', () => {
  for (const scroller of ['target', 'root', 'document']) {
    const f = fixture();
    const element = scroller === 'document' ? f.root.ownerDocument.scrollingElement : f[scroller];
    element.scrollTop = 100;
    f.emit('touchstart');
    element.scrollTop = 0;
    assert.equal(f.emit('touchmove', 0, 200).prevented, false);
    f.emit('touchend');
    assert.equal(f.refreshes, 0);
  }
});

test('editing, multi-touch and non-cancelable browser gestures never refresh', () => {
  for (const scenario of ['editing', 'multitouch-start', 'multitouch-move', 'browser-scroll', 'scroll-changed']) {
    const f = fixture();
    if (scenario === 'editing') f.target.closest = () => ({});
    f.emit('touchstart', 0, 0, scenario === 'multitouch-start' ? { touches: [{}, {}] } : {});
    if (scenario === 'scroll-changed') f.target.scrollTop = 5;
    const extra = scenario === 'multitouch-move' ? { touches: [{}, {}] }
      : scenario === 'browser-scroll' ? { cancelable: false } : {};
    assert.equal(f.emit('touchmove', 0, 200, extra).prevented, false);
    f.emit('touchend');
    assert.equal(f.refreshes, 0);
  }
});

test('cleanup removes every installed listener', () => {
  const f = fixture();
  assert.equal(f.listeners.size, 5);
  f.cleanup();
  assert.equal(f.listeners.size, 0);
});
