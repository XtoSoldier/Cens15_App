const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Independent harness: focus can be blurred/refocused without remounting hook state.
function listadoScreen(name, mocks = {}) {
  const hooks = [];
  const effects = [];
  const timers = new Map();
  let timerId = 0;
  let cursor = 0;
  let focused = true;
  let dimensions = { width: 390, height: 844 };
  const changed = (previous, deps) => !previous || !deps || deps.some((d, i) => !Object.is(d, previous[i]));
  const react = {
    Fragment: 'Fragment',
    createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
    useState(initial) {
      const index = cursor++;
      if (!(index in hooks)) hooks[index] = typeof initial === 'function' ? initial() : initial;
      return [hooks[index], value => { hooks[index] = typeof value === 'function' ? value(hooks[index]) : value; }];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in hooks)) hooks[index] = { current: initial };
      return hooks[index];
    },
    useMemo(factory, deps) {
      const index = cursor++;
      if (!hooks[index] || changed(hooks[index].deps, deps)) hooks[index] = { deps, value: factory() };
      return hooks[index].value;
    },
    useCallback(callback, deps) { return react.useMemo(() => callback, deps); },
    useEffect(callback, deps) {
      const index = cursor++;
      if (!hooks[index] || changed(hooks[index].deps, deps)) {
        const previous = hooks[index];
        hooks[index] = { deps, cleanup: null };
        effects.push(() => {
          previous?.cleanup?.();
          hooks[index].cleanup = callback();
        });
      }
    },
  };
  const focusHooks = [];
  const useFocusEffect = callback => {
    const index = cursor++;
    const previous = hooks[index];
    if (!previous) focusHooks.push(index);
    if (!previous || previous.callback !== callback) {
      hooks[index] = { callback, cleanup: null };
      effects.push(() => {
        previous?.cleanup?.();
        if (focused) hooks[index].cleanup = callback();
      });
    }
  };
  const native = Object.fromEntries(['View', 'ScrollView', 'TouchableOpacity', 'Modal', 'Image', 'TouchableWithoutFeedback'].map(x => [x, x]));
  Object.assign(native, { StyleSheet: { create: x => x }, Platform: { OS: 'web' },
    useWindowDimensions: () => dimensions,
    Alert: { alert: () => { throw new Error('Unexpected native alert'); } }, Linking: {} });
  const paper = Object.fromEntries(['Text', 'Surface', 'IconButton', 'TouchableRipple', 'ActivityIndicator', 'Button', 'Divider', 'Snackbar'].map(x => [x, x]));
  paper.TextInput = Object.assign(function TextInput() {}, { Icon: 'TextInput.Icon' });
  paper.DataTable = Object.assign(function DataTable() {}, { Header: 'Header', Title: 'Title', Row: 'Row', Cell: 'Cell' });
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const exports = {};
    cache.set(file, exports);
    const source = fs.readFileSync(file, 'utf8');
    const compiled = ts.transpileModule(source, { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, esModuleInterop: true,
    } }).outputText;
    vm.runInNewContext(compiled, { exports, console,
      setTimeout: callback => { timers.set(++timerId, callback); return timerId; },
      clearTimeout: id => timers.delete(id),
      require(dependency) {
      if (dependency in mocks) return mocks[dependency];
      if (dependency === 'react') return react;
      if (dependency === 'react-native') return native;
      if (dependency === 'react-native-paper') return paper;
      if (dependency === '@react-navigation/native') return { useFocusEffect, useNavigation: () => ({}), ...mocks.navigation };
      if (dependency.startsWith('.')) {
        const resolved = path.resolve(path.dirname(file), dependency);
        const ext = ['.ts', '.tsx'].find(ext => fs.existsSync(resolved + ext));
        if (ext) return load(resolved + ext);
      }
      throw new Error(`Unexpected listado dependency: ${dependency}`);
    } });
    return exports;
  }
  const component = load(path.join(__dirname, '../src/screens', name)).default;
  return {
    load: file => load(path.join(__dirname, '../src', file)),
    flushTimers() { const pending = [...timers.values()]; timers.clear(); pending.forEach(callback => callback()); },
    resize(width, height = 844) { dimensions = { width, height }; },
    render() {
      cursor = 0;
      const tree = component({});
      effects.splice(0).forEach(effect => effect());
      return tree;
    },
    blur() {
      focused = false;
      focusHooks.forEach(index => { hooks[index].cleanup?.(); hooks[index].cleanup = null; });
    },
    focus() {
      if (focused) return;
      focused = true;
      focusHooks.forEach(index => { hooks[index].cleanup = hooks[index].callback(); });
    },
  };
}

function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...(tree.children || []).flatMap(nodes)];
}
function text(tree) {
  if (Array.isArray(tree)) return tree.map(text).join('');
  if (tree == null || typeof tree === 'boolean') return '';
  return typeof tree === 'object' ? text(tree.children || []) : String(tree);
}
function press(tree, label) {
  const node = nodes(tree).find(n => n.props.onPress && text(n) === label);
  if (!node) throw new Error(`No press target: ${label}\n${text(tree)}`);
  return node.props.onPress();
}
const settle = () => new Promise(resolve => setImmediate(resolve));
module.exports = { listadoScreen, nodes, text, press, settle };
