const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const jwt = (payload) => `e30.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.c2ln`;
const deferred = () => { let resolve; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; };

function harness({ browser, page } = {}) {
  let now = 100000;
  let fetchImpl = async () => new Response('{}');
  const values = new Map();
  const timers = new Map();
  let timerId = 0;
  const cache = new Map();
  const storage = {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
    removeItem: async (key) => { values.delete(key); },
    multiRemove: async (keys) => { keys.forEach((key) => values.delete(key)); },
  };
  function load(relative) {
    const filename = path.resolve(__dirname, '..', relative);
    if (cache.has(filename)) return cache.get(filename);
    const exports = {};
    cache.set(filename, exports);
    const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    }).outputText;
    vm.runInNewContext(compiled, {
      exports, atob, Headers, URL, FormData, window: browser, document: page,
      Date: class extends Date { static now() { return now; } },
      setTimeout: (callback, delay) => { const id = ++timerId; timers.set(id, { callback, delay }); return id; },
      clearTimeout: (id) => timers.delete(id),
      fetch: (...args) => fetchImpl(...args),
      require: (name) => {
        if (name === '@react-native-async-storage/async-storage') return storage;
        if (name === './env') return { API_URL: 'https://own.test/api', EXTERNAL_API_URL: 'https://external.test' };
        if (name.startsWith('.')) return load(path.relative(path.resolve(__dirname, '..'), path.resolve(path.dirname(filename), `${name}.ts`)));
        if (name === '@reduxjs/toolkit') return require(name);
        throw new Error(`Unexpected dependency ${name}`);
      },
    }, { filename });
    return exports;
  }
  return {
    load, values, timers, storage,
    session: load('src/utils/session.ts'),
    credentials: load('src/utils/storage.ts'),
    setNow: (value) => { now = value; },
    setFetch: (value) => { fetchImpl = value; },
  };
}

test('JWT deadline is exact and base64url payload needs no input padding', () => {
  const h = harness();
  const token = jwt({ exp: 101, sub: 'user' });
  assert.equal(h.session.tokenDeadline(token), 101000);
  assert.equal(h.session.isSessionTokenUsable(token, 100999), true);
  assert.equal(h.session.isSessionTokenUsable(token, 101000), false);
  assert.equal(h.session.isSessionTokenUsable(token, 101001), false);
});

test('missing, malformed, nonnumeric and nonfinite deadlines are unusable', () => {
  const h = harness();
  for (const token of [jwt({}), jwt({ exp: '200' }), jwt({ exp: null }), jwt({ exp: 1e308 }), 'x.y.z', 'bad', 'e30.eyJleHAiOjFlOTk5fQ.c2ln']) {
    assert.equal(h.session.isSessionTokenUsable(token), false, token);
  }
});

test('startup expired token is removed once while remembered device data survives', async () => {
  const h = harness();
  h.values.set('user_token', jwt({ exp: 100 }));
  h.values.set('biometric_login_enabled', 'true');
  h.values.set('user_email', 'remembered@example.test');
  h.values.set('user_name', 'Remembered');
  let expired = 0;
  const unsubscribe = h.session.onSessionExpired(() => expired++);
  assert.equal(await h.credentials.getToken(), null);
  assert.equal(await h.credentials.getToken(), null);
  assert.equal(expired, 1);
  assert.equal(h.values.has('user_token'), false);
  assert.equal(await h.credentials.isBiometricLoginEnabled(), true);
  assert.equal((await h.credentials.getSavedProfile()).userName, 'Remembered');
  assert.equal(h.values.get('user_email'), 'remembered@example.test');
  unsubscribe();
});

test('guest startup emits no expiration and does not force a public navigation reset', async () => {
  const h = harness();
  let expired = 0;
  h.session.onSessionExpired(() => expired++);
  assert.equal(await h.credentials.getToken(), null);
  assert.equal(expired, 0);
});

test('absolute timer expires the stored credential and cleans subscriptions', async () => {
  const h = harness();
  const stop = h.session.watchSessionExpiry(h.credentials.getToken);
  await h.credentials.saveToken(jwt({ exp: 102 }));
  assert.equal([...h.timers.values()][0].delay, 2000);
  h.setNow(101000);
  await h.credentials.getToken();
  assert.equal([...h.timers.values()][0].delay, 1000);
  h.setNow(102000);
  const timer = [...h.timers.values()][0];
  timer.callback();
  await h.credentials.getToken();
  assert.equal(h.values.has('user_token'), false);
  stop();
  assert.equal(h.timers.size, 0);
});

