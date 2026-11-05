const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/services/env.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText;
const intranet = Object.fromEntries(fs.readFileSync(path.join(__dirname, '../.env.intranet'), 'utf8')
  .trim().split(/\r?\n/).map((line) => {
    const separator = line.indexOf('=');
    return [line.slice(0, separator), line.slice(separator + 1)];
  }));

function loadEnv({ dev = false, os = 'web', hostname = '192.168.1.50', hostUri, env = intranet } = {}) {
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    require: (name) => {
      if (name === 'expo-constants') return { expoConfig: { hostUri } };
      if (name === 'react-native') return { Platform: { OS: os } };
      throw new Error(`Unexpected module: ${name}`);
    },
    process: { env },
    __DEV__: dev,
    window: { location: { hostname } },
    URL,
  });
  return exports.default;
}

for (const dev of [true, false]) {
  test(`intranet resolves browser LAN hostname in ${dev ? 'development' : 'production'}`, () => {
    const env = loadEnv({ dev });
    assert.equal(env.API_URL, 'http://192.168.1.50:8080/api');
    assert.equal(env.ENV_LABEL, 'INTRANET');
    assert.equal(env.SHOW_ENV_INDICATOR, true);
    assert.equal(env.EXTERNAL_API_URL, '');
    assert.equal(intranet.EXPO_NO_DOTENV, '1');
  });
}

test('hostname follows the deployed page DNS name', () => {
  assert.equal(loadEnv({ hostname: 'cens-server.lan' }).API_URL, 'http://cens-server.lan:8080/api');
});

test('native template uses an available Expo host', () => {
  assert.equal(loadEnv({ os: 'android', hostUri: '192.168.1.50:8081' }).API_URL, 'http://192.168.1.50:8080/api');
});

test('native template without a server host fails clearly instead of using localhost', () => {
  assert.throws(() => loadEnv({ os: 'android' }), /INTRANET API URL requires.*explicit API server URL/);
});

test('explicit URLs and false or blank settings remain unchanged', () => {
  const env = loadEnv({ env: {
    EXPO_PUBLIC_API_URL_PROD: 'https://api.cens15.tierradelfuego.edu.ar/api',
    EXPO_PUBLIC_EXTERNAL_API_URL_PROD: '',
    EXPO_PUBLIC_ENV_LABEL: '',
    EXPO_PUBLIC_SHOW_ENV_INDICATOR: 'false',
  } });
  assert.equal(env.API_URL, 'https://api.cens15.tierradelfuego.edu.ar/api');
  assert.equal(env.EXTERNAL_API_URL, '');
  assert.equal(env.ENV_LABEL, '');
  assert.equal(env.SHOW_ENV_INDICATOR, false);
});

test('existing local web and native fallback URLs remain unchanged', () => {
  assert.equal(loadEnv({ dev: true, env: {} }).API_URL, 'https://localhost:7000/api');
  assert.equal(loadEnv({ dev: true, os: 'android', env: {} }).API_URL, 'http://10.0.2.2:5211/api');
});
