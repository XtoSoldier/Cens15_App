const { test } = require('node:test');
const assert = require('node:assert/strict');
const { screen, nodes, input, button, messages } = require('./screenHelper.cjs');

function setup(overrides = {}) {
  const calls = { validate: [], reset: [], resend: [] };
  const result = screen('ResetPasswordScreen', {
    validatePasswordResetCode: async (...args) => { calls.validate.push(args); },
    resetPasswordWithCode: async (...args) => { calls.reset.push(args); },
    requestPasswordReset: async (...args) => { calls.resend.push(args); },
    ...overrides,
  });
  return { ...result, calls };
}
async function validate(render) {
  input(render(), 'Codigo de acceso unico').props.onChangeText('123456');
  await button(render(), 'Validar código').props.onPress();
}
function passwords(render, password = 'secret123', confirmation = password) {
  input(render(), 'Nueva contraseña').props.onChangeText(password);
  input(render(), 'Confirmar nueva contraseña').props.onChangeText(confirmation);
}

test('only six-digit OTP entry is initially shown; invalid format prevents API calls', async () => {
  const { render, calls } = setup();
  assert.equal(input(render(), 'Nueva contraseña'), undefined);
  const otp = input(render(), 'Codigo de acceso unico');
  assert.equal(otp.props.textContentType, 'oneTimeCode');
  assert.equal(otp.props.autoComplete, 'one-time-code');
  assert.match(nodes(render()).map((node) => node.children.join('')).join(' '), /Si el correo esta registrado y activo, recibiras/);
  for (const value of ['', '12345', 'abc']) {
    input(render(), 'Codigo de acceso unico').props.onChangeText(value);
    await button(render(), 'Validar código').props.onPress();
    assert.match(messages(render())[0], /6 dígitos/);
  }
  assert.equal(calls.validate.length, 0);
  assert.equal(calls.reset.length, 0);
});

test('successful validation reveals passwords; short and mismatched passwords never reset', async () => {
  const { render, calls } = setup();
  await validate(render);
  assert.deepEqual(calls.validate, [['ana@example.com', '123456']]);
  assert.equal(input(render(), 'Codigo de acceso unico'), undefined);
  for (const node of nodes(render()).filter((node) => node.type === 'TextInput')) {
    assert.equal(node.props.autoCorrect, false);
    assert.equal(node.props.autoCapitalize, 'none');
  }
  passwords(render, 'short');
  await button(render(), 'Guardar contraseña').props.onPress();
  assert.match(messages(render())[0], /al menos 6/);
  passwords(render, 'secret123', 'different');
  await button(render(), 'Guardar contraseña').props.onPress();
  assert.match(messages(render())[0], /no coinciden/);
  assert.equal(calls.reset.length, 0);
});

test('validation server errors remain visible in code entry', async () => {
  const { render } = setup({ validatePasswordResetCode: async () => { throw new Error('Codigo vencido'); } });
  await validate(render);
  assert.equal(messages(render())[0], 'Codigo vencido');
  assert.ok(input(render(), 'Codigo de acceso unico'));
  assert.equal(input(render(), 'Nueva contraseña'), undefined);
});

test('returning to code entry removes save and clears passwords', async () => {
  const { render, calls } = setup();
  await validate(render);
  passwords(render);
  button(render(), 'Usar otro codigo').props.onPress();
  assert.equal(input(render(), 'Codigo de acceso unico').props.value, '');
  assert.equal(button(render(), 'Guardar contraseña'), undefined);
  await validate(render);
  assert.equal(input(render(), 'Nueva contraseña').props.value, '');
  assert.equal(input(render(), 'Confirmar nueva contraseña').props.value, '');
  assert.equal(calls.reset.length, 0);
});

