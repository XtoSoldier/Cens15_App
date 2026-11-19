const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/services/healthService.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;

function probe(fetch) {
  const exports = {};
  vm.runInNewContext(compiled, { exports, fetch });
  return exports.checkApiHealth;
}

test('health uses GET /health without tokens or opaque no-cors responses', async () => {
  let call;
  const check = probe(async (url, options) => {
    call = { url, options };
    return { ok: true, json: async () => ({ status: 'ok' }) };
  });
  const signal = new AbortController().signal;
  assert.equal(await check('https://localhost:7000/api/', signal), true);
  assert.equal(call.url, 'https://localhost:7000/api/health');
  assert.equal(call.options.method, 'GET');
  assert.equal(call.options.signal, signal);
  assert.equal(call.options.cache, 'no-store');
  assert.equal(call.options.mode, undefined);
  assert.equal(call.options.headers, undefined);
});

test('HTTP errors and unexpected response bodies never mark the API active', async () => {
  assert.equal(await probe(async () => ({ ok: false }))('http://server/api'), false);
  assert.equal(await probe(async () => ({ ok: true, json: async () => ({ status: 'failed' }) }))('http://server/api'), false);
});

test('network failures and malformed responses propagate to the status indicator', async () => {
  await assert.rejects(probe(async () => { throw new Error('network'); })('http://server/api'), /network/);
  await assert.rejects(probe(async () => ({ ok: true, json: async () => { throw new Error('invalid JSON'); } }))('http://server/api'), /invalid JSON/);
});

test('app status indicator schedules health checks every 60 seconds and clears the interval on unmount', async () => {
  const effects = [];
  const intervals = new Map();
  let calls = 0;
  const react = {
    createElement: () => null,
    useState: value => [value, () => {}],
    useEffect: effect => effects.push(effect),
  };
  const exports = {};
  const component = fs.readFileSync(path.join(__dirname, '../src/components/EnvironmentRibbon.tsx'), 'utf8');
  const compiledComponent = ts.transpileModule(component, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, esModuleInterop: true,
  } }).outputText;
  vm.runInNewContext(compiledComponent, {
    exports, AbortController, setTimeout, clearTimeout,
    setInterval: (callback, delay) => { intervals.set(1, { callback, delay }); return 1; },
    clearInterval: id => intervals.delete(id),
    require(name) {
      if (name === 'react') return react;
      if (name === 'react-native') return { StyleSheet: { create: x => x }, Linking: {}, View: 'View', Text: 'Text', TouchableOpacity: 'TouchableOpacity' };
      if (name === '../services/env') return { API_URL: 'https://own.test/api', SHOW_ENV_INDICATOR: true, ENV_LABEL: 'TEST' };
      if (name === '../services/healthService') return { checkApiHealth: async () => { calls++; return true; } };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  exports.default();
  const cleanup = effects[0]();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls, 1, 'initial health check');
  assert.equal(intervals.get(1).delay, 60000);
  await intervals.get(1).callback();
  assert.equal(calls, 2);
  cleanup();
  assert.equal(intervals.size, 0);
});
