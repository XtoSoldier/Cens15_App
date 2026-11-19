const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function fixture(platform = 'web', doc) {
  const hooks = [];
  const effects = [];
  const cleanups = [];
  let cursor = 0;
  const react = {
    Fragment: 'Fragment',
    createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
    useState(value) {
      const i = cursor++;
      if (!(i in hooks)) hooks[i] = value;
      return [hooks[i], next => { hooks[i] = next; }];
    },
    useRef(value) {
      const i = cursor++;
      if (!(i in hooks)) hooks[i] = { current: value };
      return hooks[i];
    },
    useEffect(effect) {
      const i = cursor++;
      if (!(i in hooks)) { hooks[i] = true; effects.push(effect); }
    },
  };
  const Dialog = Object.assign(function Dialog() {}, { Title: 'Title', Content: 'Content', Actions: 'Actions' });
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, '../src/components/FullscreenButton.tsx'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, esModuleInterop: true,
  } }).outputText;
  vm.runInNewContext(compiled, { exports, document: doc, require(name) {
    if (name === 'react') return react;
    if (name === 'react-native') return { Platform: { OS: platform } };
    if (name === 'react-native-paper') return { Dialog, Button: 'Button', IconButton: 'IconButton', Portal: 'Portal', Text: 'Text' };
    throw new Error(`Unexpected dependency ${name}`);
  } });
  const render = () => {
    cursor = 0;
    const tree = exports.default();
    effects.splice(0).forEach(effect => { const cleanup = effect(); if (cleanup) cleanups.push(cleanup); });
    return tree;
  };
  const nodes = tree => !tree || typeof tree !== 'object' ? [] : [tree, ...(tree.children || []).flatMap(nodes)];
  return {
    render,
    button: () => nodes(render()).find(n => n.type === 'IconButton'),
    dialog: () => nodes(render()).find(n => n.type === Dialog),
    text: () => nodes(render()).find(n => n.type === 'Text').children.join(''),
    dismiss: () => nodes(render()).find(n => n.type === 'Button').props.onPress(),
    cleanup: () => cleanups.forEach(cleanup => cleanup()),
  };
}

function browser() {
  const listeners = new Map();
  let requests = 0;
  let exits = 0;
  const doc = {
    fullscreenElement: null,
    documentElement: {},
    addEventListener: (name, handler) => listeners.set(name, handler),
    removeEventListener: (name, handler) => { assert.equal(listeners.get(name), handler); listeners.delete(name); },
    emit: name => listeners.get(name)?.(),
    async exitFullscreen() { assert.equal(this, doc); exits++; doc.fullscreenElement = null; doc.emit('fullscreenchange'); },
  };
  doc.documentElement.requestFullscreen = async function (options) {
    assert.equal(this, doc.documentElement);
    assert.equal(options.navigationUI, 'hide');
    requests++;
    doc.fullscreenElement = doc.documentElement;
    doc.emit('fullscreenchange');
  };
  return { doc, listeners, get requests() { return requests; }, get exits() { return exits; } };
}

test('web button enters and exits fullscreen on the document without reloading', async () => {
  const b = browser();
  const f = fixture('web', b.doc);
  assert.equal(f.button().props.icon, 'fullscreen');
  await f.button().props.onPress();
  assert.equal(b.requests, 1);
  assert.equal(f.button().props.icon, 'fullscreen-exit');
  assert.equal(f.button().props.accessibilityLabel, 'Salir de pantalla completa');
  await f.button().props.onPress();
  assert.equal(b.exits, 1);
  assert.equal(f.button().props.icon, 'fullscreen');
});

test('browser exit gestures update the icon and unmount removes all listeners', async () => {
  const b = browser();
  const f = fixture('web', b.doc);
  await f.button().props.onPress();
  b.doc.fullscreenElement = null;
  b.doc.emit('fullscreenchange');
  assert.equal(f.button().props.icon, 'fullscreen');
  assert.equal(b.listeners.size, 4);
  f.cleanup();
  assert.equal(b.listeners.size, 0);
});

test('WebKit fullscreen methods preserve their document and element receivers', async () => {
  const b = browser();
  delete b.doc.documentElement.requestFullscreen;
  delete b.doc.exitFullscreen;
  b.doc.documentElement.webkitRequestFullscreen = function () {
    assert.equal(this, b.doc.documentElement);
    b.doc.webkitFullscreenElement = this;
    b.doc.emit('webkitfullscreenchange');
  };
  b.doc.webkitExitFullscreen = function () {
    assert.equal(this, b.doc);
    b.doc.webkitFullscreenElement = null;
    b.doc.emit('webkitfullscreenchange');
  };
  const f = fixture('web', b.doc);
  await f.button().props.onPress();
  assert.equal(f.button().props.icon, 'fullscreen-exit');
  await f.button().props.onPress();
  assert.equal(f.button().props.icon, 'fullscreen');
});

test('unsupported mobile browsers display home-screen guidance and allow dismissal', async () => {
  const b = browser();
  delete b.doc.documentElement.requestFullscreen;
  const f = fixture('web', b.doc);
  await f.button().props.onPress();
  assert.equal(f.dialog().props.visible, true);
  assert.match(f.text(), /iPhone\/iPad.*Compartir > Agregar a pantalla de inicio/);
  f.dismiss();
  assert.equal(f.dialog().props.visible, false);
});

test('browser rejection and fullscreenerror show a recoverable message', async () => {
  const b = browser();
  b.doc.documentElement.requestFullscreen = () => Promise.reject(new Error('Denied'));
  const f = fixture('web', b.doc);
  await f.button().props.onPress();
  assert.equal(f.dialog().props.visible, true);
  assert.equal(f.button().props.disabled, false);
  assert.match(f.text(), /No se pudo/);
  f.dismiss();
  b.doc.emit('fullscreenerror');
  assert.equal(f.dialog().props.visible, true);
});

test('rapid taps cannot start duplicate pending fullscreen requests', async () => {
  const b = browser();
  let requests = 0;
  let resolve;
  b.doc.documentElement.requestFullscreen = () => { requests++; return new Promise(done => { resolve = done; }); };
  const f = fixture('web', b.doc);
  const press = f.button().props.onPress;
  const pending = press();
  await press();
  assert.equal(requests, 1);
  assert.equal(f.button().props.disabled, true);
  resolve();
  await pending;
  assert.equal(f.button().props.disabled, false);
});

test('native platforms and server rendering do not require a DOM or show the button', () => {
  assert.equal(fixture('android', new Proxy({}, { get() { throw new Error('DOM accessed on native'); } })).render(), null);
  assert.equal(fixture('ios').render(), null);
  assert.equal(fixture('web').render(), null);
});
