const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { alumnoDateValue } = require('../src/utils/alumnoFields.ts');

function field(value) {
  let open = false;
  const changes = [];
  const react = {
    useState: () => [open, (next) => { open = next; }],
    createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
  };
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, '../src/components/AlumnoBirthDateField.tsx'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, esModuleInterop: true,
  } }).outputText;
  vm.runInNewContext(compiled, {
    exports, Date,
    require: (dependency) => {
      if (dependency === 'react') return react;
      if (dependency === 'react-native') return { Platform: { OS: 'android' }, View: 'View' };
      if (dependency === 'react-native-paper') return { Button: 'Button', Text: 'Text' };
      if (dependency === '@react-native-community/datetimepicker') return 'DateTimePicker';
      if (dependency === '../utils/alumnoFields') return { alumnoDateValue };
      throw new Error(`Unexpected dependency: ${dependency}`);
    },
  });
  return { changes, render: () => exports.default({ value, onChange: (next) => changes.push(next) }) };
}

const nodes = (tree) => !tree || typeof tree !== 'object' ? [] :
  Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...tree.children.flatMap(nodes)];

test('opening and dismissing an unknown birth date never commits today', () => {
  const { render, changes } = field(null);
  assert.equal(nodes(render()).find((node) => node.type === 'Button').children[0], 'Sin informar');
  nodes(render()).find((node) => node.type === 'Button').props.onPress();
  const picker = nodes(render()).find((node) => node.type === 'DateTimePicker');
  assert.ok(picker);
  assert.deepEqual(changes, []);
  picker.props.onChange({ type: 'dismissed' }, new Date());
  assert.deepEqual(changes, []);
});

test('a selected date is committed and existing dates can be explicitly cleared', () => {
  const empty = field(null);
  nodes(empty.render()).find((node) => node.type === 'Button').props.onPress();
  nodes(empty.render()).find((node) => node.type === 'DateTimePicker').props.onChange({ type: 'set' }, new Date(2000, 1, 29));
  assert.deepEqual(empty.changes, ['2000-02-29']);
  const existing = field('2000-02-29');
  const buttons = nodes(existing.render()).filter((node) => node.type === 'Button');
  assert.equal(buttons[0].children[0], '29/02/2000');
  buttons.find((node) => node.children[0] === 'Quitar fecha').props.onPress();
  assert.deepEqual(existing.changes, ['']);
});