test('long deadline timers cap their delay and re-arm without expiring early', async () => {
  const h = harness();
  const stop = h.session.watchSessionExpiry(h.credentials.getToken);
  const token = jwt({ exp: 5000000 });
  await h.credentials.saveToken(token);
  assert.equal([...h.timers.values()][0].delay, 2147483647);
  h.setNow(2147583647);
  [...h.timers.values()][0].callback();
  assert.equal(await h.credentials.getToken(), token);
  stop();
});

test('own API 401 expires only its attached current credential and preserves the HTTP message', async () => {
  const h = harness();
  const token = jwt({ exp: 200 });
  await h.credentials.saveToken(token);
  let expired = 0;
  h.session.onSessionExpired(() => expired++);
  h.setFetch(async (url, options) => {
    assert.equal(url, 'https://own.test/api/Alumnos');
    assert.equal(options.headers.get('Authorization'), `Bearer ${token}`);
    return new Response('{"message":"Unauthorized original"}', { status: 401 });
  });
  await assert.rejects(h.load('src/services/api.ts').apiFetch('Alumnos'), /Unauthorized original/);
  assert.equal(expired, 1);
  assert.equal(await h.credentials.getToken(), null);
});

test('a delayed old 401 cannot clear a newer login credential', async () => {
  const h = harness();
  const oldToken = jwt({ exp: 200, sub: 'old' });
  const newToken = jwt({ exp: 300, sub: 'new' });
  await h.credentials.saveToken(oldToken);
  const sent = deferred();
  const result = deferred();
  h.setFetch(async () => { sent.resolve(); return result.promise; });
  const pending = h.load('src/services/api.ts').authenticatedApiRequest('Alumnos');
  await sent.promise;
  await h.credentials.saveToken(newToken);
  result.resolve(new Response('old error', { status: 401 }));
  await pending;
  assert.equal(await h.credentials.getToken(), newToken);
  assert.equal(h.session.isSessionTokenUsable(oldToken), false);
});

for (const status of [403, 500]) {
  test(`${status} does not expire the credential and preserves non-JSON errors`, async () => {
    const h = harness();
    const token = jwt({ exp: 200 });
    await h.credentials.saveToken(token);
    h.setFetch(async () => new Response('original failure', { status }));
    await assert.rejects(h.load('src/services/api.ts').apiFetch('Alumnos'), /original failure/);
    assert.equal(await h.credentials.getToken(), token);
  });
}

test('network errors do not expire the credential', async () => {
  const h = harness();
  const token = jwt({ exp: 200 });
  await h.credentials.saveToken(token);
  h.setFetch(async () => { throw new Error('offline'); });
  await assert.rejects(h.load('src/services/api.ts').apiFetch('Alumnos'), /offline/);
  assert.equal(await h.credentials.getToken(), token);
});

test('login 401 and external 401 never attach or expire the saved credential', async () => {
  const h = harness();
  const token = jwt({ exp: 200 });
  await h.credentials.saveToken(token);
  h.setFetch(async (url, options) => {
    const headers = new Headers(options.headers);
    assert.equal(headers.has('Authorization'), false);
    return new Response('Invalid Credentials', { status: 401 });
  });
  const api = h.load('src/services/api.ts');
  await assert.rejects(api.apiFetch('auth/login'), /Invalid Credentials/);
  await assert.rejects(api.externalApiFetch('lookup'), /Invalid Credentials/);
  assert.equal(await h.credentials.getToken(), token);
  await assert.rejects(api.authenticatedApiRequest('https://external.test/lookup'), /API-relative/);
});

test('public password login still proceeds after discovering an expired saved token', async () => {
  const h = harness();
  h.values.set('user_token', jwt({ exp: 100 }));
  const token = jwt({ exp: 200, sub: 'new' });
  h.setFetch(async (_url, options) => {
    assert.equal(options.headers.has('Authorization'), false);
    return new Response(JSON.stringify({ token, name: 'New', userId: 'new' }));
  });
  const result = await h.load('src/services/authService.ts').login('user@example.test', 'password');
  assert.equal(result.token, token);
  assert.equal(await h.credentials.getToken(), token);
});

test('login rejects expired or malformed returned JWT before saving profile', async () => {
  for (const token of [jwt({ exp: 100 }), jwt({}), 'malformed']) {
    const h = harness();
    h.setFetch(async () => new Response(JSON.stringify({ token, name: 'Invalid' })));
    await assert.rejects(h.load('src/services/authService.ts').login('user@example.test', 'password'), /expirado/);
    assert.equal(h.values.has('user_token'), false);
    assert.equal(h.values.has('user_name'), false);
  }
});