test('accepted resend clears the validated step and invalidates previous code', async () => {
  const { render, calls } = setup();
  await validate(render);
  passwords(render);
  await button(render(), 'Reenviar codigo').props.onPress();
  assert.deepEqual(calls.resend, [['ana@example.com']]);
  assert.equal(input(render(), 'Codigo de acceso unico').props.value, '');
  assert.equal(input(render(), 'Nueva contraseña'), undefined);
  assert.match(messages(render())[0], /anterior ya no es valido/);
  await button(render(), 'Validar código').props.onPress();
  assert.equal(calls.validate.length, 1);
  await validate(render);
  assert.equal(input(render(), 'Nueva contraseña').props.value, '');
  assert.equal(input(render(), 'Confirmar nueva contraseña').props.value, '');
});

test('failed resend preserves code entry and validated password step', async () => {
  const { render, calls } = setup({ requestPasswordReset: async () => { throw new Error('No disponible'); } });
  input(render(), 'Codigo de acceso unico').props.onChangeText('123456');
  await button(render(), 'Reenviar codigo').props.onPress();
  assert.equal(input(render(), 'Codigo de acceso unico').props.value, '123456');
  assert.equal(messages(render())[0], 'No disponible');
  await validate(render);
  passwords(render);
  await button(render(), 'Reenviar codigo').props.onPress();
  assert.equal(messages(render())[0], 'No disponible');
  assert.equal(input(render(), 'Nueva contraseña').props.value, 'secret123');
  assert.equal(input(render(), 'Confirmar nueva contraseña').props.value, 'secret123');
  await button(render(), 'Guardar contraseña').props.onPress();
  assert.deepEqual(calls.reset, [['ana@example.com', '123456', 'secret123']]);
});

test('reset failure is inline and permits returning to OTP after expiration', async () => {
  const { render, navigation } = setup({ resetPasswordWithCode: async () => { throw new Error('Codigo vencido'); } });
  await validate(render);
  passwords(render);
  await button(render(), 'Guardar contraseña').props.onPress();
  assert.equal(messages(render())[0], 'Codigo vencido');
  assert.equal(navigation.resets.length, 0);
  button(render(), 'Usar otro codigo').props.onPress();
  assert.ok(input(render(), 'Codigo de acceso unico'));
});

test('success clears sensitive fields and requires an explicit Login reset', async () => {
  const { render, calls, navigation } = setup();
  await validate(render);
  passwords(render);
  await button(render(), 'Guardar contraseña').props.onPress();
  assert.deepEqual(calls.reset, [['ana@example.com', '123456', 'secret123']]);
  assert.match(messages(render())[0], /Contraseña actualizada/);
  assert.equal(nodes(render()).filter((node) => node.type === 'TextInput').length, 0);
  assert.equal(button(render(), 'Reenviar codigo'), undefined);
  assert.equal(button(render(), 'Guardar contraseña'), undefined);
  assert.equal(navigation.resets.length, 0);
  assert.equal(navigation.calls.length, 0);
  button(render(), 'Iniciar sesion').props.onPress();
  assert.equal(JSON.stringify(navigation.resets), JSON.stringify([{ index: 0, routes: [{ name: 'Login' }] }]));
});

for (const action of ['validate', 'reset', 'resend']) {
  test(`${action}: busy state disables controls and prevents duplicate requests`, async () => {
    let resolve;
    let calls = 0;
    const method = { validate: 'validatePasswordResetCode', reset: 'resetPasswordWithCode', resend: 'requestPasswordReset' }[action];
    const { render } = setup({ [method]: () => {
      calls++; return new Promise((done) => { resolve = done; });
    } });
    if (action === 'validate') input(render(), 'Codigo de acceso unico').props.onChangeText('123456');
    if (action === 'reset') { await validate(render); passwords(render); }
    const label = { validate: 'Validar código', reset: 'Guardar contraseña', resend: 'Reenviar codigo' }[action];
    const pending = button(render(), label).props.onPress();
    for (const node of nodes(render()).filter((node) => ['TextInput', 'Button', 'IconButton'].includes(node.type))) {
      assert.equal(node.props.disabled, true);
    }
    await button(render(), label).props.onPress();
    assert.equal(calls, 1);
    resolve(); await pending;
  });
}
