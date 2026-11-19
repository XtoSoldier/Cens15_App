const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Separate from the authentication harness: grading needs effects, refs and functional setters.
function gradingScreen(name, mocks = {}, props = {}) {
  const hooks = [];
  const effects = [];
  let cursor = 0;
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
    useEffect(effect, deps) {
      const index = cursor++;
      const previous = hooks[index];
      if (!previous || deps.some((dep, i) => !Object.is(dep, previous[i]))) effects.push(effect);
      hooks[index] = deps;
    },
  };
  const native = Object.fromEntries(['View', 'ScrollView', 'KeyboardAvoidingView', 'TouchableOpacity', 'Modal', 'TouchableWithoutFeedback', 'ActivityIndicator'].map(x => [x, x]));
  native.StyleSheet = { create: x => x };
  native.Platform = { OS: 'web' };
  native.Alert = { alert() { throw new Error('Grading must display web-safe errors'); } };
  const paper = Object.fromEntries(['Text', 'TextInput', 'Surface', 'Chip', 'IconButton', 'Button', 'ActivityIndicator', 'Checkbox'].map(x => [x, x]));
  paper.DataTable = Object.assign('DataTable', { Header: 'Header', Title: 'Title', Row: 'Row', Cell: 'Cell' });
  paper.Avatar = { Text: 'Avatar' };
  paper.RadioButton = { Group: 'RadioGroup', Item: 'RadioItem' };
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const exports = {};
    cache.set(file, exports);
    const source = fs.readFileSync(file, 'utf8');
    const compiled = ts.transpileModule(source, { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, esModuleInterop: true,
    } }).outputText;
    const testExports = '\nif (typeof buildBoletinHtml !== "undefined") exports.buildBoletinHtml = buildBoletinHtml;\nif (typeof BoletinPreviewModal !== "undefined") exports.BoletinPreviewModal = BoletinPreviewModal;';
    vm.runInNewContext(compiled + testExports, { exports, console, setTimeout, require(dependency) {
      if (dependency in mocks) return mocks[dependency];
      if (dependency === 'react') return react;
      if (dependency === 'react-native') return native;
      if (dependency === 'react-native-paper') return paper;
      if (dependency === '@react-navigation/native') return { useNavigation: () => ({}) };
      if (dependency === '../hooks/useRedux') return { useAppSelector: fn => fn({ app: { userId: 'teacher' } }), useAppDispatch: () => () => {} };
      if (dependency === '../slices/appSlice') return { updateProfile: x => x };
      if (dependency === '../utils/storage') return { getUserIdFromToken: async () => 'teacher' };
      if (dependency === 'expo-print' || dependency === 'expo-sharing') return {};
      if (dependency.startsWith('.')) {
        const resolved = path.resolve(path.dirname(file), dependency);
        const extension = ['.ts', '.tsx'].find(ext => fs.existsSync(resolved + ext));
        if (extension) return load(resolved + extension);
      }
      throw new Error(`Unexpected grading dependency: ${dependency}`);
    } });
    return exports;
  }
  const component = load(path.join(__dirname, `../src/${name}`)).default;
  return {
    render(nextProps) {
      if (nextProps) props = nextProps;
      cursor = 0;
      const tree = component(props);
      effects.splice(0).forEach(effect => effect());
      return tree;
    },
    load: file => load(path.join(__dirname, '../src', file)),
  };
}

function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...(tree.children || []).flatMap(nodes)];
}
const named = (tree, name) => nodes(tree).find(node => typeof node.type === 'function' && node.type.name === name);
const settle = () => new Promise(resolve => setImmediate(resolve));
module.exports = { gradingScreen, nodes, named, settle };