test('foreground, browser focus and visibility recheck credentials and clean up', async () => {
  const listeners = new Map();
  const browser = {
    addEventListener: (event, callback) => listeners.set(event, callback),
    removeEventListener: (event) => listeners.delete(event),
    visibilityState: 'hidden',
  };
  const h = harness({ browser, page: browser });
  let onState;
  let removed = false;
  let checks = 0;
  const stop = h.load('src/utils/sessionLifecycle.web.ts').observeSessionForeground(async () => { checks++; }, {
    addEventListener: (_event, callback) => { onState = callback; return { remove: () => { removed = true; } }; },
  });
  onState('background');
  listeners.get('visibilitychange')();
  assert.equal(checks, 0);
  onState('active');
  listeners.get('focus')();
  browser.visibilityState = 'visible';
  listeners.get('visibilitychange')();
  assert.equal(checks, 3);
  stop();
  assert.equal(removed, true);
  assert.equal(listeners.size, 0);
});

test('native window without DOM events does not crash foreground registration or cleanup', async () => {
  const h = harness({ browser: {}, page: { visibilityState: 'visible' } });
  let onState;
  let checks = 0;
  let removed = false;
  const stop = h.load('src/utils/sessionLifecycle.web.ts').observeSessionForeground(async () => { checks++; }, {
    addEventListener: (_event, callback) => { onState = callback; return { remove: () => { removed = true; } }; },
  });
  onState('background');
  assert.equal(checks, 0);
  onState('active');
  assert.equal(checks, 1);
  assert.doesNotThrow(stop);
  assert.equal(removed, true);
});

test('non-callable DOM event properties cannot crash native-like globals', () => {
  const target = { addEventListener: true, removeEventListener: false, visibilityState: 'visible' };
  const h = harness({ browser: target, page: target });
  const stop = h.load('src/utils/sessionLifecycle.web.ts').observeSessionForeground(async () => {}, {
    addEventListener: () => ({ remove: () => {} }),
  });
  assert.doesNotThrow(stop);
});

test('native platform module only subscribes to AppState and never touches DOM-like globals', () => {
  const h = harness();
  let onState;
  let removed = false;
  let checks = 0;
  const browser = new Proxy({}, { get: () => { throw new Error('Native must not access browser events'); } });
  const stop = h.load('src/utils/sessionLifecycle.native.ts').observeSessionForeground(async () => { checks++; }, {
    addEventListener: (event, callback) => {
      assert.equal(event, 'change');
      onState = callback;
      return { remove: () => { removed = true; } };
    },
  }, browser, browser);
  onState('background');
  assert.equal(checks, 0);
  onState('active');
  assert.equal(checks, 1);
  stop();
  assert.equal(removed, true);
});

test('manual Redux lock retains valid biometric token; expiration blocks stale rehydration', async () => {
  const h = harness();
  const token = jwt({ exp: 102 });
  await h.credentials.saveToken(token);
  const slice = h.load('src/slices/appSlice.ts');
  const reducer = slice.default;
  let state = reducer(undefined, slice.setUserToken(token));
  state = reducer(state, slice.logout());
  assert.equal(state.userToken, null);
  assert.equal(await h.credentials.getToken(), token);
  state = reducer(state, slice.setUserToken(token));
  assert.equal(state.userToken, token);
  h.setNow(102000);
  assert.equal(await h.credentials.getToken(), null);
  state = reducer(state, slice.logout());
  state = reducer(state, slice.setUserToken(token));
  state = reducer(state, slice.updateProfile({ userName: 'Stale profile' }));
  assert.equal(state.userToken, null);
  assert.equal(state.userName, '');
});

test('upload and grade custom requests share authenticated 401 handling', async () => {
  for (const kind of ['upload', 'grade']) {
    const h = harness();
    await h.credentials.saveToken(jwt({ exp: 200 }));
    h.setFetch(async (_url, options) => {
      assert.ok(options.headers.has('Authorization'));
      if (kind === 'upload') assert.equal(options.headers.has('Content-Type'), false);
      return new Response('custom unauthorized', { status: 401 });
    });
    const request = kind === 'upload'
      ? h.load('src/services/alumnoDocumentoService.ts').uploadAlumnoDocumento({ alumnoId: 1, tipoDocumentoAlumnoId: 1, presentado: true, files: [] })
      : h.load('src/services/calificacionService.ts').getCalificacionByCursada(1);
    await assert.rejects(request, /custom unauthorized/);
    assert.equal(await h.credentials.getToken(), null);
  }
});
