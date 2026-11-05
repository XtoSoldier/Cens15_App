const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function screen(name, auth) {
  const source = fs.readFileSync(path.join(__dirname, `../src/screens/${name}.tsx`), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, esModuleInterop: true,
  } }).outputText;
  const values = [];
  let cursor;
  const navigation = { calls: [], resets: [],
    navigate: (...args) => navigation.calls.push(args),
    reset: (value) => navigation.resets.push(value),
  };
  const react = {
    Fragment: 'Fragment',
    useState: (initial) => {
      const index = cursor++;
      if (!(index in values)) values[index] = initial;
      return [values[index], (value) => { values[index] = value; }];
    },
    createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
  };
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    require: (dependency) => {
      if (dependency === 'react') return react;
      if (dependency === '@react-navigation/native') return {
        useNavigation: () => navigation, useRoute: () => ({ params: { email: 'ana@example.com' } }),
      };
      if (dependency === 'react-native') return {
        StyleSheet: { create: (styles) => styles }, Platform: { OS: 'web' },
        Image: 'Image', View: 'View', ScrollView: 'ScrollView', KeyboardAvoidingView: 'KeyboardAvoidingView',
        Alert: { alert: () => { throw new Error('Web must not rely on Alert.alert'); } },
      };
      if (dependency === 'react-native-paper') return {
        Text: 'Text', TextInput: 'TextInput', Button: 'Button', IconButton: 'IconButton', Surface: 'Surface',
      };
      if (dependency === '../services/authService') return auth;
      if (dependency.endsWith('cens_logo.jpeg')) return {};
      throw new Error(`Unexpected dependency: ${dependency}`);
    },
  });
  return { navigation, render: () => { cursor = 0; return exports.default(); } };
}

function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...tree.children.flatMap(nodes)];
}
const find = (tree, type) => nodes(tree).find((node) => node.type === type);
const input = (tree, label) => nodes(tree).find((node) => node.type === 'TextInput' && node.props.label === label);
const button = (tree, text) => nodes(tree).find((node) => node.type === 'Button' && node.children.join('') === text);
const messages = (tree) => nodes(tree).filter((node) => node.props.accessibilityRole === 'alert').map((node) => node.children.join(''));

module.exports = { screen, nodes, find, input, button, messages };
